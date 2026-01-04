import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ProviderHealthCacheService } from './provider-health-cache.service';

@Injectable()
export class ProviderHealthIndicator extends HealthIndicator {
  constructor(private readonly cache: ProviderHealthCacheService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const snapshot = this.cache.getSnapshot() ?? (await this.cache.refresh());

    return this.getStatus(key, snapshot.ok, {
      provider: snapshot.provider?.meta ?? { mode: 'mock', name: 'unknown' },
      ready: Boolean(snapshot.provider?.ready),
      ping: snapshot.ping,
      checkedAt: snapshot.checkedAt,
    });
  }
}
