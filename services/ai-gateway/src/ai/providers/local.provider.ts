import { Injectable } from '@nestjs/common';
import type { AIProvider, AIProviderStatus, GenerateTextRequest, GenerateTextResponse } from '../ai-provider.interface';
import type { ProviderMeta } from '../ai.types';

@Injectable()
export class LocalAIProvider implements AIProvider {
  private readonly meta: ProviderMeta = {
    mode: 'local',
    name: 'local-stub',
    version: '0.1.0',
  };

  async status(): Promise<AIProviderStatus> {
    const endpoint = process.env.LOCAL_LLM_ENDPOINT ?? null;
    return {
      meta: this.meta,
      ready: Boolean(endpoint),
      details: {
        localEndpoint: endpoint,
      },
    };
  }

  async generateText(req: GenerateTextRequest): Promise<GenerateTextResponse> {
    // 占位：后续接 Ollama/vLLM 等本地模型推理服务
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return {
      content: `[local-stub] echo: ${lastUser}`.trim(),
      raw: { provider: this.meta, stub: true },
    };
  }
}
