import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { SessionCostService } from '../../core/session-cost.service';
import { streamSse } from '../../core/sse-client';
import { DecisionEvent, FallbackEvent, MetricsEvent } from '../../core/models';

interface ExamplePrompt {
  label: string;
  /** What it's meant to demonstrate — shown as the button's tooltip. */
  hint: string;
  prompt: string;
  latencyBudget: 'fast' | 'balanced' | 'quality';
}

/**
 * Three fixed prompts chosen to hit three different branches of the real
 * routing policy in apps/api (DecisionService.decide / ClassifyService) —
 * not invented behavior, just prompts crafted to trip the actual regexes
 * and score thresholds:
 *  - an email address trips the PII regex → sensitivity forces local,
 *    regardless of budget.
 *  - a short factual question under a "fast" budget scores low complexity
 *    and excludes local (latencyClass 'slow'), so the cheapest adequate
 *    *cloud* model wins on deployments where one is configured.
 *  - reasoning language + a code block + multiple questions pushes the
 *    complexity score above 0.75, requiring capability 4 — only the most
 *    capable configured model qualifies.
 * On a deployment with no cloud keys configured, cases 2 and 3 still
 * demonstrate the policy honestly: they route local with a *different*
 * plain-language reason than case 1 (see decision.service.ts's `reasons`).
 */
const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    label: 'Contains personal data',
    hint: 'Should force local inference — the data never leaves the server.',
    prompt:
      'My email is jane.doe@example.com — can you draft a short, polite follow-up message to a client?',
    latencyBudget: 'balanced',
  },
  {
    label: 'Simple question, fast budget',
    hint: 'Should route to the cheapest model that is fast enough, not the most capable one.',
    prompt: "What's the capital of France, and what's a good day trip from there?",
    latencyBudget: 'fast',
  },
  {
    label: 'Complex reasoning',
    hint: 'Should require the highest-capability configured model.',
    prompt:
      'Architect a fault-tolerant order-processing pipeline for 50k requests/sec. ' +
      'Walk through the trade-offs step-by-step, sketch the retry logic as ```code```, ' +
      'and explain why an event-driven design beats a synchronous one here. ' +
      'What failure modes should we test for? How would you roll this out safely?',
    latencyBudget: 'quality',
  },
];

@Component({
  selector: 'app-playground',
  imports: [FormsModule],
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.scss',
})
export class PlaygroundComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  readonly sessionCost = inject(SessionCostService);
  private abortController: AbortController | null = null;

  readonly examples = EXAMPLE_PROMPTS;

  readonly prompt = signal('');
  readonly latencyBudget = signal<'fast' | 'balanced' | 'quality'>('balanced');
  readonly isRunning = signal(false);
  readonly decision = signal<DecisionEvent | null>(null);
  readonly fallbacks = signal<FallbackEvent[]>([]);
  readonly answer = signal('');
  readonly metrics = signal<MetricsEvent | null>(null);
  readonly error = signal<string | null>(null);

  /** A plain-language one-liner for the routing decision — the model name
   * alone tells a recruiter nothing; "why" is the point of this demo. */
  routingHeadline(d: DecisionEvent): string {
    if (d.sensitive) {
      const what = d.sensitivityCategories[0] ?? 'personal data';
      return `routed to local — contains ${what}`;
    }
    if (d.chosen.tier === 'local') {
      return 'routed to local — no cloud model was needed for this request';
    }
    if (d.complexity.score >= 0.75) {
      return 'routed to cloud — requires complex reasoning';
    }
    return 'routed to cloud — cheapest model adequate for this request';
  }

  async runExample(example: ExamplePrompt): Promise<void> {
    if (this.isRunning()) return;
    this.prompt.set(example.prompt);
    this.latencyBudget.set(example.latencyBudget);
    await this.run();
  }

  async run(): Promise<void> {
    const prompt = this.prompt().trim();
    const token = this.auth.token;
    if (!prompt || !token || this.isRunning()) return;

    this.decision.set(null);
    this.fallbacks.set([]);
    this.answer.set('');
    this.metrics.set(null);
    this.error.set(null);
    this.isRunning.set(true);
    this.abortController = new AbortController();

    try {
      const events = streamSse(
        '/api/route/stream',
        { prompt, latencyBudget: this.latencyBudget() },
        token,
        this.abortController.signal,
      );
      for await (const event of events) {
        switch (event.type) {
          case 'decision':
            this.decision.set(event.data as DecisionEvent);
            break;
          case 'fallback':
            this.fallbacks.update((list) => [...list, event.data as FallbackEvent]);
            break;
          case 'answer':
            this.answer.set((event.data as { text: string }).text);
            break;
          case 'metrics': {
            const m = event.data as MetricsEvent;
            this.metrics.set(m);
            this.sessionCost.record(m);
            break;
          }
          case 'error':
            this.error.set((event.data as { message: string }).message);
            break;
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        this.error.set((err as Error).message);
      }
    } finally {
      this.isRunning.set(false);
      this.abortController = null;
    }
  }

  formatUsd(value: number): string {
    return value === 0 ? '$0' : `$${value.toFixed(6)}`;
  }

  ngOnDestroy(): void {
    this.abortController?.abort();
  }
}
