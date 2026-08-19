import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { streamSse } from '../../core/sse-client';
import { DecisionEvent, FallbackEvent, MetricsEvent } from '../../core/models';

@Component({
  selector: 'app-playground',
  imports: [FormsModule],
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.scss',
})
export class PlaygroundComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private abortController: AbortController | null = null;

  readonly prompt = signal('');
  readonly latencyBudget = signal<'fast' | 'balanced' | 'quality'>('balanced');
  readonly isRunning = signal(false);
  readonly decision = signal<DecisionEvent | null>(null);
  readonly fallbacks = signal<FallbackEvent[]>([]);
  readonly answer = signal('');
  readonly metrics = signal<MetricsEvent | null>(null);
  readonly error = signal<string | null>(null);

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
          case 'metrics':
            this.metrics.set(event.data as MetricsEvent);
            break;
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
