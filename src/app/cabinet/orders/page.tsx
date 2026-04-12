'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  created_at: string;
  product_type: string;
  status: string;
  price: number;
  domain: string;
  payment_status: string | null;
  paid_at: string | null;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'completed', label: 'Выполненные' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cabinet/orders?status=${filter}`)
      .then(r => r.json())
      .then(data => { setOrders(data.orders || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Мои заказы</h1>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${filter === f.value
                ? 'bg-[#6C5CE7] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Загрузка...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <p className="text-gray-500 mb-2">Заказов пока нет</p>
          <Link href="/cabinet/sites" className="text-sm text-[#6C5CE7] hover:underline">
            Перейти к сайтам для заказа услуг
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Link
              key={order.id}
              href={`/cabinet/orders/${order.id}`}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200
                         hover:border-[#6C5CE7]/30 hover:shadow-sm transition-all"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{productLabel(order.product_type)}</p>
                  <StatusBadge status={order.status} paymentStatus={order.payment_status} />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {order.domain} &middot; {new Date(order.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-semibold text-gray-900">{order.price.toLocaleString('ru-RU')} &#8381;</p>
                {order.payment_status === 'succeeded' && order.paid_at && (
                  <p className="text-xs text-green-600">Оплачен {new Date(order.paid_at).toLocaleDateString('ru-RU')}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string | null }) {
  if (status === 'completed') return <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Выполнен</span>;
  if (paymentStatus === 'succeeded' || status === 'in_progress') return <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">В работе</span>;
  if (status === 'new' && !paymentStatus) return <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Ожидает оплаты</span>;
  if (status === 'cancelled') return <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Отменён</span>;
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
