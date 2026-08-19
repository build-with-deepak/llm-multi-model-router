import { randomUUID } from 'node:crypto';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DbService } from './db.service';

/**
 * Generates ~7 days of plausible request history on first boot against an
 * empty database, flagged `seed = true`.
 *
 * Why seed at all: the dashboard is the part of this demo a decision-maker
 * actually cares about (cost saved, latency by route), and an empty
 * dashboard on a visitor's first request teaches them nothing. Why
 * generated rather than a static SQL file: the rows carry timestamps
 * relative to "now", and a static file's dates go stale the week after it
 * is written. `scripts/db-reset.mjs` truncates the table; the next boot
 * reruns this.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly db: DbService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const existing = await this.db.query<{ count: string }>(
        'SELECT count(*) AS count FROM requests',
      );
      if (Number(existing[0].count) > 0) return;
      await this.seed();
    } catch (err) {
      this.logger.warn(
        `Seed skipped (database unreachable): ${(err as Error).message}`,
      );
    }
  }

  private async seed(): Promise<void> {
    const rows = this.generate(220);
    for (const row of rows) {
      await this.db.tryQuery(
        `INSERT INTO requests
           (id, session_id, created_at, route, provider, model, complexity, sensitive,
            latency_budget, input_tokens, output_tokens, cost_usd, baseline_cost_usd,
            ttfb_ms, total_ms, fallback_used, seed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true)`,
        row,
      );
    }
    this.logger.log(`Seeded ${rows.length} historical demo requests.`);
  }

  private generate(count: number): unknown[][] {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const rows: unknown[][] = [];

    for (let i = 0; i < count; i++) {
      const createdAt = new Date(now - Math.random() * week);
      const sensitive = Math.random() < 0.18;
      const complexity = sensitive ? Math.random() * 0.9 : Math.random() ** 1.4; // skew toward simple prompts, like real traffic
      const local = sensitive || complexity < 0.45 || Math.random() < 0.15;

      const inputTokens = 40 + Math.floor(Math.random() * 800);
      const outputTokens = 60 + Math.floor(Math.random() * 700);

      // Costs mirror catalog.ts: local inference is charged at 0; the
      // baseline is what the same tokens would have cost on the premium
      // cloud model everything is compared against.
      const cloudInputPer1M = 3.0;
      const cloudOutputPer1M = 15.0;
      const midInputPer1M = 0.4;
      const midOutputPer1M = 1.6;
      const baseline =
        (inputTokens * cloudInputPer1M + outputTokens * cloudOutputPer1M) / 1e6;
      const cost = local
        ? 0
        : complexity > 0.75
          ? baseline
          : (inputTokens * midInputPer1M + outputTokens * midOutputPer1M) / 1e6;

      const ttfb = local
        ? 900 + Math.floor(Math.random() * 2500)
        : 250 + Math.floor(Math.random() * 900);
      const total =
        ttfb +
        outputTokens *
          (local ? 55 + Math.random() * 60 : 8 + Math.random() * 18);

      rows.push([
        randomUUID(),
        'seed-history',
        createdAt.toISOString(),
        local ? 'local' : 'cloud',
        local ? 'ollama' : Math.random() < 0.6 ? 'openai' : 'anthropic',
        local
          ? 'llama3:8b'
          : complexity > 0.75
            ? 'claude-sonnet'
            : 'gpt-4.1-mini',
        Number(complexity.toFixed(3)),
        sensitive,
        ['fast', 'balanced', 'quality'][Math.floor(Math.random() * 3)],
        inputTokens,
        outputTokens,
        Number(cost.toFixed(6)),
        Number(baseline.toFixed(6)),
        ttfb,
        Math.floor(total),
        Math.random() < 0.04,
      ]);
    }

    return rows;
  }
}
