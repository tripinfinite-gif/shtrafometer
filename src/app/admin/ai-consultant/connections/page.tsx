/**
 * /admin/ai-consultant/connections
 *
 * Phase 3D — docs/plan-ai-consultant.md
 *
 * Server component: показывает статус OAuth-подключений Яндекса
 * (Директ / Метрика / Вебмастер). Кнопки «Подключить все» и «Отключить»
 * вызывают OAuth-роуты.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import {
  listConnections,
  type ConnectionStatus,
  type OAuthProvider,
} from '@/lib/yandex/token-vault';
import ConnectionsClient from './ConnectionsClient';

export const metadata: Metadata = {
  title: 'Подключения — AI-консультант — Штрафометр',
  robots: 'noindex',
};

export const dynamic = 'force-dynamic';

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  'yandex-direct': 'Яндекс.Директ',
  'yandex-metrika': 'Яндекс.Метрика',
  'yandex-webmaster': 'Яндекс.Вебмастер',
};

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; detail?: string }>;
}) {
  if (!(await isAuthenticated())) {
    redirect('/admin/login');
  }

  await ensureSchema();
  const connections: ConnectionStatus[] = await listConnections('admin');
  const allConnected = connections.every((c) => c.connected);
  const sp = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/admin/ai-consultant" className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-lg">Штрафометр</span>
            <span className="text-sm text-gray-500">/ AI-консультант / Подключения</span>
          </a>
          <a
            href="/admin/ai-consultant"
            className="text-sm text-gray-500 hover:text-primary transition-colors"
          >
            ← К консультанту
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
            Подключения к Яндексу
          </h1>
          <p className="mt-2 text-gray-500 text-sm sm:text-base">
            OAuth 2.0-доступ к API Директа, Метрики и Вебмастера. Токены шифруются
            в базе (pgcrypto) и используются AI-консультантом при ответах на вопросы
            о реальной статистике кабинетов.
          </p>
        </header>

        {sp?.status === 'ok' && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Подключение успешно сохранено.
          </div>
        )}
        {sp?.status === 'error' && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Не удалось завершить подключение
            {sp.detail ? <span className="font-mono"> ({sp.detail})</span> : null}.
            Попробуйте ещё раз.
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-gray-900">Единое подключение Яндекса</div>
              <div className="text-sm text-gray-500 mt-1">
                Один OAuth-flow выдаёт доступ ко всем трём сервисам сразу (Директ,
                Метрика, Вебмастер) — scopes настроены в приложении на oauth.yandex.ru.
              </div>
            </div>
            <div className="shrink-0 flex gap-2">
              <a
                href="/api/admin/ai/oauth/yandex/start"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                {allConnected ? 'Переподключить' : 'Подключить всё'}
              </a>
              {allConnected && <ConnectionsClient action="disconnect-all" />}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {connections.map((c) => {
              const days = daysUntil(c.expiresAt);
              return (
                <li key={c.provider} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      {PROVIDER_LABELS[c.provider]}
                    </div>
                    <div className="text-sm mt-0.5">
                      {c.connected ? (
                        <span className="text-green-700">
                          Подключено
                          {days !== null
                            ? ` — токен истекает через ${days} ${pluralDays(days)}`
                            : ''}
                        </span>
                      ) : (
                        <span className="text-gray-500">Не подключено</span>
                      )}
                    </div>
                    {c.scope && (
                      <div className="mt-1 text-xs text-gray-400 font-mono truncate">
                        scopes: {c.scope}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {c.connected ? (
                      <ConnectionsClient action="disconnect" provider={c.provider} />
                    ) : (
                      <a
                        href="/api/admin/ai/oauth/yandex/start"
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Подключить
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Токены хранятся зашифрованно через pgcrypto (ключ — в переменной
          окружения AI_TOKEN_ENCRYPTION_KEY). Отзыв доступа также возможен
          вручную на{' '}
          <a
            href="https://id.yandex.ru/security/access"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            id.yandex.ru/security/access
          </a>
          .
        </p>
      </main>
    </div>
  );
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
  return 'дней';
}
