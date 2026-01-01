import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Client } from 'pg';

@Injectable()
export class PostgresHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return this.getStatus(key, false, { required: ['DATABASE_URL'] });
    }

    const client = new Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 2000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      return this.getStatus(key, true, { databaseUrl: this.redact(databaseUrl) });
    } catch (err: unknown) {
      return this.getStatus(key, false, {
        databaseUrl: this.redact(databaseUrl),
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      try {
        await client.end();
      } catch {
        // ignore
      }
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
