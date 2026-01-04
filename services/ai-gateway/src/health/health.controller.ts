import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthResponse } from '@family-hub/schemas';
import { ConfigHealthIndicator } from './config-health.indicator';
import { ProviderHealthIndicator } from './provider-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly configIndicator: ConfigHealthIndicator,
    private readonly providerIndicator: ProviderHealthIndicator,
  ) {}

  @Get(['/health', '/healthz'])
  @HealthCheck()
  async check(): Promise<HealthResponse> {
    const result = await this.health.check([
      () => this.configIndicator.isHealthy('config'),
      () => this.providerIndicator.isHealthy('provider'),
    ]);

    return {
      status: result.status === 'ok' ? 'ok' : 'error',
      info: result.info,
      error: result.error,
      details: result.details,
    };
  }
}
