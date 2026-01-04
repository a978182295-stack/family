import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER } from './ai.constants';
import { AiCacheService } from './ai-cache.service';
import type { AIProvider } from './ai-provider.interface';
import type { AIProviderStatus, GenerateTextRequest, GenerateTextResponse } from './ai.types';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
    private readonly cache: AiCacheService,
  ) {}

  async status(): Promise<AIProviderStatus> {
    return this.provider.status();
  }

  async generateText(req: GenerateTextRequest): Promise<GenerateTextResponse> {
    const cached = await this.cache.get(req);
    if (cached) {
      return cached;
    }

    const response = await this.provider.generateText(req);
    await this.cache.set(req, response);
    return response;
  }
}
