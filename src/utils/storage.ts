/**
 * storage.ts — Typed Chrome Local Storage Wrapper
 * Strictly chrome.storage.local (NEVER .sync) to prevent secrets replicating across devices.
 */

export interface StorageConfig {
  pat?: string;
  userLogin?: string;
  repoOwner?: string;
  repoName?: string;
  branch?: string;
  folderPath?: string; // Default: 'difficulty/slug'
  commitTemplate?: string;
  dryRun?: boolean;
  hideCat?: boolean;
  streakCount?: number;
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  lastPushTimestamp?: number;
}

export interface PushLogEntry {
  id: string;
  problemTitle: string;
  problemSlug: string;
  difficulty: string;
  language: string;
  commitUrl?: string;
  timestamp: number;
}

export interface QueuedPush {
  id: string; // Submission UUID
  payload: any;
  attempts: number;
  queuedAt: number;
}

export const StorageKeys = {
  CONFIG: 'cooked2git_config',
  QUEUE: 'cooked2git_queue',
  PUSH_LOG: 'cooked2git_push_log',
  ENCRYPTED_PAT: 'cooked2git_enc_pat',
};

export async function getStorageConfig(): Promise<StorageConfig> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      resolve({});
      return;
    }
    chrome.storage.local.get([StorageKeys.CONFIG], (res) => {
      resolve(res[StorageKeys.CONFIG] || {});
    });
  });
}

export async function setStorageConfig(config: Partial<StorageConfig>): Promise<void> {
  const current = await getStorageConfig();
  const updated = { ...current, ...config };
  return new Promise((resolve) => {
    chrome.storage.local.set({ [StorageKeys.CONFIG]: updated }, () => resolve());
  });
}

export async function getPushLog(): Promise<PushLogEntry[]> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      resolve([]);
      return;
    }
    chrome.storage.local.get([StorageKeys.PUSH_LOG], (res) => {
      resolve(res[StorageKeys.PUSH_LOG] || []);
    });
  });
}

export async function addPushLog(entry: PushLogEntry): Promise<void> {
  const current = await getPushLog();
  // Keep last 20 entries
  const updated = [entry, ...current.filter(e => e.id !== entry.id)].slice(0, 20);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [StorageKeys.PUSH_LOG]: updated }, () => resolve());
  });
}

export async function getQueue(): Promise<QueuedPush[]> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      resolve([]);
      return;
    }
    chrome.storage.local.get([StorageKeys.QUEUE], (res) => {
      resolve(res[StorageKeys.QUEUE] || []);
    });
  });
}

export async function setQueue(queue: QueuedPush[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [StorageKeys.QUEUE]: queue }, () => resolve());
  });
}

export async function clearAllData(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => resolve());
  });
}
