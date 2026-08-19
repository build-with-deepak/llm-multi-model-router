import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface RouteStats {
  route: string;
  requests: number;
  p50Ms: number;
  p95Ms: number;
  costUsd: number;
}

export interface DashboardStats {
  totalRequests: number;
  totalCostUsd: number;
  totalBaselineCostUsd: number;
  totalSavedUsd: number;
  savedPercent: number;
  byRoute: RouteStats[];
  sessionRequests: number;
  recent: RecentRequest[];
}

export interface RecentRequest {
  createdAt: string;
  route: string;
  model: string;
  complexity: number;
  sensitive: boolean;
  costUsd: number;
  savedUsd: number;
  totalMs: number;
  fallbackUsed: boolean;
  mine: boolean;
}

@Injectable()
export class DashboardService {
  constructor(private readonly db: DbService) {}

  async stats(sessionId: string): Promise<DashboardStats> {
    // percentile_cont in SQL rather than fetching rows and computing in JS:
    // the request log grows without bound between cleanups, and shipping
    // every row over the wire to compute two percentiles is the kind of
    // thing that works in a demo and falls over the first busy week.
    const totals = await this.db.query<{
      total: string;
      cost: string | null;
      baseline: string | null;
    }>(
      `SELECT count(*) AS total,
              sum(cost_usd) AS cost,
              sum(baseline_cost_usd) AS baseline
       FROM requests`,
    );

    const byRoute = await this.db.query<{
      route: string;
      requests: string;
      p50: number | null;
      p95: number | null;
      cost: string | null;
    }>(
      `SELECT route,
              count(*) AS requests,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY total_ms) AS p50,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY total_ms) AS p95,
              sum(cost_usd) AS cost
       FROM requests
       GROUP BY route
       ORDER BY route`,
    );

    const session = await this.db.query<{ count: string }>(
      `SELECT count(*) AS count FROM requests WHERE session_id = $1`,
      [sessionId],
    );

    const recent = await this.db.query<{
      created_at: Date;
      route: string;
      model: string;
      complexity: number;
      sensitive: boolean;
      cost_usd: string;
      baseline_cost_usd: string;
      total_ms: number;
      fallback_used: boolean;
      session_id: string;
    }>(
      `SELECT created_at, route, model, complexity, sensitive, cost_usd,
              baseline_cost_usd, total_ms, fallback_used, session_id
       FROM requests
       ORDER BY created_at DESC
       LIMIT 20`,
    );

    const totalCost = Number(totals[0].cost ?? 0);
    const totalBaseline = Number(totals[0].baseline ?? 0);
    const saved = totalBaseline - totalCost;

    return {
      totalRequests: Number(totals[0].total),
      totalCostUsd: round6(totalCost),
      totalBaselineCostUsd: round6(totalBaseline),
      totalSavedUsd: round6(saved),
      savedPercent:
        totalBaseline > 0 ? Math.round((saved / totalBaseline) * 100) : 0,
      byRoute: byRoute.map((row) => ({
        route: row.route,
        requests: Number(row.requests),
        p50Ms: Math.round(row.p50 ?? 0),
        p95Ms: Math.round(row.p95 ?? 0),
        costUsd: round6(Number(row.cost ?? 0)),
      })),
      sessionRequests: Number(session[0].count),
      recent: recent.map((row) => ({
        createdAt: row.created_at.toISOString(),
        route: row.route,
        model: row.model,
        complexity: row.complexity,
        sensitive: row.sensitive,
        costUsd: round6(Number(row.cost_usd)),
        savedUsd: round6(Number(row.baseline_cost_usd) - Number(row.cost_usd)),
        totalMs: row.total_ms,
        fallbackUsed: row.fallback_used,
        mine: row.session_id === sessionId,
      })),
    };
  }
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}
