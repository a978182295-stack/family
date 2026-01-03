import { Injectable } from '@nestjs/common';
import { fetchWithRetry } from '@family-hub/observability';

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
}
