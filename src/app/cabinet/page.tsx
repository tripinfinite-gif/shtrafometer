import { getCurrentUser } from '@/lib/user-auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { addUserSite, getUserSite, extractDomain } from '@/lib/user-storage';
import Link from 'next/link';
import AttachPreRegisterCheck from './attach-pre-register-check';

export default async function CabinetDashboard({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  // If arriving from a pre-registration check flow (?site=example.ru),
  // automatically attach the site to this account so it shows up below.
  const { site: rawSite } = await searchParams;
  let pendingAttachDomain: string | null = null;
  if (rawSite) {
    const domain = extractDomain(rawSite);
    if (domain && /^[a-zа-я0-9.-]+\.[a-zа-я]{2,}$/i.test(domain)) {
      try {
        await addUserSite(user.id, domain);
        // If the site has no check yet, let the client component attach the
        // localStorage result (or trigger a fresh check) and refresh.
        const existing = await getUserSite(user.id, domain);
        if (existing && !existing.lastCheckAt) {
          pendingAttachDomain = domain;
        }
      } catch (err) {
        console.error('[CABINET] Failed to auto-attach site:', err);
      }
    }
  }

  // Fetch user's sites
  const sitesResult = await query<Record<string, unknown>>(
    `SELECT domain, last_check_at, last_violations, last_max_fine
     FROM user_sites WHERE user_id = $1
     ORDER BY last_check_at DESC NULLS LAST LIMIT 5`,
    [user.id],
  );

  // Fetch active orders
  const ordersResult = await query<Record<string, unknown>>(
    `SELECT id, created_at, product_type, status, price, domain, payment_status
     FROM orders WHERE user_id = $1 AND status != 'cancelled'
     ORDER BY created_at DESC LIMIT 5`,
    [user.id],
  );

  const sites = sitesResult.rows;
  const orders = ordersResult.rows;
  const lastSite = sites[0];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Здравствуйте, {user.name}!
        </h1>
        <p className="text-gray-500 mt-1">
          {sites.length > 0
            ? `У вас ${sites.length} ${siteWord(sites.length)} на проверке`
            : 'Добавьте сайт для проверки на соответствие законам'}
        </p>
      </div>

      {/* Auto-attach pre-registration check result (runs client-side on mount) */}
      {pendingAttachDomain && <AttachPreRegisterCheck domain={pendingAttachDomain} />}

      {/* Email banner */}
      {!user.email && <EmailBanner />}

      {/* Last check card */}
      {lastSite && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Последняя проверка</h2>
            <StatusLight violations={Number(lastSite.last_violations) || 0} />
          </div>
          <p className="text-lg font-semibold text-gray-900">{lastSite.domain as string}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{Number(lastSite.last_violations) || 0} нарушений</span>
            <span>Штрафы до {formatMoney(Number(lastSite.last_max_fine) || 0)}</span>
          </div>
          <div className="flex gap-3 mt-4">
            <Link
              href={`/cabinet/sites/${encodeURIComponent(lastSite.domain as string)}`}
              className="px-4 py-2 rounded-lg bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5B4BD5] transition-colors"
            >
              Подробнее
            </Link>
            <Link
              href="/cabinet/sites"
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Все сайты
            </Link>
          </div>
        </div>
      )}

      {/* Active orders */}
      {orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Активные заказы</h2>
            <Link href="/cabinet/orders" className="text-sm text-[#6C5CE7] hover:underline">Все заказы</Link>
          </div>
          <div className="space-y-3">
            {orders.map(order => (
              <Link
                key={order.id as string}
                href={`/cabinet/orders/${order.id}`}
                className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{productLabel(order.product_type as string)}</p>
                  <p className="text-xs text-gray-400">{order.domain as string}</p>
                </div>
                <div className="text-right">
                  <OrderStatusBadge status={order.status as string} paymentStatus={order.payment_status as string} />
                  <p className="text-xs text-gray-400 mt-1">{formatMoney(Number(order.price) || 0)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/cabinet/sites"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-[#6C5CE7]/30 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Проверить сайт</p>
            <p className="text-xs text-gray-400">Бесплатная проверка</p>
          </div>
        </Link>

        <Link
          href="/cabinet/orders"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-[#6C5CE7]/30 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.5"><path d="M9 12l2 2 4-4M22 12A10 10 0 112 12a10 10 0 0120 0z"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Заказать услугу</p>
            <p className="text-xs text-gray-400">Отчёт, автофикс, консалтинг</p>
          </div>
        </Link>

        <Link
          href="/cabinet/settings"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-[#6C5CE7]/30 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Настройки</p>
            <p className="text-xs text-gray-400">Email, профиль</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────

function EmailBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" className="mt-0.5 shrink-0">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <path d="M22 6l-10 7L2 6"/>
      </svg>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">Укажите email</p>
        <p className="text-xs text-amber-600 mt-0.5">Чтобы получать отчёты, чеки и уведомления о новых нарушениях</p>
      </div>
      <Link href="/cabinet/settings?focus=email" className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 underline">
        Добавить
      </Link>
    </div>
  );
}

function StatusLight({ violations }: { violations: number }) {
  const color = violations === 0 ? 'bg-green-500' : violations < 5 ? 'bg-yellow-500' : 'bg-red-500';
  return <div className={`w-3 h-3 rounded-full ${color}`} />;
}

function OrderStatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string | null }) {
  if (paymentStatus === 'succeeded' || status === 'in_progress') {
    return <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">В работе</span>;
  }
  if (status === 'completed') {
    return <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Выполнен</span>;
  }
  if (status === 'new' && !paymentStatus) {
    return <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Ожидает оплаты</span>;
  }
  return <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{status}</span>;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return amount.toLocaleString('ru-RU') + ' \u20BD';
}

function siteWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'сайт';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'сайта';
  return 'сайтов';
}

function productLabel(type: string): string {
  const labels: Record<string, string> = {
    'report': 'PDF-отчёт',
    'autofix-basic': 'Автоисправление (базовый)',
    'autofix-std': 'Автоисправление (все нарушения)',
    'autofix-prem': 'Автоисправление + проверка',
    'monitoring': 'Мониторинг',
    'consulting': 'Консалтинг',
    'fix': 'Исправление нарушений',
    'email-lead': 'Бесплатный отчёт',
  };
  return labels[type] || type;
}
