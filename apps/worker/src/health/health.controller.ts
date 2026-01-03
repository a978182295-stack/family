import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  @Get(['/health', '/healthz'])
  @HealthCheck()
  async check() {
    // Terminus 原生输出形如 { status, info, error, details }
    const result = await this.health.check([() => this.redisIndicator.isHealthy('redis')]);

    // 显式整形输出，确保字段集合对齐 HealthResponseSchema
    return {
      status: result.status,
      info: result.info,
      error: result.error,
      details: result.details,
    };
  }
}
