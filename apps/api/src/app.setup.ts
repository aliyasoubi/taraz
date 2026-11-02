import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

import { ValidationException } from './common/http-errors';

/**
 * How the API behaves — the `/api` prefix, cookies and request validation —
 * shared with the e2e tests so they see exactly what a real client does.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors) => ValidationException.from(errors),
    }),
  );
}
