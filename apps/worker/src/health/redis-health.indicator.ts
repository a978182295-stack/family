import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator implements OnModuleDestroy {
  private readonly redisUrl = this.resolveRedisUrl();
  private readonly client = new Redis(this.redisUrl, {
    lazyConnect: true,
    connectTimeout: 2000,
  });

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }

      const pong = await this.client.ping();
      const ok = pong === 'PONG';

      return this.getStatus(key, ok, { redisUrl: this.redact(this.redisUrl) });
    } catch (err: unknown) {
      return this.getStatus(key, false, {
        redisUrl: this.redact(this.redisUrl),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      // ignore
    }
  }

  private resolveRedisUrl(): string {
    const raw = process.env.REDIS_URL;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }

    const password = process.env.REDIS_PASSWORD;
    if (typeof password === 'string' && password.trim().length > 0) {
      return `redis://:${password.trim()}@redis:6379/0`;
    }

    return 'redis://redis:6379/0';
  }

  private redact(url: string): string {
    try {
      const u = new URL(url);
      if (u.password) u.password = '***';
      return u.toString();
    } catch {
      return 'redacted';
    }
  }
}
