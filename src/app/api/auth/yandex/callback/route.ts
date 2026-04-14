import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { findOrCreateOAuthUser, createUserSession, setSessionCookie } from '@/lib/user-auth';

// ─── GET /api/auth/yandex/callback ────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const loginUrl = '/auth/login?error=oauth_failed';

  if (error || !code || !state) {
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  // Validate state
  const stateCookie = request.cookies.get('oauth_state_yandex')?.value;
  let returnUrl = '/cabinet';
  try {
    const stored = JSON.parse(stateCookie || '{}');
    if (stored.state !== state) {
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
    returnUrl = stored.returnUrl || '/cabinet';
  } catch {
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  const clientId = process.env.YANDEX_CLIENT_ID!;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET!;
  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shtrafometer.ru'}/api/auth/yandex/callback`;

  // Exchange code for token
  let accessToken: string;
  try {
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Yandex OAuth] Token exchange failed:', tokenData);
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('[Yandex OAuth] Token request error:', err);
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  // Get user info
  let providerId: string;
  let name: string;
  let email: string | undefined;
  try {
    const userRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    const userData = await userRes.json();
    if (!userRes.ok || !userData.id) {
      console.error('[Yandex OAuth] User info failed:', userData);
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
    providerId = String(userData.id);
    name = userData.real_name || userData.display_name || userData.login || 'Пользователь';
    email = userData.default_email || undefined;
  } catch (err) {
    console.error('[Yandex OAuth] User info error:', err);
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  await ensureSchema();

  const { user } = await findOrCreateOAuthUser('yandex', providerId, name, email);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
  const userAgent = request.headers.get('user-agent')?.slice(0, 512);
  const sessionId = await createUserSession(user.id, ip, userAgent);
  const cookie = setSessionCookie(sessionId);

  const response = NextResponse.redirect(new URL(returnUrl, request.url));
  response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
  // Clear state cookie
  response.cookies.set('oauth_state_yandex', '', { maxAge: 0, path: '/' });
  return response;
}
