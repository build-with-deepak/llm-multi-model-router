import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { costUsd, ModelSpec } from './catalog';
import {
  DecisionService,
  LatencyBudget,
  RoutingDecision,
} from './decision.service';
import {
  AnthropicProvider,
  GeminiProvider,
  OpenAiProvider,
} from './providers/cloud.providers';
import { OllamaProvider } from './providers/ollama.provider';
import type {
  CompletionResult,
  LlmProvider,
} from './providers/provider.interface';

export interface RouteEventSink {
  (type: string, data: unknown): void;
}

@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name);
  private readonly providers: Record<ModelSpec['provider'], LlmProvider>;

  constructor(
    private readonly decisionService: DecisionService,
    private readonly db: DbService,
    ollama: OllamaProvider,
    openai: OpenAiProvider,
    anthropic: AnthropicProvider,
    gemini: GeminiProvider,
  ) {
    this.providers = { ollama, openai, anthropic, gemini };
  }

  availability(): Record<ModelSpec['provider'], boolean> {
    return {
      ollama: this.providers.ollama.available,
      openai: this.providers.openai.available,
      anthropic: this.providers.anthropic.available,
      gemini: this.providers.gemini.available,
    };
  }

  /**
   * The full request lifecycle: decide → emit the decision → execute with
   * fallback → emit metrics → persist. Never throws; every failure path
   * emits an `error` event so the stream always terminates cleanly.
   */
  async run(
    sessionId: string,
    prompt: string,
    latencyBudget: LatencyBudget,
    emit: RouteEventSink,
  ): Promise<void> {
    const decision = this.decisionService.decide(
      prompt,
      latencyBudget,
      this.availability(),
    );

    emit('decision', {
      chosen: {
        key: decision.chosen.key,
        displayName: decision.chosen.displayName,
        tier: decision.chosen.tier,
        provider: decision.chosen.provider,
      },
      reasons: decision.reasons,
      complexity: decision.complexity,
      sensitive: decision.sensitivity.sensitive,
      sensitivityCategories: decision.sensitivity.categories,
      latencyBudget,
      candidates: decision.candidates,
      fallbackChain: decision.fallbackChain.map((s) => s.displayName),
    });

    const execution = await this.executeWithFallback(decision, prompt, emit);
    if (!execution) {
      emit('error', {
        message:
          'Every candidate provider failed, including local inference. The model may be cold-starting — try again shortly.',
      });
      return;
    }

    const { spec, result, fallbackUsed } = execution;
    emit('answer', { text: result.text });

    const cost = costUsd(spec, result.inputTokens, result.outputTokens);
    const baseline = this.decisionService.estimateBaselineCost(
      result.inputTokens,
      result.outputTokens,
    );

    emit('metrics', {
      model: spec.displayName,
      route: spec.tier,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: Number(cost.toFixed(6)),
      baselineCostUsd: Number(baseline.toFixed(6)),
      savedUsd: Number((baseline - cost).toFixed(6)),
      ttfbMs: result.ttfbMs,
      totalMs: result.totalMs,
      fallbackUsed,
    });

    await this.db.tryQuery(
      `INSERT INTO requests
         (id, session_id, route, provider, model, complexity, sensitive,
          latency_budget, input_tokens, output_tokens, cost_usd,
          baseline_cost_usd, ttfb_ms, total_ms, fallback_used)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        randomUUID(),
        sessionId,
        spec.tier,
        spec.provider,
        spec.model,
        decision.complexity.score,
        decision.sensitivity.sensitive,
        latencyBudget,
        result.inputTokens,
        result.outputTokens,
        cost.toFixed(6),
        baseline.toFixed(6),
        result.ttfbMs,
        result.totalMs,
        fallbackUsed,
      ],
    );

    emit('done', {});
  }

  private async executeWithFallback(
    decision: RoutingDecision,
    prompt: string,
    emit: RouteEventSink,
  ): Promise<{
    spec: ModelSpec;
    result: CompletionResult;
    fallbackUsed: boolean;
  } | null> {
    const chain = [decision.chosen, ...decision.fallbackChain];

    for (const [index, spec] of chain.entries()) {
      try {
        const result = await this.providers[spec.provider].complete(
          spec,
          prompt,
        );
        return { spec, result, fallbackUsed: index > 0 };
      } catch (err) {
        this.logger.warn(
          `${spec.displayName} failed (${(err as Error).message})` +
            (index < chain.length - 1 ? ' — trying next in chain' : ''),
        );
        if (index < chain.length - 1) {
          emit('fallback', {
            failed: spec.displayName,
            next: chain[index + 1].displayName,
            reason: (err as Error).message,
          });
        }
      }
    }
    return null;
  }
}
