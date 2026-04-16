'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CheckLog, CheckLogsResponse } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU') + ' \u20BD';
}

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Критический', color: '#DC2626', bg: '#FEF2F2' },
  high: { label: 'Высокий', color: '#EA580C', bg: '#FFF7ED' },
  medium: { label: 'Средний', color: '#D97706', bg: '#FFFBEB' },
  low: { label: 'Низкий', color: '#16A34A', bg: '#F0FDF4' },
};

const SITE_TYPE_LABELS: Record<string, string> = {
  ecommerce: 'Магазин',
  service: 'Услуги',
  informational: 'Информ.',
  unknown: '—',
};

const PAGE_SIZE = 50;

// ─── Page ─────────────────────────────────────────────────────────────

export default function AdminChecksPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<CheckLog[]>([]);
  const [stats, setStats] = useState<CheckLogsResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [domainSearch, setDomainSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      if (domainSearch.trim()) params.set('domain', domainSearch.trim().toLowerCase());

      const res = await fetch(`/api/admin/checks?${params}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data: CheckLogsResponse = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setStats(data.stats ?? null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, domainSearch, router]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Проверки</h1>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Всего проверок" value={String(stats.totalChecks)} color="#7B68EE" />
          <StatCard label="Сегодня" value={String(stats.todayChecks)} color="#3B82F6" />
          <StatCard label="Уникальных доменов" value={String(stats.uniqueDomains)} color="#6B7280" />
          <StatCard label="Ср. нарушений" value={String(stats.avgViolations)} color="#F59E0B" />
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={domainSearch}
          onChange={(e) => { setDomainSearch(e.target.value); setPage(0); }}
          placeholder="Поиск по домену..."
          className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm text-gray-800 placeholder:text-gray-400 w-full sm:w-64"
        />
        <div className="text-sm text-gray-400 self-center">
          {total > 0 && `${total} записей`}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Домен</th>
                <th className="px-4 py-3 font-medium">Тип</th>
                <th className="px-4 py-3 font-medium text-center">Нарушения</th>
                <th className="px-4 py-3 font-medium text-center">Предупр.</th>
                <th className="px-4 py-3 font-medium text-right">Макс. штраф</th>
                <th className="px-4 py-3 font-medium">Риск</th>
                <th className="px-4 py-3 font-medium text-right">Время</th>
                <th className="px-4 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    Загрузка...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    Проверок не найдено
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const risk = RISK_CONFIG[log.riskLevel] || RISK_CONFIG.low;
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 hover:bg-primary-lighter/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-primary whitespace-nowrap font-medium">
                        {log.domain}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {SITE_TYPE_LABELS[log.siteType] || '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">
                        {log.success ? log.violations : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {log.success ? log.warnings : '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-gray-700">
                        {log.success && log.totalMaxFine > 0
                          ? `до ${formatMoney(log.totalMaxFine)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span
                            className="inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                            style={{ color: risk.color, background: risk.bg }}
                          >
                            {risk.label}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap">
                        {(log.durationMs / 1000).toFixed(1)}с
                      </td>
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium text-green-700 bg-green-50">
                            OK
                          </span>
                        ) : (
                          <span
                            className="inline-block px-2.5 py-1 rounded-full text-xs font-medium text-red-700 bg-red-50 cursor-help"
                            title={log.error}
                          >
                            Ошибка
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-700 disabled:opacity-40 cursor-pointer disabled:cursor-default hover:bg-gray-50"
            >
              Назад
            </button>
            <span className="text-sm text-gray-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-700 disabled:opacity-40 cursor-pointer disabled:cursor-default hover:bg-gray-50"
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reusable ─────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-2xl font-semibold" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
    </div>
  );
}
