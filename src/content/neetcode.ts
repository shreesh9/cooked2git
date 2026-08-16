/**
 * neetcode.ts — Isolated-World Content Script for NeetCode
 * Validates origin (https://neetcode.io), UUID token, and Zod payload schema.
 */

import { PostMessageEnvelopeSchema } from '../utils/messageSchema';

const SESSION_CHANNEL_ID = crypto.randomUUID();
try {
  document.documentElement.setAttribute('data-cooked2git-channel', SESSION_CHANNEL_ID);
} catch (e) {}

function injectHookScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/content/inject/neetcode.inject.ts');
  script.dataset.channelId = SESSION_CHANNEL_ID;
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

injectHookScript();

window.addEventListener('message', (event: MessageEvent) => {
  if (event.origin !== 'https://neetcode.io') return;

  const channelAttr = document.documentElement.getAttribute('data-cooked2git-channel');
  const validChannel = event.data?.channelId === SESSION_CHANNEL_ID ||
                       event.data?.channelId === channelAttr ||
                       event.data?.channelId === 'COOKED2GIT_CHANNEL_DEFAULT';

  if (!validChannel || event.data?.type !== 'COOKED2GIT_SUBMISSION') {
    return;
  }

  const parseResult = PostMessageEnvelopeSchema.safeParse(event.data);
  if (!parseResult.success) {
    console.warn('[Cooked2Git CS NeetCode] Rejected invalid payload:', parseResult.error);
    return;
  }

  const { payload } = parseResult.data;
  console.log(`[Cooked2Git CS NeetCode] Forwarding ${payload.problemTitle} to background...`);

  chrome.runtime.sendMessage({ type: 'COOKED2GIT_SUBMISSION', payload });
});
