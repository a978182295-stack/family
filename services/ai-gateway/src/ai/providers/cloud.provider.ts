import { Injectable } from '@nestjs/common';
import type { AIProvider, AIProviderStatus, GenerateTextRequest, GenerateTextResponse } from '../ai-provider.interface';
import type { ProviderMeta } from '../ai.types';

@Injectable()
export class CloudAIProvider implements AIProvider {
  private readonly meta: ProviderMeta = {
    mode: 'cloud',
    name: 'cloud-stub',
    version: '0.1.0',
  };

  async status(): Promise<AIProviderStatus> {
    const hasKey = Boolean(process.env.CLOUD_API_KEY);
    return {
      meta: this.meta,
      ready: hasKey,
      details: {
        hasCloudApiKey: hasKey,
        cloudTextModel: process.env.CLOUD_TEXT_MODEL ?? null,
        cloudVisionModel: process.env.CLOUD_VISION_MODEL ?? null,
      },
    };
  }

  async generateText(req: GenerateTextRequest): Promise<GenerateTextResponse> {
    // 占位：后续接 OpenAI/其他云厂商 SDK（严格禁止业务方直连）
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return {
      content: `[cloud-stub] echo: ${lastUser}`.trim(),
      raw: { provider: this.meta, stub: true },
    };
  }
}
