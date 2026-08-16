/**
 * leetcode.ts — Isolated-World Content Script for LeetCode
 * Validates window.postMessage origin, session channel UUID, and Zod schema.
 * Relays validated payload to background service worker with zero host page UI overlays.
 */

import { PostMessageEnvelopeSchema } from '../utils/messageSchema';

const SESSION_CHANNEL_ID = crypto.randomUUID();
try {
  document.documentElement.setAttribute('data-cooked2git-channel', SESSION_CHANNEL_ID);
} catch (e) {}

// Inject MAIN-world hook script into DOM with session UUID data attribute
function injectHookScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/content/inject/leetcode.inject.ts');
  script.dataset.channelId = SESSION_CHANNEL_ID;
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

injectHookScript();

// Listen for window.postMessage from MAIN-world hook
window.addEventListener('message', (event: MessageEvent) => {
  // 1. Origin Check
  if (event.origin !== 'https://leetcode.com' && event.origin !== 'https://leetcode.cn') {
    return;
  }

  // 2. Channel ID & Type validation
  const channelAttr = document.documentElement.getAttribute('data-cooked2git-channel');
  const validChannel = event.data?.channelId === SESSION_CHANNEL_ID ||
                       event.data?.channelId === channelAttr ||
                       event.data?.channelId === 'COOKED2GIT_CHANNEL_DEFAULT';

  if (!validChannel || event.data?.type !== 'COOKED2GIT_SUBMISSION') {
    return;
  }

  // 3. Zod Envelope Schema Validation
  const parseResult = PostMessageEnvelopeSchema.safeParse(event.data);
  if (!parseResult.success) {
    console.warn('[Cooked2Git CS] Rejected invalid postMessage payload:', parseResult.error);
    return;
  }

  const { payload } = parseResult.data;
  console.log(`[Cooked2Git CS] Validated submission payload for ${payload.problemTitle}. Forwarding to service worker...`);

  // Relay to Background Service Worker
  chrome.runtime.sendMessage({ type: 'COOKED2GIT_SUBMISSION', payload }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Cooked2Git CS] Runtime error relaying submission:', chrome.runtime.lastError.message);
    } else {
      console.log('[Cooked2Git CS] Background worker response:', response);
    }
  });
});
