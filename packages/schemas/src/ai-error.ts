import { z } from 'zod';

export enum AIErrorCode {
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_UPSTREAM_RESPONSE = 'INVALID_UPSTREAM_RESPONSE',
  TIMEOUT = 'TIMEOUT',
  UPSTREAM_UNAVAILABLE = 'UPSTREAM_UNAVAILABLE',
  UPSTREAM_ERROR = 'UPSTREAM_ERROR',
  CONFIG_MISSING = 'CONFIG_MISSING',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export const AIErrorResponseSchema = z
  .object({
    error: z
      .object({
        id: z.string(),
        code: z.nativeEnum(AIErrorCode),
        message: z.string(),
        httpStatus: z.number().int(),
        retryable: z.boolean(),
        retryAfterMs: z.number().int().nonnegative().optional(),
        provider: z.string().optional(),
        details: z.unknown().optional(),
      })
      .strict(),
  })
  .strict();

export type AIErrorResponse = z.infer<typeof AIErrorResponseSchema>;
