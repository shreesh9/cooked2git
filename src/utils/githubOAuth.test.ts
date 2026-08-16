import { describe, it, expect } from 'vitest';
import { getQuickTokenUrl, verifyTokenAndGetUser, fetchUserRepos, createRepo } from './githubOAuth';

describe('githubOAuth - Helper Functions', () => {
  it('generates pre-filled GitHub token URL with repo scopes', () => {
    const url = getQuickTokenUrl();
    expect(url).toContain('https://github.com/settings/tokens/new');
    expect(url).toContain('scopes=repo');
  });

  it('exports helper functions', () => {
    expect(verifyTokenAndGetUser).toBeTypeOf('function');
    expect(fetchUserRepos).toBeTypeOf('function');
    expect(createRepo).toBeTypeOf('function');
  });
});
