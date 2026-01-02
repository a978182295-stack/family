import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AIErrorCode, AIErrorResponseSchema } from '@family-hub/schemas';
import { ProviderError } from '../errors/provider-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req: any = ctx.getRequest();
    const res: any = ctx.getResponse();

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
        details: providerError.details,
      },
    };

    const safePayload = ensureSchema(payload, requestId);

    res.status(providerError.httpStatus).json(safePayload);
  }
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
