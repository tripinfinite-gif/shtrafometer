'use client';

import { useState, useMemo } from 'react';
import type { AdDecisionType, AdDecisionOutcome } from '@/lib/types';

// ─── Mock Data ──────────────────────────────────────────────────────

interface MockDecision {
  id: string;
  createdAt: string;
  decisionType: AdDecisionType;
  channelId: string;
  campaignId: string | null;
  campaignName: string | null;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
  hypothesis: string;
  tags: string[];
  outcome: AdDecisionOutcome;
  outcomeComment: string | null;
  outcomeAssessedAt: string | null;
  actor: 'admin' | 'ai-consultant';
}

const MOCK_DECISIONS: MockDecision[] = [
  {
    id: '1', createdAt: '2026-04-15T14:30:00Z',
    decisionType: 'bid_change', channelId: 'yandex-direct',
    campaignId: '709014339', campaignName: 'Поиск — проверка сайта',
    beforeValue: { bid: 80 }, afterValue: { bid: 120 },
    hypothesis: 'Ожидаем рост позиции и CTR на 15-20% при увеличении ставки на 50%',
    tags: ['optimization', 'scaling'],
    outcome: 'positive', outcomeComment: 'CTR вырос на 23%, CPA снизился на 8%. Позиция улучшилась с 3.2 до 1.8',
    outcomeAssessedAt: '2026-04-22T10:00:00Z', actor: 'admin',
  },
  {
    id: '2', createdAt: '2026-04-12T09:00:00Z',
    decisionType: 'budget_change', channelId: 'yandex-direct',
    campaignId: null, campaignName: null,
    beforeValue: { daily_budget: 3000 }, afterValue: { daily_budget: 5000 },
    hypothesis: 'Увеличение дневного бюджета на 67% должно пропорционально увеличить охват без роста CPA',
    tags: ['scaling'], outcome: 'neutral',
    outcomeComment: 'Охват вырос на 45%, но CPA вырос на 12%. Нужна оптимизация ставок.',
    outcomeAssessedAt: '2026-04-19T16:00:00Z', actor: 'admin',
  },
  {
    id: '3', createdAt: '2026-04-10T11:15:00Z',
    decisionType: 'strategy_change', channelId: 'yandex-direct',
    campaignId: '709014341', campaignName: 'Поиск — штрафы',
    beforeValue: { strategy: 'AVERAGE_CPC' }, afterValue: { strategy: 'WB_MAXIMUM_CONVERSIONS' },
    hypothesis: 'Переход на автостратегию по конверсиям должен снизить CPA с 3750₽ до ~2500₽',
    tags: ['test', 'automation'], outcome: 'negative',
    outcomeComment: 'CPA вырос до 4200₽, ROI упал на 15%. Откатили на ручное управление.',
    outcomeAssessedAt: '2026-04-17T14:00:00Z', actor: 'ai-consultant',
  },
  {
    id: '4', createdAt: '2026-04-08T16:00:00Z',
    decisionType: 'creative_change', channelId: 'yandex-direct',
    campaignId: '709014340', campaignName: 'РСЯ — комплаенс',
    beforeValue: { title: 'Проверьте свой сайт' }, afterValue: { title: 'Штраф до 500 000 ₽ — проверьте сайт бесплатно' },
    hypothesis: 'Добавление суммы штрафа в заголовок увеличит CTR на РСЯ за счёт urgency',
    tags: ['creative', 'test'], outcome: 'positive',
    outcomeComment: 'CTR вырос с 0.8% до 1.4% (+75%), конверсия стабильна',
    outcomeAssessedAt: '2026-04-15T12:00:00Z', actor: 'admin',
  },
  {
    id: '5', createdAt: '2026-04-05T10:00:00Z',
    decisionType: 'campaign_toggle', channelId: 'yandex-direct',
    campaignId: '709014342', campaignName: 'РСЯ — ретаргетинг',
    beforeValue: { status: 'OFF' }, afterValue: { status: 'ON' },
    hypothesis: 'Запуск ретаргетинга на посетивших, но не зарегистрировавшихся — ожидаем CR 3-5%',
    tags: ['new_campaign', 'retargeting'], outcome: 'pending',
    outcomeComment: null, outcomeAssessedAt: null, actor: 'admin',
  },
  {
    id: '6', createdAt: '2026-04-03T14:20:00Z',
    decisionType: 'negative_keywords', channelId: 'yandex-direct',
    campaignId: '709014339', campaignName: 'Поиск — проверка сайта',
    beforeValue: { count: 45 }, afterValue: { count: 78, added: ['бесплатно', 'реферат', 'курсовая', 'диплом'] },
    hypothesis: 'Добавление 33 минус-слов снизит нецелевые клики и CPA на 10-15%',
    tags: ['optimization'], outcome: 'positive',
    outcomeComment: 'CPA снизился на 18%, bounce rate упал с 65% до 48%',
    outcomeAssessedAt: '2026-04-10T09:00:00Z', actor: 'ai-consultant',
  },
];

// Mock impact data per decision
const MOCK_IMPACT: Record<string, { before: { clicks: number; cpa: number }; after: { clicks: number; cpa: number } }> = {
  '1': { before: { clicks: 420, cpa: 2100 }, after: { clicks: 516, cpa: 1932 } },
  '2': { before: { clicks: 380, cpa: 1800 }, after: { clicks: 551, cpa: 2016 } },
  '3': { before: { clicks: 150, cpa: 3750 }, after: { clicks: 120, cpa: 4200 } },
  '4': { before: { clicks: 310, cpa: 2500 }, after: { clicks: 340, cpa: 2480 } },
  '6': { before: { clicks: 520, cpa: 2450 }, after: { clicks: 490, cpa: 2009 } },
};

// ─── Helpers ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AdDecisionType, string> = {
  bid_change: 'Ставка',
  budget_change: 'Бюджет',
  campaign_toggle: 'Вкл/Выкл кампании',
  creative_change: 'Креатив',
  strategy_change: 'Стратегия',
  targeting_change: 'Таргетинг',
  negative_keywords: 'Минус-слова',
  other: 'Другое',
};

const TYPE_ICONS: Record<AdDecisionType, string> = {
  bid_change: '\u{1F4B0}',
  budget_change: '\u{1F4CA}',
  campaign_toggle: '\u{1F504}',
  creative_change: '\u{270F}\u{FE0F}',
  strategy_change: '\u{1F3AF}',
  targeting_change: '\u{1F3AA}',
  negative_keywords: '\u{1F6AB}',
  other: '\u{2699}\u{FE0F}',
};

const OUTCOME_COLORS: Record<AdDecisionOutcome, string> = {
  positive: 'border-green-500',
  negative: 'border-red-500',
  neutral: 'border-yellow-500',
  pending: 'border-gray-300',
  inconclusive: 'border-gray-400',
};

const OUTCOME_LABELS: Record<AdDecisionOutcome, string> = {
  positive: 'Положительное',
  negative: 'Отрицательное',
  neutral: 'Нейтральное',
  pending: 'Ожидает оценки',
  inconclusive: 'Неопределённое',
};

const OUTCOME_BADGE_COLORS: Record<AdDecisionOutcome, string> = {
  positive: 'bg-green-100 text-green-700',
  negative: 'bg-red-100 text-red-700',
  neutral: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-gray-100 text-gray-500',
  inconclusive: 'bg-gray-100 text-gray-500',
};

const CHANNEL_LABELS: Record<string, string> = {
  'yandex-direct': 'Яндекс.Директ',
  'vk-ads': 'VK Ads',
  'telegram-ads': 'Telegram Ads',
  'google-ads': 'Google Ads',
};

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

function rub(n: number): string {
  return n.toLocaleString('ru-RU') + ' \u20BD';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function delta(before: number, after: number): string {
  const pct = ((after - before) / before) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${Math.round(pct)}%`;
}

function deltaColor(before: number, after: number, invertPositive = false): string {
  const pct = ((after - before) / before) * 100;
  const isGood = invertPositive ? pct < 0 : pct > 0;
  return isGood ? 'text-green-600' : pct === 0 ? 'text-gray-500' : 'text-red-600';
}

function renderValue(value: Record<string, unknown>): string {
  return Object.entries(value)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`;
      if (typeof v === 'number') return `${k}: ${fmt(v)}`;
      return `${k}: ${String(v)}`;
    })
    .join(', ');
}

// ─── Decision Form Modal ────────────────────────────────────────────

function DecisionFormModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (d: MockDecision) => void;
}) {
  const [decisionType, setDecisionType] = useState<AdDecisionType>('bid_change');
  const [channelId, setChannelId] = useState('yandex-direct');
  const [campaignName, setCampaignName] = useState('');
  const [beforeStr, setBeforeStr] = useState('');
  const [afterStr, setAfterStr] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Parse key-value pairs from textarea ("key: value" per line or JSON)
    function parseKV(s: string): Record<string, unknown> {
      const trimmed = s.trim();
      if (!trimmed) return {};
      try {
        return JSON.parse(trimmed);
      } catch {
        const obj: Record<string, string> = {};
        trimmed.split('\n').forEach((line) => {
          const idx = line.indexOf(':');
          if (idx > 0) obj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        });
        return obj;
      }
    }

    const newDecision: MockDecision = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      decisionType,
      channelId,
      campaignId: null,
      campaignName: campaignName || null,
      beforeValue: parseKV(beforeStr),
      afterValue: parseKV(afterStr),
      hypothesis,
      tags: tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      outcome: 'pending',
      outcomeComment: null,
      outcomeAssessedAt: null,
      actor: 'admin',
    };

    onSubmit(newDecision);
    alert('Решение записано');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Новое решение</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип решения</label>
            <select
              value={decisionType}
              onChange={(e) => setDecisionType(e.target.value as AdDecisionType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {TYPE_ICONS[k as AdDecisionType]} {v}
                </option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Канал</label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Campaign */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Кампания <span className="text-gray-400">(опционально)</span></label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Название кампании"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          {/* Before / After */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Before</label>
              <textarea
                value={beforeStr}
                onChange={(e) => setBeforeStr(e.target.value)}
                placeholder={'key: value\nbid: 80'}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">After</label>
              <textarea
                value={afterStr}
                onChange={(e) => setAfterStr(e.target.value)}
                placeholder={'key: value\nbid: 120'}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Hypothesis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Гипотеза</label>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="Что ожидаете от этого изменения?"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Теги <span className="text-gray-400">(через запятую)</span></label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="optimization, scaling"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors cursor-pointer"
            >
              Записать решение
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assess Outcome Inline ──────────────────────────────────────────

function AssessOutcomeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (outcome: AdDecisionOutcome, comment: string) => void;
  onCancel: () => void;
}) {
  const [outcome, setOutcome] = useState<AdDecisionOutcome>('positive');
  const [comment, setComment] = useState('');

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Результат</label>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as AdDecisionOutcome)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-full focus:ring-2 focus:ring-violet-500"
        >
          <option value="positive">Положительное</option>
          <option value="negative">Отрицательное</option>
          <option value="neutral">Нейтральное</option>
          <option value="inconclusive">Неопределённое</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Комментарий</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Опишите результат..."
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-violet-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSubmit(outcome, comment)}
          className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 cursor-pointer"
        >
          Сохранить оценку
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs cursor-pointer"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Impact Card ────────────────────────────────────────────────────

function ImpactCard({ decisionId }: { decisionId: string }) {
  const impact = MOCK_IMPACT[decisionId];
  if (!impact) return null;

  const clicksDelta = delta(impact.before.clicks, impact.after.clicks);
  const cpaDelta = delta(impact.before.cpa, impact.after.cpa);
  const clicksColor = deltaColor(impact.before.clicks, impact.after.clicks);
  const cpaColor = deltaColor(impact.before.cpa, impact.after.cpa, true);

  const isPositive =
    impact.after.clicks >= impact.before.clicks && impact.after.cpa <= impact.before.cpa;

  return (
    <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-600">Impact: 7 дней до vs 7 дней после</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-200">
            <th className="px-3 py-2 text-left font-medium">Метрика</th>
            <th className="px-3 py-2 text-right font-medium">7 дней до</th>
            <th className="px-3 py-2 text-right font-medium">7 дней после</th>
            <th className="px-3 py-2 text-right font-medium">Дельта</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="px-3 py-2 text-gray-700">Клики</td>
            <td className="px-3 py-2 text-right text-gray-600">{fmt(impact.before.clicks)}</td>
            <td className="px-3 py-2 text-right text-gray-600">{fmt(impact.after.clicks)}</td>
            <td className={`px-3 py-2 text-right font-medium ${clicksColor}`}>{clicksDelta}</td>
          </tr>
          <tr>
            <td className="px-3 py-2 text-gray-700">CPA</td>
            <td className="px-3 py-2 text-right text-gray-600">{rub(impact.before.cpa)}</td>
            <td className="px-3 py-2 text-right text-gray-600">{rub(impact.after.cpa)}</td>
            <td className={`px-3 py-2 text-right font-medium ${cpaColor}`}>{cpaDelta}</td>
          </tr>
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-gray-200 text-sm">
        {isPositive ? (
          <span className="text-green-600 font-medium">{'\u2705'} Положительное влияние</span>
        ) : (
          <span className="text-red-600 font-medium">{'\u274C'} Отрицательное влияние</span>
        )}
      </div>
    </div>
  );
}

// ─── Timeline Card ──────────────────────────────────────────────────

function DecisionCard({
  decision,
  isExpanded,
  onToggle,
  onAssess,
}: {
  decision: MockDecision;
  isExpanded: boolean;
  onToggle: () => void;
  onAssess: (outcome: AdDecisionOutcome, comment: string) => void;
}) {
  const [assessing, setAssessing] = useState(false);
  const borderColor = OUTCOME_COLORS[decision.outcome];

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm border-l-4 ${borderColor} transition-all`}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Type + Channel + Campaign */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">{TYPE_ICONS[decision.decisionType]}</span>
              <span className="font-semibold text-gray-900 text-sm">
                {TYPE_LABELS[decision.decisionType]}
              </span>
              <span className="text-gray-400 text-xs">{'\u2022'}</span>
              <span className="text-gray-600 text-xs">{CHANNEL_LABELS[decision.channelId] ?? decision.channelId}</span>
              {decision.campaignName && (
                <>
                  <span className="text-gray-400 text-xs">{'\u2022'}</span>
                  <span className="text-gray-500 text-xs truncate max-w-[200px]">{decision.campaignName}</span>
                </>
              )}
            </div>

            {/* Hypothesis preview (2 lines collapsed) */}
            {decision.hypothesis && (
              <p className={`mt-1 text-sm text-gray-500 italic ${isExpanded ? '' : 'line-clamp-2'}`}>
                {decision.hypothesis}
              </p>
            )}
          </div>

          {/* Right side: date + outcome + actor */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-xs text-gray-400">{fmtDateTime(decision.createdAt)}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_BADGE_COLORS[decision.outcome]}`}>
              {OUTCOME_LABELS[decision.outcome]}
            </span>
            <span className="text-xs text-gray-400">
              {decision.actor === 'admin' ? '\u{1F464} admin' : '\u{1F916} AI'}
            </span>
          </div>
        </div>

        {/* Tags */}
        {decision.tags.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {decision.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Before -> After diff */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Before {'\u2192'} After</p>
            <div className="flex items-center gap-3 text-sm font-mono">
              <span className="line-through text-red-500 bg-red-50 px-2 py-1 rounded">
                {renderValue(decision.beforeValue)}
              </span>
              <span className="text-gray-400">{'\u2192'}</span>
              <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                {renderValue(decision.afterValue)}
              </span>
            </div>
          </div>

          {/* Hypothesis full */}
          {decision.hypothesis && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Гипотеза</p>
              <p className="text-sm text-gray-600 italic">{decision.hypothesis}</p>
            </div>
          )}

          {/* Outcome comment */}
          {decision.outcomeComment && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Результат
                {decision.outcomeAssessedAt && (
                  <span className="text-gray-400 font-normal ml-1">
                    ({fmtDate(decision.outcomeAssessedAt)})
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-700">{decision.outcomeComment}</p>
            </div>
          )}

          {/* Impact card */}
          <ImpactCard decisionId={decision.id} />

          {/* Assess button for pending */}
          {decision.outcome === 'pending' && !assessing && (
            <button
              type="button"
              onClick={() => setAssessing(true)}
              className="mt-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-200 transition-colors cursor-pointer"
            >
              Оценить результат
            </button>
          )}

          {assessing && (
            <AssessOutcomeForm
              onSubmit={(outcome, comment) => {
                onAssess(outcome, comment);
                setAssessing(false);
              }}
              onCancel={() => setAssessing(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<MockDecision[]>(MOCK_DECISIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterOutcome, setFilterOutcome] = useState<string>('');
  const [filterChannel, setFilterChannel] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');

  const filtered = useMemo(() => {
    return decisions.filter((d) => {
      if (filterType && d.decisionType !== filterType) return false;
      if (filterOutcome && d.outcome !== filterOutcome) return false;
      if (filterChannel && d.channelId !== filterChannel) return false;
      if (filterTag) {
        const search = filterTag.toLowerCase();
        if (!d.tags.some((t) => t.toLowerCase().includes(search))) return false;
      }
      return true;
    });
  }, [decisions, filterType, filterOutcome, filterChannel, filterTag]);

  // Stats
  const stats = useMemo(() => {
    const positive = decisions.filter((d) => d.outcome === 'positive').length;
    const negative = decisions.filter((d) => d.outcome === 'negative').length;
    const neutral = decisions.filter((d) => d.outcome === 'neutral').length;
    const pending = decisions.filter((d) => d.outcome === 'pending').length;
    return { total: decisions.length, positive, negative, neutral, pending };
  }, [decisions]);

  function handleAddDecision(d: MockDecision) {
    setDecisions((prev) => [d, ...prev]);
  }

  function handleAssess(id: string, outcome: AdDecisionOutcome, comment: string) {
    setDecisions((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, outcome, outcomeComment: comment, outcomeAssessedAt: new Date().toISOString() }
          : d,
      ),
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Журнал решений</h1>
          <p className="text-gray-500 text-sm mt-1">Рекламные решения с оценкой влияния</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors w-fit cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M7 1v12M1 7h12" />
          </svg>
          Новое решение
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          <p className="text-gray-400 text-xs mt-1">Решений за апрель</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-green-600 font-semibold">{stats.positive} {'\u{1F7E2}'}</span>
            <span className="text-red-600 font-semibold">{stats.negative} {'\u{1F534}'}</span>
            <span className="text-yellow-600 font-semibold">{stats.neutral} {'\u{1F7E1}'}</span>
            <span className="text-gray-400 font-semibold">{stats.pending} {'\u{23F3}'}</span>
          </div>
          <p className="text-gray-400 text-xs mt-1">По результатам</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-green-600">CTR +14%</p>
          <p className="text-gray-400 text-xs mt-1">Средний impact</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        >
          <option value="">Все типы</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        >
          <option value="">Все результаты</option>
          {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        >
          <option value="">Все каналы</option>
          {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <input
          type="text"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          placeholder="Фильтр по тегу..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 w-44"
        />
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">Решения не найдены</p>
          </div>
        )}
        {filtered.map((d) => (
          <DecisionCard
            key={d.id}
            decision={d}
            isExpanded={expandedId === d.id}
            onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
            onAssess={(outcome, comment) => handleAssess(d.id, outcome, comment)}
          />
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <DecisionFormModal
          onClose={() => setShowForm(false)}
          onSubmit={handleAddDecision}
        />
      )}
    </div>
  );
}
