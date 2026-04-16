'use client';

import { useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

type Impact = 'high' | 'medium' | 'low';
type Status = 'pending' | 'applied' | 'rejected' | 'tested';
type Source = 'ai' | 'manual' | 'ab_test_result';

interface Recommendation {
  id: string;
  element: string;
  recommendation: string;
  impact: Impact;
  confidence: number;
  status: Status;
  source: Source;
  createdAt: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  { id: '1', element: 'Hero CTA', recommendation: 'Изменить текст кнопки с "Проверить сайт" на "Проверить бесплатно за 30 секунд" — добавляет urgency и убирает страх оплаты', impact: 'high', confidence: 0.87, status: 'pending', source: 'ai', createdAt: '2026-04-15' },
  { id: '2', element: 'Форма проверки', recommendation: 'Добавить placeholder "Введите URL вашего сайта" и иконку — снижает когнитивную нагрузку', impact: 'medium', confidence: 0.72, status: 'applied', source: 'ai', createdAt: '2026-04-14' },
  { id: '3', element: 'Блок результатов', recommendation: 'Размытие нарушений с 4-го пункта → "Зарегистрируйтесь для полного отчёта" — основной драйвер конверсии', impact: 'high', confidence: 0.91, status: 'pending', source: 'manual', createdAt: '2026-04-13' },
  { id: '4', element: 'Pricing секция', recommendation: 'Добавить бейдж "Популярный" на тариф "Автофикс Стандарт" — якорный эффект', impact: 'medium', confidence: 0.65, status: 'rejected', source: 'ai', createdAt: '2026-04-12' },
  { id: '5', element: 'Footer', recommendation: 'Добавить блок "Нам доверяют 500+ компаний" с логотипами — social proof', impact: 'high', confidence: 0.78, status: 'pending', source: 'ai', createdAt: '2026-04-11' },
  { id: '6', element: 'Mobile навигация', recommendation: 'Sticky CTA-кнопка внизу экрана на мобильных — видна при скролле', impact: 'medium', confidence: 0.83, status: 'tested', source: 'ab_test_result', createdAt: '2026-04-10' },
];

// ─── Helpers ────────────────────────────────────────────────────────

const IMPACT_BADGE: Record<Impact, { label: string; icon: string; cls: string }> = {
  high:   { label: 'Высокий', icon: '🔴', cls: 'bg-red-100 text-red-700' },
  medium: { label: 'Средний', icon: '🟡', cls: 'bg-yellow-100 text-yellow-700' },
  low:    { label: 'Низкий',  icon: '🟢', cls: 'bg-green-100 text-green-700' },
};

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
  pending:  { label: 'Ожидает',   cls: 'bg-gray-100 text-gray-600' },
  applied:  { label: 'Применено', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонено', cls: 'bg-red-100 text-red-700' },
  tested:   { label: 'Тестируется', cls: 'bg-blue-100 text-blue-700' },
};

const SOURCE_LABEL: Record<Source, string> = {
  ai: '🤖 AI',
  manual: '👤 Manual',
  ab_test_result: '🧪 A/B тест',
};

// ─── Component ──────────────────────────────────────────────────────

export default function OptimizationPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [impactFilter, setImpactFilter] = useState<'all' | Impact>('all');

  const filtered = MOCK_RECOMMENDATIONS.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (impactFilter !== 'all' && r.impact !== impactFilter) return false;
    return true;
  });

  const appliedCount = MOCK_RECOMMENDATIONS.filter((r) => r.status === 'applied').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Рекомендации AI</h1>
          <p className="text-gray-500 mt-1">Оптимизация конверсии на основе анализа поведения</p>
        </div>
        <button
          onClick={() => alert('Анализ запущен')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#6C5CE7] text-white font-medium hover:bg-[#5b4bd5] transition-colors cursor-pointer"
        >
          <span className="text-lg">✨</span>
          Запросить анализ AI
        </button>
      </div>

      {/* Stats bar */}
      <div className="rounded-xl border shadow-sm p-4 flex flex-wrap gap-6">
        <Stat label="Всего рекомендаций" value={String(MOCK_RECOMMENDATIONS.length)} />
        <Stat label="Применено" value={String(appliedCount)} />
        <Stat label="Потенциальный рост CR" value="+23%" accent />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <FilterGroup
          label="Статус"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'pending', label: 'Ожидает' },
            { value: 'applied', label: 'Применено' },
            { value: 'rejected', label: 'Отклонено' },
            { value: 'tested', label: 'Тестируется' },
          ]}
        />
        <FilterGroup
          label="Импакт"
          value={impactFilter}
          onChange={(v) => setImpactFilter(v as typeof impactFilter)}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'high', label: '🔴 Высокий' },
            { value: 'medium', label: '🟡 Средний' },
            { value: 'low', label: '🟢 Низкий' },
          ]}
        />
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-gray-400 text-center py-8">Нет рекомендаций по выбранным фильтрам</p>
        )}
        {filtered.map((r) => (
          <RecommendationCard key={r.id} rec={r} />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold ${accent ? 'text-green-600' : ''}`}>{value}</div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border rounded-lg px-3 py-1.5 bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const impact = IMPACT_BADGE[rec.impact];
  const status = STATUS_BADGE[rec.status];
  const confidencePct = Math.round(rec.confidence * 100);

  return (
    <div className="rounded-xl border shadow-sm p-5 space-y-3">
      {/* Top row: element + badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-lg">{rec.element}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${impact.cls}`}>
          {impact.icon} {impact.label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>
          {status.label}
        </span>
        <span className="text-xs text-gray-400 ml-auto">{SOURCE_LABEL[rec.source]}</span>
      </div>

      {/* Recommendation text */}
      <p className="text-gray-700 text-sm leading-relaxed">{rec.recommendation}</p>

      {/* Confidence bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-24 shrink-0">Уверенность</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#6C5CE7] transition-all"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 w-10 text-right">{confidencePct}%</span>
      </div>

      {/* Date + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-xs text-gray-400">{rec.createdAt}</span>
        <div className="flex gap-2">
          {rec.status === 'pending' && (
            <>
              <ActionBtn label="Применить" cls="bg-green-600 text-white hover:bg-green-700" onClick={() => alert(`Применяем: ${rec.element}`)} />
              <ActionBtn label="Отклонить" cls="bg-red-50 text-red-600 hover:bg-red-100" onClick={() => alert(`Отклоняем: ${rec.element}`)} />
              <ActionBtn label="Создать A/B тест" cls="bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => alert(`A/B тест для: ${rec.element}`)} />
            </>
          )}
          {rec.status === 'applied' && (
            <span className="text-xs text-green-600 font-medium">Применено ✓</span>
          )}
          {rec.status === 'rejected' && (
            <ActionBtn label="Вернуть" cls="bg-gray-100 text-gray-600 hover:bg-gray-200" onClick={() => alert(`Возвращаем: ${rec.element}`)} />
          )}
          {rec.status === 'tested' && (
            <span className="text-xs text-blue-600 font-medium">Тестируется</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, cls, onClick }: { label: string; cls: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${cls}`}
    >
      {label}
    </button>
  );
}
