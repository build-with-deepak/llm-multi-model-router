import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type QueryResultRow } from 'pg';
import type { AppConfig } from '../config/configuration';

/**
 * Plain `pg` over an ORM, deliberately. The dashboard's queries are
 * aggregate SQL (percentile_cont, filtered counts) that an ORM would either
 * fight or hide behind raw-query escape hatches anyway — at which point the
 * ORM is only adding a dependency between this service and its data.
 *
 * Boot-time migration follows the same resilience pattern as the sibling
 * demos' Qdrant init: Postgres may still be starting inside the same
 * compose stack, so a failed migrate logs and retries lazily on first use
 * instead of crash-looping the process against a dependency that is seconds
 * from ready.
 */
@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private readonly pool: Pool;
  private migrated = false;

  constructor(configService: ConfigService<{ app: AppConfig }, true>) {
    this.pool = new Pool({
      connectionString: configService.get('app', { infer: true }).db.url,
      max: 10,
    });
    this.pool.on('error', (err) =>
      this.logger.error(`Postgres pool error: ${err.message}`),
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.migrate();
    } catch (err) {
      this.logger.warn(
        `Postgres not reachable at boot (will retry on first use): ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async query<T extends QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    await this.ensureMigrated();
    try {
      const result = await this.pool.query<T>(sql, params);
      return result.rows;
    } catch (err) {
      this.logger.error(`Query failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'The database is unreachable right now. Try again shortly.',
      );
    }
  }

  /**
   * Best-effort insert for the request log: a Postgres outage must never
   * fail the visitor's actual routing request, which does not depend on the
   * log existing. The dashboard degrades; the demo keeps working.
   */
  async tryQuery(sql: string, params: unknown[] = []): Promise<boolean> {
    try {
      await this.ensureMigrated();
      await this.pool.query(sql, params);
      return true;
    } catch (err) {
      this.logger.warn(`Best-effort query dropped: ${(err as Error).message}`);
      return false;
    }
  }

  private async ensureMigrated(): Promise<void> {
    if (this.migrated) return;
    await this.migrate();
  }

  private async migrate(): Promise<void> {
    const schema = await readFile(
      join(__dirname, '..', '..', 'db', 'schema.sql'),
      'utf-8',
    );
    await this.pool.query(schema);
    this.migrated = true;
    this.logger.log('Schema migration applied.');
  }
}
