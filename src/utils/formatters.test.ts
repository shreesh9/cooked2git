import { describe, it, expect } from 'vitest';
import { buildFilePath, buildCommitMessage, languageToExtension } from './formatters';
import { SubmissionPayload } from './messageSchema';

describe('formatters', () => {
  it('maps languages to file extensions accurately', () => {
    expect(languageToExtension('python3')).toBe('py');
    expect(languageToExtension('cpp')).toBe('cpp');
    expect(languageToExtension('javascript')).toBe('js');
    expect(languageToExtension('typescript')).toBe('ts');
  });

  it('builds structured file path', () => {
    const payload: SubmissionPayload = {
      submissionId: '101',
      source: 'leetcode',
      problemTitle: 'Two Sum',
      problemSlug: 'two-sum',
      difficulty: 'Easy',
      language: 'python3',
      code: 'print("hello")',
      timestamp: Date.now(),
    };

    expect(buildFilePath(payload)).toBe('easy/two-sum/solution.py');
  });

  it('builds category-aware file path for NeetCode', () => {
    const payload: SubmissionPayload = {
      submissionId: '102',
      source: 'neetcode',
      problemTitle: 'Valid Anagram',
      problemSlug: 'valid-anagram',
      difficulty: 'Easy',
      language: 'cpp',
      code: 'class Solution {};',
      category: 'Arrays & Hashing',
      timestamp: Date.now(),
    };

    expect(buildFilePath(payload)).toBe('arrays-and-hashing/easy/valid-anagram/solution.cpp');
  });

  it('formats commit message with stats', () => {
    const payload: SubmissionPayload = {
      submissionId: '103',
      source: 'leetcode',
      problemTitle: '3Sum',
      problemSlug: '3sum',
      difficulty: 'Medium',
      language: 'java',
      code: 'class Solution {}',
      runtimePercentile: 94.5,
      memoryPercentile: 88.2,
      timestamp: Date.now(),
    };

    const msg = buildCommitMessage(payload);
    expect(msg).toContain('sol(leetcode): 3Sum [Medium]');
    expect(msg).toContain('Runtime: 94.5%');
    expect(msg).toContain('Memory: 88.2%');
  });
});
