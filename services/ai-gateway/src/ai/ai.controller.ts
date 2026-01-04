import { Body, Controller, Get, Post } from '@nestjs/common';
import { AIErrorCode, GenerateTextRequestSchema } from '@family-hub/schemas';
import { ProviderError } from '../common/errors/provider-error';
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
    const parsed = GenerateTextRequestSchema.safeParse(body);
    if (!parsed.success) {
      const field =
        parsed.error.issues[0]?.path.map((part) => String(part)).join('.') || 'request';
      throw new ProviderError({
        code: AIErrorCode.INVALID_REQUEST,
        httpStatus: 400,
        retryable: false,
        message: 'Invalid request.',
        details: { reason: 'schema_validation', field },
      });
    }

    return this.ai.generateText(parsed.data);
  }
}
