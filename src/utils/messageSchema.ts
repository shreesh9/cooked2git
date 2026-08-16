/**
 * messageSchema.ts — Zod Runtime Message Validation
 * Validates postMessage and extension runtime message payloads against strict schemas.
 */

import { z } from 'zod';

export const DifficultySchema = z.enum(['Easy', 'Medium', 'Hard', 'Unknown']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const SubmissionPayloadSchema = z.object({
  submissionId: z.string().min(1),
  source: z.enum(['leetcode']),
  problemTitle: z.string().min(1),
  problemSlug: z.string().min(1),
  difficulty: DifficultySchema,
  language: z.string().min(1),
  code: z.string().min(1),
  runtimePercentile: z.number().optional(),
  memoryPercentile: z.number().optional(),
  timestamp: z.number().default(() => Date.now()),
});

export type SubmissionPayload = z.infer<typeof SubmissionPayloadSchema>;

export const PostMessageEnvelopeSchema = z.object({
  channelId: z.string().min(1),
  type: z.literal('COOKED2GIT_SUBMISSION'),
  payload: SubmissionPayloadSchema,
});

export type PostMessageEnvelope = z.infer<typeof PostMessageEnvelopeSchema>;

export const PushResultSchema = z.object({
  success: z.boolean(),
  submissionId: z.string(),
  commitUrl: z.string().url().optional(),
  error: z.string().optional(),
  status: z.number().optional(),
});

export type PushResult = z.infer<typeof PushResultSchema>;
