/**
 * formatters.ts — File Path and Commit Message Builders
 */

import { SubmissionPayload } from './messageSchema';

export function languageToExtension(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  const map: Record<string, string> = {
    python: 'py',
    python3: 'py',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    java: 'java',
    javascript: 'js',
    typescript: 'ts',
    golang: 'go',
    go: 'go',
    rust: 'rs',
    ruby: 'rb',
    swift: 'swift',
    kotlin: 'kt',
    scala: 'scala',
    sql: 'sql',
    mysql: 'sql',
    oracle: 'sql',
    bash: 'sh',
    php: 'php',
  };
  return map[normalized] || 'txt';
}

export function buildFilePath(submission: SubmissionPayload): string {
  const ext = languageToExtension(submission.language);
  const difficulty = submission.difficulty.toLowerCase();
  const slug = submission.problemSlug;

  // E.g., easy/two-sum/solution.py
  return `${difficulty}/${slug}/solution.${ext}`;
}

export function buildCommitMessage(submission: SubmissionPayload): string {
  const stats: string[] = [];
  if (submission.runtimePercentile !== undefined) {
    stats.push(`Runtime: ${submission.runtimePercentile.toFixed(1)}%`);
  }
  if (submission.memoryPercentile !== undefined) {
    stats.push(`Memory: ${submission.memoryPercentile.toFixed(1)}%`);
  }

  const statsStr = stats.length > 0 ? ` (${stats.join(', ')})` : '';

  return `sol: ${submission.problemTitle} [${submission.difficulty}]${statsStr} — Cooked2Git`;
}
