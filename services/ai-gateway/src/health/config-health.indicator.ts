import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class ConfigHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const mode = (process.env.AI_MODE ?? 'cloud').toLowerCase();
    const ok = mode === 'cloud' || mode === 'local';

    return this.getStatus(key, ok, { mode });
  }
}
