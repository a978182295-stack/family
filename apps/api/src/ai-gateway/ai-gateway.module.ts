import { Module } from '@nestjs/common';
import { AiGatewayClient } from './ai-gateway.client';
import { AiGatewayController } from './ai-gateway.controller';

@Module({
  controllers: [AiGatewayController],
  providers: [AiGatewayClient],
})
export class AiGatewayModule {}
