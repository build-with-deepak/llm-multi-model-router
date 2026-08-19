import type { ModelSpec } from '../catalog';

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** Time to first token where the provider streams; equals totalMs where it doesn't. */
  ttfbMs: number;
  totalMs: number;
}

export interface LlmProvider {
  readonly id: ModelSpec['provider'];
  /** False when the API key for this provider isn't configured — the
   * decision engine then treats its models as absent, visibly. */
  readonly available: boolean;
  complete(spec: ModelSpec, prompt: string): Promise<CompletionResult>;
}
