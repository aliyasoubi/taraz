import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { buildConfiguration } from './config/configuration';

async function bootstrap(): Promise<void> {
  const config = buildConfiguration();
  // Every "today" and every Jalali month boundary is taken on the practice's clock.
  process.env.TZ = config.timezone;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);
  configureApp(app);
  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: config.corsOrigin, credentials: true });
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
  new Logger('Bootstrap').log(
    `API listening on http://localhost:${config.port}/api`,
  );
}

void bootstrap();
