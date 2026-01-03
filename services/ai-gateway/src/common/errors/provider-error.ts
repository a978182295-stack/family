import { HttpException } from '@nestjs/common';
import { AIErrorCode } from '@family-hub/schemas';

type ProviderErrorInit = {
  code: AIErrorCode;
  message: string;
  httpStatus: number;
  retryable: boolean;
  retryAfterMs?: number;
  provider?: string;
  details?: Record<string, unknown>;
};

export class ProviderError extends Error {
  readonly code: AIErrorCode;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly provider?: string;
  readonly details?: Record<string, unknown>;

  constructor(init: ProviderErrorInit) {
    super(init.message);
    this.name = 'ProviderError';
    this.code = init.code;
    this.httpStatus = init.httpStatus;
    this.retryable = init.retryable;
    this.retryAfterMs = init.retryAfterMs;
    this.provider = init.provider;
    this.details = init.details;
  }

  static fromHttpException(exception: HttpException): ProviderError {
    const status = exception.getStatus();
    const code = status >= 500 ? AIErrorCode.UPSTREAM_ERROR : AIErrorCode.INVALID_REQUEST;
    return new ProviderError({
      code,
      httpStatus: status,
      retryable: status >= 500,
      message: exception.message || 'Upstream error',
    });
  }

  static fromUnknown(exception: unknown): ProviderError {
    if (exception instanceof ProviderError) {
      return exception;
    }

    return new ProviderError({
      code: AIErrorCode.INTERNAL_ERROR,
      httpStatus: 500,
      retryable: false,
      message: exception instanceof Error ? exception.message : 'Internal error',
    });
  }
}
