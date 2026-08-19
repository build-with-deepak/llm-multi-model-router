/**
 * The routing table: every model the router can choose between, with the
 * numbers the decision is made on.
 *
 * Prices are per MILLION tokens, in USD, and are CONFIG, not live data —
 * they are what this deployment believes cloud inference costs, checked
 * against provider pricing pages when this file was written (see
 * `pricedAt`). A production router would sync these from a billing API;
 * for a demo, honest static config beats a fake "live" number.
 *
 * `capability` is a deliberately coarse 1–4: enough to express "this model
 * is adequate for prompts up to this complexity" without pretending to a
 * precision benchmark scores don't actually have across workloads.
 */
export interface ModelSpec {
  key: string;
  provider: 'ollama' | 'openai' | 'anthropic' | 'gemini';
  /** Provider-side model identifier. */
  model: string;
  displayName: string;
  tier: 'local' | 'cloud';
  inputPer1M: number;
  outputPer1M: number;
  /** 1 = simple lookups, 4 = hardest reasoning this catalog can serve. */
  capability: 1 | 2 | 3 | 4;
  /** Rough time-to-first-token class, used by the latency-budget rule. */
  latencyClass: 'fast' | 'medium' | 'slow';
}

export const PRICED_AT = '2026-08';

export const MODEL_CATALOG: ModelSpec[] = [
  {
    key: 'local-llama3',
    provider: 'ollama',
    model: 'llama3:8b', // overridden by OLLAMA_MODEL at runtime
    displayName: 'Llama 3 8B (self-hosted)',
    tier: 'local',
    inputPer1M: 0,
    outputPer1M: 0,
    capability: 2,
    latencyClass: 'slow',
  },
  {
    key: 'gemini-flash',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    tier: 'cloud',
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    capability: 3,
    latencyClass: 'fast',
  },
  {
    key: 'gpt-4.1-mini',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    displayName: 'GPT-4.1 mini',
    tier: 'cloud',
    inputPer1M: 0.4,
    outputPer1M: 1.6,
    capability: 3,
    latencyClass: 'fast',
  },
  {
    key: 'claude-sonnet',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    displayName: 'Claude Sonnet',
    tier: 'cloud',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    capability: 4,
    latencyClass: 'medium',
  },
];

/**
 * The cost every request is compared against: "what would this have cost if
 * we sent everything to the premium model" — the default behaviour of a
 * team that hasn't built routing. The saved-vs-baseline number on the
 * dashboard is the whole business case, so the baseline must be the most
 * capable catalog entry, not a cheap one that would flatter the router.
 */
export const BASELINE_MODEL_KEY = 'claude-sonnet';

export function costUsd(
  spec: ModelSpec,
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    (inputTokens * spec.inputPer1M + outputTokens * spec.outputPer1M) / 1e6
  );
}
