'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CheckResponse } from '@/checks/types';

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

const PRODUCTS = [
  { type: 'report', label: 'PDF-отчёт', desc: 'Список нарушений + инструкции по исправлению', price: '1 990' },
  { type: 'autofix-basic', label: 'Автоисправление (базовый)', desc: 'Исправление топ-5 критичных нарушений', price: '4 990' },
  { type: 'autofix-std', label: 'Автоисправление (все)', desc: 'Исправление всех найденных нарушений', price: '9 990' },
  { type: 'autofix-prem', label: 'Автоисправление + проверка', desc: 'Все исправления + ручная проверка эксперта', price: '14 990' },
  { type: 'consulting', label: 'Консультация эксперта', desc: 'Аудит + подготовка документов + сопровождение', price: '15 000' },
];

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const domain = decodeURIComponent(params.domain as string);

  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [ordering, setOrdering] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cabinet/sites/${encodeURIComponent(domain)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [domain]);

  async function handleRecheck() {
    setChecking(true);
    try {
      const res = await fetch(`/api/cabinet/sites/${encodeURIComponent(domain)}/check`, {
        method: 'POST',
      });
      const result = await res.json();
      if (res.ok) {
        // Refresh page data
        const updated = await fetch(`/api/cabinet/sites/${encodeURIComponent(domain)}`);
        setData(await updated.json());
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
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
      if (res.ok && result.orderId) {
        router.push(`/cabinet/orders/${result.orderId}`);
      }
    } catch {
      // ignore
    } finally {
      setOrdering(null);
    }
  }

  if (loading) return <div className="text-gray-400 text-center py-12">Загрузка...</div>;
  if (!data?.site) return <div className="text-gray-400 text-center py-12">Сайт не найден</div>;

  const { site, orders } = data;
  const checkResult = site.lastCheckResult;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cabinet/sites" className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">&larr; Все сайты</Link>
          <h1 className="text-2xl font-bold text-gray-900">{domain}</h1>
        </div>
        <button
          onClick={handleRecheck}
          disabled={checking}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600
                     hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {checking ? 'Проверяем...' : 'Проверить снова'}
        </button>
      </div>

      {/* Status card */}
      {checkResult && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-red-600">{checkResult.stats.violations}</p>
              <p className="text-xs text-gray-500 mt-1">Нарушений</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-600">{checkResult.stats.warnings}</p>
              <p className="text-xs text-gray-500 mt-1">Предупреждений</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{checkResult.totalMaxFine.toLocaleString('ru-RU')} &#8381;</p>
              <p className="text-xs text-gray-500 mt-1">Макс. штраф</p>
            </div>
          </div>
        </div>
      )}

      {/* Violations list */}
      {checkResult && checkResult.violations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Нарушения</h2>
          <div className="space-y-3">
            {checkResult.violations.map((v, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  v.severity === 'critical' ? 'bg-red-500' : v.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{v.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{v.description}</p>
                  {v.maxFine > 0 && (
                    <p className="text-xs text-red-600 mt-1">Штраф: до {v.maxFine.toLocaleString('ru-RU')} &#8381;</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order services */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Заказать услугу</h2>
        <div className="space-y-3">
          {PRODUCTS.map(product => (
            <div key={product.type} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{product.label}</p>
                <p className="text-xs text-gray-500">{product.desc}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{product.price} &#8381;</span>
                <button
                  onClick={() => handleOrder(product.type)}
                  disabled={ordering === product.type}
                  className="px-3 py-1.5 rounded-lg bg-[#6C5CE7] text-white text-xs font-medium
                             hover:bg-[#5B4BD5] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {ordering === product.type ? '...' : 'Заказать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders for this site */}
      {orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Заказы для этого сайта</h2>
          <div className="space-y-2">
            {orders.map(order => (
              <Link
                key={order.id}
                href={`/cabinet/orders/${order.id}`}
                className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{productLabel(order.product_type)}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={order.status} paymentStatus={order.payment_status} />
                </div>
              </Link>
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
    'report': 'PDF-отчёт', 'autofix-basic': 'Автоисправление (базовый)', 'autofix-std': 'Автоисправление (все)',
    'autofix-prem': 'Автоисправление + проверка', 'monitoring': 'Мониторинг', 'consulting': 'Консалтинг',
    'fix': 'Исправление', 'email-lead': 'Бесплатный отчёт',
  };
  return labels[type] || type;
}
