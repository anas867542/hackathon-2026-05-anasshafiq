import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly client: PostHog | null = null;
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private config: ConfigService) {
    const key  = this.config.get<string>('POSTHOG_KEY', '');
    const host = this.config.get<string>('POSTHOG_HOST', 'https://app.posthog.com');

    if (!key) {
      this.logger.warn('POSTHOG_KEY not set — analytics disabled');
      return;
    }

    this.client = new PostHog(key, {
      host,
      flushAt: 20,
      flushInterval: 10_000,
    });
  }

  capture(distinctId: string, event: string, properties?: Record<string, unknown>) {
    if (!this.client) return;
    this.client.capture({ distinctId, event, properties });
  }

  identify(distinctId: string, properties: Record<string, unknown>) {
    if (!this.client) return;
    this.client.identify({ distinctId, properties });
  }

  async onModuleDestroy() {
    await this.client?.shutdown();
  }
}
