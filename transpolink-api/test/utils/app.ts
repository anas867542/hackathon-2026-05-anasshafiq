import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json, urlencoded } from 'express';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

/**
 * Builds a Nest app configured to mirror src/main.ts:
 *  - global ValidationPipe (whitelist + forbidNonWhitelisted + transform)
 *  - global HttpExceptionFilter
 *  - global prefix '/api/v1'
 *  - body parsers
 *
 * Throttler is disabled in tests by setting THROTTLE_DISABLED=1.
 */
export async function buildTestApp(): Promise<INestApplication> {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-for-jwt-signing-32b';
  process.env.JWT_EXPIRES_IN = '15m';
  process.env.REFRESH_EXPIRES_IN = '7d';
  process.env.THROTTLE_DISABLED = '1';
  process.env.THROTTLE_TTL = '60';
  process.env.THROTTLE_LIMIT = '100000';
  process.env.WEB_APP_URL = 'http://localhost:3000';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  return app;
}

export const API = '/api/v1';
