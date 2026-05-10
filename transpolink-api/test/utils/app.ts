import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { json, urlencoded } from 'express';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

class NoopThrottlerGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext): boolean {
    return true;
  }
}

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
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-32-bytes-padding-aaaa';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-32-bytes-padding-bbbb';
  process.env.JWT_ACCESS_EXPIRES = '15m';
  process.env.JWT_REFRESH_EXPIRES = '7d';
  process.env.THROTTLE_DISABLED = '1';
  process.env.THROTTLE_TTL = '60';
  process.env.THROTTLE_LIMIT = '100000';
  process.env.WEB_APP_URL = 'http://localhost:3000';
  // GoogleStrategy refuses to instantiate without a non-empty clientID/secret,
  // even though we never exercise the OAuth flow in tests. Use placeholder values.
  process.env.GOOGLE_CLIENT_ID =
    process.env.GOOGLE_CLIENT_ID ?? 'test-client-id.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? 'test-client-secret';
  process.env.GOOGLE_CALLBACK_URL =
    process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/v1/auth/google/callback';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(APP_GUARD)
    .useClass(NoopThrottlerGuard)
    .compile();

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
