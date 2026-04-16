/**
 * AI Consultant — env validation (Phase 1B).
 *
 * Lazy validators: nothing runs at import time, so a missing key cannot
 * break `next build` or `next dev`. Call `getAiEnv()` (or one of the
 * tier-specific helpers) from a route/handler that actually needs the keys.
 *
 * See: docs/plan-ai-consultant.md → "Env matrix"
 */

// ─── Types ────────────────────────────────────────────────────────

export type AiRouterMode = 'auto' | 'openai-only' | 'claude-only' | 'yandexgpt-only';

const ROUTER_MODES: readonly AiRouterMode[] = [
  'auto',
  'openai-only',
  'claude-only',
  'yandexgpt-only',
] as const;

export interface AiLlmEnv {
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  YANDEX_GPT_API_KEY: string;
  YANDEX_GPT_FOLDER_ID: string;
}

export interface AiOAuthEnv {
  YANDEX_DIRECT_CLIENT_ID: string;
  YANDEX_DIRECT_CLIENT_SECRET: string;
  YANDEX_DIRECT_REDIRECT_URI: string;
  AI_TOKEN_ENCRYPTION_KEY: string;
}

export interface AiEmbeddingsEnv {
  EMBEDDINGS_SERVICE_URL: string;
}

export interface AiOptionalEnv {
  AI_ROUTER_MODE: AiRouterMode;
  AI_RATE_LIMIT_PER_HOUR: number;
}

export interface AiEnv extends AiLlmEnv, AiOAuthEnv, AiEmbeddingsEnv, AiOptionalEnv {}

// ─── Internal helpers ─────────────────────────────────────────────

function requireEnv(name: string): string {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `See .env.example and docs/plan-ai-consultant.md → "Env matrix".`,
    );
  }
  return raw;
}

function parseRouterMode(): AiRouterMode {
  const raw = process.env.AI_ROUTER_MODE?.trim();
  if (!raw) return 'auto';
  if ((ROUTER_MODES as readonly string[]).includes(raw)) {
    return raw as AiRouterMode;
  }
  throw new Error(
    `[env] Invalid AI_ROUTER_MODE="${raw}". ` +
      `Allowed: ${ROUTER_MODES.join(', ')}.`,
  );
}

function parseRateLimit(): number {
  const raw = process.env.AI_RATE_LIMIT_PER_HOUR?.trim();
  if (!raw) return 60;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new Error(
      `[env] Invalid AI_RATE_LIMIT_PER_HOUR="${raw}". ` +
        `Expected a positive integer.`,
    );
  }
  return n;
}

// ─── Public API (lazy) ────────────────────────────────────────────

/** LLM provider keys (Phase 2). Throws if any are missing. */
export function getLlmEnv(): AiLlmEnv {
  return {
    OPENAI_API_KEY: requireEnv('OPENAI_API_KEY'),
    ANTHROPIC_API_KEY: requireEnv('ANTHROPIC_API_KEY'),
    YANDEX_GPT_API_KEY: requireEnv('YANDEX_GPT_API_KEY'),
    YANDEX_GPT_FOLDER_ID: requireEnv('YANDEX_GPT_FOLDER_ID'),
  };
}

/** Yandex OAuth + token encryption (Phase 3). Throws if any are missing. */
export function getOAuthEnv(): AiOAuthEnv {
  return {
    YANDEX_DIRECT_CLIENT_ID: requireEnv('YANDEX_DIRECT_CLIENT_ID'),
    YANDEX_DIRECT_CLIENT_SECRET: requireEnv('YANDEX_DIRECT_CLIENT_SECRET'),
    YANDEX_DIRECT_REDIRECT_URI: requireEnv('YANDEX_DIRECT_REDIRECT_URI'),
    AI_TOKEN_ENCRYPTION_KEY: requireEnv('AI_TOKEN_ENCRYPTION_KEY'),
  };
}

/** Embeddings service URL (Phase 4). Throws if missing. */
export function getEmbeddingsEnv(): AiEmbeddingsEnv {
  return {
    EMBEDDINGS_SERVICE_URL: requireEnv('EMBEDDINGS_SERVICE_URL'),
  };
}

/** Optional knobs with defaults. Never throws for missing values, but
 *  validates format if provided. */
export function getOptionalEnv(): AiOptionalEnv {
  return {
    AI_ROUTER_MODE: parseRouterMode(),
    AI_RATE_LIMIT_PER_HOUR: parseRateLimit(),
  };
}

/** Full AI env (all tiers). Throws if anything required is missing. */
export function getAiEnv(): AiEnv {
  return {
    ...getLlmEnv(),
    ...getOAuthEnv(),
    ...getEmbeddingsEnv(),
    ...getOptionalEnv(),
  };
}

/** Non-throwing health check: returns a list of missing required keys.
 *  Useful for the admin UI / status endpoint to show readiness per phase
 *  without crashing the request. */
export function checkAiEnv(): {
  ok: boolean;
  missing: string[];
  routerMode: AiRouterMode | null;
  rateLimit: number | null;
} {
  const required = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'YANDEX_GPT_API_KEY',
    'YANDEX_GPT_FOLDER_ID',
    'YANDEX_DIRECT_CLIENT_ID',
    'YANDEX_DIRECT_CLIENT_SECRET',
    'YANDEX_DIRECT_REDIRECT_URI',
    'AI_TOKEN_ENCRYPTION_KEY',
    'EMBEDDINGS_SERVICE_URL',
  ];
  const missing = required.filter((k) => !process.env[k] || process.env[k]!.trim() === '');

  let routerMode: AiRouterMode | null = null;
  let rateLimit: number | null = null;
  try {
    routerMode = parseRouterMode();
  } catch {
    /* invalid format — leave null */
  }
  try {
    rateLimit = parseRateLimit();
  } catch {
    /* invalid format — leave null */
  }

  return { ok: missing.length === 0, missing, routerMode, rateLimit };
}
