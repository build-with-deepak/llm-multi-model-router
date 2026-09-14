import { Injectable, computed, signal } from '@angular/core';
import { MetricsEvent } from './models';

/**
 * Running cost comparison for the current browser session: what routing
 * actually cost so far vs. what the same requests would have cost if every
 * one of them had gone to the premium/most-expensive model instead (the
 * same `baselineCostUsd` the API computes per request against
 * `BASELINE_MODEL_KEY`, not a client-side guess).
 *
 * `providedIn: 'root'` makes this one instance per browser tab — it lives
 * as long as the demo session does and is never shared across visitors, the
 * same isolation the API gives session-scoped data server-side.
 */
@Injectable({ providedIn: 'root' })
export class SessionCostService {
  private readonly costSignal = signal(0);
  private readonly baselineSignal = signal(0);
  private readonly countSignal = signal(0);

  readonly costUsd = this.costSignal.asReadonly();
  readonly baselineCostUsd = this.baselineSignal.asReadonly();
  readonly requestCount = this.countSignal.asReadonly();

  readonly savedUsd = computed(() =>
    Number((this.baselineSignal() - this.costSignal()).toFixed(6)),
  );

  record(metrics: MetricsEvent): void {
    this.costSignal.update((v) => v + metrics.costUsd);
    this.baselineSignal.update((v) => v + metrics.baselineCostUsd);
    this.countSignal.update((v) => v + 1);
  }
}
