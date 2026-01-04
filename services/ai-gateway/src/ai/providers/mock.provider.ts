import { Injectable } from '@nestjs/common';
import type { AIProvider } from '../ai-provider.interface';
import type { AIProviderStatus, GenerateTextRequest, GenerateTextResponse, ProviderMeta } from '../ai.types';

@Injectable()
export class MockAIProvider implements AIProvider {
  private readonly meta: ProviderMeta = {
    mode: 'mock',
    name: 'mock-provider',
    version: '0.1.0',
  };

  async status(): Promise<AIProviderStatus> {
    return {
      meta: this.meta,
      ready: true,
      details: {
        mock: true,
      },
    };
  }

  async generateText(req: GenerateTextRequest): Promise<GenerateTextResponse> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return {
      content: [
        '【Mock AI】已在本地离线模式运行。',
        `你刚刚提问：${lastUser || '（空）'}`,
        '示例输出：',
        '1) 菜谱分析：建议 3 份高蛋白早餐。',
        '2) 知识库查询：共匹配 2 条家庭笔记。',
        '3) 旅行计划：推荐 2 天游玩路线。',
      ].join('\n'),
      raw: { provider: this.meta, stub: true },
      usage: { promptTokens: 18, completionTokens: 42 },
    };
  }
}
