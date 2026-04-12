import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { normalizePhone, isValidPhone, verifyOtp, createUserSession, setSessionCookie } from '@/lib/user-auth';

// ─── IP-based rate limiting for verify endpoint ─────────────────────

const verifyRateMap = new Map<string, { count: number; resetAt: number }>();
const VERIFY_MAX_REQUESTS = 10; // max verify attempts per IP per window
const VERIFY_RATE_WINDOW = 60_000; // 1 minute

function checkVerifyRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = verifyRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    verifyRateMap.set(ip, { count: 1, resetAt: now + VERIFY_RATE_WINDOW });
    // Cleanup old entries periodically
    if (verifyRateMap.size > 1000) {
      for (const [key, val] of verifyRateMap) {
        if (now > val.resetAt) verifyRateMap.delete(key);
      }
    }
    return true;
  }

  if (entry.count >= VERIFY_MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

// ─── POST /api/auth/verify-code ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (!checkVerifyRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Подождите минуту.' },
      { status: 429 },
    );
  }

  await ensureSchema();

  let body: { phone?: string; code?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { phone, code, name } = body;

  if (!phone || typeof phone !== 'string' || !isValidPhone(phone)) {
    return NextResponse.json({ error: 'Некорректный номер телефона' }, { status: 400 });
  }

  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Введите 6-значный код' }, { status: 400 });
  }

  const normalized = normalizePhone(phone);

  // Verify OTP
  const result = await verifyOtp(normalized, code, name?.trim()?.slice(0, 100));

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Create session
  const userAgent = request.headers.get('user-agent')?.slice(0, 512);
  const sessionId = await createUserSession(result.user!.id, ip, userAgent);

  // Set cookie
  const cookie = setSessionCookie(sessionId);
  const response = NextResponse.json({
    success: true,
    user: {
      id: result.user!.id,
      name: result.user!.name,
      phone: result.user!.phone,
      email: result.user!.email,
    },
    isNewUser: result.isNewUser,
  });

  response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);

  return response;
}
