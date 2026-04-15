import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { findOrCreateOAuthUser, createUserSession, setSessionCookie } from '@/lib/user-auth';
import { publicUrl } from '@/lib/base-url';

// ─── GET /api/auth/vk/callback ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const deviceId = searchParams.get('device_id'); // VK ID sends this

  const loginUrl = '/auth/login?error=oauth_failed';

  if (error || !code || !state) {
    return NextResponse.redirect(publicUrl(request, loginUrl));
  }

  // Validate state
  const stateCookie = request.cookies.get('oauth_state_vk')?.value;
  const codeVerifier = request.cookies.get('oauth_vk_verifier')?.value;
  let returnUrl = '/cabinet';
  try {
    const stored = JSON.parse(stateCookie || '{}');
    if (stored.state !== state) {
      return NextResponse.redirect(publicUrl(request, loginUrl));
    }
    returnUrl = stored.returnUrl || '/cabinet';
  } catch {
    return NextResponse.redirect(publicUrl(request, loginUrl));
  }

  if (!codeVerifier) {
    return NextResponse.redirect(publicUrl(request, loginUrl));
  }

  const clientId = process.env.VK_CLIENT_ID!;
  const clientSecret = process.env.VK_CLIENT_SECRET!;
  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shtrafometer.ru'}/api/auth/vk/callback`;

  // Exchange code for token
  let accessToken: string;
  let userId: string;
  let email: string | undefined;
  try {
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      code_verifier: codeVerifier,
    };
    if (deviceId) body.device_id = deviceId;

    const tokenRes = await fetch('https://id.vk.com/oauth2/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[VK OAuth] Token exchange failed:', tokenData);
      return NextResponse.redirect(publicUrl(request, loginUrl));
    }
    accessToken = tokenData.access_token;
    userId = String(tokenData.user_id);
    email = tokenData.email || undefined;
  } catch (err) {
    console.error('[VK OAuth] Token request error:', err);
    return NextResponse.redirect(publicUrl(request, loginUrl));
  }

  // Get user info
  let name: string = 'Пользователь';
  try {
    const userRes = await fetch('https://id.vk.com/oauth2/user_info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: accessToken, client_id: clientId }),
    });
    const userData = await userRes.json();
    if (userRes.ok && userData.user) {
      const u = userData.user;
      name = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Пользователь';
      if (!email && u.email) email = u.email;
    }
  } catch (err) {
    console.error('[VK OAuth] User info error:', err);
    // Continue with userId and no name — not fatal
  }

  await ensureSchema();

  const { user } = await findOrCreateOAuthUser('vk', userId, name, email);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
  const userAgent = request.headers.get('user-agent')?.slice(0, 512);
  const sessionId = await createUserSession(user.id, ip, userAgent);
  const cookie = setSessionCookie(sessionId);

  const response = NextResponse.redirect(publicUrl(request, returnUrl));
  response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
  // Clear OAuth cookies
  response.cookies.set('oauth_state_vk', '', { maxAge: 0, path: '/' });
  response.cookies.set('oauth_vk_verifier', '', { maxAge: 0, path: '/' });
  return response;
}
