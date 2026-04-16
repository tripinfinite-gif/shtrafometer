/**
 * Yandex.Webmaster API v4 — тонкий read-only клиент.
 *
 * Используется AI-консультантом в `/admin/ai-consultant` для получения данных
 * по верификации, индексации, sitemap-ам и поисковым запросам.
 *
 * Docs: https://yandex.ru/dev/webmaster/doc/ru/
 * Phase 3C — docs/plan-ai-consultant.md
 *
 * Авторизация: OAuth-токен (тот же токен Яндекс ID, что используется для
 * Direct/Metrika), scope `webmaster:verify,webmaster:hostinfo`.
 *
 * Заголовок: `Authorization: OAuth <token>` (исторический формат Яндекса,
 * `Bearer` тоже принимается).
 */

import { z } from 'zod';
import { directCache, TTL } from './cache';
import {
  HostSchema,
  HostsListSchema,
  IndexingStatsSchema,
  IndexingHistoryEnvelopeSchema,
  SitemapSchema,
  SitemapsListSchema,
  SearchQuerySchema,
  PopularQuerySchema,
  PopularQueriesEnvelopeSchema,
  SearchQueriesEnvelopeSchema,
  WebmasterApiErrorSchema,
  type Host,
  type IndexingStats,
  type Sitemap,
  type SearchQuery,
  type PopularQuery,
} from './webmaster.schemas';
import { WebmasterApiError, WebmasterTransportError } from './webmaster-errors';

const BASE_URL = 'https://api.webmaster.yandex.net/v4';

/** TTL для статистики поисковых запросов — Вебмастер обновляет её раз в несколько часов. */
const QUERY_STATS_TTL_MS = 30 * 60 * 1000;

// ─── Interface ─────────────────────────────────────────────────────

export interface PopularQueriesOptions {
  orderBy?: 'TOTAL_CLICKS' | 'TOTAL_SHOWS';
  queryIndicator?: string[];
}

export interface SearchQueriesOptions {
  /** ISO date `YYYY-MM-DD`. */
  dateFrom: string;
  /** ISO date `YYYY-MM-DD`. */
  dateTo: string;
  /** ALL | DESKTOP | MOBILE_AND_TABLET | ... */
  deviceType?: string;
  queryCategories?: string[];
}

export interface WebmasterClient {
  /** Первый шаг OAuth-флоу: получить user_id текущего владельца токена. */
  getUserId(): Promise<string>;
  getHosts(userId: string): Promise<Host[]>;
  getHost(userId: string, hostId: string): Promise<Host>;
  getIndexingStats(userId: string, hostId: string): Promise<IndexingStats>;
  getSitemaps(userId: string, hostId: string): Promise<Sitemap[]>;
  getPopularQueries(
    userId: string,
    hostId: string,
    opts?: PopularQueriesOptions,
  ): Promise<SearchQuery[]>;
  getSearchQueries(
    userId: string,
    hostId: string,
    opts: SearchQueriesOptions,
  ): Promise<SearchQuery[]>;
}

// ─── HTTP helper ───────────────────────────────────────────────────

async function webmasterFetch<T>(
  accessToken: string,
  path: string,
  schema: z.ZodType<T>,
  init?: { query?: Record<string, string | string[] | undefined>; method?: 'GET' },
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (init?.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.append(key, value);
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `OAuth ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const text = await response.text();

  if (!response.ok) {
    // Пробуем распарсить штатный envelope ошибки Вебмастера.
    try {
      const parsed: unknown = JSON.parse(text);
      const err = WebmasterApiErrorSchema.safeParse(parsed);
      if (err.success) {
        throw new WebmasterApiError({
          errorCode: err.data.error_code,
          errorMessage: err.data.error_message,
          availableValues: err.data.available_values,
        });
      }
    } catch (e) {
      if (e instanceof WebmasterApiError) throw e;
      // fallthrough to transport error
    }
    throw new WebmasterTransportError(response.status, text);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new WebmasterTransportError(response.status, `Invalid JSON: ${text.slice(0, 200)}`);
  }

  return schema.parse(json);
}

// ─── Factory ───────────────────────────────────────────────────────

export function createWebmasterClient(accessToken: string): WebmasterClient {
  // Кэш-ключи префиксуем fingerprint токена (его длина обычно ~50 символов —
  // берём первые 8 для изоляции между разными OAuth-аккаунтами).
  const tokenKey = accessToken.slice(0, 8);
  const k = (parts: string[]) => ['wm', tokenKey, ...parts].join(':');

  async function getUserId(): Promise<string> {
    const cacheKey = k(['user']);
    const cached = directCache.get<string>(cacheKey);
    if (cached) return cached;

    const schema = z.object({ user_id: z.union([z.string(), z.number()]) }).passthrough();
    const data = await webmasterFetch(accessToken, '/user', schema);
    const userId = String(data.user_id);
    // user_id не меняется — кэшируем на метаданные-TTL.
    directCache.set(cacheKey, userId, TTL.METADATA_MS);
    return userId;
  }

  async function getHosts(userId: string): Promise<Host[]> {
    const cacheKey = k(['hosts', userId]);
    const cached = directCache.get<Host[]>(cacheKey);
    if (cached) return cached;

    const data = await webmasterFetch(
      accessToken,
      `/user/${encodeURIComponent(userId)}/hosts`,
      HostsListSchema,
    );
    // TTL 10 мин — per spec Phase 3C.
    directCache.set(cacheKey, data.hosts, 10 * 60 * 1000);
    return data.hosts;
  }

  async function getHost(userId: string, hostId: string): Promise<Host> {
    const cacheKey = k(['host', userId, hostId]);
    const cached = directCache.get<Host>(cacheKey);
    if (cached) return cached;

    const data = await webmasterFetch(
      accessToken,
      `/user/${encodeURIComponent(userId)}/hosts/${encodeURIComponent(hostId)}`,
      HostSchema,
    );
    directCache.set(cacheKey, data, 10 * 60 * 1000);
    return data;
  }

  async function getIndexingStats(userId: string, hostId: string): Promise<IndexingStats> {
    const cacheKey = k(['indexing', userId, hostId]);
    const cached = directCache.get<IndexingStats>(cacheKey);
    if (cached) return cached;

    // Эндпоинт `/hosts/{hostId}/summary` даёт сводку по индексации.
    // Структура ответа Вебмастера не строго стандартизирована: парсим как
    // passthrough и извлекаем нужные числа, падая обратно на /indexing/history.
    const SummarySchema = z
      .object({
        searchable_pages_count: z.number().optional(),
        downloaded_pages_count: z.number().optional(),
        excluded_pages_count: z.number().optional(),
      })
      .passthrough();

    try {
      const summary = await webmasterFetch(
        accessToken,
        `/user/${encodeURIComponent(userId)}/hosts/${encodeURIComponent(hostId)}/summary`,
        SummarySchema,
      );
      const downloaded = summary.downloaded_pages_count ?? 0;
      const excluded = summary.excluded_pages_count ?? 0;
      const searchable = summary.searchable_pages_count ?? 0;
      const stats: IndexingStats = IndexingStatsSchema.parse({
        downloaded,
        excluded,
        searchable,
        index_percent: downloaded > 0 ? Math.round((searchable / downloaded) * 100) : 0,
      });
      directCache.set(cacheKey, stats, TTL.METADATA_MS);
      return stats;
    } catch {
      // Фолбэк: /indexing/history — берём последнее значение каждого индикатора.
      const history = await webmasterFetch(
        accessToken,
        `/user/${encodeURIComponent(userId)}/hosts/${encodeURIComponent(hostId)}/indexing/history`,
        IndexingHistoryEnvelopeSchema,
        {
          query: {
            indexing_indicator: ['SEARCHABLE', 'DOWNLOADED', 'EXCLUDED'],
          },
        },
      );
      const last = (arr?: Array<{ value?: number }>) =>
        arr && arr.length > 0 ? (arr[arr.length - 1].value ?? 0) : 0;
      const searchable = last(history.indicators?.SEARCHABLE);
      const downloaded = last(history.indicators?.DOWNLOADED);
      const excluded = last(history.indicators?.EXCLUDED);
      const stats: IndexingStats = {
        searchable,
        downloaded,
        excluded,
        index_percent: downloaded > 0 ? Math.round((searchable / downloaded) * 100) : 0,
      };
      directCache.set(cacheKey, stats, TTL.METADATA_MS);
      return stats;
    }
  }

  async function getSitemaps(userId: string, hostId: string): Promise<Sitemap[]> {
    const cacheKey = k(['sitemaps', userId, hostId]);
    const cached = directCache.get<Sitemap[]>(cacheKey);
    if (cached) return cached;

    const data = await webmasterFetch(
      accessToken,
      `/user/${encodeURIComponent(userId)}/hosts/${encodeURIComponent(hostId)}/sitemaps`,
      SitemapsListSchema,
    );
    directCache.set(cacheKey, data.sitemaps, 10 * 60 * 1000);
    return data.sitemaps;
  }

  async function getPopularQueries(
    userId: string,
    hostId: string,
    opts: PopularQueriesOptions = {},
  ): Promise<PopularQuery[]> {
    const cacheKey = k([
      'popular',
      userId,
      hostId,
      opts.orderBy ?? 'TOTAL_CLICKS',
      (opts.queryIndicator ?? []).join(','),
    ]);
    const cached = directCache.get<PopularQuery[]>(cacheKey);
    if (cached) return cached;

    const data = await webmasterFetch(
      accessToken,
      `/user/${encodeURIComponent(userId)}/hosts/${encodeURIComponent(hostId)}/search-queries/popular`,
      PopularQueriesEnvelopeSchema,
      {
        query: {
          order_by: opts.orderBy ?? 'TOTAL_CLICKS',
          query_indicator: opts.queryIndicator,
        },
      },
    );
    directCache.set(cacheKey, data.queries, QUERY_STATS_TTL_MS);
    return data.queries;
  }

  async function getSearchQueries(
    userId: string,
    hostId: string,
    opts: SearchQueriesOptions,
  ): Promise<SearchQuery[]> {
    const cacheKey = k([
      'queries',
      userId,
      hostId,
      opts.dateFrom,
      opts.dateTo,
      opts.deviceType ?? 'ALL',
      (opts.queryCategories ?? []).join(','),
    ]);
    const cached = directCache.get<SearchQuery[]>(cacheKey);
    if (cached) return cached;

    const data = await webmasterFetch(
      accessToken,
      `/user/${encodeURIComponent(userId)}/hosts/${encodeURIComponent(hostId)}/search-queries/all`,
      SearchQueriesEnvelopeSchema,
      {
        query: {
          date_from: opts.dateFrom,
          date_to: opts.dateTo,
          device_type_indicator: opts.deviceType,
          query_category: opts.queryCategories,
        },
      },
    );
    directCache.set(cacheKey, data.queries, QUERY_STATS_TTL_MS);
    return data.queries;
  }

  return {
    getUserId,
    getHosts,
    getHost,
    getIndexingStats,
    getSitemaps,
    getPopularQueries,
    getSearchQueries,
  };
}

// Re-exports for consumers
export type { Host, IndexingStats, Sitemap, SearchQuery, PopularQuery };
export { WebmasterApiError, WebmasterTransportError };
// Silence unused-import warning for SearchQuerySchema/SitemapSchema — re-export
// so tool-definitions can reference the schemas directly.
export { SearchQuerySchema, SitemapSchema };
