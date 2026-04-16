/**
 * Yandex.Webmaster API v4 — Zod schemas for read-only responses.
 *
 * Покрыты поля, нужные AI-консультанту Штрафометра: хосты, индексация,
 * sitemap-ы и поисковые запросы. Всё остальное допускается через
 * `.passthrough()` — sanity-check cron предупреждает о смене схемы (R8).
 *
 * Docs: https://yandex.ru/dev/webmaster/doc/ru/
 * Phase 3C — docs/plan-ai-consultant.md
 */

import { z } from 'zod';

// ─── Host ─────────────────────────────────────────────────────────

export const HostSchema = z
  .object({
    host_id: z.string(),
    ascii_host_url: z.string(),
    unicode_host_url: z.string().optional(),
    main_mirror: z.boolean().optional(),
    verified: z.boolean().optional(),
  })
  .passthrough();

export type Host = z.infer<typeof HostSchema>;

export const HostsListSchema = z.object({
  hosts: z.array(HostSchema).default([]),
});

// ─── Indexing stats ───────────────────────────────────────────────

/**
 * Индексация хоста: сколько страниц загружено роботом, сколько исключено
 * и сколько в поиске. `index_percent` — утилитарное поле, считается
 * клиентом (searchable / max(downloaded, 1) * 100).
 */
export const IndexingStatsSchema = z
  .object({
    downloaded: z.number().default(0),
    excluded: z.number().default(0),
    searchable: z.number().default(0),
    index_percent: z.number().optional(),
  })
  .passthrough();

export type IndexingStats = z.infer<typeof IndexingStatsSchema>;

/**
 * Ответ /host_information/indexing/ нестабилен: разные разделы API
 * возвращают данные под разными корневыми ключами. Принимаем как
 * passthrough и извлекаем нужные числа в клиенте.
 */
export const IndexingHistoryEnvelopeSchema = z
  .object({
    indicators: z
      .object({
        SEARCHABLE: z
          .array(
            z
              .object({
                date: z.string().optional(),
                value: z.number().optional(),
              })
              .passthrough(),
          )
          .optional(),
        DOWNLOADED: z
          .array(
            z
              .object({
                date: z.string().optional(),
                value: z.number().optional(),
              })
              .passthrough(),
          )
          .optional(),
        EXCLUDED: z
          .array(
            z
              .object({
                date: z.string().optional(),
                value: z.number().optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type IndexingHistoryEnvelope = z.infer<typeof IndexingHistoryEnvelopeSchema>;

// ─── Sitemap ──────────────────────────────────────────────────────

export const SitemapSchema = z
  .object({
    sitemap_id: z.string(),
    filename: z.string().optional(),
    /** NOT_INDEXED | INDEXED | DRAFT | INVALID | ... */
    status: z.string().optional(),
    last_access_date: z.string().optional(),
    errors_count: z.number().optional(),
    urls_count: z.number().optional(),
  })
  .passthrough();

export type Sitemap = z.infer<typeof SitemapSchema>;

export const SitemapsListSchema = z.object({
  sitemaps: z.array(SitemapSchema).default([]),
});

// ─── Search queries ───────────────────────────────────────────────

/**
 * Строка поискового запроса. В разных эндпоинтах Вебмастера (popular-queries,
 * query-analytics) колонки отличаются — держим максимум опциональных.
 *
 * `demand` приходит только в popular-queries как «спрос» (0..100).
 */
export const SearchQuerySchema = z
  .object({
    query: z.string(),
    impressions: z.number().optional(),
    clicks: z.number().optional(),
    ctr: z.number().optional(),
    position: z.number().optional(),
    demand: z.number().optional(),
  })
  .passthrough();

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/**
 * Popular queries отдаются как массив под ключом `queries`. В ответе также
 * присутствуют агрегаты — не парсим, т.к. не нужны консультанту.
 */
export const PopularQuerySchema = SearchQuerySchema.extend({
  /** Сколько показов/кликов суммарно за период. */
  count: z.number().optional(),
});

export type PopularQuery = z.infer<typeof PopularQuerySchema>;

export const PopularQueriesEnvelopeSchema = z
  .object({
    queries: z.array(PopularQuerySchema).default([]),
  })
  .passthrough();

export const SearchQueriesEnvelopeSchema = z
  .object({
    queries: z.array(SearchQuerySchema).default([]),
  })
  .passthrough();

// ─── Error envelope ───────────────────────────────────────────────

/**
 * Формат ошибок Вебмастера v4 отличается от Директа:
 *   { error_code: "INVALID_PARAMETER", error_message: "..." }
 */
export const WebmasterApiErrorSchema = z.object({
  error_code: z.string(),
  error_message: z.string(),
  available_values: z.array(z.string()).optional(),
});

export type WebmasterApiErrorEnvelope = z.infer<typeof WebmasterApiErrorSchema>;
