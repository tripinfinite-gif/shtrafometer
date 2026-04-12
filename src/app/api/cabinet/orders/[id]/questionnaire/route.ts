import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { query } from '@/lib/db';

// POST /api/cabinet/orders/[id]/questionnaire — save pre-payment questionnaire
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { ownerRole?: string; accessMethod?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { ownerRole, accessMethod } = body;

  if (!ownerRole || !accessMethod) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
  }

  // Verify order belongs to user
  const orderResult = await query<Record<string, unknown>>(
    `SELECT id FROM orders WHERE id = $1 AND user_id = $2`,
    [id, user.id],
  );

  if (orderResult.rows.length === 0) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  }

  // Check if user is a returning client (has completed orders)
  const completedOrders = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM orders WHERE user_id = $1 AND status = 'completed' AND id != $2`,
    [user.id, id],
  );
  const isReturning = Number(completedOrders.rows[0].cnt) > 0;
  const discount = isReturning ? 50 : 0;

  // Save questionnaire and discount
  await query(
    `UPDATE orders SET questionnaire = $1, discount_percent = $2 WHERE id = $3`,
    [JSON.stringify({ ownerRole, accessMethod, answeredAt: new Date().toISOString() }), discount, id],
  );

  return NextResponse.json({ success: true, discount });
}
