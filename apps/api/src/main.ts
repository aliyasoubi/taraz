import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { join } from 'node:path';

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
  if (config.webDist) serveWeb(app, config.webDist);
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
  new Logger('Bootstrap').log(
    `API listening on http://localhost:${config.port}/api`,
  );
}

/**
 * In production the API also serves the built web app, so both share one
 * origin: the session cookie stays same-site and no CORS is needed. Hashed
 * bundles are cached for good; `index.html` never is, so a deploy shows at
 * once. Any other path outside `/api` is one of the app's routes.
 */
function serveWeb(app: NestExpressApplication, dir: string): void {
  const index = join(dir, 'index.html');
  app.useStaticAssets(dir, {
    index: false,
    setHeaders: (res: Response, path: string) => {
      res.setHeader(
        'Cache-Control',
        /-[A-Za-z0-9]{8}\.(js|css|woff2)$/.test(path)
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      );
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
}

void bootstrap();
