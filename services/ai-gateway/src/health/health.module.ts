import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ConfigHealthIndicator } from './config-health.indicator';
import { ProviderHealthCacheService } from './provider-health-cache.service';
import { ProviderHealthIndicator } from './provider-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [ConfigHealthIndicator, ProviderHealthCacheService, ProviderHealthIndicator],
})
export class HealthModule {}
