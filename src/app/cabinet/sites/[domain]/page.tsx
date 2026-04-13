'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CheckResponse } from '@/checks/types';

type Tab = 'overview' | 'check' | 'history' | 'services';

interface SiteData {
  site: {
    domain: string;
    lastCheckAt: string | null;
    lastViolations: number;
    lastMaxFine: number;
    lastCheckResult: CheckResponse | null;
  };
  orders: Array<{
    id: string;
    created_at: string;
    product_type: string;
    status: string;
    price: number;
    payment_status: string | null;
  }>;
}

interface HistoryEntry {
  id: string;
  checkedAt: string;
  violations: number;
  warnings: number;
  totalMaxFine: number;
  complianceScore: number;
  newViolations: number;
  fixedViolations: number;
  recurringViolations: number;
}

const PRODUCTS = [
  { type: 'report', label: 'PDF-\u043e\u0442\u0447\u0451\u0442 \u0434\u043b\u044f \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u0430', desc: '\u0412\u0441\u0435 \u043d\u0430\u0440\u0443\u0448\u0435\u043d\u0438\u044f + \u043f\u043e\u0448\u0430\u0433\u043e\u0432\u044b\u0435 \u0438\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u0438', price: '1 990' },
  { type: 'autofix-std', label: '\u0418\u0441\u043f\u0440\u0430\u0432\u0438\u043c \u0437\u0430 \u0432\u0430\u0441', desc: '\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0430\u0440\u0443\u0448\u0435\u043d\u0438\u0439', price: '9 990' },
  { type: 'monitoring', label: '\u0417\u0430\u0449\u0438\u0442\u0430 \u043e\u0442 \u0448\u0442\u0440\u0430\u0444\u043e\u0432', desc: '\u0415\u0436\u0435\u043c\u0435\u0441\u044f\u0447\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 + \u043e\u0442\u0447\u0451\u0442 \u043d\u0430 email', price: '490/\u043c\u0435\u0441' },
];

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const domain = decodeURIComponent(params.domain as string);

  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<SiteData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [ordering, setOrdering] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null);

  useEffect(() => {
    fetch(`/api/cabinet/sites/${encodeURIComponent(domain)}`)
      .then(r => r.json())
      .then(d => { setData(d); setCheckResult(d.site?.lastCheckResult || null); setLoading(false); });
  }, [domain]);

  useEffect(() => {
    if (tab === 'history') {
      fetch(`/api/cabinet/sites/${encodeURIComponent(domain)}/history`)
        .then(r => r.json())
        .then(d => setHistory(d.history || []));
    }
  }, [tab, domain]);

  async function handleCheck() {
    setChecking(true);
    setTab('check');
    try {
      const res = await fetch(`/api/cabinet/sites/${encodeURIComponent(domain)}/check`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        setCheckResult(d.result);
        // Refresh site data
        const updated = await fetch(`/api/cabinet/sites/${encodeURIComponent(domain)}`);
        setData(await updated.json());
      }
    } catch { /* ignore */ }
    setChecking(false);
  }

  async function handleOrder(productType: string) {
    setOrdering(productType);
    try {
      const res = await fetch('/api/cabinet/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, domain }),
      });
      const result = await res.json();
      if (res.ok && result.orderId) router.push(`/cabinet/orders/${result.orderId}`);
    } catch { /* ignore */ }
    setOrdering(null);
  }

  if (loading) return <div className="text-gray-400 text-center py-12">Загрузка...</div>;
  if (!data?.site) return <div className="text-gray-400 text-center py-12">Сайт не найден</div>;

  const { site, orders } = data;
  const score = checkResult?.complianceScore ?? 0;
  const siteInfo = checkResult?.siteInfo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cabinet/sites" className="text-sm text-gray-400 hover:text-gray-600">&larr; Все сайты</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{domain}</h1>
          {siteInfo && (
            <p className="text-sm text-gray-500 mt-0.5">
              {siteInfo.cmsLabel} &middot; ~{siteInfo.estimatedPages} стр. &middot; {siteInfo.formsWithPdCount} форм
            </p>
          )}
        </div>
        <button onClick={handleCheck} disabled={checking}
          className="px-4 py-2 rounded-lg bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5B4BD5] disabled:opacity-50 transition-colors">
          {checking ? 'Проверяем...' : 'Проверить'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          { key: 'overview', label: 'Обзор' },
          { key: 'check', label: 'Проверка' },
          { key: 'history', label: 'История' },
          { key: 'services', label: 'Услуги' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Score card */}
          {checkResult && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                    <circle cx="60" cy="60" r="52" fill="none"
                      stroke={score > 80 ? '#22C55E' : score > 60 ? '#EAB308' : score > 30 ? '#F97316' : '#EF4444'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 327} 327`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-gray-800">{score}</span>
                    <span className="text-[9px] text-gray-400">из 100</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-red-500">{checkResult.stats.violations}</p>
                      <p className="text-xs text-gray-500">нарушений</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-500">{checkResult.stats.warnings}</p>
                      <p className="text-xs text-gray-500">предупреждений</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{checkResult.totalMaxFine.toLocaleString('ru-RU')} &#8381;</p>
                      <p className="text-xs text-gray-500">макс. штраф</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fix estimate card */}
          {siteInfo?.fixEstimate && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Стоимость исправления</h2>
                <span className="text-lg font-bold text-gray-900">{siteInfo.fixEstimate.total.toLocaleString('ru-RU')} &#8381;</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {siteInfo.fixEstimate.items.length} позиций &middot; {siteInfo.cmsLabel} &middot; x{siteInfo.cmsMultiplier}
              </p>
              <button onClick={() => setTab('services')}
                className="w-full py-2.5 rounded-lg bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5B4BD5] transition-colors">
                Подробнее об услугах
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTab('check')}
              className="p-4 bg-white rounded-xl border border-gray-200 hover:border-[#6C5CE7]/30 text-left transition-all">
              <p className="text-sm font-medium text-gray-900">Проверить снова</p>
              <p className="text-xs text-gray-400">Полная проверка сайта</p>
            </button>
            <button onClick={() => setTab('history')}
              className="p-4 bg-white rounded-xl border border-gray-200 hover:border-[#6C5CE7]/30 text-left transition-all">
              <p className="text-sm font-medium text-gray-900">История</p>
              <p className="text-xs text-gray-400">Тренд по проверкам</p>
            </button>
          </div>

          {/* Orders for this site */}
          {orders.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Заказы</h2>
              {orders.map(order => (
                <Link key={order.id} href={`/cabinet/orders/${order.id}`}
                  className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{productLabel(order.product_type)}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <StatusBadge status={order.status} paymentStatus={order.payment_status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Check (full results) ── */}
      {tab === 'check' && (
        <div className="space-y-4">
          {checking && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <div className="w-8 h-8 border-3 border-[#6C5CE7]/20 border-t-[#6C5CE7] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Проверяем сайт, это может занять до 30 секунд...</p>
            </div>
          )}

          {!checking && checkResult && (
            <>
              {checkResult.violations.map((v, i) => (
                <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      v.severity === 'critical' ? 'bg-red-500' : v.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          v.severity === 'critical' ? 'text-red-600 bg-red-50' : v.severity === 'high' ? 'text-orange-600 bg-orange-50' : 'text-yellow-600 bg-yellow-50'
                        }`}>{v.severity === 'critical' ? 'Критическое' : v.severity === 'high' ? 'Высокое' : 'Среднее'}</span>
                        <span className="text-xs text-gray-400">{v.law} {v.article}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{v.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{v.description}</p>
                      {v.maxFine > 0 && (
                        <p className="text-xs text-red-600 mt-1">Штраф: до {v.maxFine.toLocaleString('ru-RU')} &#8381;</p>
                      )}
                      {v.recommendation && (
                        <div className="mt-2 bg-[#6C5CE7]/5 border border-[#6C5CE7]/10 rounded-lg p-3">
                          <p className="text-xs text-gray-700">{v.recommendation}</p>
                        </div>
                      )}
                      {/* Contextual CTA */}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleOrder('report')} className="text-xs text-[#6C5CE7] hover:underline">В отчёт</button>
                        <button onClick={() => { setTab('services'); }} className="text-xs text-[#6C5CE7] hover:underline">Исправить</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {checkResult.violations.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                  <p className="text-lg font-medium text-green-600 mb-1">Нарушений не найдено</p>
                  <p className="text-sm text-gray-500">Сайт соответствует требованиям законодательства</p>
                </div>
              )}
            </>
          )}

          {!checking && !checkResult && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <p className="text-gray-500 mb-3">Проверка ещё не проводилась</p>
              <button onClick={handleCheck}
                className="px-6 py-2.5 rounded-xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5B4BD5]">
                Запустить проверку
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: History ── */}
      {tab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <p className="text-gray-500">Пока нет истории проверок</p>
            </div>
          ) : (
            <>
              {/* Trend mini-chart */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Тренд</h2>
                <div className="flex items-end gap-1 h-20">
                  {[...history].reverse().map((h, i) => {
                    const maxV = Math.max(...history.map(x => x.violations), 1);
                    const height = Math.max(8, (h.violations / maxV) * 100);
                    return (
                      <div key={h.id} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t transition-all ${h.violations === 0 ? 'bg-green-400' : h.violations < 5 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[9px] text-gray-400">{new Date(h.checkedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* History entries */}
              {history.map(h => (
                <div key={h.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(h.checkedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className={`text-sm font-bold ${h.complianceScore > 80 ? 'text-green-600' : h.complianceScore > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {h.complianceScore}/100
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{h.violations} нарушений</span>
                    <span>{h.warnings} предупреждений</span>
                    <span>до {h.totalMaxFine.toLocaleString('ru-RU')} &#8381;</span>
                  </div>
                  {(h.newViolations > 0 || h.fixedViolations > 0) && (
                    <div className="flex gap-2 mt-2">
                      {h.newViolations > 0 && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">+{h.newViolations} новых</span>}
                      {h.fixedViolations > 0 && <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{h.fixedViolations} исправлено</span>}
                      {h.recurringViolations > 0 && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{h.recurringViolations} повторных</span>}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Services ── */}
      {tab === 'services' && (
        <div className="space-y-4">
          {/* Fix estimate breakdown */}
          {siteInfo?.fixEstimate && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Исправим за вас</h2>
              <p className="text-xs text-gray-500 mb-4">{siteInfo.cmsLabel} &middot; x{siteInfo.cmsMultiplier} множитель CMS</p>
              <div className="space-y-2 mb-4">
                {siteInfo.fixEstimate.items.map(item => (
                  <div key={item.violationId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        item.type === 'auto' ? 'text-green-700 bg-green-50' :
                        item.type === 'semi-auto' ? 'text-blue-700 bg-blue-50' :
                        item.type === 'manual' ? 'text-orange-700 bg-orange-50' :
                        'text-red-700 bg-red-50'
                      }`}>{item.typeLabel}</span>
                      <span className="text-sm text-gray-900">{item.title}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">{item.finalPrice.toLocaleString('ru-RU')} &#8381;</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-base font-semibold text-gray-900">Итого</span>
                <span className="text-xl font-bold text-gray-900">{siteInfo.fixEstimate.total.toLocaleString('ru-RU')} &#8381;</span>
              </div>
              <p className="text-xs text-green-600 mt-1 text-right">
                Для действующих клиентов: {siteInfo.fixEstimate.discountedTotal.toLocaleString('ru-RU')} &#8381; (скидка 50%)
              </p>
              <button onClick={() => handleOrder('autofix-std')} disabled={ordering === 'autofix-std'}
                className="w-full mt-4 py-3 rounded-xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5B4BD5] disabled:opacity-50 transition-colors">
                {ordering === 'autofix-std' ? 'Создаём заказ...' : 'Заказать исправление'}
              </button>
            </div>
          )}

          {/* Other services */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Другие услуги</h2>
            {PRODUCTS.map(product => (
              <div key={product.type} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.label}</p>
                  <p className="text-xs text-gray-500">{product.desc}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{product.price} &#8381;</span>
                  <button onClick={() => handleOrder(product.type)} disabled={ordering === product.type}
                    className="px-3 py-1.5 rounded-lg bg-[#6C5CE7] text-white text-xs font-medium hover:bg-[#5B4BD5] disabled:opacity-50 transition-colors whitespace-nowrap">
                    {ordering === product.type ? '...' : 'Заказать'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {['Все доступы зашифрованы AES-256', 'Обязательный бэкап перед изменениями', 'Доступы удаляются после работы', 'Возврат денег если не исправим'].map(text => (
              <div key={text} className="flex items-center gap-2 text-xs text-gray-600">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7.5L5.5 9.5L10.5 4.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string | null }) {
  if (status === 'completed') return <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Выполнен</span>;
  if (paymentStatus === 'succeeded' || status === 'in_progress') return <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">В работе</span>;
  if (status === 'new') return <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Ожидает оплаты</span>;
  return <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{status}</span>;
}

function productLabel(type: string): string {
  const labels: Record<string, string> = {
    'report': 'PDF-отчёт', 'autofix-basic': 'Автоисправление (базовый)', 'autofix-std': 'Исправим за вас',
    'autofix-prem': 'Исправление + проверка', 'monitoring': 'Защита от штрафов', 'consulting': 'Консалтинг',
  };
  return labels[type] || type;
}
