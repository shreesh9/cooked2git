import { CookedCat } from './CookedCat';
import { getStorageConfig, setStorageConfig, getQueue, clearAllData, getPushLog } from '../utils/storage';
import { getQuickTokenUrl, verifyTokenAndGetUser, fetchUserRepos, createRepo } from '../utils/githubOAuth';

document.addEventListener('DOMContentLoaded', async () => {
  const catMount = document.getElementById('catMount');
  let cat: CookedCat | null = null;

  if (catMount) {
    cat = new CookedCat({
      container: catMount,
      initialState: 'idle',
      interactive: true,
    });
  }

  const getTokenLinkBtn = document.getElementById('getTokenLinkBtn');
  const tokenInput = document.getElementById('tokenInput') as HTMLInputElement;
  const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
  const disconnectedPanel = document.getElementById('disconnectedPanel');
  const connectedPanel = document.getElementById('connectedPanel');
  const userLoginDisplay = document.getElementById('userLoginDisplay');
  const unlinkBtn = document.getElementById('unlinkBtn');
  const repoSelect = document.getElementById('repoSelect') as HTMLSelectElement;
  const createRepoBtn = document.getElementById('createRepoBtn');

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statStreak = document.getElementById('statStreak');
  const statQueue = document.getElementById('statQueue');
  const statPushed = document.getElementById('statPushed');
  const dryRunToggle = document.getElementById('dryRunToggle');

  // Load state on startup
  await refreshUI();

  // 1-Click Token Link button -> opens GitHub token creation page with description & repo scopes pre-selected
  getTokenLinkBtn?.addEventListener('click', () => {
    chrome.tabs.create({ url: getQuickTokenUrl() });
  });

  // Connect button -> verifies token, fetches repos
  connectBtn?.addEventListener('click', async () => {
    const rawToken = tokenInput.value.trim();
    if (!rawToken) {
      alert('Please paste your GitHub Token.');
      return;
    }

    try {
      connectBtn.disabled = true;
      connectBtn.textContent = 'CONNECTING...';
      cat?.setState('thinking');

      // Verify token
      const user = await verifyTokenAndGetUser(rawToken);

      // Save token and user login
      await setStorageConfig({ pat: rawToken, userLogin: user.login });

      cat?.setState('cooked', 1500);

      // Populate repo dropdown
      await populateRepoDropdown(rawToken);
    } catch (err: any) {
      console.error('[Cooked2Git Connect] Error:', err);
      cat?.setState('error', 1500);
      alert(`Connection Error: ${err.message || 'Invalid token'}`);
    } finally {
      connectBtn.disabled = false;
      connectBtn.textContent = 'CONNECT';
      await refreshUI();
    }
  });

  // Unlink button -> resets credentials
  unlinkBtn?.addEventListener('click', async () => {
    if (confirm('Unlink GitHub repository and credentials?')) {
      await clearAllData();
      cat?.setState('idle');
      await refreshUI();
    }
  });

  // Repo select change handler
  repoSelect?.addEventListener('change', async () => {
    const selected = repoSelect.value;
    if (!selected) return;
    const [owner, name] = selected.split('/');
    await setStorageConfig({ repoOwner: owner, repoName: name });
    await refreshUI();
  });

  // Auto-Create Repo button
  createRepoBtn?.addEventListener('click', async () => {
    const config = await getStorageConfig();
    if (!config.pat) {
      alert('Please connect your GitHub token first.');
      return;
    }

    try {
      createRepoBtn.textContent = 'CREATING...';
      const newRepo = await createRepo(config.pat, 'leetcode-solutions');
      await setStorageConfig({ repoOwner: newRepo.owner, repoName: newRepo.name });
      cat?.setState('cooked', 1500);
      alert(`✓ Repository '${newRepo.owner}/${newRepo.name}' connected successfully!`);
      await populateRepoDropdown(config.pat);
    } catch (err: any) {
      alert(`Could not create repo: ${err.message}`);
    } finally {
      createRepoBtn.textContent = '+ NEW REPO';
      await refreshUI();
    }
  });

  async function populateRepoDropdown(token: string) {
    if (!repoSelect) return;
    try {
      const repos = await fetchUserRepos(token);
      repoSelect.innerHTML = repos.map(r => `<option value="${r.full_name}">${r.full_name}</option>`).join('');

      const config = await getStorageConfig();
      if (config.repoOwner && config.repoName && repos.some(r => r.full_name === `${config.repoOwner}/${config.repoName}`)) {
        repoSelect.value = `${config.repoOwner}/${config.repoName}`;
      } else if (repos.length > 0) {
        const first = repos[0];
        await setStorageConfig({ repoOwner: first.owner, repoName: first.name });
        repoSelect.value = first.full_name;
      }

      if (repoSelect.value) {
        const [owner, name] = repoSelect.value.split('/');
        if (owner && name) {
          await setStorageConfig({ repoOwner: owner, repoName: name });
        }
      }
    } catch (e) {
      console.warn('[Cooked2Git] Failed to fetch repos:', e);
    }
  }

  async function refreshUI() {
    try {
      const config = await getStorageConfig();
      const queue = await getQueue();

      const isConnected = Boolean(config.pat && config.repoOwner && config.repoName);

      if (isConnected) {
        if (disconnectedPanel) disconnectedPanel.classList.add('hidden');
        if (connectedPanel) connectedPanel.classList.remove('hidden');
        if (userLoginDisplay) userLoginDisplay.textContent = `@${config.userLogin || config.repoOwner}`;
        if (statusDot) statusDot.className = 'status-dot online';
        if (statusText) {
          statusText.textContent = 'CONNECTED';
          statusText.className = 'font-micro text-green';
        }
        if (config.pat && repoSelect.options.length <= 1) {
          populateRepoDropdown(config.pat);
        }
      } else if (config.pat) {
        // Authenticated token, select repo state
        if (disconnectedPanel) disconnectedPanel.classList.add('hidden');
        if (connectedPanel) connectedPanel.classList.remove('hidden');
        if (userLoginDisplay) userLoginDisplay.textContent = `@${config.userLogin || 'user'}`;
        if (statusDot) statusDot.className = 'status-dot medium';
        if (statusText) {
          statusText.textContent = 'SELECT REPO';
          statusText.className = 'font-micro text-ash';
        }
        populateRepoDropdown(config.pat);
      } else {
        if (disconnectedPanel) disconnectedPanel.classList.remove('hidden');
        if (connectedPanel) connectedPanel.classList.add('hidden');
        if (statusDot) statusDot.className = 'status-dot offline';
        if (statusText) {
          statusText.textContent = 'DISCONNECTED';
          statusText.className = 'font-micro text-ash';
        }
      }

      const pushLog = await getPushLog();
      const pushesList = document.getElementById('pushesList');

      if (statStreak) statStreak.textContent = `${config.streakCount || 0} 🔥`;
      if (statQueue) statQueue.textContent = `${queue.length}`;
      if (statPushed) statPushed.textContent = `${pushLog.length}`;

      if (pushesList) {
        if (pushLog.length === 0) {
          pushesList.innerHTML = `<li class="empty-state text-ash text-xs">No synced commits yet. Solve a problem on LeetCode!</li>`;
        } else {
          pushesList.innerHTML = pushLog.map(item => {
            const badgeClass = item.difficulty.toLowerCase() === 'easy' ? 'badge-easy' : item.difficulty.toLowerCase() === 'medium' ? 'badge-medium' : 'badge-hard';
            const linkHtml = item.commitUrl ? `<a href="${item.commitUrl}" target="_blank" class="hover-crimson text-crimson">VIEW</a>` : '<span class="text-green">SYNCED</span>';
            return `
              <li class="push-item">
                <div class="flex items-center gap-2 truncate">
                  <span class="badge ${badgeClass}">${item.difficulty.toUpperCase()}</span>
                  <span class="text-paper truncate">${escapeHtml(item.problemTitle)}</span>
                </div>
                ${linkHtml}
              </li>
            `;
          }).join('');
        }
      }

      let dryRunActive = Boolean(config.dryRun);
      if (dryRunToggle) {
        dryRunToggle.textContent = `DRY RUN: ${dryRunActive ? 'ON' : 'OFF'}`;
        dryRunToggle.style.color = dryRunActive ? 'var(--ok-green)' : 'var(--ash)';

        dryRunToggle.onclick = async (e) => {
          e.preventDefault();
          dryRunActive = !dryRunActive;
          await setStorageConfig({ dryRun: dryRunActive });
          dryRunToggle.textContent = `DRY RUN: ${dryRunActive ? 'ON' : 'OFF'}`;
          dryRunToggle.style.color = dryRunActive ? 'var(--ok-green)' : 'var(--ash)';
        };
      }
    } catch (err) {
      console.warn('[Cooked2Git Popup] Error updating UI:', err);
    }
  }

  const openOptionsLink = document.getElementById('openOptionsLink');
  if (openOptionsLink) {
    openOptionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      openOptionsPage();
    });
  }

  function openOptionsPage() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('src/options/options.html'));
    }
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
