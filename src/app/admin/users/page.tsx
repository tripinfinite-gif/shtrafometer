'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { DomainHistory, DomainCheck, OrderStatus } from '@/lib/types';

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

// ─── Admin Shell ──────────────────────────────────────────────────────

function AdminShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-primary text-lg">Штрафометр</span>
            <div className="hidden sm:flex items-center gap-1">
              <NavLink href="/admin" label="Заявки" active={title === 'Заявки'} />
              <NavLink href="/admin/checks" label="Проверки" active={title === 'Проверки'} />
              <NavLink href="/admin/users" label="Домены" active={title === 'Домены'} />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red transition-colors cursor-pointer"
          >
            Выйти
          </button>
        </div>
      </nav>

      <div className="sm:hidden flex gap-1 px-4 pt-3">
        <NavLink href="/admin" label="Заявки" active={title === 'Заявки'} />
        <NavLink href="/admin/checks" label="Проверки" active={title === 'Проверки'} />
        <NavLink href="/admin/users" label="Домены" active={title === 'Домены'} />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-primary-lighter text-primary font-medium'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      {label}
    </a>
  );
}

// ─── Users/Domains Page ───────────────────────────────────────────────

export default function AdminUsersPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<DomainHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainSearch, setDomainSearch] = useState('');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (domainSearch.trim()) params.set('domain', domainSearch.trim().toLowerCase());

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setDomains(data.domains ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [domainSearch, router]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  function toggleDomain(domain: string) {
    setExpandedDomain((prev) => (prev === domain ? null : domain));
  }

  function getLastMaxFine(checks: DomainCheck[]): number {
    if (checks.length === 0) return 0;
    return checks[0].totalMaxFine;
  }

  return (
    <AdminShell title="Домены">
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={domainSearch}
          onChange={(e) => setDomainSearch(e.target.value)}
          placeholder="Поиск по домену..."
          className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm text-gray-800 placeholder:text-gray-400 w-full sm:w-80"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Домен</th>
                <th className="px-4 py-3 font-medium">Последняя проверка</th>
                <th className="px-4 py-3 font-medium text-center">Проверок</th>
                <th className="px-4 py-3 font-medium text-right">Посл. макс. штраф</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    Загрузка...
                  </td>
                </tr>
              ) : domains.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    Доменов не найдено
                  </td>
                </tr>
              ) : (
                domains.map((dh) => (
                  <DomainRow
                    key={dh.domain}
                    domain={dh}
                    expanded={expandedDomain === dh.domain}
                    onToggle={() => toggleDomain(dh.domain)}
                    lastMaxFine={getLastMaxFine(dh.checks)}
                    onNavigate={(orderId) => router.push(`/admin/orders/${orderId}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

// ─── Domain Row ───────────────────────────────────────────────────────

function DomainRow({
  domain,
  expanded,
  onToggle,
  lastMaxFine,
  onNavigate,
}: {
  domain: DomainHistory;
  expanded: boolean;
  onToggle: () => void;
  lastMaxFine: number;
  onNavigate: (orderId: string) => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-gray-100 hover:bg-primary-lighter/50 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3 text-primary font-medium">
          <span className="mr-2 text-gray-400 text-xs">{expanded ? '▼' : '▶'}</span>
          {domain.domain}
        </td>
        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
          {formatDate(domain.lastCheckedAt)}
        </td>
        <td className="px-4 py-3 text-center text-gray-700">{domain.totalOrders}</td>
        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-700">
          {lastMaxFine > 0 ? `до ${formatMoney(lastMaxFine)}` : '—'}
        </td>
      </tr>

      {expanded &&
        domain.checks.map((check) => (
          <tr
            key={check.orderId}
            className="border-b border-gray-100 bg-gray-50/50"
          >
            <td className="px-4 py-2 pl-10 text-xs text-gray-500 whitespace-nowrap">
              {formatDate(check.checkedAt)}
            </td>
            <td className="px-4 py-2 text-xs">
              <span className="text-gray-700">{check.name}</span>
              <span className="text-gray-400 ml-2">{check.email}</span>
            </td>
            <td className="px-4 py-2 text-xs text-center">
              <span className="text-gray-500">{check.violations} нар.</span>
              {check.totalMaxFine > 0 && (
                <span className="text-red ml-2">до {formatMoney(check.totalMaxFine)}</span>
              )}
            </td>
            <td className="px-4 py-2 text-right">
              <div className="flex items-center justify-end gap-2">
                <StatusBadge status={check.status} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(check.orderId);
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Открыть
                </button>
              </div>
            </td>
          </tr>
        ))}
    </>
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
