import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ConfigHealthIndicator } from './config-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly configIndicator: ConfigHealthIndicator,
  ) {}

  @Get('/health')
  @HealthCheck()
  async check() {
    const result = await this.health.check([() => this.configIndicator.isHealthy('config')]);

    // 显式整形输出，确保字段集合对齐 HealthResponseSchema
    return {
      status: result.status,
      info: result.info,
      error: result.error,
      details: result.details,
    };
  }
}
