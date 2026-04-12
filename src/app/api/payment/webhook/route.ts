import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getOrder, saveOrder } from '@/lib/storage';
import { getPaymentPrice } from '@/lib/yookassa';
import { sendOrderConfirmation, sendAdminNotification } from '@/lib/email';

/**
 * YooKassa webhook handler.
 * Called when payment status changes (payment.succeeded, payment.canceled, etc.)
 * Docs: https://yookassa.ru/developers/using-api/webhooks
 */

const VALID_EVENTS = [
  'payment.succeeded',
  'payment.canceled',
  'payment.waiting_for_capture',
  'refund.succeeded',
] as const;

/** Verify webhook signature from YooKassa (HMAC-SHA256) */
function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!secretKey) return false;
  if (!signature) return false;

  const expected = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex');

  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
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
    const rawBody = await request.text();

    // Verify webhook signature (skip only if YOOKASSA_SKIP_SIGNATURE_CHECK=true for local testing)
    if (process.env.YOOKASSA_SKIP_SIGNATURE_CHECK !== 'true') {
      const signature = request.headers.get('X-Yookassa-Signature');
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.warn('[WEBHOOK] Invalid signature, rejecting');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const event = body.event;
    const payment = body.object;

    if (!event || !payment) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Validate event type
    if (!VALID_EVENTS.includes(event)) {
      console.warn(`[WEBHOOK] Unknown event type: ${event}`);
      return NextResponse.json({ ok: true });
    }

    const orderId = payment.metadata?.orderId;
    if (!orderId || typeof orderId !== 'string' || orderId.length > 50) {
      console.warn('[WEBHOOK] Invalid orderId in metadata:', payment.id);
      return NextResponse.json({ ok: true });
    }

    console.log(`[WEBHOOK] ${event}: order=${orderId}, payment=${payment.id}, status=${payment.status}`);

    if (event === 'payment.succeeded') {
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
      const receivedAmount = parseFloat(payment.amount?.value || '0');
      if (Math.abs(receivedAmount - order.price) > 0.01) {
        console.error(`[WEBHOOK] Amount mismatch: order=${orderId}, expected=${order.price}, received=${receivedAmount}`);
        return NextResponse.json({ ok: true });
      }

      // Update order status
      order.status = 'in_progress';
      await saveOrder(order);

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

    if (event === 'payment.canceled') {
      const order = await getOrder(orderId);
      if (order && order.status === 'new') {
        order.status = 'cancelled';
        await saveOrder(order);
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
