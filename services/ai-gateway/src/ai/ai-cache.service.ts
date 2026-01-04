import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import type { GenerateTextRequest, GenerateTextResponse } from './ai.types';

@Injectable()
export class AiCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(AiCacheService.name);
  private readonly enabled = this.resolveEnabled();
  private readonly ttlSeconds = this.resolveTtlSeconds();
  private readonly redisUrl = this.resolveRedisUrl();
  private readonly client = this.enabled
    ? new Redis(this.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
    : null;

  async get(req: GenerateTextRequest): Promise<GenerateTextResponse | null> {
    if (!this.enabled || !this.client || this.ttlSeconds <= 0) {
      return null;
    }

    if (!(await this.ensureConnected())) {
      return null;
    }

    try {
      const cached = await this.client.get(this.keyFor(req));
      return cached ? (JSON.parse(cached) as GenerateTextResponse) : null;
    } catch (error) {
      this.logger.warn('AI cache get failed');
      return null;
    }
  }

  async set(req: GenerateTextRequest, res: GenerateTextResponse): Promise<void> {
    if (!this.enabled || !this.client || this.ttlSeconds <= 0) {
      return;
    }

    if (!(await this.ensureConnected())) {
      return;
    }

    try {
      await this.client.set(this.keyFor(req), JSON.stringify(res), 'EX', this.ttlSeconds);
    } catch (error) {
      this.logger.warn('AI cache set failed');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
    } catch (error) {
      this.client.disconnect();
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    if (this.client.status === 'ready' || this.client.status === 'connecting' || this.client.status === 'connect') {
      return true;
    }

    try {
      await this.client.connect();
      return this.client.status === 'ready';
    } catch (error) {
      this.logger.warn('AI cache redis unavailable');
      return false;
    }
  }

  private keyFor(req: GenerateTextRequest): string {
    const payload = {
      messages: req.messages,
      model: req.model ?? null,
      temperature: req.temperature ?? null,
      maxTokens: req.maxTokens ?? null,
    };
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return `ai-cache:v1:${hash}`;
  }

  private resolveEnabled(): boolean {
    const raw = (process.env.AI_CACHE_ENABLED ?? 'true').toLowerCase();
    return raw === 'true' || raw === '1' || raw === 'yes';
  }

  private resolveTtlSeconds(): number {
    const raw = process.env.AI_CACHE_TTL_SECONDS;
    const parsed = raw ? Number.parseInt(raw, 10) : 3600;
    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  }

  private resolveRedisUrl(): string {
    const raw = process.env.REDIS_URL;
    if (raw && raw.trim()) {
      return raw.trim();
    }
    const password = process.env.REDIS_PASSWORD;
    if (password && password.trim()) {
      return `redis://:${password.trim()}@redis:6379/0`;
    }
    return 'redis://redis:6379/0';
  }
}
