import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export type RequestIdSource = 'header' | 'generated' | 'unknown';

export type RequestContext = {
  requestId: string;
  requestIdSource: RequestIdSource;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function getRequestIdSource(): RequestIdSource | undefined {
  return storage.getStore()?.requestIdSource;
}

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  if (storage.getStore()) {
    return fn();
  }

  return storage.run(context, fn);
}

export function ensureRequestContext(): RequestContext {
  const existing = storage.getStore();
  if (existing) {
    return existing;
  }

  return { requestId: randomUUID(), requestIdSource: 'generated' };
}
