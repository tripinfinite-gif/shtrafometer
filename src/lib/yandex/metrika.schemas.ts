/**
 * Zod schemas for Yandex.Metrika API v1.
 *
 * Phase 3B — docs/plan-ai-consultant.md
 *
 * Documentation:
 *   - Management API: https://yandex.ru/dev/metrika/ru/management/openapi/
 *   - Reporting API:  https://yandex.ru/dev/metrika/ru/stat/
 *
 * Scopes covered:
 *   - Counter / Goal metadata (management v1)
 *   - Stat report envelope (stat/v1/data)
 *   - Error envelope
 */

import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*                                   Errors                                   */
/* -------------------------------------------------------------------------- */

/**
 * Both Management- и Reporting API Метрики могут вернуть ошибку в двух форматах:
 *   { errors: [ { error_type, message, location? } ], code, message }
 *   либо простое { code, message }
 *
 * Мы принимаем оба.
 */
export const metrikaErrorSchema = z.object({
  code: z.number().optional(),
  message: z.string().optional(),
  errors: z
    .array(
      z.object({
        error_type: z.string().optional(),
        message: z.string().optional(),
        location: z.string().optional(),
      }),
    )
    .optional(),
});

export type MetrikaErrorEnvelope = z.infer<typeof metrikaErrorSchema>;

/* -------------------------------------------------------------------------- */
/*                               Goal (цели)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Условие достижения цели.
 * type: url / exact / contain / regexp / action / step / number
 * operator: 'contain' | 'exact' | 'start' | 'regexp' ...
 */
export const goalConditionSchema = z
  .object({
    type: z.string().optional(),
    operator: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough();

/**
 * Goal API Метрики.
 * type: 'url' | 'number' | 'step' | 'action' (JS event) | 'phone' | 'email' | ...
 * Для нас важны 'action' (наши ym_goal) и 'url'.
 */
export const goalSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    is_retargeting: z.number().optional(), // 0/1
    goal_source: z.string().optional(),
    default_price: z.number().optional(),
    conditions: z.array(goalConditionSchema).optional(),
    steps: z.array(z.unknown()).optional(),
    flag: z.string().optional(),
  })
  .passthrough();

export type Goal = z.infer<typeof goalSchema>;

export const goalListResponseSchema = z.object({
  goals: z.array(goalSchema),
});

/* -------------------------------------------------------------------------- */
/*                              Counter (счётчик)                             */
/* -------------------------------------------------------------------------- */

export const counterSchema = z
  .object({
    id: z.number(),
    name: z.string().optional(),
    site: z.string().optional(),
    /** 'Active' | 'Deleted' | 'Inactive' etc. */
    status: z.string().optional(),
    type: z.string().optional(),
    owner_login: z.string().optional(),
    code_status: z.string().optional(),
    favorite: z.number().optional(),
    permission: z.string().optional(),
    time_zone_name: z.string().optional(),
    visit_threshold: z.number().optional(),
    goals: z.array(goalSchema).optional(),
    create_time: z.string().optional(),
  })
  .passthrough();

export type Counter = z.infer<typeof counterSchema>;

export const counterResponseSchema = z.object({
  counter: counterSchema,
});

export const counterListResponseSchema = z.object({
  counters: z.array(counterSchema),
  /** Пагинация. */
  rows: z.number().optional(),
});

/* -------------------------------------------------------------------------- */
/*                         Reporting API (stat/v1/data)                       */
/* -------------------------------------------------------------------------- */

/**
 * Одна строка отчёта: dimensions[] + metrics[].
 *
 * dimensions — массив объектов: { name, id?, icon_id?, ... } либо просто
 * { name } для ym:s:date.
 * metrics — массив чисел (по порядку как в query.metrics).
 */
export const reportRowSchema = z
  .object({
    dimensions: z.array(z.record(z.string(), z.unknown())).optional(),
    metrics: z.array(z.number()).optional(),
  })
  .passthrough();

export const reportQuerySchema = z
  .object({
    ids: z.array(z.number()).optional(),
    dimensions: z.array(z.string()).optional(),
    metrics: z.array(z.string()).optional(),
    date1: z.string().optional(),
    date2: z.string().optional(),
    filters: z.string().optional(),
    limit: z.number().optional(),
  })
  .passthrough();

export const reportResponseSchema = z
  .object({
    query: reportQuerySchema.optional(),
    data: z.array(reportRowSchema),
    totals: z.array(z.array(z.number())).optional(),
    total_rows: z.number().optional(),
    sampled: z.boolean().optional(),
    sample_share: z.number().optional(),
    min: z.array(z.array(z.number())).optional(),
    max: z.array(z.array(z.number())).optional(),
  })
  .passthrough();

export type ReportResponse = z.infer<typeof reportResponseSchema>;
export type ReportRow = z.infer<typeof reportRowSchema>;
