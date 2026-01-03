import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthResponse } from '@family-hub/schemas';
import { ConfigHealthIndicator } from './config-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly configIndicator: ConfigHealthIndicator,
  ) {}

  @Get(['/health', '/healthz'])
  @HealthCheck()
  async check(): Promise<HealthResponse> {
    const result = await this.health.check([
      () => this.configIndicator.isHealthy('config'),
    ]);

    return {
      status: result.status,
      info: result.info,
      error: result.error,
      details: result.details,
    };
  }
}
