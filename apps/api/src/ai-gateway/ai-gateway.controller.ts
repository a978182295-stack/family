import { Controller, Get } from '@nestjs/common';
import { AiGatewayClient } from './ai-gateway.client';

@Controller('/internal/ai-gateway')
export class AiGatewayController {
  constructor(private readonly client: AiGatewayClient) {}

  @Get('/healthz')
  async proxyHealthz(): Promise<{ status: number; upstreamRequestId: string | null }> {
    const result = await this.client.fetchHealthz();

    return {
      status: result.status,
      upstreamRequestId: result.requestId,
    };
  }
}
