import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER } from './ai.constants';
import type { AIProvider } from './ai-provider.interface';
import type { AIProviderStatus, GenerateTextRequest, GenerateTextResponse } from './ai.types';

@Injectable()
export class AiService {
  constructor(@Inject(AI_PROVIDER) private readonly provider: AIProvider) {}

  async status(): Promise<AIProviderStatus> {
    return this.provider.status();
  }

  async generateText(req: GenerateTextRequest): Promise<GenerateTextResponse> {
    return this.provider.generateText(req);
  }
}
