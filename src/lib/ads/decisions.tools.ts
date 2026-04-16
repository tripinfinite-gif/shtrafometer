/**
 * Tool-definitions для журнала рекламных решений (Decision Log).
 *
 * Phase D4 — AI tools для Decision Log.
 * Формат совместим с Anthropic Messages API (name / description / input_schema)
 * + кастомное поле `execute` и маркер `mutating`.
 *
 * - get_decision_history — read-only, история решений
 * - get_decision_impact  — read-only, оценка влияния решения на метрики
 * - record_decision      — mutating, запись нового решения (HITL gate)
 */

import {
  getDecisions,
  getDecision,
  addDecision,
  type Decision,
  type GetDecisionsFilter,
} from './decisions';

// ─── Types ────────────────────────────────────────────────────────

export type JsonSchema = Record<string, unknown>;

export interface DecisionToolExecutionContext {
  userId: string;
}

export interface DecisionToolDefinition<I = unknown, O = unknown> {
  name: string;
  description: string;
  input_schema: JsonSchema;
  mutating?: boolean;
  execute: (input: I, ctx: DecisionToolExecutionContext) => Promise<O>;
}

// ─── Tool: get_decision_history ───────────────────────────────────

interface DecisionHistoryInput {
  from?: string;
  to?: string;
  channel_id?: string;
  limit?: number;
}

const getDecisionHistory: DecisionToolDefinition<
  DecisionHistoryInput,
  { decisions: Decision[]; count: number }
> = {
  name: 'get_decision_history',
  description:
    'Получить историю рекламных решений за указанный период. ' +
    'Используй когда пользователь спрашивает «что мы меняли», «какие решения принимали», ' +
    '«покажи историю изменений».',
  input_schema: {
    type: 'object',
    properties: {
      from: {
        type: 'string',
        description: 'Начало периода (ISO date, например 2026-04-01). Если не указать — без ограничения.',
      },
      to: {
        type: 'string',
        description: 'Конец периода (ISO date). Если не указать — до сегодня.',
      },
      channel_id: {
        type: 'string',
        description: 'ID рекламного канала (yandex-direct, vk-ads, telegram и т.д.). Если не указать — все каналы.',
      },
      limit: {
        type: 'integer',
        description: 'Максимальное количество записей (по умолчанию 20).',
        default: 20,
      },
    },
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input) => {
    const filter: GetDecisionsFilter = {
      from: input.from,
      to: input.to,
      channel_id: input.channel_id,
      limit: input.limit ?? 20,
    };
    const decisions = await getDecisions(filter);
    return { decisions, count: decisions.length };
  },
};

// ─── Tool: get_decision_impact ────────────────────────────────────

interface DecisionImpactInput {
  decision_id: string;
}

interface DecisionImpactResult {
  decision: Decision | null;
  impact: {
    available: boolean;
    message: string;
    snapshot_before?: Record<string, unknown> | null;
    snapshot_after?: Record<string, unknown> | null;
  };
}

const getDecisionImpact: DecisionToolDefinition<
  DecisionImpactInput,
  DecisionImpactResult
> = {
  name: 'get_decision_impact',
  description:
    'Оценить влияние конкретного рекламного решения на метрики (7 дней до vs 7 дней после). ' +
    'Используй когда пользователь спрашивает «как повлияло изменение», «был ли эффект от решения».',
  input_schema: {
    type: 'object',
    properties: {
      decision_id: {
        type: 'string',
        description: 'ID решения из журнала.',
      },
    },
    required: ['decision_id'],
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input) => {
    const decision = await getDecision(input.decision_id);
    if (!decision) {
      return {
        decision: null,
        impact: {
          available: false,
          message: `Решение с ID «${input.decision_id}» не найдено в журнале.`,
        },
      };
    }

    const hasSnapshots = decision.snapshot_before && decision.snapshot_after;
    return {
      decision,
      impact: hasSnapshots
        ? {
            available: true,
            message: 'Данные для сравнения доступны.',
            snapshot_before: decision.snapshot_before,
            snapshot_after: decision.snapshot_after,
          }
        : {
            available: false,
            message:
              'Снимки метрик ещё не собраны. Данные появятся через 7 дней после принятия решения.',
          },
    };
  },
};

// ─── Tool: record_decision ────────────────────────────────────────

interface RecordDecisionInput {
  decision_type: string;
  channel_id: string;
  campaign_id?: string;
  campaign_name?: string;
  before_value?: Record<string, unknown>;
  after_value?: Record<string, unknown>;
  hypothesis: string;
  tags?: string[];
}

const recordDecision: DecisionToolDefinition<
  RecordDecisionInput,
  { decision: Decision; message: string }
> = {
  name: 'record_decision',
  description:
    'Записать рекламное решение в журнал с гипотезой. ' +
    'Используй когда пользователь сообщает об изменении ставки, бюджета, стратегии ' +
    'или когда ты сам рекомендуешь изменение.',
  input_schema: {
    type: 'object',
    properties: {
      decision_type: {
        type: 'string',
        description:
          'Тип решения: bid_change, budget_change, strategy_change, campaign_start, campaign_stop, targeting_change, creative_change, other.',
      },
      channel_id: {
        type: 'string',
        description: 'ID рекламного канала: yandex-direct, vk-ads, telegram, seo, other.',
      },
      campaign_id: {
        type: 'string',
        description: 'ID кампании (если применимо).',
      },
      campaign_name: {
        type: 'string',
        description: 'Название кампании (для читаемости).',
      },
      before_value: {
        type: 'object',
        description: 'Значение ДО изменения (например { "daily_budget": 500 }).',
      },
      after_value: {
        type: 'object',
        description: 'Значение ПОСЛЕ изменения (например { "daily_budget": 1000 }).',
      },
      hypothesis: {
        type: 'string',
        description: 'Гипотеза: что ожидаем от этого изменения.',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Теги для группировки (например ["rsy", "budget", "test"]).',
      },
    },
    required: ['decision_type', 'channel_id', 'hypothesis'],
    additionalProperties: false,
  },
  mutating: true,
  execute: async (input, ctx) => {
    const decision = await addDecision({
      decision_type: input.decision_type,
      channel_id: input.channel_id,
      campaign_id: input.campaign_id ?? null,
      campaign_name: input.campaign_name ?? null,
      before_value: input.before_value ?? null,
      after_value: input.after_value ?? null,
      hypothesis: input.hypothesis,
      actor: 'ai-consultant',
      conversation_id: null, // conversationId недоступен в ctx — оставляем null
      tags: input.tags ?? [],
    });
    return {
      decision,
      message: `Решение записано в журнал (ID: ${decision.id}). Снимки метрик будут собраны автоматически через 7 дней.`,
    };
  },
};

// ─── Export ───────────────────────────────────────────────────────

export const decisionTools: DecisionToolDefinition[] = [
  getDecisionHistory as DecisionToolDefinition,
  getDecisionImpact as DecisionToolDefinition,
  recordDecision as DecisionToolDefinition,
];

/** Удобный lookup по имени. */
export const decisionToolsByName: Record<string, DecisionToolDefinition> =
  Object.fromEntries(decisionTools.map((t) => [t.name, t]));
