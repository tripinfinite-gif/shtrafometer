/**
 * Tool-definitions Яндекс.Метрики для AI-консультанта.
 *
 * Phase 3B — docs/plan-ai-consultant.md.
 * Формат идентичен direct.tools.ts (совместим с Anthropic Messages API).
 * Все инструменты read-only (`mutating: false`).
 *
 * Ключевая фишка — `metrika_get_conversions`: понимает наши 7 целей
 * Штрафометра по имени (free_check, order_submit, payment_success, …),
 * сам резолвит имя → goal_id через getGoals.
 */

import {
  resolveGoalId,
  SHTRAFOMETER_COUNTER_ID,
  type MetrikaClient,
} from './metrika';
import type { Counter, Goal, ReportResponse } from './metrika.schemas';

/* -------------------------------------------------------------------------- */
/*                               Tool interfaces                              */
/* -------------------------------------------------------------------------- */

export type JsonSchema = Record<string, unknown>;

export interface MetrikaToolContext {
  client: MetrikaClient;
}

export interface MetrikaToolDefinition<I = unknown, O = unknown> {
  name: string;
  description: string;
  input_schema: JsonSchema;
  mutating?: boolean;
  execute: (input: I, ctx: MetrikaToolContext) => Promise<O>;
}

/* -------------------------------------------------------------------------- */
/*                                    Tools                                   */
/* -------------------------------------------------------------------------- */

const getCounters: MetrikaToolDefinition<
  Record<string, never>,
  { counters: Counter[]; count: number }
> = {
  name: 'metrika_get_counters',
  description:
    'Список счётчиков Яндекс.Метрики, доступных текущему OAuth-токену. ' +
    'Используй когда пользователь спрашивает «какие у меня счётчики», «что за счётчики подключены», ' +
    'или когда нужно найти counterId по имени/сайту перед другими запросами. ' +
    'Штрафометровский счётчик — 108525306. Кэш 5 минут.',
  input_schema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  mutating: false,
  execute: async (_input, { client }) => {
    const counters = await client.getCounters();
    return { counters, count: counters.length };
  },
};

const getGoals: MetrikaToolDefinition<
  { counter_id?: number },
  { goals: Goal[]; count: number; counter_id: number }
> = {
  name: 'metrika_get_goals',
  description:
    'Получить список целей (goals) для указанного счётчика Метрики. ' +
    'Используй когда пользователь спрашивает «какие цели настроены», «какие конверсии отслеживаются», ' +
    'или когда нужно узнать goal_id по имени для последующих отчётов по конверсиям. ' +
    `Если counter_id не указан — используется счётчик Штрафометра (${SHTRAFOMETER_COUNTER_ID}). Кэш 5 минут.`,
  input_schema: {
    type: 'object',
    properties: {
      counter_id: {
        type: 'integer',
        description: `ID счётчика Метрики. По умолчанию ${SHTRAFOMETER_COUNTER_ID} (Штрафометр).`,
      },
    },
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input, { client }) => {
    const counterId = input?.counter_id ?? SHTRAFOMETER_COUNTER_ID;
    const goals = await client.getGoals(counterId);
    return { goals, count: goals.length, counter_id: counterId };
  },
};

const getTraffic: MetrikaToolDefinition<
  {
    counter_id?: number;
    date1: string;
    date2: string;
    dimensions?: string[];
    limit?: number;
  },
  { report: ReportResponse; counter_id: number }
> = {
  name: 'metrika_get_traffic',
  description:
    'Получить базовый трафик-отчёт Метрики: визиты, посетители, просмотры, отказы, глубина просмотра, ' +
    'средняя длительность визита. Используй когда пользователь спрашивает «сколько посетителей за неделю», ' +
    '«какой трафик вчера», «сколько отказов». ' +
    'Даты в формате YYYY-MM-DD либо спец-значения Метрики: today, yesterday, 7daysAgo, 30daysAgo. ' +
    'По умолчанию разбивка по датам (ym:s:date). Кэш 2 минуты.',
  input_schema: {
    type: 'object',
    properties: {
      counter_id: {
        type: 'integer',
        description: `ID счётчика. По умолчанию ${SHTRAFOMETER_COUNTER_ID}.`,
      },
      date1: {
        type: 'string',
        description:
          'Начало периода: YYYY-MM-DD или today/yesterday/7daysAgo/30daysAgo.',
      },
      date2: {
        type: 'string',
        description: 'Конец периода: YYYY-MM-DD или today.',
      },
      dimensions: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Разбивка. По умолчанию ["ym:s:date"]. Альтернативы: ym:s:datePeriod<Week|Month>, ym:s:deviceCategory, ym:s:regionCountry.',
      },
      limit: {
        type: 'integer',
        description: 'Макс число строк (default 100, max 100000).',
      },
    },
    required: ['date1', 'date2'],
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input, { client }) => {
    const counterId = input.counter_id ?? SHTRAFOMETER_COUNTER_ID;
    const report = await client.getReport({
      counterId,
      metrics: [
        'ym:s:visits',
        'ym:s:users',
        'ym:s:pageviews',
        'ym:s:bounceRate',
        'ym:s:pageDepth',
        'ym:s:avgVisitDurationSeconds',
      ],
      dimensions: input.dimensions ?? ['ym:s:date'],
      date1: input.date1,
      date2: input.date2,
      limit: input.limit ?? 100,
      lang: 'ru',
    });
    return { report, counter_id: counterId };
  },
};

const getConversions: MetrikaToolDefinition<
  {
    counter_id?: number;
    date1: string;
    date2: string;
    goal_names?: string[];
    goal_ids?: number[];
    dimensions?: string[];
    limit?: number;
  },
  {
    report: ReportResponse;
    counter_id: number;
    resolved_goals: Array<{ name?: string; id: number }>;
    unresolved_goal_names: string[];
  }
> = {
  name: 'metrika_get_conversions',
  description:
    'Получить отчёт по конверсиям (достижениям целей). ' +
    'Можно передать цели по имени (goal_names) — инструмент сам найдёт goal_id через getGoals. ' +
    'Знает 7 целей Штрафометра: free_check, order_form_open, order_submit, payment_success, user_register, user_login, pdf_download. ' +
    'Если ни goal_names, ни goal_ids не переданы — возвращает все цели штрафометровского счётчика. ' +
    'Метрики для каждой цели: reaches (достижения), visits (визиты с достижением), conversionRate. ' +
    'Используй когда пользователь спрашивает «сколько конверсий по order_submit за неделю», «воронка за месяц», ' +
    '«сколько оплат прошло вчера». Даты YYYY-MM-DD или today/yesterday/7daysAgo/30daysAgo. Кэш 2 минуты.',
  input_schema: {
    type: 'object',
    properties: {
      counter_id: {
        type: 'integer',
        description: `ID счётчика. По умолчанию ${SHTRAFOMETER_COUNTER_ID}.`,
      },
      date1: { type: 'string', description: 'Начало периода (YYYY-MM-DD или today/7daysAgo).' },
      date2: { type: 'string', description: 'Конец периода.' },
      goal_names: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Имена целей (например, ["payment_success","order_submit"]). Авто-резолв в goal_id через getGoals.',
      },
      goal_ids: {
        type: 'array',
        items: { type: 'integer' },
        description: 'Явные goal_id, если они известны. Дополняются к goal_names.',
      },
      dimensions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Разбивка. По умолчанию ["ym:s:date"].',
      },
      limit: { type: 'integer' },
    },
    required: ['date1', 'date2'],
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input, { client }) => {
    const counterId = input.counter_id ?? SHTRAFOMETER_COUNTER_ID;

    const resolvedIds = new Set<number>(input.goal_ids ?? []);
    const resolved: Array<{ name?: string; id: number }> = (input.goal_ids ?? []).map(
      (id) => ({ id }),
    );
    const unresolved: string[] = [];

    if (input.goal_names?.length) {
      for (const name of input.goal_names) {
        const id = await resolveGoalId(client, counterId, name);
        if (id != null) {
          if (!resolvedIds.has(id)) {
            resolvedIds.add(id);
            resolved.push({ name, id });
          }
        } else {
          unresolved.push(name);
        }
      }
    }

    // Если ничего не передано — берём все цели счётчика
    if (resolvedIds.size === 0) {
      const allGoals = await client.getGoals(counterId);
      for (const g of allGoals) {
        resolvedIds.add(g.id);
        resolved.push({ name: g.name, id: g.id });
      }
    }

    if (resolvedIds.size === 0) {
      throw new Error(
        `[metrika_get_conversions] Не удалось определить ни одной цели. Unresolved: ${unresolved.join(', ')}`,
      );
    }

    // Метрики: reaches + conversionRate по каждой цели
    const metrics: string[] = [];
    for (const id of resolvedIds) {
      metrics.push(`ym:s:goal${id}reaches`);
      metrics.push(`ym:s:goal${id}conversionRate`);
    }
    // Базовые визиты/посетители для контекста
    metrics.unshift('ym:s:visits', 'ym:s:users');

    const report = await client.getReport({
      counterId,
      metrics,
      dimensions: input.dimensions ?? ['ym:s:date'],
      date1: input.date1,
      date2: input.date2,
      limit: input.limit ?? 100,
      lang: 'ru',
    });

    return {
      report,
      counter_id: counterId,
      resolved_goals: resolved,
      unresolved_goal_names: unresolved,
    };
  },
};

const getSources: MetrikaToolDefinition<
  {
    counter_id?: number;
    date1: string;
    date2: string;
    breakdown?: 'source' | 'utm' | 'search_engine' | 'referer';
    limit?: number;
  },
  { report: ReportResponse; counter_id: number; breakdown: string }
> = {
  name: 'metrika_get_sources',
  description:
    'Источники трафика: разбивка визитов по каналам (direct/ads/organic/social/referral) либо по UTM-меткам. ' +
    'Используй когда пользователь спрашивает «откуда идёт трафик», «сколько из Директа», ' +
    '«какие UTM работают лучше всего», «сколько SEO-трафика». ' +
    'breakdown: "source" (ym:s:trafficSource — канал), "utm" (ym:s:UTMSource+Medium+Campaign), ' +
    '"search_engine" (ym:s:searchEngineName), "referer" (ym:s:referer). ' +
    'Метрики: visits, users, bounceRate, goal-less conversionRate. Кэш 2 минуты.',
  input_schema: {
    type: 'object',
    properties: {
      counter_id: {
        type: 'integer',
        description: `ID счётчика. По умолчанию ${SHTRAFOMETER_COUNTER_ID}.`,
      },
      date1: { type: 'string' },
      date2: { type: 'string' },
      breakdown: {
        type: 'string',
        enum: ['source', 'utm', 'search_engine', 'referer'],
        description: 'Как разбивать трафик. По умолчанию "source".',
      },
      limit: { type: 'integer' },
    },
    required: ['date1', 'date2'],
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input, { client }) => {
    const counterId = input.counter_id ?? SHTRAFOMETER_COUNTER_ID;
    const breakdown = input.breakdown ?? 'source';

    const dimensionsByBreakdown: Record<string, string[]> = {
      source: ['ym:s:trafficSource'],
      utm: ['ym:s:UTMSource', 'ym:s:UTMMedium', 'ym:s:UTMCampaign'],
      search_engine: ['ym:s:searchEngineName'],
      referer: ['ym:s:referer'],
    };

    const report = await client.getReport({
      counterId,
      metrics: [
        'ym:s:visits',
        'ym:s:users',
        'ym:s:bounceRate',
        'ym:s:pageDepth',
        'ym:s:avgVisitDurationSeconds',
      ],
      dimensions: dimensionsByBreakdown[breakdown],
      date1: input.date1,
      date2: input.date2,
      limit: input.limit ?? 50,
      sort: '-ym:s:visits',
      lang: 'ru',
    });

    return { report, counter_id: counterId, breakdown };
  },
};

/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */

export const metrikaTools: MetrikaToolDefinition[] = [
  getCounters as MetrikaToolDefinition,
  getGoals as MetrikaToolDefinition,
  getTraffic as MetrikaToolDefinition,
  getConversions as MetrikaToolDefinition,
  getSources as MetrikaToolDefinition,
];

export const metrikaToolsByName: Record<string, MetrikaToolDefinition> =
  Object.fromEntries(metrikaTools.map((t) => [t.name, t]));
