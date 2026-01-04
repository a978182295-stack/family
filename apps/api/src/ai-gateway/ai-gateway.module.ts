import { Module } from '@nestjs/common';
import { AiGatewayClient } from './ai-gateway.client';
import { AiGatewayController } from './ai-gateway.controller';
import { AiProxyController } from './ai-proxy.controller';

@Module({
  controllers: [AiGatewayController, AiProxyController],
  providers: [AiGatewayClient],
})
export class AiGatewayModule {}
