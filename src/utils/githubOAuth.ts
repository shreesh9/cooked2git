/**
 * githubOAuth.ts — Seamless GitHub Authentication & Repository Helper
 * 
 * Provides:
 * 1. 1-Click Pre-filled GitHub Token Link (opens GitHub with 'Cooked2Git' & 'repo' scopes pre-selected)
 * 2. Token verification & user profile fetching
 * 3. Automatic user repository listing & 1-click repo creation
 */

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
}

export function getQuickTokenUrl(): string {
  // Pre-fills GitHub token creation form with Cooked2Git name and 'repo' permission pre-checked
  return 'https://github.com/settings/tokens/new?description=Cooked2Git%20Auto-Sync&scopes=repo';
}

export async function verifyTokenAndGetUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Cooked2Git-ChromeExtension',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid token. Please check the token and try again.');
    }
    throw new Error(`GitHub API Error: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    login: data.login,
    avatar_url: data.avatar_url,
    name: data.name || data.login,
  };
}

export async function fetchUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      'Authorization': `Bearer ${accessToken.trim()}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Cooked2Git-ChromeExtension',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user repositories: ${res.statusText}`);
  }

  const repos = await res.json();
  return repos.map((r: any) => ({
    name: r.name,
    full_name: r.full_name,
    owner: r.owner.login,
    private: r.private,
  }));
}

export async function createRepo(accessToken: string, repoName = 'leetcode-solutions'): Promise<{ owner: string; name: string }> {
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.trim()}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Cooked2Git-ChromeExtension',
    },
    body: JSON.stringify({
      name: repoName,
      description: 'Auto-synced LeetCode & NeetCode solutions powered by Cooked2Git 🚀',
      private: false,
      auto_init: true,
    }),
  });

  if (!res.ok && res.status !== 422) { // 422 = repo already exists (handled gracefully)
    throw new Error(`Failed to create repository: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    owner: data.owner?.login || '',
    name: data.name || repoName,
  };
}
