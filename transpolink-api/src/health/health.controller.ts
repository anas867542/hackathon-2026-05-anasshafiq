import { Controller, Get, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness probe — is the process alive? */
  @Get()
  @HttpCode(HttpStatus.OK)
  liveness() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  /** Readiness probe — can the service handle traffic (DB reachable)? */
  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok', ts: new Date().toISOString() };
    } catch {
      // 503 tells load balancers / k8s to stop routing here until DB recovers
      throw new HttpException(
        { status: 'degraded', db: 'error', ts: new Date().toISOString() },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
