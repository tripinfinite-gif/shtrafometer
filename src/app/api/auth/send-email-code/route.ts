import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { checkEmailOtpRateLimit, sendEmailOtp } from '@/lib/user-auth';

// ─── IP-based rate limiting (in-memory) ──────────────────────────────

const ipRequests = new Map<string, { count: number; resetAt: number }>();
const IP_MAX = 5;
const IP_WINDOW_MS = 10 * 60 * 1000;

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    if (ipRequests.size > 1000) {
      for (const [k, v] of ipRequests) { if (now > v.resetAt) ipRequests.delete(k); }
    }
    return true;
  }
  if (entry.count >= IP_MAX) return false;
  entry.count++;
  return true;
}

// ─── POST /api/auth/send-email-code ─────────────────────────────────

export async function POST(request: NextRequest) {
  await ensureSchema();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkIpRateLimit(ip)) {
    return NextResponse.json({ error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 });
  }

  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, name } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Укажите email' }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
  }

  const rateCheck = await checkEmailOtpRateLimit(normalized);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Подождите перед повторной отправкой', retryAfter: rateCheck.retryAfter },
      { status: 429 },
    );
  }

  const result = await sendEmailOtp(normalized);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, retryAfter: 60 });
}
