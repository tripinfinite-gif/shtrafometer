/**
 * Server component: компактная сводка подключений Яндекса,
 * отображается над чатом на `/admin/ai-consultant`.
 * Phase 3D.
 */

import { ensureSchema } from '@/lib/db';
import { listConnections, type OAuthProvider } from '@/lib/yandex/token-vault';

const LABELS: Record<OAuthProvider, string> = {
  'yandex-direct': 'Директ',
  'yandex-metrika': 'Метрика',
  'yandex-webmaster': 'Вебмастер',
};

export default async function ConnectionsBanner() {
  let connected: Record<OAuthProvider, boolean> = {
    'yandex-direct': false,
    'yandex-metrika': false,
    'yandex-webmaster': false,
  };
  try {
    await ensureSchema();
    const conns = await listConnections('admin');
    connected = Object.fromEntries(conns.map((c) => [c.provider, c.connected])) as Record<
      OAuthProvider,
      boolean
    >;
  } catch {
    // Silent: если БД недоступна — не роняем страницу консультанта.
  }

  const allConnected =
    connected['yandex-direct'] && connected['yandex-metrika'] && connected['yandex-webmaster'];
  const anyConnected =
    connected['yandex-direct'] || connected['yandex-metrika'] || connected['yandex-webmaster'];

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-800">Подключения Яндекса:</span>
          {(Object.keys(LABELS) as OAuthProvider[]).map((p) => (
            <span
              key={p}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                connected[p]
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  connected[p] ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              {LABELS[p]}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {!allConnected && (
            <a
              href="/api/admin/ai/oauth/yandex/start"
              className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              {anyConnected ? 'Переподключить' : 'Подключить Яндекс'}
            </a>
          )}
          <a
            href="/admin/ai-consultant/connections"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Управление
          </a>
        </div>
      </div>
    </div>
  );
}
