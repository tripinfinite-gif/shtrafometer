/**
 * Tool-definitions for Yandex.Webmaster API v4.
 *
 * Формат совместим с Vercel AI SDK (`tool({ description, inputSchema, execute })`)
 * и Anthropic SDK (`{ name, description, input_schema, handler }`): оба читают
 * те же поля. В chat route (Фаза 3 интеграция) будет адаптер, конвертирующий
 * этот массив в конкретный формат провайдера.
 *
 * Все инструменты — read-only, HITL не требуется.
 *
 * Phase 3C — docs/plan-ai-consultant.md
 */

import { z } from 'zod';
import {
  createWebmasterClient,
  type WebmasterClient,
  type Host,
  type IndexingStats,
  type Sitemap,
  type SearchQuery,
} from './webmaster';

// ─── Generic tool shape ────────────────────────────────────────────

export interface WebmasterToolContext {
  /** OAuth-токен текущего пользователя (расшифрован из ai_client_oauth_tokens). */
  accessToken: string;
  /**
   * Кэшированный user_id Вебмастера. Если не задан — будет получен через
   * `getUserId()` при первом вызове. Передавать, когда вызов идёт в батче
   * нескольких инструментов — экономит один запрос.
   */
  userId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WebmasterTool<TInput extends z.ZodType<any> = z.ZodType<any>> {
  name: string;
  description: string;
  inputSchema: TInput;
  execute: (input: z.infer<TInput>, ctx: WebmasterToolContext) => Promise<unknown>;
}

async function resolveUserId(
  client: WebmasterClient,
  ctx: WebmasterToolContext,
): Promise<string> {
  return ctx.userId ?? (await client.getUserId());
}

// ─── Tool: webmaster_get_sites ─────────────────────────────────────

const GetSitesInput = z
  .object({})
  .describe('Без параметров. Возвращает все хосты, добавленные в Вебмастер.');

export const webmasterGetSites: WebmasterTool<typeof GetSitesInput> = {
  name: 'webmaster_get_sites',
  description:
    'Возвращает список сайтов пользователя в Яндекс.Вебмастере с флагами верификации ' +
    'и признаком главного зеркала. Используй, когда нужно узнать host_id перед другими вызовами.',
  inputSchema: GetSitesInput,
  async execute(_input, ctx) {
    const client = createWebmasterClient(ctx.accessToken);
    const userId = await resolveUserId(client, ctx);
    const hosts = await client.getHosts(userId);
    return {
      user_id: userId,
      count: hosts.length,
      hosts: hosts.map((h: Host) => ({
        host_id: h.host_id,
        url: h.unicode_host_url ?? h.ascii_host_url,
        verified: h.verified ?? false,
        main_mirror: h.main_mirror ?? false,
      })),
    };
  },
};

// ─── Tool: webmaster_get_indexing_status ───────────────────────────

const GetIndexingInput = z.object({
  host_id: z
    .string()
    .describe('host_id из webmaster_get_sites (например, `https:shtrafometer.ru:443`).'),
});

export const webmasterGetIndexingStatus: WebmasterTool<typeof GetIndexingInput> = {
  name: 'webmaster_get_indexing_status',
  description:
    'Возвращает статистику индексации сайта: сколько страниц загружено роботом, сколько ' +
    'исключено и сколько сейчас в поиске. Также процент индексации.',
  inputSchema: GetIndexingInput,
  async execute(input, ctx) {
    const client = createWebmasterClient(ctx.accessToken);
    const userId = await resolveUserId(client, ctx);
    const stats: IndexingStats = await client.getIndexingStats(userId, input.host_id);
    return {
      host_id: input.host_id,
      searchable: stats.searchable,
      downloaded: stats.downloaded,
      excluded: stats.excluded,
      index_percent: stats.index_percent ?? 0,
    };
  },
};

// ─── Tool: webmaster_get_top_queries ───────────────────────────────

const GetTopQueriesInput = z.object({
  host_id: z.string().describe('host_id из webmaster_get_sites.'),
  order_by: z
    .enum(['TOTAL_CLICKS', 'TOTAL_SHOWS'])
    .optional()
    .default('TOTAL_CLICKS')
    .describe('Порядок сортировки: по кликам или по показам.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(50)
    .describe('Сколько запросов вернуть (по умолчанию 50).'),
});

export const webmasterGetTopQueries: WebmasterTool<typeof GetTopQueriesInput> = {
  name: 'webmaster_get_top_queries',
  description:
    'Топ поисковых запросов, по которым сайт показывался в Яндексе: показы, клики, CTR, ' +
    'средняя позиция. Данные из Вебмастера обновляются раз в несколько часов.',
  inputSchema: GetTopQueriesInput,
  async execute(input, ctx) {
    const client = createWebmasterClient(ctx.accessToken);
    const userId = await resolveUserId(client, ctx);
    const rows = await client.getPopularQueries(userId, input.host_id, {
      orderBy: input.order_by ?? 'TOTAL_CLICKS',
    });
    const limited = rows.slice(0, input.limit ?? 50);
    return {
      host_id: input.host_id,
      order_by: input.order_by ?? 'TOTAL_CLICKS',
      count: limited.length,
      queries: limited.map((q: SearchQuery) => ({
        query: q.query,
        impressions: q.impressions ?? 0,
        clicks: q.clicks ?? 0,
        ctr: q.ctr ?? 0,
        position: q.position ?? null,
      })),
    };
  },
};

// ─── Tool: webmaster_get_sitemap_status ────────────────────────────

const GetSitemapsInput = z.object({
  host_id: z.string().describe('host_id из webmaster_get_sites.'),
});

export const webmasterGetSitemapStatus: WebmasterTool<typeof GetSitemapsInput> = {
  name: 'webmaster_get_sitemap_status',
  description:
    'Список sitemap-файлов сайта с их статусом, количеством URL и числом ошибок. ' +
    'Используй для диагностики проблем с индексацией.',
  inputSchema: GetSitemapsInput,
  async execute(input, ctx) {
    const client = createWebmasterClient(ctx.accessToken);
    const userId = await resolveUserId(client, ctx);
    const sitemaps = await client.getSitemaps(userId, input.host_id);
    return {
      host_id: input.host_id,
      count: sitemaps.length,
      sitemaps: sitemaps.map((s: Sitemap) => ({
        sitemap_id: s.sitemap_id,
        filename: s.filename ?? '',
        status: s.status ?? 'UNKNOWN',
        urls_count: s.urls_count ?? 0,
        errors_count: s.errors_count ?? 0,
        last_access_date: s.last_access_date ?? null,
      })),
    };
  },
};

// ─── Registry ──────────────────────────────────────────────────────

export const webmasterTools = [
  webmasterGetSites,
  webmasterGetIndexingStatus,
  webmasterGetTopQueries,
  webmasterGetSitemapStatus,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
] as const satisfies readonly WebmasterTool<any>[];

export type WebmasterToolName = (typeof webmasterTools)[number]['name'];
