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
 * All three cloud providers in one file because they share one shape: an
 * availability flag driven by whether the API key is configured, one
 * non-streaming completion call, and honest token accounting from the
 * provider's own usage block. Non-streaming is a deliberate trade-off —
 * see the README — so for these, ttfbMs === totalMs.
 *
 * A missing key does NOT stub the provider with fake responses. It marks
 * it unavailable, the decision panel says so, and traffic that would have
 * gone there routes to the next candidate. A demo that fakes a cloud call
 * would be indistinguishable from working until the one moment someone
 * checks — which is exactly when it matters.
 */
abstract class BaseCloudProvider implements LlmProvider {
  abstract readonly id: ModelSpec['provider'];
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly apiKey: string | undefined) {}

  get available(): boolean {
    return !!this.apiKey;
  }

  async complete(spec: ModelSpec, prompt: string): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        `${this.id} is not configured on this deployment.`,
      );
    }
    const started = Date.now();
    const result = await this.callApi(spec, prompt);
    const totalMs = Date.now() - started;
    return { ...result, ttfbMs: totalMs, totalMs };
  }

  protected abstract callApi(
    spec: ModelSpec,
    prompt: string,
  ): Promise<Omit<CompletionResult, 'ttfbMs' | 'totalMs'>>;

  protected async postJson(
    url: string,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      this.logger.error(`${this.id} unreachable: ${(err as Error).message}`);
      throw new ServiceUnavailableException(`${this.id} is unreachable.`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(
        `${this.id} returned ${res.status}: ${text.slice(0, 300)}`,
      );
      throw new ServiceUnavailableException(
        `${this.id} returned an error (${res.status}).`,
      );
    }
    return res.json();
  }
}

@Injectable()
export class OpenAiProvider extends BaseCloudProvider {
  readonly id = 'openai' as const;

  constructor(configService: ConfigService<{ app: AppConfig }, true>) {
    super(configService.get('app', { infer: true }).providers.openaiApiKey);
  }

  protected async callApi(spec: ModelSpec, prompt: string) {
    const body = (await this.postJson(
      'https://api.openai.com/v1/chat/completions',
      { Authorization: `Bearer ${this.apiKey}` },
      { model: spec.model, messages: [{ role: 'user', content: prompt }] },
    )) as {
      choices: { message: { content: string } }[];
      usage: { prompt_tokens: number; completion_tokens: number };
    };
    return {
      text: body.choices[0]?.message?.content ?? '',
      inputTokens: body.usage?.prompt_tokens ?? 0,
      outputTokens: body.usage?.completion_tokens ?? 0,
    };
  }
}

@Injectable()
export class AnthropicProvider extends BaseCloudProvider {
  readonly id = 'anthropic' as const;

  constructor(configService: ConfigService<{ app: AppConfig }, true>) {
    super(configService.get('app', { infer: true }).providers.anthropicApiKey);
  }

  protected async callApi(spec: ModelSpec, prompt: string) {
    const body = (await this.postJson(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': this.apiKey!, 'anthropic-version': '2023-06-01' },
      {
        model: spec.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
    )) as {
      content: { type: string; text?: string }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    return {
      text: body.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join(''),
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
    };
  }
}

@Injectable()
export class GeminiProvider extends BaseCloudProvider {
  readonly id = 'gemini' as const;

  constructor(configService: ConfigService<{ app: AppConfig }, true>) {
    super(configService.get('app', { infer: true }).providers.geminiApiKey);
  }

  protected async callApi(spec: ModelSpec, prompt: string) {
    const body = (await this.postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${spec.model}:generateContent`,
      { 'x-goog-api-key': this.apiKey! },
      { contents: [{ parts: [{ text: prompt }] }] },
    )) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };
    return {
      text:
        body.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? '')
          .join('') ?? '',
      inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
