import { sql } from '@vercel/postgres';

// ─── Schema migration ──────────────────────────────────────────────

export async function ensureSchema(): Promise<void> {
  await sql`
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
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_orders_domain ON orders (domain)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)
  `;

  // Migration: add product_type column (safe for existing DBs)
  await sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'fix'
  `;

  // ─── Check logs table ──────────────────────────────────────────────
  await sql`
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
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_check_logs_domain ON check_logs (domain)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_check_logs_created_at ON check_logs (created_at DESC)
  `;
}
