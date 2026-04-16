'use client';

import { useState } from 'react';

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_FUNNEL = {
  period: 'Апрель 2026',
  stages: [
    { name: 'Визиты', value: 4820, color: '#6C5CE7' },
    { name: 'Проверки', value: 1340, color: '#a29bfe' },
    { name: 'Регистрации', value: 186, color: '#fd79a8' },
    { name: 'Заказы', value: 42, color: '#00b894' },
    { name: 'Оплаты', value: 18, color: '#00cec9' },
  ],
};

const MOCK_DAILY = [
  { date: '01.04', visits: 156, checks: 43, regs: 6, orders: 1, payments: 0 },
  { date: '02.04', visits: 189, checks: 52, regs: 8, orders: 2, payments: 1 },
  { date: '03.04', visits: 201, checks: 61, regs: 7, orders: 2, payments: 1 },
  { date: '04.04', visits: 145, checks: 38, regs: 4, orders: 1, payments: 0 },
  { date: '05.04', visits: 132, checks: 35, regs: 3, orders: 0, payments: 0 },
  { date: '06.04', visits: 98, checks: 27, regs: 2, orders: 0, payments: 0 },
  { date: '07.04', visits: 167, checks: 46, regs: 5, orders: 1, payments: 1 },
  { date: '08.04', visits: 214, checks: 58, regs: 9, orders: 3, payments: 1 },
  { date: '09.04', visits: 198, checks: 54, regs: 7, orders: 2, payments: 1 },
  { date: '10.04', visits: 223, checks: 62, regs: 8, orders: 3, payments: 2 },
  { date: '11.04', visits: 187, checks: 51, regs: 6, orders: 2, payments: 1 },
  { date: '12.04', visits: 142, checks: 39, regs: 4, orders: 1, payments: 0 },
  { date: '13.04', visits: 108, checks: 29, regs: 3, orders: 0, payments: 0 },
  { date: '14.04', visits: 195, checks: 53, regs: 7, orders: 2, payments: 1 },
  { date: '15.04', visits: 178, checks: 48, regs: 5, orders: 1, payments: 1 },
];

const MOCK_PREV_PERIOD = {
  visits: 4200,
  checks: 1180,
  regs: 160,
  orders: 35,
  payments: 14,
};

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Сегодня' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'custom', label: 'Произвольный' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

function pct(a: number, b: number): string {
  if (b === 0) return '0%';
  return (a / b * 100).toFixed(1) + '%';
}

function delta(current: number, prev: number): { text: string; positive: boolean } {
  if (prev === 0) return { text: '+∞', positive: true };
  const d = ((current - prev) / prev) * 100;
  return {
    text: (d >= 0 ? '+' : '') + d.toFixed(1) + '%',
    positive: d >= 0,
  };
}

// ─── Page ────────────────────────────────────────────────────────────

export default function FunnelPage() {
  const [period, setPeriod] = useState('30d');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const stages = MOCK_FUNNEL.stages;
  const maxValue = stages[0].value;

  // Conversions between stages
  const conversions = stages.slice(1).map((s, i) => ({
    from: stages[i].name,
    to: s.name,
    rate: pct(s.value, stages[i].value),
  }));

  // Deltas vs previous period
  const prevValues = [
    MOCK_PREV_PERIOD.visits,
    MOCK_PREV_PERIOD.checks,
    MOCK_PREV_PERIOD.regs,
    MOCK_PREV_PERIOD.orders,
    MOCK_PREV_PERIOD.payments,
  ];

  const sortedDaily = [...MOCK_DAILY].sort((a, b) => {
    const [da, ma] = a.date.split('.').map(Number);
    const [db, mb] = b.date.split('.').map(Number);
    if (ma !== mb) return mb - ma;
    return db - da;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Воронка</h1>
          <p className="text-gray-500 text-sm mt-1">{MOCK_FUNNEL.period}</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer w-full sm:w-auto"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stages.map((s, i) => {
          const d = delta(s.value, prevValues[i]);
          return (
            <div
              key={s.name}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
            >
              <p className="text-2xl font-semibold" style={{ color: s.color }}>
                {fmt(s.value)}
              </p>
              <p className="text-gray-400 text-xs mt-1">{s.name}</p>
              <p
                className={`text-xs mt-1 font-medium ${d.positive ? 'text-green-600' : 'text-red-500'}`}
              >
                {d.text} vs пред. период
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Horizontal Funnel ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Конверсия по этапам</h2>
        <div className="space-y-3">
          {stages.map((s, i) => {
            const widthPct = (s.value / maxValue) * 100;
            return (
              <div key={s.name}>
                <div className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-sm text-gray-600 text-right">
                    {s.name}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-8 bg-gray-100 rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: s.color,
                          minWidth: '2rem',
                        }}
                      />
                    </div>
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white drop-shadow-sm">
                      {fmt(s.value)}
                    </span>
                  </div>
                </div>
                {/* Conversion arrow between stages */}
                {i < conversions.length && (
                  <div className="flex items-center gap-3 my-1">
                    <div className="w-24" />
                    <div className="flex items-center gap-1 text-xs text-gray-400 pl-2">
                      <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-400">
                        <path
                          d="M6 2 L6 10 M3 7 L6 10 L9 7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="font-medium text-gray-600">{conversions[i].rate}</span>
                      <span>конверсия</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-900">2.3</p>
          <p className="text-gray-400 text-xs mt-1">Среднее проверок на человека</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-900">4.2 мин</p>
          <p className="text-gray-400 text-xs mt-1">Время до регистрации</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-900">2.1 дня</p>
          <p className="text-gray-400 text-xs mt-1">Время до оплаты</p>
        </div>
      </div>

      {/* ── Daily Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">По дням</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium text-right">Визиты</th>
                <th className="px-4 py-3 font-medium text-right">Проверки</th>
                <th className="px-4 py-3 font-medium text-right">Регистрации</th>
                <th className="px-4 py-3 font-medium text-right">Заказы</th>
                <th className="px-4 py-3 font-medium text-right">Оплаты</th>
                <th className="px-4 py-3 font-medium text-right">CR</th>
              </tr>
            </thead>
            <tbody>
              {sortedDaily.map((row) => {
                const cr = pct(row.checks, row.visits);
                const isExpanded = expandedRow === row.date;
                return (
                  <tr key={row.date}>
                    <td colSpan={7} className="p-0">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : row.date)
                        }
                        className="w-full text-left hover:bg-violet-50/50 cursor-pointer transition-colors"
                      >
                        <div className="grid grid-cols-7">
                          <span className="px-4 py-3 text-gray-500">{row.date}</span>
                          <span className="px-4 py-3 text-right text-gray-800">{fmt(row.visits)}</span>
                          <span className="px-4 py-3 text-right text-gray-800">{fmt(row.checks)}</span>
                          <span className="px-4 py-3 text-right text-gray-800">{fmt(row.regs)}</span>
                          <span className="px-4 py-3 text-right text-gray-800">{fmt(row.orders)}</span>
                          <span className="px-4 py-3 text-right text-gray-800">{fmt(row.payments)}</span>
                          <span className="px-4 py-3 text-right text-gray-600 font-medium">{cr}</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="font-medium text-gray-700">Визиты → Проверки:</span>{' '}
                            {pct(row.checks, row.visits)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Проверки → Рег.:</span>{' '}
                            {pct(row.regs, row.checks)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Рег. → Заказы:</span>{' '}
                            {pct(row.orders, row.regs)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Заказы → Оплаты:</span>{' '}
                            {pct(row.payments, row.orders)}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
