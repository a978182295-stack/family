import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { initLogger, PinoNestLogger } from '@family-hub/observability';
import { AppModule } from './app.module';

async function bootstrap() {
  const pinoLogger = initLogger('worker');
  const nestLogger = new PinoNestLogger(pinoLogger);
  const app = await NestFactory.create(AppModule, { logger: nestLogger });

  app.enableShutdownHooks();
  Logger.overrideLogger(nestLogger);

  const port = Number.parseInt(process.env.PORT ?? '3200', 10);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
