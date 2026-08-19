import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { AppConfig } from '../config/configuration';
import { DbService } from './db.service';

/**
 * The demo-data half of the "demo accounts are ephemeral, registered
 * accounts will persist" contract: request history from demo sessions is
 * deleted after `historyRetentionDays` (default 7). Seed rows are exempt —
 * they exist so the dashboard is never empty, and they carry no visitor
 * data. When registration ships, registered sessions' rows get their own
 * retention rule instead of this one.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly retentionDays: number;

  constructor(
    private readonly db: DbService,
    configService: ConfigService<{ app: AppConfig }, true>,
  ) {
    this.retentionDays = configService.get('app', {
      infer: true,
    }).limits.historyRetentionDays;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async purgeOldDemoData(): Promise<void> {
    const ok = await this.db.tryQuery(
      `DELETE FROM requests
       WHERE seed = false
         AND created_at < now() - make_interval(days => $1)`,
      [this.retentionDays],
    );
    if (ok) {
      this.logger.log(
        `Demo request history older than ${this.retentionDays} days purged.`,
      );
    }
  }
}
