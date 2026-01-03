import { setTimeout as delay } from 'timers/promises';
import { AIErrorCode, AIErrorResponseSchema } from '@family-hub/schemas';
import { getLogger } from './logger';
import { ensureRequestContext, runWithRequestContext } from './request-context';

export class HttpClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HttpClientError';
  }
}

export class TimeoutError extends HttpClientError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends HttpClientError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class HttpResponseError extends HttpClientError {
  readonly status: number;
  readonly aiErrorCode?: AIErrorCode;
  readonly retryAfterMs?: number;
  readonly retryable?: boolean;

  constructor(
    status: number,
    message: string,
    aiErrorCode?: AIErrorCode,
    retryAfterMs?: number,
    retryable?: boolean,
  ) {
    super(message);
    this.name = 'HttpResponseError';
    this.status = status;
    this.aiErrorCode = aiErrorCode;
    this.retryAfterMs = retryAfterMs;
    this.retryable = retryable;
  }
}

export type HttpRequestOptions = Omit<RequestInit, 'signal'> & {
  targetService: string;
  operation: string;
  timeoutMs?: number;
  maxRetries?: number;
  allowRetry?: boolean;
  retryProfile?: 'sync' | 'worker';
  errorStrategy?: 'ai' | 'http';
};

type AttemptLog = {
  targetService: string;
  method: string;
  urlHost: string | null;
  urlPath: string | null;
  operation: string;
  attempt: number;
  maxAttempts: number;
  timeoutMs: number;
  latencyMs: number;
  status?: number;
  errorClass?: string;
  aiErrorCode?: AIErrorCode;
  retryAfterMs?: number;
  retry: boolean;
  backoffMs?: number;
  delayMs?: number;
  requestIdSource?: string;
};

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_RETRIES = 1;

export async function fetchWithRetry(url: string, options: HttpRequestOptions): Promise<Response> {
  const requestContext = ensureRequestContext();

  return runWithRequestContext(requestContext, async () => {
    const logger = getLogger();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const maxAttempts = maxRetries + 1;
    const retryProfile = options.retryProfile ?? 'sync';
    const errorStrategy = options.errorStrategy ?? 'ai';
    const method = (options.method ?? 'GET').toUpperCase();
    const allowRetryMethod =
      ['GET', 'HEAD', 'PUT', 'DELETE'].includes(method) ||
      (['POST', 'PATCH'].includes(method) && options.allowRetry === true);
    const { urlHost, urlPath } = parseUrl(url);

    const headers = new Headers(options.headers);
    headers.set('x-request-id', requestContext.requestId);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          method,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const latencyMs = Date.now() - startedAt;

        if (!response.ok) {
          const parsed = await parseErrorResponse(response, errorStrategy);
          const error = new HttpResponseError(
            response.status,
            `HTTP ${response.status} from ${options.targetService}`,
            parsed.aiErrorCode,
            parsed.retryAfterMs,
            parsed.retryable,
          );
          const decision = decideRetry({
            attempt,
            maxAttempts,
            allowRetryMethod,
            retryProfile,
            aiErrorCode: parsed.aiErrorCode,
            retryable: parsed.retryable,
            retryAfterMs: parsed.retryAfterMs,
          });

          logAttempt(logger, {
            targetService: options.targetService,
            method,
            urlHost,
            urlPath,
            operation: options.operation,
            attempt,
            maxAttempts,
            timeoutMs,
            latencyMs,
            status: response.status,
            errorClass: error.name,
            aiErrorCode: parsed.aiErrorCode,
            retryAfterMs: parsed.retryAfterMs,
            retry: decision.shouldRetry,
            backoffMs: decision.backoffMs,
            delayMs: decision.delayMs,
            requestIdSource: requestContext.requestIdSource,
          });

          if (decision.shouldRetry) {
            if (decision.delayMs) {
              await delay(decision.delayMs);
            }
            continue;
          }

          throw error;
        }

        logAttempt(logger, {
          targetService: options.targetService,
          method,
          urlHost,
          urlPath,
          operation: options.operation,
          attempt,
          maxAttempts,
          timeoutMs,
          latencyMs,
          status: response.status,
          retry: false,
          requestIdSource: requestContext.requestIdSource,
        });

        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startedAt;
        const error = normalizeError(err, timeoutMs, options.targetService);
        const aiErrorCode = deriveAiErrorCodeFromError(error);
        const retryable = isRetryableCode(aiErrorCode);
        const decision = decideRetry({
          attempt,
          maxAttempts,
          allowRetryMethod,
          retryProfile,
          aiErrorCode,
          retryable,
        });

        logAttempt(logger, {
          targetService: options.targetService,
          method,
          urlHost,
          urlPath,
          operation: options.operation,
          attempt,
          maxAttempts,
          timeoutMs,
          latencyMs,
          errorClass: error.name,
          aiErrorCode,
          retry: decision.shouldRetry,
          backoffMs: decision.backoffMs,
          delayMs: decision.delayMs,
          requestIdSource: requestContext.requestIdSource,
        });

        if (decision.shouldRetry) {
          if (decision.delayMs) {
            await delay(decision.delayMs);
          }
          continue;
        }

        throw error;
      }
    }

    throw new HttpClientError(`Unexpected retry loop exit for ${options.targetService}`);
  });
}

function parseUrl(rawUrl: string): { urlHost: string | null; urlPath: string | null } {
  try {
    const parsed = new URL(rawUrl);
    return { urlHost: parsed.host, urlPath: parsed.pathname };
  } catch {
    const trimmed = rawUrl.split('?')[0] ?? rawUrl;
    return { urlHost: null, urlPath: trimmed };
  }
}

function normalizeError(
  err: unknown,
  timeoutMs: number,
  targetService: string,
): HttpClientError {
  if (err instanceof HttpClientError) {
    return err;
  }

  if (err instanceof Error && err.name === 'AbortError') {
    return new TimeoutError(`Timeout after ${timeoutMs}ms calling ${targetService}`);
  }

  if (err instanceof Error) {
    return new NetworkError(err.message);
  }

  return new NetworkError(`Unknown network error calling ${targetService}`);
}

async function parseErrorResponse(
  response: Response,
  strategy: 'ai' | 'http',
): Promise<{
  aiErrorCode: AIErrorCode;
  retryable: boolean;
  retryAfterMs?: number;
}> {
  const text = await response.clone().text();
  const parsed = tryParseAiError(text);

  if (parsed) {
    return {
      aiErrorCode: parsed.code,
      retryable: parsed.retryable,
      retryAfterMs: parsed.retryAfterMs,
    };
  }

  if (strategy === 'ai') {
    return {
      aiErrorCode: AIErrorCode.INVALID_UPSTREAM_RESPONSE,
      retryable: true,
    };
  }

  return {
    aiErrorCode: mapStatusToAiErrorCode(response.status),
    retryable: isRetryableCode(mapStatusToAiErrorCode(response.status)),
    retryAfterMs: parseRetryAfterMs(response),
  };
}

function tryParseAiError(text: string): {
  code: AIErrorCode;
  retryable: boolean;
  retryAfterMs?: number;
} | null {
  if (!text) {
    return null;
  }

  try {
    const parsed = AIErrorResponseSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return null;
    }

    return {
      code: parsed.data.error.code,
      retryable: parsed.data.error.retryable,
      retryAfterMs: parsed.data.error.retryAfterMs,
    };
  } catch {
    return null;
  }
}

function parseRetryAfterMs(response: Response): number | undefined {
  const header = response.headers.get('retry-after');
  if (!header) {
    return undefined;
  }

  const seconds = Number.parseInt(header, 10);
  if (Number.isFinite(seconds)) {
    return seconds * 1000;
  }

  const dateValue = Date.parse(header);
  if (!Number.isNaN(dateValue)) {
    const diff = dateValue - Date.now();
    return diff > 0 ? diff : undefined;
  }

  return undefined;
}

function mapStatusToAiErrorCode(status: number): AIErrorCode {
  if (status === 429) return AIErrorCode.RATE_LIMITED;
  if (status === 408) return AIErrorCode.TIMEOUT;
  if (status === 503) return AIErrorCode.UPSTREAM_UNAVAILABLE;
  if (status >= 500) return AIErrorCode.UPSTREAM_ERROR;
  if (status >= 400) return AIErrorCode.INVALID_REQUEST;
  return AIErrorCode.UNKNOWN;
}

function deriveAiErrorCodeFromError(error: HttpClientError): AIErrorCode {
  if (error instanceof TimeoutError) return AIErrorCode.TIMEOUT;
  if (error instanceof NetworkError) return AIErrorCode.UPSTREAM_UNAVAILABLE;
  if (error instanceof HttpResponseError && error.aiErrorCode) return error.aiErrorCode;
  return AIErrorCode.UNKNOWN;
}

function isRetryableCode(code: AIErrorCode): boolean {
  switch (code) {
    case AIErrorCode.RATE_LIMITED:
    case AIErrorCode.INVALID_UPSTREAM_RESPONSE:
    case AIErrorCode.TIMEOUT:
    case AIErrorCode.UPSTREAM_UNAVAILABLE:
    case AIErrorCode.UPSTREAM_ERROR:
      return true;
    default:
      return false;
  }
}

function decideRetry(params: {
  attempt: number;
  maxAttempts: number;
  allowRetryMethod: boolean;
  retryProfile: 'sync' | 'worker';
  aiErrorCode: AIErrorCode;
  retryable?: boolean;
  retryAfterMs?: number;
}): { shouldRetry: boolean; backoffMs?: number; delayMs?: number } {
  const {
    attempt,
    maxAttempts,
    allowRetryMethod,
    retryProfile,
    aiErrorCode,
    retryable,
    retryAfterMs,
  } = params;
  const canRetry = attempt < maxAttempts && allowRetryMethod && (retryable ?? isRetryableCode(aiErrorCode));

  if (!canRetry) {
    return { shouldRetry: false };
  }

  if (retryProfile === 'sync') {
    if (aiErrorCode === AIErrorCode.RATE_LIMITED) {
      return { shouldRetry: false };
    }

    if (
      aiErrorCode !== AIErrorCode.INVALID_UPSTREAM_RESPONSE &&
      aiErrorCode !== AIErrorCode.TIMEOUT &&
      aiErrorCode !== AIErrorCode.UPSTREAM_UNAVAILABLE &&
      aiErrorCode !== AIErrorCode.UPSTREAM_ERROR
    ) {
      return { shouldRetry: false };
    }

    const backoffMs = jitterRangeMs(300, 800);
    const delayMs = retryAfterMs ? Math.max(backoffMs, retryAfterMs) : backoffMs;
    return { shouldRetry: true, backoffMs, delayMs };
  }

  const baseDelayMs = exponentialBackoffMs(attempt, 1000, 0.2);
  const delayMs = retryAfterMs ? Math.max(baseDelayMs, retryAfterMs) : baseDelayMs;
  return { shouldRetry: true, backoffMs: baseDelayMs, delayMs };
}

function exponentialBackoffMs(attempt: number, baseDelayMs: number, jitterRatio: number): number {
  const raw = baseDelayMs * 2 ** (attempt - 1);
  return applyJitter(raw, jitterRatio);
}

function applyJitter(value: number, jitterRatio: number): number {
  const jitter = value * jitterRatio;
  const min = Math.max(0, value - jitter);
  const max = value + jitter;
  return Math.floor(min + Math.random() * (max - min));
}

function jitterRangeMs(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function logAttempt(logger: ReturnType<typeof getLogger>, payload: AttemptLog): void {
  if (payload.errorClass && payload.retry) {
    logger.warn(payload, 'Outbound request retry scheduled');
    return;
  }

  if (payload.errorClass) {
    logger.error(payload, 'Outbound request failed');
    return;
  }

  logger.info(payload, 'Outbound request succeeded');
}
