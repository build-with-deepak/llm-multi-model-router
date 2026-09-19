import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import type { ModelSpec } from '../catalog';
import type { CompletionResult, LlmProvider } from './provider.interface';

/** How long to wait for the first byte before giving up on a connect attempt. */
const CONNECT_TIMEOUT_MS = 20_000;
/** How long a stream may go with no new bytes before it counts as stalled. */
const READ_IDLE_TIMEOUT_MS = 45_000;
/** One retry, for the specific case a cold Ollama instance resets the first connection. */
const MAX_ATTEMPTS = 2;

/**
 * The one provider that streams: TTFB against local inference is the
 * number that makes the latency trade-off in the dashboard honest, and
 * only a streamed read gives it. (Cloud providers here are non-streaming —
 * see the README's trade-offs section.)
 *
 * Three failure modes get distinct handling, because they read very
 * differently to someone trying this demo and "unreachable" was doing
 * duty for all three:
 *
 *   1. Ollama has the model unloaded and is loading it from disk — this is
 *      normal, not a fault, and can take upwards of twenty seconds for an
 *      8B model. A generous connect timeout plus one retry absorbs this
 *      without the visitor ever seeing an error.
 *   2. The connection is refused or times out outright — Ollama really is
 *      down or unreachable. Reported plainly, with the suggestion to retry
 *      rather than a message that reads as a permanent break.
 *   3. A response starts streaming and then stalls — rarer, but a hung
 *      request with no bound would leave a visitor watching a spinner
 *      forever. The idle timeout below is what turns that into an honest
 *      failure instead.
 */
@Injectable()
export class OllamaProvider implements LlmProvider {
  readonly id = 'ollama' as const;
  readonly available = true; // local inference is this demo's floor — always on

  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly modelOverride: string;

  constructor(configService: ConfigService<{ app: AppConfig }, true>) {
    const config = configService.get('app', { infer: true }).ollama;
    this.baseUrl = config.baseUrl;
    this.modelOverride = config.model;
  }

  async complete(spec: ModelSpec, prompt: string): Promise<CompletionResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.attempt(spec, prompt);
      } catch (err) {
        lastError = err as Error;
        const isLastAttempt = attempt === MAX_ATTEMPTS;
        this.logger.warn(
          `Ollama attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError.message}` +
            (isLastAttempt ? '' : ' — retrying once (model may be cold-starting)'),
        );
      }
    }

    throw new ServiceUnavailableException(
      'The local model did not respond in time. This usually means it is still ' +
        'loading after being idle — please try again in a few seconds.',
    );
  }

  private async attempt(spec: ModelSpec, prompt: string): Promise<CompletionResult> {
    const started = Date.now();
    const controller = new AbortController();
    const connectTimer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelOverride || spec.model,
          prompt,
          stream: true,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(
        (err as Error).name === 'AbortError'
          ? `no response within ${CONNECT_TIMEOUT_MS / 1000}s (connect)`
          : `connection failed: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(connectTimer);
    }

    if (!res.ok || !res.body) {
      throw new Error(`Ollama returned HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let ttfbMs = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      while (true) {
        // Bounds each individual read, not just the connection — a stream
        // that starts and then goes silent (the failure a plain fetch
        // timeout does not cover) is exactly what this guards.
        const { value, done } = await this.readWithIdleTimeout(reader);
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line) as {
            response?: string;
            done?: boolean;
            prompt_eval_count?: number;
            eval_count?: number;
          };
          if (parsed.response) {
            if (ttfbMs === 0) ttfbMs = Date.now() - started;
            text += parsed.response;
          }
          if (parsed.done) {
            inputTokens = parsed.prompt_eval_count ?? 0;
            outputTokens = parsed.eval_count ?? 0;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const totalMs = Date.now() - started;
    return {
      text,
      inputTokens,
      outputTokens,
      ttfbMs: ttfbMs || totalMs,
      totalMs,
    };
  }

  private async readWithIdleTimeout(
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): Promise<ReadableStreamReadResult<Uint8Array>> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`no data for ${READ_IDLE_TIMEOUT_MS / 1000}s (stalled stream)`)),
        READ_IDLE_TIMEOUT_MS,
      );
    });
    try {
      return await Promise.race([reader.read(), timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }
}
