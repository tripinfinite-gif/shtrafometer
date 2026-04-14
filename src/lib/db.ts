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

export async function ensureSchema(): Promise<void> {
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
}
