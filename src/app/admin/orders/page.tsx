'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderListItem, OrderStatus, AdminStatsResponse } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────

function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU') + ' \u20BD';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'Новая', color: '#2563EB', bg: '#EFF6FF' },
  in_progress: { label: 'В работе', color: '#D97706', bg: '#FFFBEB' },
  completed: { label: 'Выполнена', color: '#16A34A', bg: '#F0FDF4' },
  cancelled: { label: 'Отменена', color: '#6B7280', bg: '#F3F4F6' },
};

const FILTER_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'completed', label: 'Выполнены' },
];

// ─── Orders Page ─────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [domainSearch, setDomainSearch] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (domainSearch.trim()) params.set('domain', domainSearch.trim().toLowerCase());

      const res = await fetch(`/api/admin/orders?${params}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setOrders(data.orders ?? []);
      setStats(data.stats ?? null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [statusFilter, domainSearch, router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleStatusChange(id: string, newStatus: OrderStatus) {
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Заявки</h1>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatCard label="Всего заявок" value={stats.totalOrders} color="#7B68EE" />
          <StatCard label="Новые" value={stats.newOrders} color="#3B82F6" />
          <StatCard label="В работе" value={stats.inProgressOrders} color="#F59E0B" />
          <StatCard label="Выполнены" value={stats.completedOrders} color="#22C55E" />
          <StatCard label="Уникальных доменов" value={stats.uniqueDomains} color="#6B7280" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
                statusFilter === opt.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={domainSearch}
          onChange={(e) => setDomainSearch(e.target.value)}
          placeholder="Поиск по домену..."
          className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm text-gray-800 placeholder:text-gray-400 w-full sm:w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium">Сайт</th>
                <th className="px-4 py-3 font-medium text-center">Нарушения</th>
                <th className="px-4 py-3 font-medium text-right">Макс. штраф</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Загрузка...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Заявок не найдено
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                    className="border-b border-gray-100 hover:bg-primary-lighter/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{order.name}</td>
                    <td className="px-4 py-3 text-primary whitespace-nowrap">{order.domain}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{order.violations}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-gray-700">
                      {order.totalMaxFine > 0 ? `до ${formatMoney(order.totalMaxFine)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700 cursor-pointer"
                      >
                        <option value="new">Новая</option>
                        <option value="in_progress">В работе</option>
                        <option value="completed">Выполнена</option>
                        <option value="cancelled">Отменена</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Components ──────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-2xl font-semibold" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ color: config.color, background: config.bg }}
    >
      {config.label}
    </span>
  );
}
