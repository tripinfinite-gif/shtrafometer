import { NextRequest, NextResponse } from 'next/server';
import { getOrder, saveOrder } from '@/lib/storage';
import { sendOrderConfirmation, sendAdminNotification } from '@/lib/email';

/**
 * YooKassa webhook handler.
 * Called when payment status changes (payment.succeeded, payment.canceled, etc.)
 * Docs: https://yookassa.ru/developers/using-api/webhooks
 *
 * Security: YooKassa does not sign webhook requests. We verify each payment
 * by fetching it directly from the YooKassa API before acting on the event.
 */

const VALID_EVENTS = [
  'payment.succeeded',
  'payment.canceled',
  'payment.waiting_for_capture',
  'refund.succeeded',
] as const;

/** Fetch and verify payment status directly from YooKassa API */
async function fetchPaymentFromApi(paymentId: string): Promise<Record<string, unknown> | null> {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) return null;

  try {
    const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${shopId}:${secretKey}`),
      },
    });
    if (!response.ok) return null;
    return response.json() as Promise<Record<string, unknown>>;
  } catch {
    return null;
  }
}

/** Simple IP-based rate limiting for webhook endpoint */
const webhookRateMap = new Map<string, { count: number; resetAt: number }>();
const WEBHOOK_RATE_LIMIT = 30; // max requests per window
const WEBHOOK_RATE_WINDOW = 60_000; // 1 minute

function isWebhookRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = webhookRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    webhookRateMap.set(ip, { count: 1, resetAt: now + WEBHOOK_RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > WEBHOOK_RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isWebhookRateLimited(clientIp)) {
    console.warn(`[WEBHOOK] Rate limited: ${clientIp}`);
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const event = body.event as string | undefined;
    const payload = body.object as Record<string, unknown> | undefined;

    if (!event || !payload) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Validate event type
    if (!VALID_EVENTS.includes(event as typeof VALID_EVENTS[number])) {
      console.warn(`[WEBHOOK] Unknown event type: ${event}`);
      return NextResponse.json({ ok: true });
    }

    const paymentId = payload.id as string | undefined;
    const orderId = (payload.metadata as Record<string, unknown> | undefined)?.orderId as string | undefined;

    if (!paymentId || !orderId || typeof orderId !== 'string' || orderId.length > 50) {
      console.warn('[WEBHOOK] Invalid payload structure:', paymentId, orderId);
      return NextResponse.json({ ok: true });
    }

    console.log(`[WEBHOOK] ${event}: order=${orderId}, payment=${paymentId}`);

    // Verify payment status by fetching directly from YooKassa API
    // This is the standard security pattern since YooKassa does not sign webhook requests
    const verifiedPayment = await fetchPaymentFromApi(paymentId);
    if (!verifiedPayment) {
      console.error(`[WEBHOOK] Failed to verify payment ${paymentId} with YooKassa API`);
      // Return 500 so YooKassa retries
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
    }

    const verifiedStatus = verifiedPayment.status as string;
    const verifiedMetaOrderId = (verifiedPayment.metadata as Record<string, unknown> | undefined)?.orderId as string | undefined;

    // Double-check orderId matches between webhook payload and verified payment
    if (verifiedMetaOrderId !== orderId) {
      console.error(`[WEBHOOK] OrderId mismatch: webhook=${orderId}, api=${verifiedMetaOrderId}`);
      return NextResponse.json({ ok: true });
    }

    console.log(`[WEBHOOK] Verified payment ${paymentId}: status=${verifiedStatus}`);

    if (event === 'payment.succeeded' && verifiedStatus === 'succeeded') {
      const order = await getOrder(orderId);
      if (!order) {
        console.warn(`[WEBHOOK] Order not found: ${orderId}`);
        return NextResponse.json({ ok: true });
      }

      // Prevent double-processing
      if (order.status !== 'new') {
        console.warn(`[WEBHOOK] Order ${orderId} already processed (status=${order.status}), skipping`);
        return NextResponse.json({ ok: true });
      }

      // Verify payment amount matches order price
      const verifiedAmount = verifiedPayment.amount as { value: string } | undefined;
      const receivedAmount = parseFloat(verifiedAmount?.value || '0');
      if (Math.abs(receivedAmount - order.price) > 0.01) {
        console.error(`[WEBHOOK] Amount mismatch: order=${orderId}, expected=${order.price}, received=${receivedAmount}`);
        return NextResponse.json({ ok: true });
      }

      // Update order status + payment fields
      order.status = 'in_progress';
      await saveOrder(order);

      await import('@/lib/db').then(({ query: q }) =>
        q(`UPDATE orders SET payment_status = 'succeeded', paid_at = NOW(), payment_id = $1 WHERE id = $2`,
          [paymentId, orderId])
      ).catch(err => console.error('[WEBHOOK] Failed to update payment fields:', err));

      // Send confirmation emails (fire-and-forget)
      if (order.email) {
        sendOrderConfirmation(order.email, {
          orderId: order.id,
          name: order.name,
          productType: order.productType || 'fix',
          siteUrl: order.siteUrl,
          price: order.price,
        }).catch(err => console.error('[WEBHOOK] Email to client failed:', err));

        sendAdminNotification({
          orderId: order.id,
          name: order.name,
          email: order.email,
          phone: order.phone,
          productType: order.productType || 'fix',
          siteUrl: order.siteUrl,
          violations: order.violations,
          totalMaxFine: order.totalMaxFine,
        }).catch(err => console.error('[WEBHOOK] Admin email failed:', err));
      }

      console.log(`[WEBHOOK] Order ${orderId} marked as in_progress, emails sent`);
    }

    if (event === 'payment.canceled' && verifiedStatus === 'canceled') {
      const order = await getOrder(orderId);
      if (order && order.status === 'new') {
        order.status = 'cancelled';
        await saveOrder(order);
        await import('@/lib/db').then(({ query: q }) =>
          q(`UPDATE orders SET payment_status = 'canceled' WHERE id = $1`, [orderId])
        ).catch(() => {});
        console.log(`[WEBHOOK] Order ${orderId} cancelled`);
      }
    }

    if (event === 'refund.succeeded') {
      const order = await getOrder(orderId);
      if (order) {
        order.status = 'cancelled';
        await saveOrder(order);
        console.log(`[WEBHOOK] Order ${orderId} refunded → cancelled`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    // Return 500 so YooKassa retries the webhook
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
