import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@/lib/yookassa';
import { createOrder } from '@/lib/storage';
import type { ProductType } from '@/lib/types';

// ─── Validation ────────────────────────────────────────────────────

const VALID_PRODUCT_TYPES: ProductType[] = [
  'fix', 'report', 'autofix-basic', 'autofix-std',
  'autofix-prem', 'monitoring', 'consulting', 'email-lead',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s\-+()]{7,20}$/;

function sanitize(str: string): string {
  return String(str).trim().slice(0, 200);
}

// ─── Rate limiting (in-memory, per IP) ─────────────────────────────

const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// ─── Handler ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: 'Слишком много запросов. Подождите минуту.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, phone, email, siteUrl, violations, totalMaxFine, productType, checkResult } = body;

    // Input validation
    if (!email || !EMAIL_RE.test(String(email))) {
      return NextResponse.json({ error: 'Укажите корректный email' }, { status: 400 });
    }
    if (!name || String(name).trim().length < 1) {
      return NextResponse.json({ error: 'Укажите имя' }, { status: 400 });
    }
    if (!phone || !PHONE_RE.test(String(phone))) {
      return NextResponse.json({ error: 'Укажите корректный телефон' }, { status: 400 });
    }
    if (!productType || !VALID_PRODUCT_TYPES.includes(productType as ProductType)) {
      return NextResponse.json({ error: 'Некорректный тип продукта' }, { status: 400 });
    }

    // Create order first
    const order = await createOrder({
      name: sanitize(name),
      phone: sanitize(phone),
      email: sanitize(email),
      siteUrl: siteUrl ? sanitize(siteUrl) : undefined,
      violations: typeof violations === 'number' ? violations : 0,
      totalMaxFine: typeof totalMaxFine === 'number' ? totalMaxFine : 0,
      productType: productType as ProductType,
      checkResult,
    });

    // Free leads don't need payment
    if (productType === 'email-lead') {
      return NextResponse.json({
        success: true,
        orderId: order.id,
      });
    }

    // Create YooKassa payment
    const { paymentId, confirmationUrl } = await createPayment({
      orderId: order.id,
      productType: productType as ProductType,
      email: sanitize(email),
    });

    console.log(`[PAYMENT] Created: order=${order.id}, payment=${paymentId}, product=${productType}`);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentUrl: confirmationUrl,
    });
  } catch (error) {
    console.error('[PAYMENT] Error:', error);
    return NextResponse.json(
      { error: 'Ошибка создания платежа. Попробуйте позже.' },
      { status: 500 },
    );
  }
}
