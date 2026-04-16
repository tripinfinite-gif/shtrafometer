import { Pool } from 'pg';

// ─── Connection pool (singleton) ──────────────────────────────────

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.DATABASE_SSL === 'false' ? false : process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    });
  }
  return _pool;
}

/** Helper: run a parameterized query */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[] }> {
  const pool = getPool();
  const result = await pool.query<T>(text, params);
  return { rows: result.rows as T[] };
}

// ─── Schema migration ──────────────────────────────────────────────

let _schemaReady = false;

export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      site_url TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      violations INTEGER NOT NULL DEFAULT 0,
      total_max_fine INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 9900,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      check_result JSONB,
      fix_plan JSONB
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_orders_domain ON orders (domain)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)`);

  // Migration: add product_type column (safe for existing DBs)
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'fix'`);

  // ─── Check logs table ──────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS check_logs (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      url TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      violations INTEGER NOT NULL DEFAULT 0,
      warnings INTEGER NOT NULL DEFAULT 0,
      total_max_fine INTEGER NOT NULL DEFAULT 0,
      site_type TEXT NOT NULL DEFAULT 'unknown',
      risk_level TEXT NOT NULL DEFAULT 'low',
      success BOOLEAN NOT NULL DEFAULT TRUE,
      error TEXT,
      duration_ms INTEGER NOT NULL DEFAULT 0
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_check_logs_domain ON check_logs (domain)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_check_logs_created_at ON check_logs (created_at DESC)`);

  // ─── Users table ────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      company_name TEXT,
      company_inn TEXT,
      last_login_at TIMESTAMPTZ,
      login_count INTEGER NOT NULL DEFAULT 0
    )
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users (phone)`);

  // ─── OTP codes table ───────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'login',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      attempts INTEGER NOT NULL DEFAULT 0
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes (phone, created_at DESC)`);

  // ─── User sessions table ───────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      ip TEXT,
      user_agent TEXT
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at)`);

  // ─── User sites table ──────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS user_sites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain TEXT NOT NULL,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_check_at TIMESTAMPTZ,
      last_violations INTEGER NOT NULL DEFAULT 0,
      last_max_fine INTEGER NOT NULL DEFAULT 0,
      last_check_result JSONB,
      monitoring_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(user_id, domain)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sites_user ON user_sites (user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sites_domain ON user_sites (domain)`);

  // ─── Check history table ─────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS check_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain TEXT NOT NULL,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      violations INTEGER NOT NULL DEFAULT 0,
      warnings INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      total_max_fine INTEGER NOT NULL DEFAULT 0,
      compliance_score INTEGER NOT NULL DEFAULT 100,
      check_result JSONB,
      new_violations INTEGER NOT NULL DEFAULT 0,
      fixed_violations INTEGER NOT NULL DEFAULT 0,
      recurring_violations INTEGER NOT NULL DEFAULT 0
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_check_history_user_domain ON check_history (user_id, domain, checked_at DESC)`);

  // ─── Orders: add user columns (safe migration) ─────────────────────
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id)`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id TEXT`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS questionnaire JSONB`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id) WHERE user_id IS NOT NULL`);

  // ─── OAuth provider columns (safe migration) ───────────────────────
  await query(`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`).catch(() => { /* already nullable */ });
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS yandex_id TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vk_id TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'phone'`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_yandex ON users (yandex_id) WHERE yandex_id IS NOT NULL`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_vk ON users (vk_id) WHERE vk_id IS NOT NULL`);

  // ─── OTP: add email support (safe migration) ──────────────────────
  await query(`ALTER TABLE otp_codes ALTER COLUMN phone DROP NOT NULL`).catch(() => { /* already nullable */ });
  await query(`ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS email TEXT`);
  await query(`CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes (email, created_at DESC) WHERE email IS NOT NULL`);

  // ═══════════════════════════════════════════════════════════════════
  // AI Consultant (Phase 1A) — extensions, tables, indexes
  // План: docs/plan-ai-consultant.md
  // ═══════════════════════════════════════════════════════════════════

  // ─── Extensions ────────────────────────────────────────────────────
  // pgcrypto: gen_random_uuid() + pgp_sym_encrypt/decrypt for OAuth tokens
  // vector:   pgvector для embeddings (multilingual-e5-large, 1024 dim)
  await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await query(`CREATE EXTENSION IF NOT EXISTS vector`);

  // ─── 1. AI conversations ──────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL DEFAULT 'admin',
      title TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations (user_id, updated_at DESC)`);

  // ─── 2. AI messages ───────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tool_calls JSONB,
      tool_result JSONB,
      model_used TEXT,
      tokens_input INTEGER NOT NULL DEFAULT 0,
      tokens_output INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages (conversation_id, created_at)`);

  // ─── 3. AI knowledge chunks (RAG) ─────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id TEXT,
      source_url TEXT,
      source_type TEXT NOT NULL DEFAULT 'manual',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      embedding vector(1024),
      tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      layer TEXT NOT NULL DEFAULT 'facts',
      published_at TIMESTAMPTZ,
      ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ttl_days INTEGER
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_kb_embedding ON ai_knowledge_chunks USING hnsw (embedding vector_cosine_ops)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_kb_source ON ai_knowledge_chunks (source_type, ingested_at DESC)`);

  // ─── 4. AI client OAuth tokens (encrypted via pgcrypto) ───────────
  await query(`
    CREATE TABLE IF NOT EXISTS ai_client_oauth_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL DEFAULT 'admin',
      provider TEXT NOT NULL,
      access_token_encrypted BYTEA NOT NULL,
      refresh_token_encrypted BYTEA,
      expires_at TIMESTAMPTZ,
      scope TEXT,
      client_login TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_oauth_user_provider ON ai_client_oauth_tokens (user_id, provider)`);
  // Phase 3D — unique (user_id, provider) для UPSERT токенов через pgcrypto
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_oauth_user_provider_unique ON ai_client_oauth_tokens(user_id, provider)`);

  // ─── 5. AI audit log (HITL tool calls) ────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS ai_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL DEFAULT 'admin',
      conversation_id UUID,
      action TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      tool_args JSONB,
      tool_result JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_audit_user_created ON ai_audit_log (user_id, created_at DESC)`);

  // ═══════════════════════════════════════════════════════════════════
  // Decision Log (Phase D1) — журнал решений по рекламе
  // План: docs/plan-decision-log.md
  // ═══════════════════════════════════════════════════════════════════

  // ─── 1. Ad decisions ──────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS ad_decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      decision_type TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      campaign_id TEXT,
      campaign_name TEXT,
      before_value JSONB,
      after_value JSONB,
      hypothesis TEXT,
      tags TEXT[] DEFAULT '{}',
      outcome TEXT DEFAULT 'pending',
      outcome_comment TEXT,
      outcome_assessed_at TIMESTAMPTZ,
      actor TEXT NOT NULL DEFAULT 'admin',
      conversation_id UUID,
      audit_log_id UUID,
      metadata JSONB DEFAULT '{}'
    )
  `);

  // ─── 2. Ad decision snapshots ─────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS ad_decision_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      decision_id UUID NOT NULL REFERENCES ad_decisions(id) ON DELETE CASCADE,
      snapshot_type TEXT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      metrics JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (decision_id, snapshot_type)
    )
  `);

  // ─── Ad decisions indexes ─────────────────────────────────────────
  await query(`CREATE INDEX IF NOT EXISTS idx_ad_decisions_created ON ad_decisions (created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ad_decisions_channel ON ad_decisions (channel_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ad_decisions_outcome ON ad_decisions (outcome) WHERE outcome = 'pending'`);

  _schemaReady = true;
}
