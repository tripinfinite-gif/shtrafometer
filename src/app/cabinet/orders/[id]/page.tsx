'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

declare global { interface Window { ym?: (...args: unknown[]) => void; } }

interface OrderDetail {
  id: string;
  created_at: string;
  product_type: string;
  status: string;
  price: number;
  domain: string;
  site_url: string;
  violations: number;
  total_max_fine: number;
  payment_status: string | null;
  payment_id: string | null;
  paid_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
  notes: string | null;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch(`/api/cabinet/orders/${id}`)
      .then(r => r.json())
      .then(data => { setOrder(data.order || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handlePay() {
    setPaying(true);
    window.ym?.(108525306, 'reachGoal', 'order_submit');
    try {
      const res = await fetch(`/api/cabinet/orders/${id}/pay`, { method: 'POST' });
      const data = await res.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch {
      // ignore
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <div className="text-gray-400 text-center py-12">Загрузка...</div>;
  if (!order) return <div className="text-gray-400 text-center py-12">Заказ не найден</div>;

  const needsPayment = order.status === 'new' && order.payment_status !== 'succeeded';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/cabinet/orders" className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">&larr; Все заказы</Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{productLabel(order.product_type)}</h1>
          <StatusBadge status={order.status} paymentStatus={order.payment_status} />
        </div>
        <p className="text-sm text-gray-500 mt-1">{order.domain}</p>
      </div>

      {/* Pay button */}
      {needsPayment && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
          <p className="text-base font-semibold text-blue-900 mb-1">
            К оплате: {order.price.toLocaleString('ru-RU')} &#8381;
          </p>
          <p className="text-sm text-blue-600 mb-4">
            После оплаты мы сразу приступим к выполнению
          </p>
          <button
            onClick={handlePay}
            disabled={paying}
            className="px-8 py-3 rounded-xl bg-[#6C5CE7] text-white font-medium text-base
                       hover:bg-[#5B4BD5] disabled:opacity-50 transition-colors"
          >
            {paying ? 'Перенаправляем...' : 'Оплатить'}
          </button>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
            <span>Банковские карты</span>
            <span>СБП</span>
            <span>ЮMoney</span>
          </div>
        </div>
      )}

      {/* Order details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Детали заказа</h2>
        <dl className="space-y-3">
          <DetailRow label="Номер заказа" value={order.id.slice(0, 8)} />
          <DetailRow label="Услуга" value={productLabel(order.product_type)} />
          <DetailRow label="Сайт" value={order.domain} />
          <DetailRow label="Нарушений при проверке" value={String(order.violations)} />
          <DetailRow label="Макс. штраф" value={`${order.total_max_fine.toLocaleString('ru-RU')} \u20BD`} />
          <DetailRow label="Стоимость" value={`${order.price.toLocaleString('ru-RU')} \u20BD`} />
          <DetailRow label="Дата создания" value={new Date(order.created_at).toLocaleString('ru-RU')} />
          {order.paid_at && <DetailRow label="Дата оплаты" value={new Date(order.paid_at).toLocaleString('ru-RU')} />}
          {order.completed_at && <DetailRow label="Дата завершения" value={new Date(order.completed_at).toLocaleString('ru-RU')} />}
          {order.scheduled_at && <DetailRow label="Запланировано" value={new Date(order.scheduled_at).toLocaleString('ru-RU')} />}
          {order.notes && <DetailRow label="Примечание" value={order.notes} />}
        </dl>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Статус выполнения</h2>
        <Timeline order={order} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function Timeline({ order }: { order: OrderDetail }) {
  const steps = [
    { label: 'Заказ создан', done: true, date: order.created_at },
    { label: 'Оплата', done: order.payment_status === 'succeeded', date: order.paid_at },
    { label: 'В работе', done: order.status === 'in_progress' || order.status === 'completed', date: null },
    { label: 'Выполнено', done: order.status === 'completed', date: order.completed_at },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full border-2 ${
              step.done ? 'bg-[#6C5CE7] border-[#6C5CE7]' : 'bg-white border-gray-300'
            }`} />
            {i < steps.length - 1 && (
              <div className={`w-0.5 h-8 ${step.done ? 'bg-[#6C5CE7]' : 'bg-gray-200'}`} />
            )}
          </div>
          <div className="pb-4">
            <p className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
              {step.label}
            </p>
            {step.date && (
              <p className="text-xs text-gray-400">{new Date(step.date).toLocaleString('ru-RU')}</p>
            )}
          </div>
        </div>
      ))}
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
