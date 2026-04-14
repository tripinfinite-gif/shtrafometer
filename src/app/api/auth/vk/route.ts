import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomBytes, createHash } from 'crypto';

// ─── GET /api/auth/vk ─────────────────────────────────────────────────
// Initiates VK ID OAuth 2.1 (PKCE) flow

export async function GET(request: NextRequest) {
  const clientId = process.env.VK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'VK OAuth не настроен' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get('returnUrl') || '/cabinet';
  const state = randomUUID();

  // PKCE: generate code_verifier and code_challenge
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shtrafometer.ru'}/api/auth/vk/callback`;

  const authUrl = new URL('https://id.vk.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'email');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl.toString());
  // Store state + verifier + returnUrl in cookies (5 min TTL)
  response.cookies.set('oauth_state_vk', JSON.stringify({ state, returnUrl }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });
  response.cookies.set('oauth_vk_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });
  return response;
}
