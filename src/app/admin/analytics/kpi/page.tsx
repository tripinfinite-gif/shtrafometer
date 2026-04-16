'use client';

import { useState } from 'react';

// ─── Mock Data ───────────────────────────────────────────────────────

interface KpiItem {
  metric: string;
  plan: number;
  fact: number;
  unit: string;
  inverse?: boolean;
}

const MOCK_KPI: KpiItem[] = [
  { metric: 'Визиты', plan: 6000, fact: 4820, unit: '' },
  { metric: 'Проверки', plan: 1800, fact: 1340, unit: '' },
  { metric: 'Регистрации', plan: 300, fact: 186, unit: '' },
  { metric: 'Заказы', plan: 60, fact: 42, unit: '' },
  { metric: 'Выручка', plan: 600000, fact: 420000, unit: '₽' },
  { metric: 'CAC', plan: 4000, fact: 5200, unit: '₽', inverse: true },
];

const CURRENT_DAY = 15;
const DAYS_IN_MONTH = 30;

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

function fmtWithUnit(n: number, unit: string): string {
  return fmt(n) + (unit ? ' ' + unit : '');
}

function getCompletion(kpi: KpiItem): number {
  if (kpi.inverse) {
    // For inverse metrics: if fact <= plan, that's 100%+
    if (kpi.fact === 0) return 100;
    return (kpi.plan / kpi.fact) * 100;
  }
  if (kpi.plan === 0) return 0;
  return (kpi.fact / kpi.plan) * 100;
}

function getBarColor(completion: number): string {
  if (completion >= 80) return '#6C5CE7'; // purple/blue — on track
  if (completion >= 50) return '#F59E0B'; // yellow — warning
  return '#EF4444'; // red — behind
}

function getForecast(kpi: KpiItem): number {
  return Math.round(kpi.fact * (DAYS_IN_MONTH / CURRENT_DAY));
}

function getForecastCompletion(kpi: KpiItem): number {
  const forecast = getForecast(kpi);
  if (kpi.inverse) {
    if (forecast === 0) return 100;
    return (kpi.plan / forecast) * 100;
  }
  if (kpi.plan === 0) return 0;
  return (forecast / kpi.plan) * 100;
}

// ─── Page ────────────────────────────────────────────────────────────

export default function KpiPage() {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  function handleEditStart(idx: number) {
    setEditingIdx(idx);
    setEditValue(String(MOCK_KPI[idx].plan));
  }

  function handleEditSave() {
    if (editingIdx !== null) {
      alert(`Сохранено: ${MOCK_KPI[editingIdx].metric} — план ${editValue}`);
      setEditingIdx(null);
      setEditValue('');
    }
  }

  function handleEditCancel() {
    setEditingIdx(null);
    setEditValue('');
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KPI план-факт</h1>
        <p className="text-gray-500 text-sm mt-1">
          Апрель 2026 — {CURRENT_DAY} из {DAYS_IN_MONTH} дней
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {MOCK_KPI.map((kpi, i) => {
          const completion = getCompletion(kpi);
          const barColor = getBarColor(completion);
          const forecast = getForecast(kpi);
          const forecastCompletion = getForecastCompletion(kpi);

          return (
            <div
              key={kpi.metric}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.metric}</p>
                  {kpi.inverse && (
                    <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 mt-0.5 inline-block">
                      меньше = лучше
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleEditStart(i)}
                  className="text-xs text-gray-400 hover:text-violet-600 cursor-pointer transition-colors"
                >
                  ✎ план
                </button>
              </div>

              {/* Plan / Fact */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-semibold text-gray-900">
                  {fmtWithUnit(kpi.fact, kpi.unit)}
                </span>
                <span className="text-sm text-gray-400">
                  / {fmtWithUnit(kpi.plan, kpi.unit)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(completion, 100)}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span
                  className="font-semibold"
                  style={{ color: barColor }}
                >
                  {completion.toFixed(1)}%
                </span>
                <span className="text-gray-400">выполнения</span>
              </div>

              {/* Forecast */}
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span className="font-medium text-gray-700">Прогноз:</span>{' '}
                {fmtWithUnit(forecast, kpi.unit)}{' '}
                <span
                  className={`font-semibold ${forecastCompletion >= 100 ? 'text-green-600' : forecastCompletion >= 80 ? 'text-amber-600' : 'text-red-500'}`}
                >
                  ({forecastCompletion.toFixed(0)}% плана)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Summary Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Сводная таблица</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Метрика</th>
                <th className="px-4 py-3 font-medium text-right">План</th>
                <th className="px-4 py-3 font-medium text-right">Факт</th>
                <th className="px-4 py-3 font-medium text-right">%</th>
                <th className="px-4 py-3 font-medium text-right">Прогноз</th>
                <th className="px-4 py-3 font-medium text-right">Прогноз %</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_KPI.map((kpi) => {
                const completion = getCompletion(kpi);
                const barColor = getBarColor(completion);
                const forecast = getForecast(kpi);
                const forecastCompletion = getForecastCompletion(kpi);
                return (
                  <tr
                    key={kpi.metric}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-800">
                      {kpi.metric}
                      {kpi.inverse && (
                        <span className="text-[10px] text-gray-400 ml-1">(↓)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {fmtWithUnit(kpi.plan, kpi.unit)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-800 font-medium">
                      {fmtWithUnit(kpi.fact, kpi.unit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold" style={{ color: barColor }}>
                        {completion.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {fmtWithUnit(forecast, kpi.unit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${forecastCompletion >= 100 ? 'text-green-600' : forecastCompletion >= 80 ? 'text-amber-600' : 'text-red-500'}`}
                      >
                        {forecastCompletion.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Plan Modal ── */}
      {editingIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleEditCancel}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Установить план
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              {MOCK_KPI[editingIdx].metric}
              {MOCK_KPI[editingIdx].unit ? ` (${MOCK_KPI[editingIdx].unit})` : ''}
            </p>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleEditCancel}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                className="px-4 py-2 text-sm text-white bg-violet-600 rounded-lg hover:bg-violet-700 cursor-pointer transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
