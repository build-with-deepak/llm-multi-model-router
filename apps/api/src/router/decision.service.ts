import { Injectable } from '@nestjs/common';
import {
  BASELINE_MODEL_KEY,
  MODEL_CATALOG,
  ModelSpec,
  costUsd,
} from './catalog';
import {
  ClassifyService,
  ComplexityResult,
  SensitivityResult,
} from './classify.service';

export type LatencyBudget = 'fast' | 'balanced' | 'quality';

export interface CandidateView {
  key: string;
  displayName: string;
  tier: 'local' | 'cloud';
  available: boolean;
  eligible: boolean;
  /** Why this candidate was or wasn't chosen — shown in the decision panel. */
  note: string;
}

export interface RoutingDecision {
  chosen: ModelSpec;
  /** Ordered fallbacks if the chosen provider errors — always ends local. */
  fallbackChain: ModelSpec[];
  reasons: string[];
  complexity: ComplexityResult;
  sensitivity: SensitivityResult;
  latencyBudget: LatencyBudget;
  candidates: CandidateView[];
}

/**
 * The decision itself, pure and synchronous — no provider I/O, no side
 * effects — so the whole policy is unit-testable as a function from
 * (prompt, budget, availability) to a decision. Execution, fallback and
 * persistence live in route.service.ts.
 *
 * Policy, in order:
 *  1. Sensitive prompts route LOCAL, non-negotiably. Cost and latency are
 *     optimizations; "the data didn't leave the building" is a constraint.
 *  2. Complexity sets the minimum capability the chosen model must have.
 *  3. The latency budget filters/orders what remains.
 *  4. Among adequate candidates, cheapest wins. Local inference costs 0,
 *     so it wins every prompt it is capable enough for — which is exactly
 *     the cost-control story this router exists to demonstrate.
 */
@Injectable()
export class DecisionService {
  constructor(private readonly classify: ClassifyService) {}

  decide(
    prompt: string,
    latencyBudget: LatencyBudget,
    availability: Record<ModelSpec['provider'], boolean>,
  ): RoutingDecision {
    const sensitivity = this.classify.sensitivity(prompt);
    const complexity = this.classify.complexity(prompt);
    const reasons: string[] = [];

    const requiredCapability = this.requiredCapability(complexity.score);
    reasons.push(
      `Complexity ${complexity.score} (${complexity.signals.join('; ')}) → needs capability ≥ ${requiredCapability}.`,
    );

    const local = MODEL_CATALOG.find((m) => m.tier === 'local')!;

    if (sensitivity.sensitive) {
      reasons.push(
        `Sensitive content detected (${sensitivity.categories.join(', ')}) — forced to local inference; this data does not leave the server.`,
      );
      if (local.capability < requiredCapability) {
        reasons.push(
          'Prompt complexity exceeds the local model’s usual range, but privacy overrides capability here — expect a more limited answer rather than a cloud call.',
        );
      }
      return {
        chosen: local,
        fallbackChain: [],
        reasons,
        complexity,
        sensitivity,
        latencyBudget,
        candidates: this.candidateViews(
          availability,
          requiredCapability,
          local,
          true,
        ),
      };
    }

    const eligible = MODEL_CATALOG.filter((spec) => {
      if (!availability[spec.provider]) return false;
      if (spec.capability < requiredCapability) return false;
      if (latencyBudget === 'fast' && spec.latencyClass === 'slow')
        return false;
      return true;
    });

    let chosen: ModelSpec;
    if (eligible.length === 0) {
      chosen = local;
      reasons.push(
        latencyBudget === 'fast'
          ? 'No configured model meets both the capability floor and the fast latency budget — falling back to local inference.'
          : 'No configured cloud model meets the capability floor — falling back to local inference.',
      );
    } else {
      // Cheapest adequate model; capability breaks ties downward so the
      // router never pays for headroom the prompt doesn't need.
      chosen = [...eligible].sort(
        (a, b) =>
          a.inputPer1M + a.outputPer1M - (b.inputPer1M + b.outputPer1M) ||
          a.capability - b.capability,
      )[0];
      reasons.push(
        chosen.tier === 'local'
          ? 'Local inference is capable enough for this prompt — costs nothing, and the data stays on the server.'
          : `${chosen.displayName} is the cheapest configured model adequate for this prompt under the "${latencyBudget}" budget.`,
      );
    }

    const fallbackChain = eligible
      .filter((spec) => spec.key !== chosen.key)
      .sort(
        (a, b) => a.inputPer1M + a.outputPer1M - (b.inputPer1M + b.outputPer1M),
      );
    if (
      chosen.tier !== 'local' &&
      !fallbackChain.some((s) => s.tier === 'local')
    ) {
      fallbackChain.push(local);
    }

    return {
      chosen,
      fallbackChain,
      reasons,
      complexity,
      sensitivity,
      latencyBudget,
      candidates: this.candidateViews(
        availability,
        requiredCapability,
        chosen,
        false,
        latencyBudget,
      ),
    };
  }

  estimateBaselineCost(inputTokens: number, outputTokens: number): number {
    const baseline = MODEL_CATALOG.find((m) => m.key === BASELINE_MODEL_KEY)!;
    return costUsd(baseline, inputTokens, outputTokens);
  }

  private requiredCapability(score: number): 1 | 2 | 3 | 4 {
    if (score >= 0.75) return 4;
    if (score >= 0.45) return 3;
    return 2;
  }

  private candidateViews(
    availability: Record<ModelSpec['provider'], boolean>,
    requiredCapability: number,
    chosen: ModelSpec,
    forcedLocal: boolean,
    latencyBudget?: LatencyBudget,
  ): CandidateView[] {
    return MODEL_CATALOG.map((spec) => {
      const available = availability[spec.provider];
      let note: string;
      let eligible = false;

      if (spec.key === chosen.key) {
        note = 'chosen';
        eligible = true;
      } else if (forcedLocal) {
        note = 'excluded — sensitive content must stay local';
      } else if (!available) {
        note = 'provider not configured on this deployment';
      } else if (spec.capability < requiredCapability) {
        note = `capability ${spec.capability} below required ${requiredCapability}`;
      } else if (latencyBudget === 'fast' && spec.latencyClass === 'slow') {
        note = 'too slow for the fast latency budget';
      } else {
        note = 'eligible, but costlier than the chosen model';
        eligible = true;
      }

      return {
        key: spec.key,
        displayName: spec.displayName,
        tier: spec.tier,
        available,
        eligible,
        note,
      };
    });
  }
}
