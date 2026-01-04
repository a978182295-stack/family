import { Injectable } from '@nestjs/common';
import { fetchWithRetry } from '@family-hub/observability';
import type { GenerateTextRequest, GenerateTextResponse } from '@family-hub/schemas';

@Injectable()
export class AiGatewayClient {
  private readonly baseUrl = process.env.AI_GATEWAY_URL ?? 'http://ai-gateway:3100';

  async fetchHealthz(): Promise<{ status: number; requestId: string | null }> {
    const url = new URL('/healthz', this.baseUrl).toString();
    const response = await fetchWithRetry(url, {
      targetService: 'ai-gateway',
      operation: 'ai-gateway.healthz',
      method: 'GET',
      retryProfile: 'sync',
      errorStrategy: 'ai',
    });

    return {
      status: response.status,
      requestId: response.headers.get('x-request-id'),
    };
  }

  async generateText(payload: GenerateTextRequest): Promise<GenerateTextResponse> {
    const url = new URL('/v1/ai/generate-text', this.baseUrl).toString();
    const response = await fetchWithRetry(url, {
      targetService: 'ai-gateway',
      operation: 'ai-gateway.generate-text',
      method: 'POST',
      retryProfile: 'sync',
      errorStrategy: 'ai',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return (await response.json()) as GenerateTextResponse;
  }
}
