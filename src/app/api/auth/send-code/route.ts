import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { normalizePhone, isValidPhone, checkOtpRateLimit, sendOtp } from '@/lib/user-auth';

// ─── IP-based rate limiting (in-memory) ─────────────────────────────

const ipRequests = new Map<string, { count: number; resetAt: number }>();
const IP_MAX_REQUESTS = 5;
const IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    // Cleanup expired entries periodically
    if (ipRequests.size > 1000) {
      for (const [key, val] of ipRequests) {
        if (now > val.resetAt) ipRequests.delete(key);
      }
    }
    return true;
  }

  if (entry.count >= IP_MAX_REQUESTS) return false;

  entry.count++;
  return true;
}

// ─── POST /api/auth/send-code ───────────────────────────────────────

export async function POST(request: NextRequest) {
  await ensureSchema();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // IP rate limit
  if (!checkIpRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429 },
    );
  }

  let body: { phone?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { phone, name } = body;

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Укажите номер телефона' }, { status: 400 });
  }

  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: 'Некорректный номер телефона' }, { status: 400 });
  }

  const normalized = normalizePhone(phone);

  // Phone rate limit
  const rateCheck = await checkOtpRateLimit(normalized, ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Подождите перед повторной отправкой', retryAfter: rateCheck.retryAfter },
      { status: 429 },
    );
  }

  // Send OTP
  const result = await sendOtp(normalized);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    retryAfter: 60,
    phone: normalized,
  });
}
