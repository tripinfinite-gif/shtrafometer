import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { query } from '@/lib/db';

// GET /api/cabinet/orders/[id] — order details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const result = await query<Record<string, unknown>>(
    `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
    [id, user.id],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  }

  const order = result.rows[0];

  return NextResponse.json({ order });
}
