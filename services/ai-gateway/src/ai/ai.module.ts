import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai.constants';
import { AiController } from './ai.controller';
import { AiCacheService } from './ai-cache.service';
import { AiService } from './ai.service';
import { createAIProvider } from './provider.factory';
import { CloudAIProvider } from './providers/cloud.provider';
import { LocalAIProvider } from './providers/local.provider';
import { MockAIProvider } from './providers/mock.provider';

@Module({
  controllers: [AiController],
  providers: [
    AiCacheService,
    AiService,
    CloudAIProvider,
    LocalAIProvider,
    MockAIProvider,
    {
      provide: AI_PROVIDER,
      useFactory: (cloud: CloudAIProvider, local: LocalAIProvider, mock: MockAIProvider) =>
        createAIProvider(cloud, local, mock),
      inject: [CloudAIProvider, LocalAIProvider, MockAIProvider],
    },
  ],
  exports: [AiService],
})
export class AiModule {}
