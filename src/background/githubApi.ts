/**
 * githubApi.ts — Direct Browser-to-GitHub API Client
 * Supports uninitialized/empty repositories, non-existent repositories, and fast-forward updates.
 * Uses GitHub Contents API for 100% reliable single-file commits across all repository states.
 */

import { SubmissionPayload, PushResult } from '../utils/messageSchema';

export class GitHubApiClient {
  private pat: string;
  private owner: string;
  private repo: string;
  private branch: string;

  constructor(config: { pat: string; repoOwner: string; repoName: string; branch?: string }) {
    this.pat = config.pat.trim();
    this.owner = config.repoOwner.trim();
    this.repo = config.repoName.trim();
    this.branch = (config.branch || 'main').trim();
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.pat}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Cooked2Git-ChromeExtension',
    };
  }

  /**
   * Auto-creates the target repository if it does not exist on user's GitHub account.
   */
  private async ensureRepositoryExists(): Promise<boolean> {
    try {
      const getRepoRes = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}`, {
        headers: this.headers,
      });

      if (getRepoRes.ok) return true;

      if (getRepoRes.status === 404) {
        console.log(`[Cooked2Git GitHubAPI] Repo ${this.owner}/${this.repo} missing. Creating automatically...`);
        const createRes = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            name: this.repo,
            description: 'Auto-synced LeetCode & NeetCode solutions powered by Cooked2Git 🚀',
            private: false,
            auto_init: true,
          }),
        });
        return createRes.ok || createRes.status === 422;
      }
    } catch (e) {
      console.warn('[Cooked2Git GitHubAPI] Auto-create repo check failed:', e);
    }
    return false;
  }

  /**
   * Creates a professional README.md in the solution repository if missing.
   */
  private async ensureDefaultReadme(baseUrl: string): Promise<void> {
    try {
      const checkRes = await fetch(`${baseUrl}/contents/README.md?ref=${this.branch}`, {
        headers: this.headers,
      }).catch(() => null);

      // If README.md does not exist yet (or is empty default), create the beautiful README
      if (!checkRes || checkRes.status === 404) {
        const readmeContent = `# 🧩 LeetCode Solutions

> Auto-synced with **[Cooked2Git](https://github.com/shreesh9/cooked2git)** 🚀  
> Zero servers, zero telemetry, direct browser-to-GitHub synchronization.

---

## 📊 Overview

Welcome to my personal LeetCode & NeetCode solutions repository! Every time I solve a problem on LeetCode or NeetCode, my solutions are automatically pushed here with difficulty categories, runtime performance, and memory percentiles.

| Difficulty | Badge | Folder Path |
| :--- | :--- | :--- |
| **Easy** | ![Easy](https://img.shields.io/badge/Difficulty-Easy-39FF88?style=for-the-badge) | [\`/easy\`](./easy) |
| **Medium** | ![Medium](https://img.shields.io/badge/Difficulty-Medium-FFB800?style=for-the-badge) | [\`/medium\`](./medium) |
| **Hard** | ![Hard](https://img.shields.io/badge/Difficulty-Hard-FF3355?style=for-the-badge) | [\`/hard\`](./hard) |

---

### 👨‍💻 Developer Profile

- **Developer**: Shreesh Nalawade (\`@shxeesh\`)
- 🐙 **GitHub**: [@shreesh9](https://github.com/shreesh9)
- 🌐 **Linktree**: [linktr.ee/shreesh9](https://linktr.ee/shreesh9)
- ✉️ **Email**: [shreeshnalawade9@gmail.com](mailto:shreeshnalawade9@gmail.com)
`;

        const base64Content = encodeStringToBase64(readmeContent);
        await fetch(`${baseUrl}/contents/README.md`, {
          method: 'PUT',
          headers: this.headers,
          body: JSON.stringify({
            message: 'docs: initialize professional Cooked2Git README.md 🚀',
            content: base64Content,
          }),
        }).catch(() => { });
      }
    } catch (e) { }
  }

  /**
   * Pushes a submission file directly to GitHub repo.
   * Handles empty/uninitialized repos seamlessly.
   */
  public async pushSubmission(
    payload: SubmissionPayload,
    filePath: string,
    commitMessage: string
  ): Promise<PushResult> {
    const baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;

    try {
      // Step 0: Ensure repo exists
      await this.ensureRepositoryExists();

      // Step 1: Ensure beautiful default README exists in solution repo
      await this.ensureDefaultReadme(baseUrl);

      // Step 2: Check if file already exists in repo to get existing file SHA
      let existingSha: string | undefined;
      const getFileRes = await fetch(`${baseUrl}/contents/${filePath}?ref=${this.branch}`, {
        headers: this.headers,
      }).catch(() => null);

      if (getFileRes) {
        if (getFileRes.status === 403) {
          const errorBody = await getFileRes.json().catch(() => ({ message: 'Forbidden' }));
          return {
            success: false,
            submissionId: payload.submissionId,
            status: 403,
            error: `GitHub 403 Forbidden: ${errorBody.message || 'Token lacks write scope for repo.'}`,
          };
        }

        if (getFileRes.ok) {
          const fileData = await getFileRes.json();
          existingSha = fileData.sha;
        }
      }

      // Step 3: Encode code content safely to Base64 (UTF-8 safe)
      const base64Code = encodeStringToBase64(payload.code);

      // Step 4: Put contents (creates or updates file & initializes branch if empty)
      let putRes = await fetch(`${baseUrl}/contents/${filePath}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({
          message: commitMessage,
          content: base64Code,
          branch: this.branch,
          ...(existingSha ? { sha: existingSha } : {}),
        }),
      });

      // If 404/422 occurs, retry without forcing branch parameter for new/empty repo
      if ((putRes.status === 404 || putRes.status === 422) && !existingSha) {
        console.log('[Cooked2Git GitHubAPI] PUT failed (404/422). Retrying PUT without branch parameter...');
        putRes = await fetch(`${baseUrl}/contents/${filePath}`, {
          method: 'PUT',
          headers: this.headers,
          body: JSON.stringify({
            message: commitMessage,
            content: base64Code,
          }),
        });
      }

      if (putRes.status === 200 || putRes.status === 201) {
        const putData = await putRes.json();
        const commitUrl = putData.commit?.html_url || `https://github.com/${this.owner}/${this.repo}/commit/${putData.commit?.sha}`;

        return {
          success: true,
          submissionId: payload.submissionId,
          commitUrl,
          status: putRes.status,
        };
      }

      const errorJson = await putRes.json().catch(() => ({ message: putRes.statusText }));
      return {
        success: false,
        submissionId: payload.submissionId,
        status: putRes.status,
        error: `GitHub Error (${putRes.status}): ${errorJson.message || putRes.statusText}`,
      };

    } catch (err: any) {
      return {
        success: false,
        submissionId: payload.submissionId,
        error: `Network failure: ${err.message || 'Unknown error'}`,
      };
    }
  }
}

// UTF-8 safe Base64 encoder helper
function encodeStringToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
