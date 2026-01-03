import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthResponseSchema } from '@family-hub/schemas';
import { AppModule } from '../src/app.module';

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health -> HealthResponse', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(() => HealthResponseSchema.parse(res.body)).not.toThrow();
  });

  it('GET /healthz -> HealthResponse', async () => {
    const res = await request(app.getHttpServer()).get('/healthz').expect(200);

    expect(() => HealthResponseSchema.parse(res.body)).not.toThrow();
  });
});
