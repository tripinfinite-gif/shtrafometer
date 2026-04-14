import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// ─── GET /api/auth/yandex ─────────────────────────────────────────────
// Initiates Yandex ID OAuth 2.0 flow

export async function GET(request: NextRequest) {
  const clientId = process.env.YANDEX_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Yandex OAuth не настроен' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get('returnUrl') || '/cabinet';
  const state = randomUUID();

  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shtrafometer.ru'}/api/auth/yandex/callback`;

  const authUrl = new URL('https://oauth.yandex.ru/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'login:info login:email');
  authUrl.searchParams.set('force_confirm', 'no');

  const response = NextResponse.redirect(authUrl.toString());
  // Store state + returnUrl in cookie (5 min TTL)
  response.cookies.set('oauth_state_yandex', JSON.stringify({ state, returnUrl }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });
  return response;
}
