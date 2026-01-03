import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AI Gateway (e2e)', () => {
  let app: INestApplication;

  const prev = {
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

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();

    process.env.AI_MODE = prev.AI_MODE;
    process.env.CLOUD_API_KEY = prev.CLOUD_API_KEY;
    process.env.LOCAL_LLM_ENDPOINT = prev.LOCAL_LLM_ENDPOINT;
  });

  it('GET /health returns 200', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('GET /healthz returns 200', async () => {
    await request(app.getHttpServer()).get('/healthz').expect(200);
  });

  it('echoes x-request-id when provided', async () => {
    const requestId = 'e2e-request-id';
    const res = await request(app.getHttpServer())
      .get('/healthz')
      .set('x-request-id', requestId)
      .expect(200);

    expect(res.headers['x-request-id']).toBe(requestId);
  });
});
