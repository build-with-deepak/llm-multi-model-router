import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import type { ModelSpec } from '../catalog';
import type { CompletionResult, LlmProvider } from './provider.interface';

/**
 * The one provider that streams: TTFB against local inference is the
 * number that makes the latency trade-off in the dashboard honest, and
 * only a streamed read gives it. (Cloud providers here are non-streaming —
 * see the README's trade-offs section.)
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
    const started = Date.now();
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
      });
    } catch (err) {
      this.logger.error(`Ollama unreachable: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Local inference is unreachable — the model may be cold-starting.',
      );
    }

    if (!res.ok || !res.body) {
      throw new ServiceUnavailableException(
        `Local inference returned ${res.status}.`,
      );
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
        const { value, done } = await reader.read();
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
}
