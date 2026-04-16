/**
 * GET /api/admin/ai/oauth/yandex/callback
 *
 * Phase 3D — docs/plan-ai-consultant.md
 *
 * Обработчик OAuth-callback от Яндекса. Шаги:
 *   1. Проверка admin-auth (isAuthenticated).
 *   2. Проверка state-cookie (CSRF).
 *   3. Обмен authorization code на access/refresh tokens (POST oauth.yandex.ru/token).
 *   4. Парсинг ответа через Zod.
 *   5. Сохранение токенов в pgcrypto-vault для каждого из 3 провайдеров
 *      (`yandex-direct`, `yandex-metrika`, `yandex-webmaster`) — одна OAuth-сессия
 *      Яндекса содержит merged scopes, но мы раскладываем по 3 записям,
 *      чтобы будущая независимая ротация/disconnect работал пер-провайдер.
 *   6. Редирект на `/admin/ai-consultant/connections?status=ok`.
 *
 * Никогда не логируем access_token/refresh_token.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isAuthenticated } from '@/lib/auth';
import { getOAuthEnv } from '@/lib/env';
import { ensureSchema } from '@/lib/db';
import { OAUTH_PROVIDERS, saveToken } from '@/lib/yandex/token-vault';

const STATE_COOKIE = 'yandex_oauth_state';

const YANDEX_TOKEN_URL = 'https://oauth.yandex.ru/token';

const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

function redirectToConnections(req: NextRequest, status: string, detail?: string): Response {
  const url = new URL('/admin/ai-consultant/connections', req.url);
  url.searchParams.set('status', status);
  if (detail) url.searchParams.set('detail', detail);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return redirectToConnections(req, 'error', `yandex:${error}`);
  }
  if (!code || !state) {
    return redirectToConnections(req, 'error', 'missing_code_or_state');
  }

  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;
  if (!stateCookie || stateCookie !== state) {
    return redirectToConnections(req, 'error', 'state_mismatch');
  }

  let env;
  try {
    env = getOAuthEnv();
  } catch {
    return redirectToConnections(req, 'error', 'oauth_not_configured');
  }

  // ─── Exchange code → tokens ───────────────────────────────────────
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: env.YANDEX_DIRECT_CLIENT_ID,
    client_secret: env.YANDEX_DIRECT_CLIENT_SECRET,
    redirect_uri: env.YANDEX_DIRECT_REDIRECT_URI,
  });

  let tokenJson: unknown;
  try {
    const resp = await fetch(YANDEX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      cache: 'no-store',
    });
    if (!resp.ok) {
      // Не логируем тело (может содержать секрет).
      return redirectToConnections(req, 'error', `token_exchange_http_${resp.status}`);
    }
    tokenJson = await resp.json();
  } catch {
    return redirectToConnections(req, 'error', 'token_exchange_failed');
  }

  const parsed = TokenResponseSchema.safeParse(tokenJson);
  if (!parsed.success) {
    return redirectToConnections(req, 'error', 'token_response_invalid');
  }
  const token = parsed.data;

  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000)
    : null;

  // ─── Persist: одна OAuth-сессия → 3 записи (по провайдерам) ───────
  try {
    await ensureSchema();
    for (const provider of OAUTH_PROVIDERS) {
      await saveToken('admin', provider, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? null,
        expiresAt,
        scope: token.scope ?? null,
        clientLogin: null,
      });
    }
  } catch {
    return redirectToConnections(req, 'error', 'persist_failed');
  }

  // Чистим state-cookie — он одноразовый.
  const res = redirectToConnections(req, 'ok');
  res.headers.append(
    'Set-Cookie',
    `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  );
  return res;
}
