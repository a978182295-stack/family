import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Pool } from 'pg';

@Injectable()
export class PostgresHealthIndicator extends HealthIndicator implements OnModuleDestroy {
  private readonly databaseUrl = process.env.DATABASE_URL;
  private readonly pool =
    this.databaseUrl
      ? new Pool({
          connectionString: this.databaseUrl,
          connectionTimeoutMillis: 2000,
          max: 1,
        })
      : null;

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.databaseUrl || !this.pool) {
      return this.getStatus(key, false, { required: ['DATABASE_URL'] });
    }

    try {
      await this.pool.query('SELECT 1');
      return this.getStatus(key, true, { databaseUrl: this.redact(this.databaseUrl) });
    } catch (err: unknown) {
      return this.getStatus(key, false, {
        databaseUrl: this.redact(this.databaseUrl),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.end();
    } catch {
      // ignore
    }
  }

  private redact(url: string): string {
    // 避免把密码打到 health 输出里
    try {
      const u = new URL(url);
      if (u.password) u.password = '***';
      return u.toString();
    } catch {
      return 'redacted';
    }
  }
}
