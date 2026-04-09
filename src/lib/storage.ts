import { sql } from '@vercel/postgres';
import { ensureSchema } from './db';
import type { Order, OrderStatus, ProductType, DomainHistory, DomainCheck } from './types';

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
    price: PRODUCT_PRICES[productType] ?? 9900,
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
