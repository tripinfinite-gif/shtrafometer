/**
 * GET /api/admin/ai/oauth/yandex/start
 *
 * Phase 3D — docs/plan-ai-consultant.md
 *
 * Инициирует OAuth 2.0 authorization-code flow с Яндексом.
 * Генерирует CSRF-state, кладёт в HttpOnly cookie (TTL 10 мин) и
 * редиректит пользователя на `https://oauth.yandex.ru/authorize`.
 *
 * Scopes регистрируются на стороне oauth.yandex.ru в настройках приложения
 * (direct:api, metrika:read, webmaster:hostinfo, webmaster:verify и т.д.).
 * Запрашивать `scope=` в URL не требуется — Яндекс выдаст тот набор,
 * который разрешён приложению.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { isAuthenticated } from '@/lib/auth';
import { getOAuthEnv } from '@/lib/env';

const STATE_COOKIE = 'yandex_oauth_state';
const STATE_TTL_SECONDS = 600; // 10 min

export async function GET(): Promise<Response> {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let env;
  try {
    env = getOAuthEnv();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: 'oauth_not_configured', details: msg },
      { status: 500 },
    );
  }

  const state = randomUUID();

  const authUrl = new URL('https://oauth.yandex.ru/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', env.YANDEX_DIRECT_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', env.YANDEX_DIRECT_REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('force_confirm', 'yes');

  const res = NextResponse.redirect(authUrl.toString());
  // HttpOnly, чтобы state нельзя было прочитать из JS.
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'lax' — чтобы cookie дошёл при редиректе обратно с oauth.yandex.ru
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  });
  // сохраним явно — next/headers cookies API на некоторых версиях Next требует
  // set на объекте ответа (сделано выше); доп. вызов ниже безопасен.
  void cookies;
  return res;
}
