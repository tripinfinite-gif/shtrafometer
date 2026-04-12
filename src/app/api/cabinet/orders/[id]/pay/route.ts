import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { query } from '@/lib/db';
import { createPayment } from '@/lib/yookassa';
import type { ProductType } from '@/lib/types';

// POST /api/cabinet/orders/[id]/pay — initiate payment for an order
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Atomic check-and-set: claim the order for payment (prevents double-payment race)
  const claimResult = await query<Record<string, unknown>>(
    `UPDATE orders
     SET payment_status = 'pending'
     WHERE id = $1 AND user_id = $2 AND (payment_status IS NULL OR payment_status = 'canceled')
     RETURNING id, product_type, price`,
    [id, user.id],
  );

  if (claimResult.rows.length === 0) {
    // Either not found, wrong user, or already being paid
    const checkResult = await query<Record<string, unknown>>(
      `SELECT payment_status FROM orders WHERE id = $1 AND user_id = $2`,
      [id, user.id],
    );
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }
    if (checkResult.rows[0].payment_status === 'succeeded') {
      return NextResponse.json({ error: 'Заказ уже оплачен' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Платёж уже создаётся' }, { status: 409 });
  }

  const order = claimResult.rows[0];
  const email = user.email || `${user.phone}@sms.placeholder`;

  try {
    const payment = await createPayment({
      orderId: id,
      productType: order.product_type as ProductType,
      email,
      returnUrl: `https://shtrafometer.ru/cabinet/orders/${id}`,
    });

    // Save payment ID
    await query(
      `UPDATE orders SET payment_id = $1 WHERE id = $2`,
      [payment.paymentId, id],
    );

    return NextResponse.json({
      success: true,
      paymentUrl: payment.confirmationUrl,
    });
  } catch (err) {
    // Reset payment_status on failure so user can retry
    await query(
      `UPDATE orders SET payment_status = NULL WHERE id = $1 AND payment_status = 'pending'`,
      [id],
    ).catch(() => {});
    console.error('[PAYMENT] Failed to create payment:', err);
    return NextResponse.json({ error: 'Ошибка создания платежа' }, { status: 500 });
  }
}
