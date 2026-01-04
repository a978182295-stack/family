import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AI_PROVIDER } from '../ai/ai.constants';
import type { AIProvider } from '../ai/ai-provider.interface';
import type { AIProviderStatus } from '../ai/ai.types';

type PingSnapshot = {
  enabled: boolean;
  url: string | null;
  ok: boolean | null;
  status: number | null;
  error: string | null;
  timeoutMs: number;
};

export type ProviderHealthSnapshot = {
  ok: boolean;
  provider: AIProviderStatus | null;
  ping: PingSnapshot;
  checkedAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
};

@Injectable()
export class ProviderHealthCacheService implements OnModuleInit, OnModuleDestroy {
  private snapshot: ProviderHealthSnapshot | null = null;
  private timer: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private lastError: string | null = null;

  constructor(@Inject(AI_PROVIDER) private readonly provider: AIProvider) {}

  async onModuleInit(): Promise<void> {
    await this.refresh();
    const intervalMs = this.resolveIntervalMs();
    this.timer = setInterval(() => {
      void this.refresh();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getSnapshot(): ProviderHealthSnapshot | null {
    return this.snapshot;
  }

  async refresh(): Promise<ProviderHealthSnapshot> {
    const pingUrl = process.env.AI_PROVIDER_PING_URL ?? null;
    const pingTimeoutMs = this.resolvePingTimeoutMs();

    let providerStatus: AIProviderStatus | null = null;
    let providerError: string | null = null;

    try {
      providerStatus = await this.provider.status();
    } catch (error) {
      providerError = error instanceof Error ? error.message : 'unknown error';
    }

    let pingOk = true;
    let pingStatus: number | null = null;
    let pingError: string | null = null;

    if (pingUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), pingTimeoutMs);
      try {
        const response = await fetch(pingUrl, { method: 'GET', signal: controller.signal });
        pingStatus = response.status;
        pingOk = response.ok;
      } catch (error) {
        pingOk = false;
        pingError = error instanceof Error ? error.message : 'unknown error';
      } finally {
        clearTimeout(timeout);
      }
    }

    const ready = Boolean(providerStatus?.ready);
    const ok = ready && !providerError && (!pingUrl || pingOk);

    const errorSummary = providerError ?? pingError;
    if (ok) {
      this.consecutiveFailures = 0;
      this.lastError = null;
    } else {
      this.consecutiveFailures += 1;
      if (errorSummary) {
        this.lastError = errorSummary;
      }
    }

    const nextSnapshot: ProviderHealthSnapshot = {
      ok,
      provider: providerStatus,
      ping: {
        enabled: Boolean(pingUrl),
        url: pingUrl,
        ok: pingUrl ? pingOk : null,
        status: pingStatus,
        error: pingError,
        timeoutMs: pingTimeoutMs,
      },
      checkedAt: new Date().toISOString(),
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError,
    };

    if (providerError) {
      nextSnapshot.ping = {
        ...nextSnapshot.ping,
        error: nextSnapshot.ping.error ?? providerError,
      };
    }

    this.snapshot = nextSnapshot;
    return nextSnapshot;
  }

  private resolveIntervalMs(): number {
    const raw = process.env.AI_PROVIDER_PING_INTERVAL_MS;
    const parsed = raw ? Number.parseInt(raw, 10) : 30000;
    if (Number.isNaN(parsed) || parsed <= 0) {
      return 30000;
    }
    return parsed;
  }

  private resolvePingTimeoutMs(): number {
    const raw = process.env.AI_PROVIDER_PING_TIMEOUT_MS;
    const parsed = raw ? Number.parseInt(raw, 10) : 2000;
    if (Number.isNaN(parsed) || parsed <= 0) {
      return 2000;
    }
    return parsed;
  }
}
