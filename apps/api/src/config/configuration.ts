/**
 * Single source of runtime config, read once at boot — same pattern as the
 * sibling rag-privacy-first demo, so anyone reading one repo can navigate
 * the other.
 */
import { identityConfig, type IdentityConfig } from '../auth/identity.config';

export interface AppConfig {
  port: number;
  corsOrigin: string;
  /** Verified against id.build-with-deepak.com — see auth/identity.config.ts. */
  identity: IdentityConfig;
  db: {
    url: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  providers: {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    geminiApiKey?: string;
  };
  limits: {
    maxPromptChars: number;
    /** Days of non-seed request history kept before the cleanup cron deletes it. */
    historyRetentionDays: number;
  };
  rateLimit: {
    ttlMs: number;
    limit: number;
  };
}


export default (): { app: AppConfig } => {
  return {
    app: {
      port: Number(process.env.PORT ?? 3000),
      corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
      identity: identityConfig('router.build-with-deepak.com'),
      db: {
        url:
          process.env.DATABASE_URL ??
          'postgres://router:router@localhost:5432/router',
      },
      ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL ?? 'llama3:8b',
      },
      providers: {
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY,
      },
      limits: {
        maxPromptChars: Number(process.env.MAX_PROMPT_CHARS ?? 2000),
        historyRetentionDays: Number(process.env.HISTORY_RETENTION_DAYS ?? 7),
      },
      rateLimit: {
        ttlMs: Number(process.env.RATE_LIMIT_TTL_MS ?? 60 * 1000),
        limit: Number(process.env.RATE_LIMIT_LIMIT ?? 15),
      },
    },
  };
};
