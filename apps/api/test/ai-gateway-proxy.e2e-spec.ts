import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule as ApiAppModule } from '../src/app.module';
import { AppModule as AiGatewayAppModule } from '../../services/ai-gateway/src/app.module';

describe('API -> AI Gateway (e2e)', () => {
  let apiApp: INestApplication;
  let aiGatewayApp: INestApplication;

  const prev = {
    AI_GATEWAY_URL: process.env.AI_GATEWAY_URL,
    AI_MODE: process.env.AI_MODE,
    CLOUD_API_KEY: process.env.CLOUD_API_KEY,
    LOCAL_LLM_ENDPOINT: process.env.LOCAL_LLM_ENDPOINT,
  };

  beforeAll(async () => {
    process.env.AI_MODE = process.env.AI_MODE ?? 'cloud';

    if (process.env.AI_MODE === 'cloud') {
      process.env.CLOUD_API_KEY = process.env.CLOUD_API_KEY ?? 'test-key';
    } else {
      process.env.LOCAL_LLM_ENDPOINT =
        process.env.LOCAL_LLM_ENDPOINT ?? 'http://localhost:11434';
    }

    const aiModuleRef = await Test.createTestingModule({
      imports: [AiGatewayAppModule],
    }).compile();

    aiGatewayApp = aiModuleRef.createNestApplication();
    await aiGatewayApp.init();
    await aiGatewayApp.listen(0);

    process.env.AI_GATEWAY_URL = await aiGatewayApp.getUrl();

    const apiModuleRef = await Test.createTestingModule({
      imports: [ApiAppModule],
    }).compile();

    apiApp = apiModuleRef.createNestApplication();
    await apiApp.init();
  });

  afterAll(async () => {
    await apiApp.close();
    await aiGatewayApp.close();

    process.env.AI_GATEWAY_URL = prev.AI_GATEWAY_URL;
    process.env.AI_MODE = prev.AI_MODE;
    process.env.CLOUD_API_KEY = prev.CLOUD_API_KEY;
    process.env.LOCAL_LLM_ENDPOINT = prev.LOCAL_LLM_ENDPOINT;
  });

  it('propagates x-request-id from API to AI Gateway', async () => {
    const requestId = 'TEST_ID';
    const res = await request(apiApp.getHttpServer())
      .get('/internal/ai-gateway/healthz')
      .set('x-request-id', requestId)
      .expect(200);

    expect(res.headers['x-request-id']).toBe(requestId);
    expect(res.body.upstreamRequestId).toBe(requestId);
  });
});
