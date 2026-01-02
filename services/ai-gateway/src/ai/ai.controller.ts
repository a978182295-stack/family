import { Body, Controller, Get, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import type { GenerateTextRequest, GenerateTextResponse, AIProviderStatus } from './ai.types';

@Controller('/v1/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('/status')
  async status(): Promise<AIProviderStatus> {
    return this.ai.status();
  }

  @Post('/generate-text')
  async generateText(@Body() body: GenerateTextRequest): Promise<GenerateTextResponse> {
    return this.ai.generateText(body);
  }
}
