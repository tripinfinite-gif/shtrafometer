import { sql } from '@vercel/postgres';
import { ensureSchema } from './db';
import type { Order, OrderStatus, ProductType, DomainHistory, DomainCheck, CheckLog } from './types';

// Auto-migrate on first call
let schemaReady = false;
async function ready(): Promise<void> {
  if (!schemaReady) {
    await ensureSchema();
    schemaReady = true;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Extract normalized domain from URL */
export function extractDomain(url: string): string {
  try {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    const hostname = new URL(normalized).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Map a DB row to an Order object */
function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    createdAt: (row.created_at as Date).toISOString(),
    name: row.name as string,
    phone: row.phone as string,
    email: (row.email as string) || '',
    siteUrl: (row.site_url as string) || '',
    domain: (row.domain as string) || '',
    violations: row.violations as number,
    totalMaxFine: row.total_max_fine as number,
    price: row.price as number,
    status: row.status as OrderStatus,
    productType: ((row.product_type as string) || 'fix') as ProductType,
    notes: (row.notes as string) || undefined,
    checkResult: (row.check_result as Order['checkResult']) || undefined,
    fixPlan: (row.fix_plan as Order['fixPlan']) || undefined,
  };
}

// ─── Read operations ────────────────────────────────────────────────

export async function getOrder(id: string): Promise<Order | null> {
  await ready();
  const { rows } = await sql`SELECT * FROM orders WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rowToOrder(rows[0]);
}

export async function getAllOrders(): Promise<Order[]> {
  await ready();
  const { rows } = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
  return rows.map(rowToOrder);
}

export async function getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
  await ready();
  const { rows } = await sql`SELECT * FROM orders WHERE status = ${status} ORDER BY created_at DESC`;
  return rows.map(rowToOrder);
}

export async function getOrdersByDomain(domain: string): Promise<Order[]> {
  await ready();
  const normalizedDomain = domain.toLowerCase();
  const { rows } = await sql`SELECT * FROM orders WHERE domain = ${normalizedDomain} ORDER BY created_at DESC`;
  return rows.map(rowToOrder);
}

export async function getDomainHistories(): Promise<DomainHistory[]> {
  await ready();
  const { rows } = await sql`
    SELECT domain,
           json_agg(json_build_object(
             'orderId', id,
             'checkedAt', created_at,
             'name', name,
             'email', email,
             'phone', phone,
             'violations', violations,
             'totalMaxFine', total_max_fine,
             'status', status
           ) ORDER BY created_at DESC) AS checks,
           MAX(created_at) AS last_checked_at,
           COUNT(*) AS total_orders
    FROM orders
    WHERE domain != ''
    GROUP BY domain
    ORDER BY MAX(created_at) DESC
  `;

  return rows.map((row) => ({
    domain: row.domain as string,
    checks: (row.checks as DomainCheck[]),
    lastCheckedAt: (row.last_checked_at as Date).toISOString(),
    totalOrders: Number(row.total_orders),
  }));
}

// ─── Write operations ───────────────────────────────────────────────

export async function saveOrder(order: Order): Promise<void> {
  await ready();
  await sql`
    INSERT INTO orders (id, created_at, name, phone, email, site_url, domain, violations, total_max_fine, price, status, product_type, notes, check_result, fix_plan)
    VALUES (
      ${order.id},
      ${order.createdAt},
      ${order.name},
      ${order.phone},
      ${order.email},
      ${order.siteUrl},
      ${order.domain},
      ${order.violations},
      ${order.totalMaxFine},
      ${order.price},
      ${order.status},
      ${order.productType || 'fix'},
      ${order.notes || null},
      ${order.checkResult ? JSON.stringify(order.checkResult) : null},
      ${order.fixPlan ? JSON.stringify(order.fixPlan) : null}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      site_url = EXCLUDED.site_url,
      domain = EXCLUDED.domain,
      violations = EXCLUDED.violations,
      total_max_fine = EXCLUDED.total_max_fine,
      price = EXCLUDED.price,
      status = EXCLUDED.status,
      product_type = EXCLUDED.product_type,
      notes = EXCLUDED.notes,
      check_result = EXCLUDED.check_result,
      fix_plan = EXCLUDED.fix_plan
  `;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  await ready();
  const { rows } = await sql`
    UPDATE orders SET status = ${status} WHERE id = ${id} RETURNING *
  `;
  if (rows.length === 0) return null;
  return rowToOrder(rows[0]);
}

export async function updateOrderNotes(id: string, notes: string): Promise<Order | null> {
  await ready();
  const { rows } = await sql`
    UPDATE orders SET notes = ${notes} WHERE id = ${id} RETURNING *
  `;
  if (rows.length === 0) return null;
  return rowToOrder(rows[0]);
}

const PRODUCT_PRICES: Record<ProductType, number> = {
  'fix': 9900,
  'report': 1990,
  'autofix-basic': 4990,
  'autofix-std': 9990,
  'autofix-prem': 14990,
  'monitoring': 490,
  'consulting': 15000,
  'email-lead': 0,
};

export async function createOrder(data: {
  name: string;
  phone: string;
  email?: string;
  siteUrl?: string;
  violations?: number;
  totalMaxFine?: number;
  productType?: ProductType;
  checkResult?: Order['checkResult'];
}): Promise<Order> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const productType = data.productType || 'fix';
  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    name: String(data.name).trim(),
    phone: String(data.phone).trim(),
    email: data.email ? String(data.email).trim() : '',
    siteUrl: data.siteUrl || '',
    domain: data.siteUrl ? extractDomain(data.siteUrl) : '',
    violations: data.violations || 0,
    totalMaxFine: data.totalMaxFine || 0,
    price: PRODUCT_PRICES[productType] ?? (() => { throw new Error(`Invalid product type: ${productType}`); })(),
    status: 'new',
    productType,
    checkResult: data.checkResult,
  };

  await saveOrder(order);
  return order;
}

// ─── Stats ──────────────────────────────────────────────────────────

export async function getStats(): Promise<{
  totalOrders: number;
  newOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  uniqueDomains: number;
}> {
  await ready();
  const { rows } = await sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'new') AS new_count,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
      COUNT(DISTINCT domain) FILTER (WHERE domain != '') AS unique_domains
    FROM orders
  `;

  const r = rows[0];
  return {
    totalOrders: Number(r.total),
    newOrders: Number(r.new_count),
    inProgressOrders: Number(r.in_progress_count),
    completedOrders: Number(r.completed_count),
    uniqueDomains: Number(r.unique_domains),
  };
}

// ─── Check Logs ────────────────────────────────────────────────────

function rowToCheckLog(row: Record<string, unknown>): CheckLog {
  return {
    id: row.id as string,
    createdAt: (row.created_at as Date).toISOString(),
    url: row.url as string,
    domain: (row.domain as string) || '',
    ip: (row.ip as string) || '',
    userAgent: (row.user_agent as string) || '',
    violations: row.violations as number,
    warnings: row.warnings as number,
    totalMaxFine: row.total_max_fine as number,
    siteType: (row.site_type as string) || 'unknown',
    riskLevel: (row.risk_level as string) || 'low',
    success: row.success as boolean,
    error: (row.error as string) || undefined,
    durationMs: row.duration_ms as number,
  };
}

export async function saveCheckLog(data: {
  url: string;
  ip: string;
  userAgent: string;
  violations: number;
  warnings: number;
  totalMaxFine: number;
  siteType: string;
  riskLevel: string;
  success: boolean;
  error?: string;
  durationMs: number;
}): Promise<void> {
  await ready();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const domain = extractDomain(data.url);
  await sql`
    INSERT INTO check_logs (id, url, domain, ip, user_agent, violations, warnings, total_max_fine, site_type, risk_level, success, error, duration_ms)
    VALUES (
      ${id}, ${data.url}, ${domain}, ${data.ip}, ${data.userAgent},
      ${data.violations}, ${data.warnings}, ${data.totalMaxFine},
      ${data.siteType}, ${data.riskLevel}, ${data.success},
      ${data.error || null}, ${data.durationMs}
    )
  `;
}

export async function getCheckLogs(opts?: {
  domain?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: CheckLog[]; total: number }> {
  await ready();
  const limit = opts?.limit || 100;
  const offset = opts?.offset || 0;

  if (opts?.domain) {
    const d = opts.domain.toLowerCase();
    const { rows: countRows } = await sql`SELECT COUNT(*) AS cnt FROM check_logs WHERE domain = ${d}`;
    const { rows } = await sql`
      SELECT * FROM check_logs WHERE domain = ${d}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    return { logs: rows.map(rowToCheckLog), total: Number(countRows[0].cnt) };
  }

  const { rows: countRows } = await sql`SELECT COUNT(*) AS cnt FROM check_logs`;
  const { rows } = await sql`
    SELECT * FROM check_logs ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
  `;
  return { logs: rows.map(rowToCheckLog), total: Number(countRows[0].cnt) };
}

export async function getCheckLogsStats(): Promise<{
  totalChecks: number;
  uniqueDomains: number;
  todayChecks: number;
  avgViolations: number;
}> {
  await ready();
  const { rows } = await sql`
    SELECT
      COUNT(*) AS total,
      COUNT(DISTINCT domain) FILTER (WHERE domain != '') AS unique_domains,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
      COALESCE(AVG(violations) FILTER (WHERE success = TRUE), 0) AS avg_violations
    FROM check_logs
  `;
  const r = rows[0];
  return {
    totalChecks: Number(r.total),
    uniqueDomains: Number(r.unique_domains),
    todayChecks: Number(r.today),
    avgViolations: Math.round(Number(r.avg_violations) * 10) / 10,
  };
}
