import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false, bodyParser: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const prefix = config.get<string>('API_PREFIX', 'api/v1');
  const port = config.get<number>('PORT', 4000);
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const bodyLimit = config.get<string>('BODY_LIMIT', '1mb');
  const isProd = config.get<string>('NODE_ENV') === 'production';

  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));

  const allowedOrigins = corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (isProd && allowedOrigins.includes('*')) {
    logger.error('CORS_ORIGIN contains wildcard (*) in production — refusing to start');
    process.exit(1);
  }

  app.setGlobalPrefix(prefix);
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.use(
    helmet({
      // CSP off in dev so Swagger UI works; let proxy/CDN set it in prod if customised
      contentSecurityPolicy: isProd ? undefined : false,
      hsts: isProd
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  if (!isProd) {
    const swagger = new DocumentBuilder()
      .setTitle('TranspoLink API')
      .setDescription('On-demand truck booking platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, swagger));
    logger.log(`Swagger:    http://localhost:${port}/${prefix}/docs`);
  }

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/${prefix}`);
}

const processLogger = new Logger('Process');

process.on('unhandledRejection', (reason) => {
  processLogger.error('unhandledRejection', reason instanceof Error ? reason.stack : String(reason));
});
process.on('uncaughtException', (err) => {
  processLogger.error('uncaughtException', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});

bootstrap();
