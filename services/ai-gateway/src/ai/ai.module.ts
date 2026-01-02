import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai.constants';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { createAIProvider } from './provider.factory';
import { CloudAIProvider } from './providers/cloud.provider';
import { LocalAIProvider } from './providers/local.provider';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    CloudAIProvider,
    LocalAIProvider,
    {
      provide: AI_PROVIDER,
      useFactory: (cloud: CloudAIProvider, local: LocalAIProvider) => createAIProvider(cloud, local),
      inject: [CloudAIProvider, LocalAIProvider],
    },
  ],
  exports: [AiService],
})
export class AiModule {}
