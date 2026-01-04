import {
  BadGatewayException,
  Body,
  Controller,
  HttpException,
  Post,
  Req,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AIErrorCode,
  AIErrorResponseSchema,
  GenerateTextRequestSchema,
  type GenerateTextRequest,
  type GenerateTextResponse,
} from '@family-hub/schemas';
import type { Request } from 'express';
import {
  HttpClientError,
  HttpResponseError,
  NetworkError,
  TimeoutError,
} from '@family-hub/observability';
import { AiGatewayClient } from './ai-gateway.client';

type RequestWithId = Request & { requestId?: string };

@Controller('/v1/ai')
export class AiProxyController {
  constructor(private readonly client: AiGatewayClient) {}

  @Post('/generate-text')
  async generateText(
    @Body() body: GenerateTextRequest,
    @Req() req: RequestWithId,
  ): Promise<GenerateTextResponse> {
    const parsed = GenerateTextRequestSchema.safeParse(body);
    if (!parsed.success) {
      const field =
        parsed.error.issues[0]?.path.map((part) => String(part)).join('.') || 'request';
      throw this.toHttpError(req, {
        status: 400,
        code: AIErrorCode.INVALID_REQUEST,
        message: 'Invalid request.',
        retryable: false,
        details: { reason: 'schema_validation', field },
      });
    }

    try {
      return await this.client.generateText(parsed.data);
    } catch (error) {
      throw this.mapGatewayError(error, req);
    }
  }

  private mapGatewayError(error: unknown, req: RequestWithId): HttpException {
    if (error instanceof HttpResponseError) {
      return this.toHttpError(req, {
        status: error.status,
        code: error.aiErrorCode ?? AIErrorCode.UPSTREAM_ERROR,
        message: safeMessage(error.aiErrorCode ?? AIErrorCode.UPSTREAM_ERROR),
        retryable: error.retryable ?? false,
        retryAfterMs: error.retryAfterMs,
        details: { provider: 'ai-gateway' },
      });
    }

    if (error instanceof TimeoutError) {
      return this.toHttpError(req, {
        status: 504,
        code: AIErrorCode.TIMEOUT,
        message: safeMessage(AIErrorCode.TIMEOUT),
        retryable: true,
        details: { provider: 'ai-gateway' },
      });
    }

    if (error instanceof NetworkError) {
      return this.toHttpError(req, {
        status: 503,
        code: AIErrorCode.UPSTREAM_UNAVAILABLE,
        message: safeMessage(AIErrorCode.UPSTREAM_UNAVAILABLE),
        retryable: true,
        details: { provider: 'ai-gateway' },
      });
    }

    if (error instanceof HttpClientError) {
      return this.toHttpError(req, {
        status: 502,
        code: AIErrorCode.UPSTREAM_ERROR,
        message: safeMessage(AIErrorCode.UPSTREAM_ERROR),
        retryable: false,
        details: { provider: 'ai-gateway' },
      });
    }

    return new BadGatewayException('AI Gateway unavailable');
  }

  private toHttpError(
    req: RequestWithId,
    params: {
      status: number;
      code: AIErrorCode;
      message: string;
      retryable: boolean;
      retryAfterMs?: number;
      details?: Record<string, unknown>;
    },
  ): HttpException {
    const requestId =
      typeof req.requestId === 'string' && req.requestId.length > 0 ? req.requestId : randomUUID();

    const payload = {
      error: {
        id: requestId,
        code: params.code,
        message: params.message,
        httpStatus: params.status,
        retryable: params.retryable,
        retryAfterMs: params.retryAfterMs,
        provider: 'ai-gateway',
        details: params.details,
      },
    };

    const safePayload = AIErrorResponseSchema.safeParse(payload).success
      ? payload
      : {
          error: {
            id: requestId,
            code: AIErrorCode.INTERNAL_ERROR,
            message: 'Internal error',
            httpStatus: 500,
            retryable: false,
          },
        };

    return new HttpException(safePayload, params.status);
  }
}

function safeMessage(code: AIErrorCode): string {
  if (code === AIErrorCode.CONFIG_MISSING) return 'Missing configuration.';
  if (code === AIErrorCode.RATE_LIMITED) return 'Rate limited. Please retry later.';
  if (code === AIErrorCode.TIMEOUT) return 'Upstream timeout. Please retry later.';
  if (code === AIErrorCode.UPSTREAM_UNAVAILABLE) return 'Upstream unavailable. Please retry later.';
  if (code === AIErrorCode.UPSTREAM_ERROR) return 'Upstream error. Please retry later.';
  if (code === AIErrorCode.INVALID_REQUEST) return 'Invalid request.';
  return 'Internal error';
}
