/** Mirrors the API's response shapes — plain interfaces, same reasoning as
 * the sibling demos: a two-app repo doesn't need a shared-types package. */

export interface DemoSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: { id: string; name: string; kind: 'demo' };
}

export interface CandidateView {
  key: string;
  displayName: string;
  tier: 'local' | 'cloud';
  available: boolean;
  eligible: boolean;
  note: string;
}

export interface DecisionEvent {
  chosen: { key: string; displayName: string; tier: 'local' | 'cloud'; provider: string };
  reasons: string[];
  complexity: { score: number; signals: string[] };
  sensitive: boolean;
  sensitivityCategories: string[];
  latencyBudget: string;
  candidates: CandidateView[];
  fallbackChain: string[];
}

export interface FallbackEvent {
  failed: string;
  next: string;
  reason: string;
}

export interface MetricsEvent {
  model: string;
  route: 'local' | 'cloud';
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  baselineCostUsd: number;
  savedUsd: number;
  ttfbMs: number;
  totalMs: number;
  fallbackUsed: boolean;
}

export interface RouteStats {
  route: string;
  requests: number;
  p50Ms: number;
  p95Ms: number;
  costUsd: number;
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
