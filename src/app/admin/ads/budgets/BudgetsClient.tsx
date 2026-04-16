'use client';

import { useState } from 'react';

// ─── Mock Data ───────────────────────────────────────────────────────

type Budget = {
  id: string;
  channel: string;
  type: 'daily' | 'weekly' | 'monthly';
  limit: number;
  spent: number;
  percent: number;
};

const MOCK_BUDGETS: Budget[] = [
  { id: '1', channel: 'Яндекс.Директ', type: 'daily', limit: 5000, spent: 3200, percent: 64 },
  { id: '2', channel: 'Яндекс.Директ', type: 'monthly', limit: 120000, spent: 85000, percent: 70.8 },
  { id: '3', channel: 'VK Ads', type: 'monthly', limit: 30000, spent: 12000, percent: 40 },
];

const TYPE_LABELS: Record<string, string> = {
  daily: 'Дневной',
  weekly: 'Недельный',
  monthly: 'Месячный',
};

const CHANNEL_OPTIONS = ['Яндекс.Директ', 'VK Ads', 'Telegram Ads', 'Google Ads'];
const TYPE_OPTIONS: { value: 'daily' | 'weekly' | 'monthly'; label: string }[] = [
  { value: 'daily', label: 'Дневной' },
  { value: 'weekly', label: 'Недельный' },
  { value: 'monthly', label: 'Месячный' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function rub(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function progressColor(pct: number): string {
  if (pct < 60) return 'bg-green-500';
  if (pct <= 80) return 'bg-yellow-500';
  return 'bg-red-500';
}

function progressBg(pct: number): string {
  if (pct < 60) return 'bg-green-100';
  if (pct <= 80) return 'bg-yellow-100';
  return 'bg-red-100';
}

// ─── Component ──────────────────────────────────────────────────────

export default function BudgetsClient() {
  const [budgets, setBudgets] = useState(MOCK_BUDGETS);
  const [showModal, setShowModal] = useState(false);
  const [newChannel, setNewChannel] = useState(CHANNEL_OPTIONS[0]);
  const [newType, setNewType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [newLimit, setNewLimit] = useState('');
  const [newThreshold, setNewThreshold] = useState('80');

  const handleAdd = () => {
    const limit = parseInt(newLimit, 10);
    if (!limit || limit <= 0) return;
    const b: Budget = {
      id: String(Date.now()),
      channel: newChannel,
      type: newType,
      limit,
      spent: 0,
      percent: 0,
    };
    setBudgets((prev) => [...prev, b]);
    setShowModal(false);
    setNewLimit('');
    setNewThreshold('80');
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бюджеты и лимиты</h1>
          <p className="text-gray-500 text-sm mt-1">Контроль расходов по каналам</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors cursor-pointer w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Добавить лимит
        </button>
      </div>

      {/* ── Budget Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {budgets.map((b) => {
          const remaining = b.limit - b.spent;
          return (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{b.channel}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{TYPE_LABELS[b.type]} лимит</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    b.percent < 60
                      ? 'bg-green-100 text-green-700'
                      : b.percent <= 80
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {b.percent.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-end justify-between mb-2">
                <span className="text-lg font-semibold text-gray-900">{rub(b.spent)}</span>
                <span className="text-xs text-gray-400">из {rub(b.limit)}</span>
              </div>

              {/* Progress bar */}
              <div className={`w-full h-2.5 rounded-full ${progressBg(b.percent)}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressColor(b.percent)}`}
                  style={{ width: `${Math.min(b.percent, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-500">Остаток:</span>
                <span className={`text-sm font-medium ${remaining > 0 ? 'text-gray-700' : 'text-red-600'}`}>
                  {rub(remaining)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Forecast ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Прогноз</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <span className="text-yellow-500 text-lg leading-none mt-0.5">&#9888;</span>
            <div>
              <p className="text-sm text-gray-800 font-medium">Дневной бюджет Яндекс.Директ</p>
              <p className="text-xs text-gray-500 mt-0.5">
                При текущем темпе расходов дневной бюджет будет исчерпан к <span className="font-medium text-gray-700">17:30</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <span className="text-orange-500 text-lg leading-none mt-0.5">&#9888;</span>
            <div>
              <p className="text-sm text-gray-800 font-medium">Месячный бюджет Яндекс.Директ</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Месячный бюджет закончится <span className="font-medium text-gray-700">24 апреля</span> при текущем темпе расходов
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <span className="text-green-500 text-lg leading-none mt-0.5">&#10003;</span>
            <div>
              <p className="text-sm text-gray-800 font-medium">Месячный бюджет VK Ads</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Бюджет расходуется равномерно, прогноз: <span className="font-medium text-gray-700">72%</span> к концу месяца
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Limit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Добавить лимит</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Канал</label>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer"
                >
                  {CHANNEL_OPTIONS.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип лимита</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма, ₽</label>
                <input
                  type="number"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  placeholder="10000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Порог алерта, %</label>
                <input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  placeholder="80"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors cursor-pointer"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
