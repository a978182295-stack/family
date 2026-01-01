import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthResponse } from '@family-hub/schemas';
import { PostgresHealthIndicator } from './postgres-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly pg: PostgresHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get('/health')
  @HealthCheck()
  async check(): Promise<HealthResponse> {
    const result = await this.health.check([
      () => this.pg.isHealthy('postgres'),
      () => this.redis.isHealthy('redis'),
    ]);

    // 显式整形输出，确保字段集合严格对齐 HealthResponseSchema
    return {
      status: result.status,
      info: result.info,
      error: result.error,
      details: result.details,
    };
  }
}
