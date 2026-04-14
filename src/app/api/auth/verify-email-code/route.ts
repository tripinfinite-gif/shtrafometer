import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { verifyEmailOtp, createUserSession, setSessionCookie } from '@/lib/user-auth';

// ─── IP-based rate limiting ───────────────────────────────────────────

const verifyRateMap = new Map<string, { count: number; resetAt: number }>();
const VERIFY_MAX = 10;
const VERIFY_WINDOW = 60_000;

function checkVerifyRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = verifyRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    verifyRateMap.set(ip, { count: 1, resetAt: now + VERIFY_WINDOW });
    if (verifyRateMap.size > 1000) {
      for (const [k, v] of verifyRateMap) { if (now > v.resetAt) verifyRateMap.delete(k); }
    }
    return true;
  }
  if (entry.count >= VERIFY_MAX) return false;
  entry.count++;
  return true;
}

// ─── POST /api/auth/verify-email-code ────────────────────────────────

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkVerifyRateLimit(ip)) {
    return NextResponse.json({ error: 'Слишком много попыток. Подождите минуту.' }, { status: 429 });
  }

  await ensureSchema();

  let body: { email?: string; code?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, code, name } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Укажите email' }, { status: 400 });
  }
  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Введите 6-значный код' }, { status: 400 });
  }

  const result = await verifyEmailOtp(email.trim().toLowerCase(), code, name?.trim()?.slice(0, 100));
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const userAgent = request.headers.get('user-agent')?.slice(0, 512);
  const sessionId = await createUserSession(result.user!.id, ip, userAgent);
  const cookie = setSessionCookie(sessionId);

  const response = NextResponse.json({
    success: true,
    user: {
      id: result.user!.id,
      name: result.user!.name,
      email: result.user!.email,
    },
    isNewUser: result.isNewUser,
  });
  response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
  return response;
}
