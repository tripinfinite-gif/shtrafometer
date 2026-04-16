/**
 * POST /api/admin/ai/oauth/yandex/disconnect
 *
 * Phase 3D — docs/plan-ai-consultant.md
 *
 * Удаляет сохранённые OAuth-токены. Тело запроса:
 *   { provider?: 'yandex-direct' | 'yandex-metrika' | 'yandex-webmaster' | 'all' }
 * По умолчанию (без тела) — удаляет токены всех 3 провайдеров (полное отключение).
 *
 * Токены Яндекса мы при этом НЕ отзываем через API (у Яндекса нет надёжного
 * revoke endpoint для third-party OAuth-приложений — пользователь может
 * отозвать доступ вручную в https://id.yandex.ru/security/access).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isAuthenticated } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import {
  OAUTH_PROVIDERS,
  deleteToken,
  type OAuthProvider,
} from '@/lib/yandex/token-vault';

const BodySchema = z
  .object({
    provider: z
      .enum(['yandex-direct', 'yandex-metrika', 'yandex-webmaster', 'all'])
      .optional(),
  })
  .optional();

export async function POST(req: NextRequest): Promise<Response> {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let providerArg: 'all' | OAuthProvider = 'all';
  try {
    const raw = await req.json().catch(() => undefined);
    const parsed = BodySchema.safeParse(raw);
    if (parsed.success && parsed.data?.provider) {
      providerArg = parsed.data.provider;
    }
  } catch {
    /* empty body is fine */
  }

  try {
    await ensureSchema();
    if (providerArg === 'all') {
      for (const p of OAUTH_PROVIDERS) await deleteToken('admin', p);
    } else {
      await deleteToken('admin', providerArg);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'disconnect_failed', details: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
