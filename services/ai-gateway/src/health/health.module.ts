import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ConfigHealthIndicator } from './config-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [ConfigHealthIndicator],
})
export class HealthModule {}
