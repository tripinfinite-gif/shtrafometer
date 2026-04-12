import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { getUserSite } from '@/lib/user-storage';
import { query } from '@/lib/db';

// GET /api/cabinet/sites/[domain] — site details + orders for this domain
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);

  const site = await getUserSite(user.id, decodedDomain);
  if (!site) {
    return NextResponse.json({ error: 'Сайт не найден' }, { status: 404 });
  }

  // Fetch orders for this domain
  const ordersResult = await query<Record<string, unknown>>(
    `SELECT id, created_at, product_type, status, price, payment_status, paid_at
     FROM orders
     WHERE user_id = $1 AND domain = $2
     ORDER BY created_at DESC`,
    [user.id, decodedDomain],
  );

  return NextResponse.json({
    site,
    orders: ordersResult.rows,
  });
}
