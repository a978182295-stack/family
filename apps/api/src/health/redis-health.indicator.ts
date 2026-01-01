import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const redisUrl = process.env.REDIS_URL ?? 'redis://redis:6379/0';
    const client = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 2000 });

    try {
      await client.connect();
      const pong = await client.ping();
      const ok = pong === 'PONG';

      return this.getStatus(key, ok, { redisUrl });
    } catch (err: unknown) {
      return this.getStatus(key, false, {
        redisUrl,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      try {
        client.disconnect();
      } catch {
        // ignore
      }
    }
  }
}
