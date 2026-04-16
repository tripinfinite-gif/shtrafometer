'use client';

import { useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

type ExpStatus = 'running' | 'completed' | 'draft';

interface Variant {
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cr: number;
}

interface Experiment {
  id: string;
  name: string;
  status: ExpStatus;
  startedAt: string | null;
  endedAt?: string;
  traffic: number;
  variantA: Variant;
  variantB: Variant;
  confidence: number;
  winner: string | null;
  uplift: string | null;
}

// ─── Mock Data ──────────────────────────────────────────────────────

const MOCK_EXPERIMENTS: Experiment[] = [
  {
    id: '1', name: 'CTA текст: "Проверить" vs "Проверить бесплатно"',
    status: 'running', startedAt: '2026-04-10', traffic: 50,
    variantA: { name: 'Контроль', impressions: 1240, clicks: 186, conversions: 12, cr: 0.97 },
    variantB: { name: 'Бесплатно', impressions: 1180, clicks: 224, conversions: 18, cr: 1.53 },
    confidence: 0.92, winner: 'B', uplift: '+57.7%',
  },
  {
    id: '2', name: 'Sticky CTA на мобильных',
    status: 'completed', startedAt: '2026-04-01', endedAt: '2026-04-09', traffic: 30,
    variantA: { name: 'Без sticky', impressions: 890, clicks: 67, conversions: 5, cr: 0.56 },
    variantB: { name: 'Со sticky', impressions: 910, clicks: 112, conversions: 9, cr: 0.99 },
    confidence: 0.88, winner: 'B', uplift: '+76.8%',
  },
  {
    id: '3', name: 'Количество видимых нарушений: 3 vs 5',
    status: 'draft', startedAt: null, traffic: 50,
    variantA: { name: '3 нарушения', impressions: 0, clicks: 0, conversions: 0, cr: 0 },
    variantB: { name: '5 нарушений', impressions: 0, clicks: 0, conversions: 0, cr: 0 },
    confidence: 0, winner: null, uplift: null,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

const STATUS_CFG: Record<ExpStatus, { label: string; icon: string; cls: string }> = {
  running:   { label: 'Активный',   icon: '🟢', cls: 'bg-green-100 text-green-700' },
  completed: { label: 'Завершён',   icon: '✅', cls: 'bg-blue-100 text-blue-700' },
  draft:     { label: 'Черновик',   icon: '📝', cls: 'bg-gray-100 text-gray-600' },
};

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

// ─── Component ──────────────────────────────────────────────────────

export default function AbTestsPage() {
  const [showModal, setShowModal] = useState(false);

  const activeCount = MOCK_EXPERIMENTS.filter((e) => e.status === 'running').length;
  const completedExps = MOCK_EXPERIMENTS.filter((e) => e.status === 'completed' || (e.status === 'running' && e.uplift));
  const avgUplift = completedExps.length > 0
    ? completedExps.reduce((sum, e) => sum + parseFloat((e.uplift ?? '0').replace('+', '')), 0) / completedExps.length
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">A/B тесты</h1>
          <p className="text-gray-500 mt-1">Эксперименты для проверки гипотез оптимизации</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#6C5CE7] text-white font-medium hover:bg-[#5b4bd5] transition-colors cursor-pointer"
        >
          <span className="text-lg">+</span>
          Создать тест
        </button>
      </div>

      {/* Stats bar */}
      <div className="rounded-xl border shadow-sm p-4 flex flex-wrap gap-6">
        <StatBlock label="Всего экспериментов" value={String(MOCK_EXPERIMENTS.length)} />
        <StatBlock label="Активных" value={String(activeCount)} />
        <StatBlock label="Средний uplift" value={`+${avgUplift.toFixed(0)}%`} accent />
      </div>

      {/* Experiment cards */}
      <div className="space-y-4">
        {MOCK_EXPERIMENTS.map((exp) => (
          <ExperimentCard key={exp.id} exp={exp} />
        ))}
      </div>

      {/* Create modal */}
      {showModal && <CreateModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold ${accent ? 'text-green-600' : ''}`}>{value}</div>
    </div>
  );
}

function ExperimentCard({ exp }: { exp: Experiment }) {
  const status = STATUS_CFG[exp.status];
  const confidencePct = Math.round(exp.confidence * 100);

  return (
    <div className="rounded-xl border shadow-sm p-5 space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-lg flex-1 min-w-0">{exp.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>
          {status.icon} {status.label}
        </span>
      </div>

      {/* Dates + traffic */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {exp.startedAt && <span>Начало: {exp.startedAt}</span>}
        {exp.endedAt && <span>Конец: {exp.endedAt}</span>}
        <span>Трафик: {exp.traffic}%</span>
      </div>

      {/* Variants table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="pb-2 pr-4 font-medium">Вариант</th>
              <th className="pb-2 pr-4 font-medium text-right">Показы</th>
              <th className="pb-2 pr-4 font-medium text-right">Клики</th>
              <th className="pb-2 pr-4 font-medium text-right">Конверсии</th>
              <th className="pb-2 font-medium text-right">CR%</th>
            </tr>
          </thead>
          <tbody>
            <VariantRow variant={exp.variantA} label="A" isWinner={exp.winner === 'A'} />
            <VariantRow variant={exp.variantB} label="B" isWinner={exp.winner === 'B'} />
          </tbody>
        </table>
      </div>

      {/* Confidence bar + uplift */}
      {exp.status !== 'draft' && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-24 shrink-0">Confidence</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${confidencePct >= 90 ? 'bg-green-500' : confidencePct >= 70 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 w-10 text-right">{confidencePct}%</span>
          </div>
          {exp.uplift && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-600">{exp.uplift}</span>
              <span className="text-xs text-gray-400">
                (p={((1 - exp.confidence).toFixed(2))}, confidence {confidencePct}%)
              </span>
              {confidencePct >= 90 && exp.winner && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  Победитель: {exp.winner}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {exp.status === 'running' && (
          <ActionBtn label="Остановить" cls="bg-red-50 text-red-600 hover:bg-red-100" onClick={() => alert(`Останавливаем: ${exp.name}`)} />
        )}
        {exp.status === 'draft' && (
          <ActionBtn label="Запустить" cls="bg-green-600 text-white hover:bg-green-700" onClick={() => alert(`Запускаем: ${exp.name}`)} />
        )}
        {exp.status === 'completed' && (
          <ActionBtn label="Архивировать" cls="bg-gray-100 text-gray-600 hover:bg-gray-200" onClick={() => alert(`Архивируем: ${exp.name}`)} />
        )}
      </div>
    </div>
  );
}

function VariantRow({ variant, label, isWinner }: { variant: Variant; label: string; isWinner: boolean }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4">
        <span className="font-medium">{label}: {variant.name}</span>
        {isWinner && <span className="ml-2 text-xs text-green-600 font-medium">★</span>}
      </td>
      <td className="py-2 pr-4 text-right text-gray-600">{fmt(variant.impressions)}</td>
      <td className="py-2 pr-4 text-right text-gray-600">{fmt(variant.clicks)}</td>
      <td className="py-2 pr-4 text-right text-gray-600">{fmt(variant.conversions)}</td>
      <td className="py-2 text-right font-medium">{variant.cr.toFixed(2)}%</td>
    </tr>
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

// ─── Create Modal ───────────────────────────────────────────────────

function CreateModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    element: '',
    variantA: '',
    variantB: '',
    traffic: 50,
  });

  const handleCreate = () => {
    if (!form.name.trim()) {
      alert('Укажите название теста');
      return;
    }
    alert(`Тест создан: ${form.name}\nЭлемент: ${form.element}\nA: ${form.variantA}\nB: ${form.variantB}\nТрафик: ${form.traffic}%`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Создать A/B тест</h2>

        <Field label="Название теста" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder='Например: CTA текст "Проверить" vs "Бесплатно"' />
        <Field label="Элемент" value={form.element} onChange={(v) => setForm({ ...form, element: v })} placeholder="Например: Hero CTA" />
        <Field label="Вариант A (контроль)" value={form.variantA} onChange={(v) => setForm({ ...form, variantA: v })} placeholder="Описание текущего варианта" />
        <Field label="Вариант B (тест)" value={form.variantB} onChange={(v) => setForm({ ...form, variantB: v })} placeholder="Описание нового варианта" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Трафик: {form.traffic}%</label>
          <input
            type="range"
            min={10}
            max={50}
            value={form.traffic}
            onChange={(e) => setForm({ ...form, traffic: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>10%</span>
            <span>50%</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
            Отмена
          </button>
          <button onClick={handleCreate} className="px-4 py-2 text-sm rounded-lg bg-[#6C5CE7] text-white font-medium hover:bg-[#5b4bd5] transition-colors cursor-pointer">
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7]"
      />
    </div>
  );
}
