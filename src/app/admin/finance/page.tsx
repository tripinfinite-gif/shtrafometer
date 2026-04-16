'use client';

import { useState } from 'react';

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_PNL = {
  month: 'Апрель 2026',
  revenue: 420000,
  costs: {
    ads_yandex: 85000,
    ads_vk: 12000,
    server: 3500,
    sms: 2100,
    api: 1500,
    salary: 0,
    other: 5000,
  },
  prevMonth: { revenue: 380000, totalCosts: 95000 },
};

const COST_LABELS: Record<string, string> = {
  ads_yandex: 'Реклама Яндекс',
  ads_vk: 'Реклама VK',
  server: 'Сервер (Beget VPS)',
  sms: 'SMS.ru',
  api: 'API (OpenAI / Claude)',
  salary: 'Зарплаты',
  other: 'Прочее',
};

// 6 months of mock data with growth trend
const MOCK_MONTHS = [
  { month: 'Ноя 25', revenue: 180000, costs: 72000 },
  { month: 'Дек 25', revenue: 220000, costs: 78000 },
  { month: 'Янв 26', revenue: 250000, costs: 80000 },
  { month: 'Фев 26', revenue: 310000, costs: 86000 },
  { month: 'Мар 26', revenue: 380000, costs: 95000 },
  { month: 'Апр 26', revenue: 420000, costs: 109100 },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function pctOf(part: number, total: number): string {
  if (total === 0) return '—';
  return (part / total * 100).toFixed(1) + '%';
}

function deltaStr(current: number, prev: number): { text: string; positive: boolean } {
  if (prev === 0) return { text: '+∞', positive: true };
  const d = ((current - prev) / prev) * 100;
  return {
    text: (d >= 0 ? '+' : '') + d.toFixed(1) + '%',
    positive: d >= 0,
  };
}

// ─── Page ────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [period, setPeriod] = useState('april');

  const totalCosts = Object.values(MOCK_PNL.costs).reduce((a, b) => a + b, 0);
  const profit = MOCK_PNL.revenue - totalCosts;
  const margin = MOCK_PNL.revenue > 0 ? (profit / MOCK_PNL.revenue * 100) : 0;

  const prevProfit = MOCK_PNL.prevMonth.revenue - MOCK_PNL.prevMonth.totalCosts;
  const prevMargin = MOCK_PNL.prevMonth.revenue > 0
    ? (prevProfit / MOCK_PNL.prevMonth.revenue * 100) : 0;

  const revenueDelta = deltaStr(MOCK_PNL.revenue, MOCK_PNL.prevMonth.revenue);
  const costsDelta = deltaStr(totalCosts, MOCK_PNL.prevMonth.totalCosts);
  const profitDelta = deltaStr(profit, prevProfit);
  const marginDelta = deltaStr(margin, prevMargin);

  // Chart max for bar scaling
  const chartMax = Math.max(...MOCK_MONTHS.map(m => Math.max(m.revenue, m.costs)));

  const costEntries = Object.entries(MOCK_PNL.costs).filter(([, v]) => v > 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Обзор финансов (P&L)</h1>
          <p className="text-gray-500 text-sm mt-1">{MOCK_PNL.month}</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer w-full sm:w-auto"
        >
          <option value="april">Апрель 2026</option>
          <option value="q1">I квартал 2026</option>
          <option value="year">2026 год</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="Выручка"
          value={fmt(MOCK_PNL.revenue)}
          delta={revenueDelta}
          accent="bg-emerald-50 border-emerald-200"
          iconBg="bg-emerald-100"
          icon={<ArrowUpIcon className="w-5 h-5 text-emerald-600" />}
        />
        <SummaryCard
          label="Расходы"
          value={fmt(totalCosts)}
          delta={costsDelta}
          accent="bg-red-50 border-red-200"
          iconBg="bg-red-100"
          icon={<ArrowDownIcon className="w-5 h-5 text-red-600" />}
          invertDelta
        />
        <SummaryCard
          label="Чистая прибыль"
          value={fmt(profit)}
          delta={profitDelta}
          accent="bg-blue-50 border-blue-200"
          iconBg="bg-blue-100"
          icon={<ProfitIcon className="w-5 h-5 text-blue-600" />}
        />
        <SummaryCard
          label="Маржа"
          value={margin.toFixed(1) + '%'}
          delta={marginDelta}
          accent="bg-violet-50 border-violet-200"
          iconBg="bg-violet-100"
          icon={<PercentIcon className="w-5 h-5 text-violet-600" />}
        />
      </div>

      {/* P&L Table */}
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Отчёт о прибылях и убытках</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Статья</th>
                <th className="px-5 py-3 font-medium text-right">Текущий месяц</th>
                <th className="px-5 py-3 font-medium text-right hidden sm:table-cell">% от выручки</th>
                <th className="px-5 py-3 font-medium text-right hidden md:table-cell">Прошлый месяц</th>
                <th className="px-5 py-3 font-medium text-right hidden md:table-cell">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {/* Revenue */}
              <tr className="border-b border-gray-50 bg-emerald-50/40">
                <td className="px-5 py-3 font-semibold text-gray-900">Выручка</td>
                <td className="px-5 py-3 text-right font-semibold text-emerald-700">{fmt(MOCK_PNL.revenue)}</td>
                <td className="px-5 py-3 text-right text-gray-500 hidden sm:table-cell">100%</td>
                <td className="px-5 py-3 text-right text-gray-600 hidden md:table-cell">{fmt(MOCK_PNL.prevMonth.revenue)}</td>
                <td className="px-5 py-3 text-right hidden md:table-cell">
                  <DeltaBadge {...revenueDelta} />
                </td>
              </tr>

              {/* Cost items */}
              {costEntries.map(([key, val]) => (
                <tr key={key} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 text-gray-600 pl-10">
                    {COST_LABELS[key] ?? key}
                  </td>
                  <td className="px-5 py-2.5 text-right text-red-600">−{fmt(val)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-400 hidden sm:table-cell">
                    {pctOf(val, MOCK_PNL.revenue)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-gray-400 hidden md:table-cell">—</td>
                  <td className="px-5 py-2.5 text-right text-gray-400 hidden md:table-cell">—</td>
                </tr>
              ))}

              {/* Total costs */}
              <tr className="border-b border-gray-100 bg-red-50/40">
                <td className="px-5 py-3 font-semibold text-gray-900">Итого расходов</td>
                <td className="px-5 py-3 text-right font-semibold text-red-700">−{fmt(totalCosts)}</td>
                <td className="px-5 py-3 text-right text-gray-500 hidden sm:table-cell">
                  {pctOf(totalCosts, MOCK_PNL.revenue)}
                </td>
                <td className="px-5 py-3 text-right text-gray-600 hidden md:table-cell">
                  −{fmt(MOCK_PNL.prevMonth.totalCosts)}
                </td>
                <td className="px-5 py-3 text-right hidden md:table-cell">
                  <DeltaBadge {...costsDelta} invert />
                </td>
              </tr>

              {/* Net profit */}
              <tr className="bg-blue-50/40">
                <td className="px-5 py-3 font-bold text-gray-900">Чистая прибыль</td>
                <td className="px-5 py-3 text-right font-bold text-blue-700">{fmt(profit)}</td>
                <td className="px-5 py-3 text-right font-medium text-gray-600 hidden sm:table-cell">
                  {pctOf(profit, MOCK_PNL.revenue)}
                </td>
                <td className="px-5 py-3 text-right font-medium text-gray-600 hidden md:table-cell">
                  {fmt(prevProfit)}
                </td>
                <td className="px-5 py-3 text-right hidden md:table-cell">
                  <DeltaBadge {...profitDelta} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar chart — Revenue vs Costs by month */}
      <div className="rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Выручка vs Расходы</h2>
        <p className="text-xs text-gray-400 mb-5">Последние 6 месяцев</p>

        <div className="flex items-end gap-4 sm:gap-6 h-52">
          {MOCK_MONTHS.map((m) => {
            const revH = (m.revenue / chartMax) * 100;
            const costH = (m.costs / chartMax) * 100;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-1 w-full h-44">
                  {/* Revenue bar */}
                  <div className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[10px] text-gray-400 mb-1 hidden sm:block">
                      {(m.revenue / 1000).toFixed(0)}к
                    </span>
                    <div
                      className="w-full rounded-t-md bg-emerald-400 transition-all"
                      style={{ height: `${revH}%` }}
                    />
                  </div>
                  {/* Costs bar */}
                  <div className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[10px] text-gray-400 mb-1 hidden sm:block">
                      {(m.costs / 1000).toFixed(0)}к
                    </span>
                    <div
                      className="w-full rounded-t-md bg-red-400 transition-all"
                      style={{ height: `${costH}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-1">{m.month}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-5 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-400" /> Выручка
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-400" /> Расходы
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  delta,
  accent,
  iconBg,
  icon,
  invertDelta,
}: {
  label: string;
  value: string;
  delta: { text: string; positive: boolean };
  accent: string;
  iconBg: string;
  icon: React.ReactNode;
  invertDelta?: boolean;
}) {
  const isGood = invertDelta ? !delta.positive : delta.positive;
  return (
    <div className={`rounded-xl border shadow-sm p-4 ${accent}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600">{label}</span>
        <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <span className={`text-xs font-medium ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>
        {delta.text} vs пред. месяц
      </span>
    </div>
  );
}

function DeltaBadge({ text, positive, invert }: { text: string; positive: boolean; invert?: boolean }) {
  const isGood = invert ? !positive : positive;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
      isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    }`}>
      {text}
    </span>
  );
}

// ─── Inline icons (no external deps) ─────────────────────────────────

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

function ProfitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PercentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
