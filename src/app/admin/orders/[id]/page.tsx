'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import type { Order, OrderStatus } from '@/lib/types';
import type { Violation, Warning, PassedCheck, Severity, RiskLevel, CheckResponse } from '@/checks/types';

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

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string }> = {
  critical: { label: 'Критично', color: '#EF4444' },
  high: { label: 'Высокий', color: '#F59E0B' },
  medium: { label: 'Средний', color: '#EAB308' },
  low: { label: 'Низкий', color: '#7B68EE' },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  critical: { label: 'Критический риск', color: '#EF4444' },
  high: { label: 'Высокий риск', color: '#F59E0B' },
  medium: { label: 'Средний риск', color: '#EAB308' },
  low: { label: 'Низкий риск', color: '#22C55E' },
};

// ─── Page ─────────────────────────────────────────────────────────────

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) {
        setError('Заявка не найдена');
        return;
      }
      const data: Order = await res.json();
      setOrder(data);
      setNotes(data.notes ?? '');
    } catch {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!order) return;
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrder();
  }

  async function handleNotesSave() {
    setSavingNotes(true);
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        Загрузка...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red">{error || 'Заявка не найдена'}</p>
        <button
          onClick={() => router.push('/admin')}
          className="text-primary hover:underline text-sm cursor-pointer"
        >
          Назад к заявкам
        </button>
      </div>
    );
  }

  const check = order.checkResult;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <nav className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="text-primary hover:underline text-sm flex items-center gap-1 cursor-pointer"
          >
            <span>&larr;</span> Заявки
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 text-sm">Заявка #{order.id.slice(0, 8)}</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Order info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 mb-1">{order.name}</h1>
              <p className="text-gray-400 text-sm">{formatDate(order.createdAt)}</p>
            </div>
            <StatusBadgeLarge status={order.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <InfoRow label="Сайт" value={order.siteUrl} isLink />
            <InfoRow label="Домен" value={order.domain} />
            <InfoRow label="Телефон" value={order.phone} />
            <InfoRow label="Email" value={order.email} />
            <InfoRow label="Нарушений" value={String(order.violations)} />
            <InfoRow
              label="Макс. штраф"
              value={order.totalMaxFine > 0 ? `до ${formatMoney(order.totalMaxFine)}` : '—'}
            />
          </div>
        </div>

        {/* Status change */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Изменить статус</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={order.status === s}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  color: STATUS_CONFIG[s].color,
                  background: order.status === s ? STATUS_CONFIG[s].bg : '#F3F4F6',
                  border: `1px solid ${order.status === s ? STATUS_CONFIG[s].color + '40' : '#E5E7EB'}`,
                }}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Autofix link */}
        {order.checkResult && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Автоисправления</h2>
            <button
              onClick={() => router.push(`/admin/orders/${id}/fixes`)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Автоисправления
            </button>
            {order.fixPlan && (
              <p className="text-xs text-gray-400 mt-2">
                План: {order.fixPlan.fixes.length} фиксов
                {' '}({order.fixPlan.fixes.filter((f) => f.status === 'applied').length} применено)
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Заметки</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesSave}
            placeholder="Добавить заметку..."
            rows={4}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 resize-y focus:border-primary transition-colors"
          />
          {savingNotes && (
            <p className="text-xs text-gray-400 mt-1">Сохранение...</p>
          )}
        </div>

        {/* Check results */}
        {check && <CheckResults check={check} />}
      </main>
    </div>
  );
}

// ─── Check Results Section ────────────────────────────────────────────

function CheckResults({ check }: { check: CheckResponse }) {
  const [showPassed, setShowPassed] = useState(false);

  const risk = RISK_CONFIG[check.riskLevel];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Результаты проверки</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MiniStat label="Уровень риска" value={risk.label} color={risk.color} />
          <MiniStat
            label="Макс. штраф"
            value={`до ${formatMoney(check.totalMaxFine)}`}
            color="#EF4444"
          />
          <MiniStat label="Нарушений" value={String(check.stats.violations)} color="#F59E0B" />
          <MiniStat label="Предупреждений" value={String(check.stats.warnings)} color="#EAB308" />
        </div>

        <div className="flex gap-4 text-xs text-gray-400">
          <span>Всего проверок: {check.stats.totalChecks}</span>
          <span>Пройдено: {check.stats.passed}</span>
        </div>
      </div>

      {/* Fines by law */}
      {Object.keys(check.finesByLaw).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Штрафы по законам</h2>
          <div className="space-y-2">
            {Object.entries(check.finesByLaw).map(([law, info]) => (
              <div
                key={law}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <span className="text-sm text-gray-700">{law}</span>
                  <span className="text-gray-400 text-xs ml-2">
                    ({info.count} {info.count === 1 ? 'нарушение' : 'нарушений'})
                  </span>
                </div>
                <span className="text-sm text-red whitespace-nowrap">
                  до {formatMoney(info.max)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Violations */}
      {check.violations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Нарушения ({check.violations.length})</h2>
          {check.violations.map((v) => (
            <ViolationCard key={v.id} violation={v} />
          ))}
        </div>
      )}

      {/* Warnings */}
      {check.warnings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Предупреждения ({check.warnings.length})</h2>
          {check.warnings.map((w) => (
            <WarningCard key={w.id} warning={w} />
          ))}
        </div>
      )}

      {/* SEO Audit */}
      <SeoAuditSection check={check} />

      {/* Passed */}
      {check.passed.length > 0 && (
        <div>
          <button
            onClick={() => setShowPassed(!showPassed)}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors mb-3 cursor-pointer"
          >
            {showPassed ? 'Скрыть' : 'Показать'} пройденные проверки ({check.passed.length})
          </button>
          {showPassed && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2">
              {check.passed.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="text-green">&#10003;</span>
                  <span className="text-gray-500">{p.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function ViolationCard({ violation: v }: { violation: Violation }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[v.severity];

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 overflow-hidden cursor-pointer severity-${v.severity}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-medium text-gray-800">{v.title}</h3>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
            style={{ color: sev.color, background: sev.color + '15' }}
          >
            {sev.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-1">
          {v.law}, {v.article}
        </p>
        <p className="text-xs text-red">
          Штраф: {formatMoney(v.minFine)} — {formatMoney(v.maxFine)}
        </p>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-500">{v.description}</p>
          {v.details.length > 0 && (
            <ul className="space-y-1">
              {v.details.map((d, i) => (
                <li key={i} className="text-xs text-gray-500 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-gray-300">
                  {d}
                </li>
              ))}
            </ul>
          )}
          <div className="bg-primary-lighter rounded-lg p-3">
            <p className="text-xs text-primary font-medium mb-1">Рекомендация</p>
            <p className="text-xs text-gray-500">{v.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function WarningCard({ warning: w }: { warning: Warning }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-orange overflow-hidden cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-800 mb-1">{w.title}</h3>
        <p className="text-xs text-gray-500">
          {w.law}, {w.article}
        </p>
        {w.potentialFine && (
          <p className="text-xs text-orange mt-1">Потенциальный штраф: {w.potentialFine}</p>
        )}
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-500">{w.description}</p>
          <div className="bg-orange/10 rounded-lg p-3">
            <p className="text-xs text-orange font-medium mb-1">Рекомендация</p>
            <p className="text-xs text-gray-500">{w.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-primary hover:underline truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      ) : (
        <p className="text-sm text-gray-800">{value}</p>
      )}
    </div>
  );
}

function StatusBadgeLarge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-sm font-medium"
      style={{ color: config.color, background: config.bg }}
    >
      {config.label}
    </span>
  );
}

// ─── SEO Audit Section ───────────────────────────────────────────────

const QUICK_FIX_IDS = new Set([
  'seo-02', 'seo-03', 'seo-04', 'seo-09', 'seo-10',
  'seo-11', 'seo-12', 'seo-13', 'seo-14',
]);

const SEO_FIX_PRICES: Record<string, string> = {
  'seo-01': '2 000–5 000 ₽',
  'seo-02': '20–40 ₽/стр',
  'seo-03': '20–40 ₽/стр',
  'seo-04': '200–500 ₽',
  'seo-06': '200–500 ₽',
  'seo-07': '2 000–6 000 ₽',
  'seo-08': '5 000–15 000 ₽',
  'seo-09': '200–800 ₽',
  'seo-10': '500–1 500 ₽',
  'seo-11': '500–1 500 ₽',
  'seo-12': '200–500 ₽',
  'seo-13': '200–500 ₽',
  'seo-14': '200–500 ₽',
};

function SeoAuditSection({ check }: { check: CheckResponse }) {
  const seoViolations = check.violations.filter((v) => v.module === 'seo');
  const seoPassed = check.passed.filter((p) => p.module === 'seo');
  const seoWarnings = check.warnings.filter((w) => w.id?.startsWith('seo-'));

  const totalSeoChecks = seoViolations.length + seoPassed.length + seoWarnings.length;
  if (totalSeoChecks === 0) return null;

  const score = Math.max(0, Math.min(100, 100 - seoViolations.length * 7));
  const scoreColor = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';

  const quickFixes = seoViolations.filter((v) => QUICK_FIX_IDS.has(v.id));
  const complexFixes = seoViolations.filter((v) => !QUICK_FIX_IDS.has(v.id));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Технический SEO-аудит</h2>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: scoreColor }}>
            {score}
          </span>
          <span className="text-xs text-gray-400">из 100</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Проверено" value={String(totalSeoChecks)} />
        <MiniStat label="Проблем" value={String(seoViolations.length)} color="#EF4444" />
        <MiniStat label="Предупреждений" value={String(seoWarnings.length)} color="#F59E0B" />
        <MiniStat label="Пройдено" value={String(seoPassed.length)} color="#22C55E" />
      </div>

      {/* What's good */}
      {seoPassed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Что хорошо</h3>
          <div className="space-y-1">
            {seoPassed.slice(0, 7).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="text-green text-xs">&#10003;</span>
                <span className="text-gray-600">{p.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What's bad */}
      {seoViolations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Что плохо</h3>
          <div className="space-y-1">
            {seoViolations.map((v) => (
              <div key={v.id} className="flex items-center gap-2 text-sm">
                <span className="text-red text-xs">&#10007;</span>
                <span className="text-gray-600">{v.title}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full ml-auto shrink-0"
                  style={{
                    color: QUICK_FIX_IDS.has(v.id) ? '#22C55E' : '#F59E0B',
                    background: QUICK_FIX_IDS.has(v.id) ? '#22C55E15' : '#F59E0B15',
                  }}
                >
                  {QUICK_FIX_IDS.has(v.id) ? 'Быстрый фикс' : 'Сложный фикс'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {seoWarnings.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Предупреждения</h3>
          <div className="space-y-1">
            {seoWarnings.map((w) => (
              <div key={w.id} className="flex items-center gap-2 text-sm">
                <span className="text-orange text-xs">&#9888;</span>
                <span className="text-gray-600">{w.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fix pricing */}
      {seoViolations.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Стоимость исправлений</h3>
          <div className="space-y-2">
            {quickFixes.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Быстрые фиксы ({quickFixes.length})</span>
                <span className="text-gray-700 font-medium">200–1 500 ₽ / шт</span>
              </div>
            )}
            {complexFixes.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Сложные фиксы ({complexFixes.length})</span>
                <span className="text-gray-700 font-medium">2 000–15 000 ₽ / шт</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm bg-primary-lighter rounded-lg p-3 mt-2">
              <span className="text-primary font-medium">Комплексное исправление</span>
              <span className="text-primary font-medium">скидка 30%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
