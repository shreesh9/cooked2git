/**
 * neetcode.inject.js — MAIN-World Fetch/XHR Hook Script for NeetCode
 * Runs in window context of neetcode.io/practice/*.
 * Intercepts NeetCode submission check requests & extracts Blind 75 / NeetCode 150 category tags.
 *
 * NOTE: Injected into page context via <script> tag. MUST be 100% valid JavaScript!
 */

(function () {
  var scriptEl = document.currentScript;
  var channelAttr = document.documentElement ? document.documentElement.getAttribute('data-cooked2git-channel') : null;
  var CHANNEL_ID = (scriptEl && scriptEl.dataset && scriptEl.dataset.channelId) || channelAttr || 'COOKED2GIT_CHANNEL_DEFAULT';

  console.log('[Cooked2Git Hook] MAIN-world interception active for NeetCode. Channel:', CHANNEL_ID);

  var originalFetch = window.fetch;
  window.fetch = function () {
    var args = arguments;
    return originalFetch.apply(this, args).then(function (response) {
      try {
        var url = '';
        if (typeof args[0] === 'string') {
          url = args[0];
        } else if (args[0] && args[0].url) {
          url = args[0].url;
        }

        if (url.indexOf('/api/') !== -1 || url.indexOf('/submissions') !== -1 || url.indexOf('/run') !== -1) {
          response.clone().json().then(function (data) {
            handleNeetCodeSubmission(data, url);
          }).catch(function () {});
        }
      } catch (e) {}
      return response;
    });
  };

  function handleNeetCodeSubmission(data, url) {
    if (!data) return;

    var isAccepted = data.status === 'ACCEPTED' || data.passed === true ||
                     (data.result && String(data.result).toLowerCase() === 'accepted');
    if (!isAccepted) return;

    console.log('[Cooked2Git Hook] ✅ Accepted submission detected on NeetCode!', url);

    var pathParts = window.location.pathname.split('/');
    var problemSlug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || 'neetcode-problem';

    var titleEl = document.querySelector('h1, h2');
    var problemTitle = (titleEl && titleEl.textContent) ? titleEl.textContent.trim() : problemSlug.replace(/-/g, ' ');

    var category = extractCategory();

    var payload = {
      submissionId: String(data.id || Date.now()),
      source: 'neetcode',
      problemTitle: problemTitle,
      problemSlug: problemSlug,
      difficulty: parseDifficulty(data),
      language: data.language || 'python',
      code: data.code || '// NeetCode Solution',
      timestamp: Date.now(),
    };
    if (category) payload.category = category;

    console.log('[Cooked2Git Hook] Sending NeetCode payload:', JSON.stringify(payload).substring(0, 200));

    window.postMessage({
      channelId: CHANNEL_ID,
      type: 'COOKED2GIT_SUBMISSION',
      payload: payload,
    }, window.location.origin);
  }

  function extractCategory() {
    var el = document.querySelector('[class*="category"], [class*="topic"], [class*="folder"]');
    return (el && el.textContent) ? el.textContent.trim() : undefined;
  }

  function parseDifficulty(data) {
    if (data && data.difficulty) {
      var d = String(data.difficulty).toLowerCase();
      if (d.indexOf('easy') !== -1) return 'Easy';
      if (d.indexOf('medium') !== -1) return 'Medium';
      if (d.indexOf('hard') !== -1) return 'Hard';
    }

    var badge = document.querySelector('[class*="difficulty"], [class*="badge"]');
    if (badge && badge.textContent) {
      var bText = badge.textContent.trim();
      if (/easy/i.test(bText)) return 'Easy';
      if (/medium/i.test(bText)) return 'Medium';
      if (/hard/i.test(bText)) return 'Hard';
    }

    return 'Easy';
  }
})();
