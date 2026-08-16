/**
 * queue.ts — Offline Retry Queue
 * Persisted in chrome.storage.local.
 * Exponential backoff: 1s -> 2s -> 4s -> 8s -> 16s -> max 5 attempts.
 * Deduplication by submissionId (idempotency guarantee).
 */

import { QueuedPush, getQueue, setQueue } from '../utils/storage';
import { SubmissionPayload } from '../utils/messageSchema';

const MAX_ATTEMPTS = 5;

export async function enqueueSubmission(payload: SubmissionPayload): Promise<void> {
  const queue = await getQueue();

  // Deduplication check
  if (queue.some(item => item.payload.submissionId === payload.submissionId)) {
    console.log(`[Cooked2Git Queue] Submission ${payload.submissionId} already in queue. Skipping.`);
    return;
  }

  const newItem: QueuedPush = {
    id: payload.submissionId,
    payload,
    attempts: 0,
    queuedAt: Date.now(),
  };

  queue.push(newItem);
  await setQueue(queue);
  console.log(`[Cooked2Git Queue] Enqueued submission ${payload.submissionId}. Queue size: ${queue.length}`);
}

export async function dequeueSubmission(submissionId: string): Promise<void> {
  let queue = await getQueue();
  queue = queue.filter(item => item.id !== submissionId);
  await setQueue(queue);
}

export async function processQueue(
  pushHandler: (payload: SubmissionPayload) => Promise<{ success: boolean; error?: string }>
): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  console.log(`[Cooked2Git Queue] Processing ${queue.length} queued items...`);

  for (const item of [...queue]) {
    if (item.attempts >= MAX_ATTEMPTS) {
      console.warn(`[Cooked2Git Queue] Item ${item.id} exceeded max retry attempts (${MAX_ATTEMPTS}). Dequeuing.`);
      await dequeueSubmission(item.id);
      continue;
    }

    item.attempts++;
    const backoffMs = Math.pow(2, item.attempts - 1) * 1000;
    console.log(`[Cooked2Git Queue] Attempt ${item.attempts}/${MAX_ATTEMPTS} for ${item.id} (Backoff: ${backoffMs}ms)`);

    await new Promise(resolve => setTimeout(resolve, backoffMs));

    const result = await pushHandler(item.payload);
    if (result.success) {
      console.log(`[Cooked2Git Queue] Successfully pushed ${item.id}. Removing from queue.`);
      await dequeueSubmission(item.id);
    } else {
      console.error(`[Cooked2Git Queue] Push failed for ${item.id}: ${result.error}`);
      // Update attempt count in storage
      const currentQueue = await getQueue();
      const updated = currentQueue.map(q => q.id === item.id ? { ...q, attempts: item.attempts } : q);
      await setQueue(updated);
    }
  }
}
