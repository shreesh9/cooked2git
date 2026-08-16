/**
 * serviceWorker.ts — Background Service Worker
 * Orchestrates content script interception payloads, GitHub API calls, offline queue, and alarms.
 */

import { SubmissionPayloadSchema, SubmissionPayload, PushResult } from '../utils/messageSchema';
import { getStorageConfig, setStorageConfig, addPushLog } from '../utils/storage';
import { GitHubApiClient } from './githubApi';
import { enqueueSubmission, processQueue } from './queue';
import { buildFilePath, buildCommitMessage } from '../utils/formatters';

console.log('[Cooked2Git Service Worker] Service Worker Initialized.');

// Alarm for periodic queue processing (every 5 minutes or on network reconnect)
chrome.alarms.create('cooked2git_process_queue', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cooked2git_process_queue') {
    handleProcessQueue();
  }
});

// Listener for messages from isolated content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'COOKED2GIT_SUBMISSION') {
    handleSubmission(message.payload)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (message?.type === 'COOKED2GIT_GET_STATUS') {
    getStorageConfig().then(config => {
      sendResponse({
        configured: Boolean(config.pat && config.repoOwner && config.repoName),
        repoOwner: config.repoOwner,
        repoName: config.repoName,
        dryRun: config.dryRun || false,
      });
    });
    return true;
  }
});

async function handleSubmission(rawPayload: unknown): Promise<PushResult> {
  // 1. Zod runtime schema validation
  const parseResult = SubmissionPayloadSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    console.error('[Cooked2Git SW] Invalid submission payload schema:', parseResult.error);
    return {
      success: false,
      submissionId: (rawPayload as any)?.submissionId || 'unknown',
      error: `Invalid payload schema: ${parseResult.error.message}`,
    };
  }

  const payload: SubmissionPayload = parseResult.data;
  console.log(`[Cooked2Git SW] Intercepted accepted submission: ${payload.problemTitle} (${payload.submissionId})`);

  const config = await getStorageConfig();

  // Dry Run check
  if (config.dryRun) {
    const filePath = buildFilePath(payload);
    const commitMsg = buildCommitMessage(payload);
    console.log('[Cooked2Git SW] DRY RUN ACTIVE. Output Preview:\nPath:', filePath, '\nCommit:', commitMsg);
    return {
      success: true,
      submissionId: payload.submissionId,
      commitUrl: `https://github.com/${config.repoOwner || 'user'}/${config.repoName || 'repo'} (Dry Run)`,
    };
  }

  const repoOwner = config.repoOwner || config.userLogin;
  const repoName = config.repoName || 'solved-questions';

  if (!config.pat || !repoOwner || !repoName) {
    return {
      success: false,
      submissionId: payload.submissionId,
      error: 'GitHub credentials not configured. Open options to connect your repository.',
    };
  }

  // Check network connection
  if (!navigator.onLine) {
    console.log('[Cooked2Git SW] Browser offline. Enqueuing submission for retry.');
    await enqueueSubmission(payload);
    return {
      success: false,
      submissionId: payload.submissionId,
      error: 'Offline mode: Submission queued for auto-retry when reconnected.',
    };
  }

  // Execute Git Tree Push
  const client = new GitHubApiClient({
    pat: config.pat,
    repoOwner,
    repoName,
    branch: config.branch || 'main',
  });

  const filePath = buildFilePath(payload);
  const commitMessage = buildCommitMessage(payload);

  const result = await client.pushSubmission(payload, filePath, commitMessage);

  if (result.success) {
    const now = Date.now();
    const streak = (config.streakCount || 0) + 1;
    const diff = payload.difficulty.toLowerCase();
    const easyCount = (config.easyCount || 0) + (diff === 'easy' ? 1 : 0);
    const mediumCount = (config.mediumCount || 0) + (diff === 'medium' ? 1 : 0);
    const hardCount = (config.hardCount || 0) + (diff === 'hard' ? 1 : 0);

    await setStorageConfig({
      streakCount: streak,
      easyCount,
      mediumCount,
      hardCount,
      lastPushTimestamp: now,
    });

    await addPushLog({
      id: payload.submissionId,
      problemTitle: payload.problemTitle,
      problemSlug: payload.problemSlug,
      difficulty: payload.difficulty,
      language: payload.language,
      commitUrl: result.commitUrl,
      timestamp: now,
    });
  } else {
    // Queue on network failure
    if (!result.status || result.status >= 500) {
      await enqueueSubmission(payload);
    }
  }

  return result;
}

async function handleProcessQueue() {
  const config = await getStorageConfig();
  if (!config.pat || !config.repoOwner || !config.repoName || !navigator.onLine) return;

  const client = new GitHubApiClient({
    pat: config.pat,
    repoOwner: config.repoOwner,
    repoName: config.repoName,
    branch: config.branch || 'main',
  });

  await processQueue(async (payload) => {
    const filePath = buildFilePath(payload);
    const commitMsg = buildCommitMessage(payload);
    const res = await client.pushSubmission(payload, filePath, commitMsg);
    return { success: res.success, error: res.error };
  });
}
