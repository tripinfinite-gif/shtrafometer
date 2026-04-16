/**
 * Tool-definitions Яндекс.Директа для AI-консультанта.
 *
 * Phase 3A — docs/plan-ai-consultant.md.
 * Формат совместим с Anthropic Messages API (name / description / input_schema)
 * + кастомное поле `execute` и маркер `mutating`. Адаптер под OpenAI пишет
 * главный агент в интеграции.
 *
 * Все инструменты в этой фазе — READ-ONLY. Mutating tools
 * (direct_stop_campaign, direct_update_bid, …) будут добавлены отдельно,
 * с human-in-the-loop апрувом (см. R5 в plan-ai-consultant.md).
 */

import type { DirectClient, GetReportOptions } from './direct';

// ─── Tool-definition interface ────────────────────────────────────

/**
 * JSON-Schema-подобный тип. Оставляем как широкий object, чтобы не
 * тянуть зависимость от конкретного SDK.
 */
export type JsonSchema = Record<string, unknown>;

export interface ToolExecutionContext {
  client: DirectClient;
}

export interface ToolDefinition<I = unknown, O = unknown> {
  name: string;
  description: string;
  input_schema: JsonSchema;
  /**
   * `true` — инструмент изменяет состояние в Директе и должен проходить
   * через HITL-апрув перед исполнением. `false`/отсутствует — read-only.
   */
  mutating?: boolean;
  execute: (input: I, ctx: ToolExecutionContext) => Promise<O>;
}

// ─── Schemas ──────────────────────────────────────────────────────

const emptyObjectSchema: JsonSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

// ─── Tools ────────────────────────────────────────────────────────

const listCampaigns: ToolDefinition<
  { ids?: number[] },
  { campaigns: unknown[]; count: number }
> = {
  name: 'direct_list_campaigns',
  description:
    'Получить список рекламных кампаний Яндекс.Директа подключённого аккаунта. ' +
    'Используй, когда пользователь спрашивает «какие у меня кампании», «покажи активные кампании», ' +
    '«в каком состоянии кампания X». Возвращает Id, имя, статус, состояние, тип, дневной бюджет, ' +
    'баланс. Кэш 5 минут.',
  input_schema: {
    type: 'object',
    properties: {
      ids: {
        type: 'array',
        items: { type: 'integer' },
        description:
          'Опционально: список ID конкретных кампаний. Если не указать — вернутся все.',
      },
    },
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input, { client }) => {
    const campaigns = await client.getCampaigns(input?.ids);
    return { campaigns, count: campaigns.length };
  },
};

const listAdGroups: ToolDefinition<
  { campaign_ids: number[] },
  { ad_groups: unknown[]; count: number }
> = {
  name: 'direct_list_ad_groups',
  description:
    'Получить группы объявлений для указанных кампаний. Используй когда нужно углубиться ' +
    'в структуру конкретной кампании перед запросом ключей/объявлений/статистики.',
  input_schema: {
    type: 'object',
    properties: {
      campaign_ids: {
        type: 'array',
        items: { type: 'integer' },
        minItems: 1,
        description: 'ID кампаний (обязательно, минимум одна).',
      },
    },
    required: ['campaign_ids'],
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input, { client }) => {
    const groups = await client.getAdGroups(input.campaign_ids);
    return { ad_groups: groups, count: groups.length };
  },
};

const listAds: ToolDefinition<
  { ad_group_ids: number[] },
  { ads: unknown[]; count: number }
> = {
  name: 'direct_list_ads',
  description:
    'Получить объявления (текст, заголовок, ссылка, статус модерации) по группам. ' +
    'Используй когда пользователь спрашивает «покажи тексты объявлений», «что сейчас крутится в группе X».',
  input_schema: {
    type: 'object',
    properties: {
      ad_group_ids: {
        type: 'array',
        items: { type: 'integer' },
        minItems: 1,
      },
    },
    required: ['ad_group_ids'],
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input, { client }) => {
    const ads = await client.getAds(input.ad_group_ids);
    return { ads, count: ads.length };
  },
};

const listKeywords: ToolDefinition<
  { ad_group_ids: number[] },
  { keywords: unknown[]; count: number }
> = {
  name: 'direct_list_keywords',
  description:
    'Получить ключевые слова (фразы) с ставками и статусом показов для указанных групп. ' +
    'Используй когда пользователь спрашивает «какие ключи в группе», «какие ставки сейчас стоят», ' +
    '«статус показов по ключам».',
  input_schema: {
    type: 'object',
    properties: {
      ad_group_ids: {
        type: 'array',
        items: { type: 'integer' },
        minItems: 1,
      },
    },
    required: ['ad_group_ids'],
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input, { client }) => {
    const kws = await client.getKeywords(input.ad_group_ids);
    return { keywords: kws, count: kws.length };
  },
};

const getStatistics: ToolDefinition<
  {
    date_from: string;
    date_to: string;
    field_names: string[];
    report_type?: GetReportOptions['reportType'];
    filter?: unknown;
  },
  { rows: unknown[]; count: number }
> = {
  name: 'direct_get_statistics',
  description:
    'Получить статистику показов/кликов/расхода из Reports API Директа. ' +
    'Используй когда пользователь спрашивает «сколько потратили», «клики за период», ' +
    '«CTR кампании X за неделю», «конверсии за вчера». ' +
    'Даты в формате YYYY-MM-DD. Типичные field_names: ["Date","CampaignId","CampaignName","Impressions","Clicks","Cost","Conversions","Ctr","AvgCpc"]. ' +
    'Cost возвращается в рублях (без микро) и без НДС. Кэш 60 секунд.',
  input_schema: {
    type: 'object',
    properties: {
      date_from: {
        type: 'string',
        description: 'Начало периода (YYYY-MM-DD, включительно).',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
      date_to: {
        type: 'string',
        description: 'Конец периода (YYYY-MM-DD, включительно).',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
      field_names: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description:
          'Колонки отчёта (см. документацию Reports API, напр. Date, CampaignId, Impressions, Clicks, Cost, Ctr, AvgCpc).',
      },
      report_type: {
        type: 'string',
        enum: [
          'CUSTOM_REPORT',
          'CAMPAIGN_PERFORMANCE_REPORT',
          'ADGROUP_PERFORMANCE_REPORT',
          'AD_PERFORMANCE_REPORT',
          'SEARCH_QUERY_PERFORMANCE_REPORT',
        ],
        description: 'Тип отчёта. По умолчанию CAMPAIGN_PERFORMANCE_REPORT.',
      },
      filter: {
        description:
          'Опциональный фильтр Reports API (напр. фильтр по CampaignId). Объект соответствует Filter в документации.',
      },
    },
    required: ['date_from', 'date_to', 'field_names'],
    additionalProperties: false,
  },
  mutating: false,
  execute: async (input, { client }) => {
    const rows = await client.getReport({
      dateFrom: input.date_from,
      dateTo: input.date_to,
      fieldNames: input.field_names,
      reportType: input.report_type,
      filter: input.filter,
    });
    return { rows, count: rows.length };
  },
};

// Декларация нужна просто чтобы линтер не ругался на неиспользуемый тип.
void emptyObjectSchema;

// ─── Export ───────────────────────────────────────────────────────

export const directTools: ToolDefinition[] = [
  listCampaigns as ToolDefinition,
  listAdGroups as ToolDefinition,
  listAds as ToolDefinition,
  listKeywords as ToolDefinition,
  getStatistics as ToolDefinition,
];

/** Удобный lookup по имени для chat-route. */
export const directToolsByName: Record<string, ToolDefinition> = Object.fromEntries(
  directTools.map((t) => [t.name, t]),
);
