import { AIErrorCode, AIErrorResponseSchema } from '../ai-error';

describe('AIErrorResponseSchema', () => {
  it('accepts valid payloads', () => {
    const result = AIErrorResponseSchema.safeParse({
      error: {
        id: 'req-123',
        code: AIErrorCode.RATE_LIMITED,
        message: 'Rate limited',
        httpStatus: 429,
        retryable: true,
        retryAfterMs: 1000,
        provider: 'openai',
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid payloads', () => {
    const result = AIErrorResponseSchema.safeParse({
      error: {
        id: 'req-123',
        code: 'NOT_A_CODE',
        message: 'Rate limited',
        httpStatus: '429',
        retryable: true,
      },
    });

    expect(result.success).toBe(false);
  });
});
