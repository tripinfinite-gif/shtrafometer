import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/user-auth';
import { ensureSchema, query } from '@/lib/db';
import { getPaymentPrice } from '@/lib/yookassa';
import { getUserSite } from '@/lib/user-storage';

const VALID_PRODUCTS = ['report', 'autofix-basic', 'autofix-std', 'autofix-prem', 'monitoring', 'consulting'];

// GET /api/cabinet/orders — list user's orders
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  let sql = `SELECT id, created_at, product_type, status, price, domain, payment_status, paid_at, site_url
             FROM orders WHERE user_id = $1`;
  const params: unknown[] = [user.id];

  if (status && status !== 'all') {
    sql += ` AND status = $2`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC`;

  const result = await query<Record<string, unknown>>(sql, params);
  return NextResponse.json({ orders: result.rows });
}

// POST /api/cabinet/orders — create a new order from cabinet
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { productType?: string; domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { productType, domain } = body;

  if (!productType || !VALID_PRODUCTS.includes(productType)) {
    return NextResponse.json({ error: 'Выберите услугу' }, { status: 400 });
  }

  if (!domain) {
    return NextResponse.json({ error: 'Укажите домен' }, { status: 400 });
  }

  await ensureSchema();

  const price = getPaymentPrice(productType);
  if (!price) {
    return NextResponse.json({ error: 'Неизвестная услуга' }, { status: 400 });
  }

  // Get site data for violations/fine
  const site = await getUserSite(user.id, domain);
  const violations = site?.lastViolations || 0;
  const totalMaxFine = site?.lastMaxFine || 0;
  const checkResult = site?.lastCheckResult || null;

  const orderId = randomUUID();

  await query(
    `INSERT INTO orders (id, user_id, name, phone, email, site_url, domain, violations, total_max_fine, price, status, product_type, check_result)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'new', $11, $12)`,
    [
      orderId,
      user.id,
      user.name,
      user.phone,
      user.email || '',
      `https://${domain}`,
      domain,
      violations,
      totalMaxFine,
      price,
      productType,
      checkResult ? JSON.stringify(checkResult) : null,
    ],
  );

  return NextResponse.json({ success: true, orderId });
}
