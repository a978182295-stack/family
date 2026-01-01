import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthResponse } from '@family-hub/schemas';
import { RedisHealthIndicator } from './redis-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  @Get('/health')
  @HealthCheck()
  async check(): Promise<HealthResponse> {
    const result = await this.health.check([() => this.redisIndicator.isHealthy('redis')]);

    return {
      status: result.status,
      info: result.info,
      error: result.error,
      details: result.details,
    };
  }
}
