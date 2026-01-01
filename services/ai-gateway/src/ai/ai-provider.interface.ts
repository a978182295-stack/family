import type { AIProviderStatus, GenerateTextRequest, GenerateTextResponse } from './ai.types';

export interface AIProvider {
  status(): Promise<AIProviderStatus>;
  generateText(req: GenerateTextRequest): Promise<GenerateTextResponse>;
}
