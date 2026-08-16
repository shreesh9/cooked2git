/**
 * leetcode.inject.js — MAIN-World Fetch/XHR Interception & DOM Observer
 * Intercepts accepted submissions on LeetCode (Classic & Modern Split-View UI).
 * Zero UI popups on host pages — clean postMessage relay to background worker.
 *
 * NOTE: Injected into page context via <script> tag. MUST be 100% valid JavaScript!
 */

(function () {
  var scriptEl = document.currentScript;
  var channelAttr = document.documentElement ? document.documentElement.getAttribute('data-cooked2git-channel') : null;
  var CHANNEL_ID = (scriptEl && scriptEl.dataset && scriptEl.dataset.channelId) || channelAttr || 'COOKED2GIT_CHANNEL_DEFAULT';
  var processedSubmissions = new Set();

  console.log('[Cooked2Git Hook] MAIN-world interception active for LeetCode. Channel:', CHANNEL_ID);

  // ===== 1. Hook Fetch API =====
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

        if (url.indexOf('/submissions/') !== -1 || url.indexOf('/check/') !== -1 || url.indexOf('/graphql') !== -1 || url.indexOf('/submit/') !== -1) {
          response.clone().json().then(function (data) {
            handlePossibleSubmission(data, url);
          }).catch(function () {});
        }
      } catch (e) {
        console.warn('[Cooked2Git Hook] Fetch hook error:', e);
      }
      return response;
    });
  };

  // ===== 2. Hook XHR =====
  var originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    xhr.addEventListener('load', function () {
      try {
        if (xhr.responseText && (xhr.responseURL.indexOf('/check/') !== -1 || xhr.responseURL.indexOf('/submissions/') !== -1 || xhr.responseURL.indexOf('/graphql') !== -1)) {
          var data = JSON.parse(xhr.responseText);
          handlePossibleSubmission(data, xhr.responseURL);
        }
      } catch (e) {}
    });
    return originalXHRSend.apply(this, arguments);
  };

  // ===== 3. Submission Handler =====
  function handlePossibleSubmission(data, url) {
    if (!data) return;

    if (!checkIsAccepted(data)) return;

    var submissionId = String(
      data.submission_id || data.submissionId || data.id ||
      (data.data && data.data.submissionDetail && data.data.submissionDetail.id) ||
      (data.data && data.data.submissionDetails && data.data.submissionDetails.id) ||
      Date.now()
    );

    if (processedSubmissions.has(submissionId)) {
      console.log('[Cooked2Git Hook] Submission ' + submissionId + ' already processed. Skipping.');
      return;
    }
    processedSubmissions.add(submissionId);

    console.log('[Cooked2Git Hook] ✅ Accepted submission intercepted!', submissionId, url);

    var problemSlug = extractProblemSlug();
    var problemTitle = extractProblemTitle(problemSlug);
    var difficulty = extractDifficulty(data);
    var code = extractCode(data);
    var language = extractLanguage(data);

    var payload = {
      submissionId: submissionId,
      source: 'leetcode',
      problemTitle: problemTitle,
      problemSlug: problemSlug,
      difficulty: difficulty,
      language: language,
      code: code,
      timestamp: Date.now(),
    };

    // Add optional percentile data
    var rp = data.runtime_percentile || data.runtimePercentile || (data.data && data.data.submissionDetail && data.data.submissionDetail.runtimePercentile);
    var mp = data.memory_percentile || data.memoryPercentile || (data.data && data.data.submissionDetail && data.data.submissionDetail.memoryPercentile);
    if (rp !== undefined) payload.runtimePercentile = rp;
    if (mp !== undefined) payload.memoryPercentile = mp;

    console.log('[Cooked2Git Hook] Sending payload:', JSON.stringify(payload).substring(0, 200));

    window.postMessage({
      channelId: CHANNEL_ID,
      type: 'COOKED2GIT_SUBMISSION',
      payload: payload,
    }, window.location.origin);
  }

  // ===== 4. Accepted Status Detection =====
  function checkIsAccepted(data) {
    if (!data) return false;

    if (data.status_msg === 'Accepted' || data.status_msg === 'ACCEPTED') return true;
    if (data.status_code === 10) return true;
    if (data.status_display === 'Accepted') return true;

    if (data.data) {
      if (data.data.submissionDetail && data.data.submissionDetail.statusDisplay === 'Accepted') return true;
      if (data.data.submissionDetails && data.data.submissionDetails.statusDisplay === 'Accepted') return true;
      if (data.data.submissionDetail && data.data.submissionDetail.statusCode === 10) return true;
      if (data.data.submissionDetails && data.data.submissionDetails.statusCode === 10) return true;
    }

    if (data.state === 'SUCCESS' && (data.status_msg === 'Accepted' || data.status_code === 10)) return true;

    try {
      var jsonStr = JSON.stringify(data);
      if (jsonStr.indexOf('"status_msg":"Accepted"') !== -1 || jsonStr.indexOf('"status_code":10') !== -1 || jsonStr.indexOf('"statusDisplay":"Accepted"') !== -1) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  // ===== 5. Data Extractors =====
  function extractProblemSlug() {
    var parts = window.location.pathname.split('/problems/');
    if (parts.length > 1) {
      var slug = parts[1].split('/')[0];
      return slug || 'leetcode-problem';
    }
    return 'leetcode-problem';
  }

  function extractProblemTitle(slug) {
    var selectors = [
      'div[data-cy="question-title"]',
      'div[class*="text-title-large"]',
      'a[class*="text-label-1"]',
      'h4[class*="title"]',
      'div[class*="css-v3d350"] a',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.textContent && el.textContent.trim().length > 0) {
        return el.textContent.trim().replace(/^\d+\.\s*/, '');
      }
    }
    return slug.replace(/-/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); });
  }

  function extractDifficulty(data) {
    // 1. From API payload directly if available
    if (data) {
      if (data.difficulty && typeof data.difficulty === 'string') return normalizeDiff(data.difficulty);
      if (data.question && data.question.difficulty) return normalizeDiff(data.question.difficulty);
      if (data.data) {
        if (data.data.question && data.data.question.difficulty) return normalizeDiff(data.data.question.difficulty);
        if (data.data.submissionDetail && data.data.submissionDetail.question && data.data.submissionDetail.question.difficulty) {
          return normalizeDiff(data.data.submissionDetail.question.difficulty);
        }
      }
    }

    // 2. Exact DOM selectors for difficulty badge on LeetCode
    var diffSelectors = [
      'div[class*="text-difficulty-easy"]',
      'div[class*="text-difficulty-medium"]',
      'div[class*="text-difficulty-hard"]',
      'div[class*="text-sd-easy"]',
      'div[class*="text-sd-medium"]',
      'div[class*="text-sd-hard"]',
      'span[class*="text-difficulty"]',
      'div[class*="text-easy"]',
      'div[class*="text-medium"]',
      'div[class*="text-hard"]',
      'div[data-difficulty]',
      '[class*="difficulty"]',
    ];

    for (var i = 0; i < diffSelectors.length; i++) {
      var els = document.querySelectorAll(diffSelectors[i]);
      for (var j = 0; j < els.length; j++) {
        var text = (els[j].textContent || '').trim();
        if (/^easy$/i.test(text) || text.indexOf('Easy') !== -1) return 'Easy';
        if (/^medium$/i.test(text) || text.indexOf('Medium') !== -1) return 'Medium';
        if (/^hard$/i.test(text) || text.indexOf('Hard') !== -1) return 'Hard';
      }
    }

    // 3. Search ONLY inside Question Description Pane (NOT global body.innerText)
    var pane = document.querySelector('div[class*="description"], div[data-track-load="description_keywords"], div[class*="elfjS"]');
    if (pane) {
      var paneText = pane.innerText || '';
      var match = paneText.match(/\b(Easy|Medium|Hard)\b/i);
      if (match && match[1]) {
        return normalizeDiff(match[1]);
      }
    }

    // 4. Search near problem title header
    var titleEl = document.querySelector('div[data-cy="question-title"], div[class*="text-title-large"], h4');
    if (titleEl && titleEl.parentElement) {
      var headerText = titleEl.parentElement.innerText || '';
      var hMatch = headerText.match(/\b(Easy|Medium|Hard)\b/i);
      if (hMatch && hMatch[1]) {
        return normalizeDiff(hMatch[1]);
      }
    }

    return 'Easy'; // Default fallback
  }

  function normalizeDiff(val) {
    if (!val) return 'Easy';
    var lower = String(val).toLowerCase();
    if (lower.indexOf('easy') !== -1) return 'Easy';
    if (lower.indexOf('medium') !== -1) return 'Medium';
    if (lower.indexOf('hard') !== -1) return 'Hard';
    return 'Easy';
  }

  function extractCode(data) {
    if (data.code && typeof data.code === 'string' && data.code.length > 5) return data.code;
    if (data.typed_code && typeof data.typed_code === 'string') return data.typed_code;
    if (data.data && data.data.submissionDetail && data.data.submissionDetail.code) return data.data.submissionDetail.code;
    if (data.data && data.data.submissionDetails && data.data.submissionDetails.code) return data.data.submissionDetails.code;
    if (data.data && data.data.questionSubmission && data.data.questionSubmission.code) return data.data.questionSubmission.code;

    try {
      if (window.monaco && window.monaco.editor) {
        var models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          var val = models[models.length - 1].getValue();
          if (val && val.trim().length > 5) return val;
        }
      }
    } catch (e) {}

    var lineSelectors = [
      '.monaco-editor .view-lines .view-line',
      '.monaco-editor .view-line',
      '.view-line',
      'div[class*="view-line"]',
      '[class*="monaco"] [class*="view-line"]',
    ];

    for (var j = 0; j < lineSelectors.length; j++) {
      var monacoLines = document.querySelectorAll(lineSelectors[j]);
      if (monacoLines.length > 0) {
        var lines = [];
        monacoLines.forEach(function (l) { lines.push(l.textContent || ''); });
        var joined = lines.join('\n');
        if (joined.trim().length > 5) return joined;
      }
    }

    var cm = document.querySelector('.CodeMirror');
    if (cm && cm.CodeMirror) {
      var cmVal = cm.CodeMirror.getValue();
      if (cmVal && cmVal.trim().length > 5) return cmVal;
    }

    var textareas = document.querySelectorAll('textarea');
    for (var k = 0; k < textareas.length; k++) {
      var ta = textareas[k];
      if (ta.value && ta.value.trim().length > 10) {
        return ta.value;
      }
    }

    return '// Solution code extracted via Cooked2Git';
  }

  function extractLanguage(data) {
    if (data.lang && typeof data.lang === 'string') return data.lang;
    if (data.language && typeof data.language === 'string') return data.language;
    if (data.data && data.data.submissionDetail && data.data.submissionDetail.lang) {
      var l = data.data.submissionDetail.lang;
      return (typeof l === 'object' && l.name) ? l.name : String(l);
    }

    var langBtn = document.querySelector('button[id*="headlessui-listbox-button"]');
    if (langBtn) {
      var text = (langBtn.textContent || '').toLowerCase().trim();
      if (text.indexOf('python3') !== -1) return 'python3';
      if (text.indexOf('python') !== -1) return 'python';
      if (text.indexOf('c++') !== -1 || text.indexOf('cpp') !== -1) return 'cpp';
      if (text.indexOf('java') !== -1 && text.indexOf('javascript') === -1) return 'java';
      if (text.indexOf('javascript') !== -1) return 'javascript';
      if (text.indexOf('typescript') !== -1) return 'typescript';
      if (text.indexOf('c#') !== -1) return 'csharp';
      if (text.indexOf('go') !== -1) return 'golang';
      if (text.indexOf('rust') !== -1) return 'rust';
      return text || 'python3';
    }
    return 'python3';
  }
})();
