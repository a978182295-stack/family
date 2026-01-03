import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AIErrorCode, AIErrorResponseSchema } from '@family-hub/schemas';
import type { Request, Response } from 'express';
import { ProviderError } from '../errors/provider-error';

type RequestWithId = Request & { requestId?: string };

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithId>();
    const res = ctx.getResponse<Response>();

    // 主路径：由 RequestIdMiddleware 写入
    const requestId = (typeof req?.requestId === 'string' && req.requestId.length > 0)
      ? req.requestId
      : randomUUID();

    // middleware 已设置 header；此处再兜底一次，避免漏设
    res.setHeader('x-request-id', requestId);

    const providerError =
      exception instanceof ProviderError
        ? exception
        : exception instanceof HttpException
          ? ProviderError.fromHttpException(exception)
          : ProviderError.fromUnknown(exception);

    const payload = {
      error: {
        id: requestId,
        code: providerError.code,
        message: safeMessage(providerError),
        httpStatus: providerError.httpStatus,
        retryable: providerError.retryable,
        retryAfterMs: providerError.retryAfterMs,
        provider: providerError.provider,
        details: sanitizeDetails(providerError.details),
      },
    };

    const safePayload = ensureSchema(payload, requestId);

    res.status(providerError.httpStatus).json(safePayload);
  }
}

const DETAILS_ALLOWED_KEYS = new Set(['reason', 'status', 'type', 'hint', 'field', 'providerCode']);
const DETAILS_MAX_STRING = 200;
const DETAILS_MAX_KEYS = 10;

function sanitizeDetails(details: unknown): Record<string, unknown> | undefined {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return undefined;
  }

  if (!DETAILS_ALLOWED_KEYS.size) {
    return undefined;
  }

  const entries = Object.entries(details as Record<string, unknown>).filter(([key]) =>
    DETAILS_ALLOWED_KEYS.has(key),
  );

  if (entries.length === 0) {
    return undefined;
  }

  const sanitized: Record<string, string | number | boolean | null> = {};
  let truncated = false;
  let count = 0;

  for (const [key, value] of entries) {
    if (count >= DETAILS_MAX_KEYS) {
      truncated = true;
      break;
    }

    if (typeof value === 'string') {
      sanitized[key] =
        value.length > DETAILS_MAX_STRING ? `${value.slice(0, DETAILS_MAX_STRING)}...` : value;
      if (value.length > DETAILS_MAX_STRING) {
        truncated = true;
      }
      count += 1;
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      sanitized[key] = value;
      count += 1;
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return undefined;
  }

  if (truncated) {
    sanitized.truncated = true;
  }

  return sanitized;
}

function ensureSchema(payload: unknown, requestId: string) {
  try {
    return AIErrorResponseSchema.parse(payload);
  } catch {
    return {
      error: {
        id: requestId,
        code: AIErrorCode.INTERNAL_ERROR,
        message: 'Internal error',
        httpStatus: 500,
        retryable: false,
      },
    };
  }
}

function safeMessage(err: ProviderError): string {
  if (err.code === 'CONFIG_MISSING') return err.message;
  if (err.code === 'RATE_LIMITED') return 'Rate limited. Please retry later.';
  if (err.code === 'TIMEOUT') return 'Upstream timeout. Please retry later.';
  if (err.code === 'UPSTREAM_UNAVAILABLE') return 'Upstream unavailable. Please retry later.';
  if (err.code === 'UPSTREAM_ERROR') return 'Upstream error. Please retry later.';
  if (err.code === 'INVALID_REQUEST') return 'Invalid request.';
  return err.message || 'Internal error';
}
