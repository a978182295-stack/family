import { randomUUID } from 'crypto';
import type { RequestIdSource } from './request-context';

export type RequestIdResult = {
  requestId: string;
  requestIdSource: RequestIdSource;
};

export function extractRequestId(headerValue: unknown): RequestIdResult {
  const trimmed = typeof headerValue === 'string' ? headerValue.trim() : '';
  if (trimmed.length > 0) {
    return { requestId: trimmed, requestIdSource: 'header' };
  }

  return { requestId: randomUUID(), requestIdSource: 'generated' };
}
