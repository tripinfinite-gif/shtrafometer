/**
 * Yandex.Metrika API client (read-only wrapper).
 *
 * Phase 3B — docs/plan-ai-consultant.md
 *
 * Endpoints:
 *   - Management: https://api-metrika.yandex.net/management/v1/
 *   - Reporting:  https://api-metrika.yandex.net/stat/v1/data
 *
 * Authorization: `OAuth <access_token>` — традиционный префикс Метрики
 * (Bearer тоже работает, но OAuth историчен и документирован).
 *
 * Zod валидирует тела ответов — при смене API Метрики мы узнаём сразу (R8).
 *
 * Кэш: используем общий `directCache` из cache.ts (shared in-process).
 *   - Метаданные (counters / goals): TTL 5 мин
 *   - Отчёты: TTL 2 мин
 */

import { z } from 'zod';
import { directCache, TTL } from './cache';
import {
  counterListResponseSchema,
  counterResponseSchema,
  goalListResponseSchema,
  metrikaErrorSchema,
  reportResponseSchema,
  type Counter,
  type Goal,
  type ReportResponse,
} from './metrika.schemas';

/* -------------------------------------------------------------------------- */
/*                                  Errors                                    */
/* -------------------------------------------------------------------------- */

export class MetrikaApiError extends Error {
  readonly name = 'MetrikaApiError';
  readonly code?: number;
  readonly errors?: Array<{ error_type?: string; message?: string; location?: string }>;
  readonly status: number;

  constructor(params: {
    status: number;
    code?: number;
    message?: string;
    errors?: Array<{ error_type?: string; message?: string; location?: string }>;
  }) {
    const first = params.errors?.[0];
    const msg =
      params.message ??
      first?.message ??
      first?.error_type ??
      `HTTP ${params.status}`;
    super(`[YandexMetrika] ${msg}`);
    this.status = params.status;
    this.code = params.code;
    this.errors = params.errors;
  }
}

export class MetrikaTransportError extends Error {
  readonly name = 'MetrikaTransportError';
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`[YandexMetrika] HTTP ${status}: ${body.slice(0, 500)}`);
    this.status = status;
    this.body = body;
  }
}

/* -------------------------------------------------------------------------- */
/*                               Public interface                             */
/* -------------------------------------------------------------------------- */

export interface GetReportOptions {
  counterId: number;
  metrics: string[];
  dimensions?: string[];
  date1: string;
  date2: string;
  filters?: string;
  limit?: number;
  /** ISO 639-1, по умолчанию 'ru'. */
  lang?: string;
  /** 'date' | 'day' | 'week' | 'month'. */
  accuracy?: string;
  /** Сортировка: 'ym:s:date' / '-ym:s:visits' / ... */
  sort?: string;
  /** Смещение для пагинации. */
  offset?: number;
}

export interface MetrikaClient {
  getCounters(): Promise<Counter[]>;
  getCounter(counterId: number): Promise<Counter>;
  getGoals(counterId: number): Promise<Goal[]>;
  getReport(opts: GetReportOptions): Promise<ReportResponse>;
}

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

const MANAGEMENT_BASE = 'https://api-metrika.yandex.net/management/v1';
const STAT_BASE = 'https://api-metrika.yandex.net/stat/v1/data';

const METRIKA_TTL = {
  METADATA_MS: TTL.METADATA_MS, // 5 мин
  REPORT_MS: 2 * 60 * 1000, // 2 мин
} as const;

/* -------------------------------------------------------------------------- */
/*                                Implementation                              */
/* -------------------------------------------------------------------------- */

export function createMetrikaClient(accessToken: string): MetrikaClient {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('[YandexMetrika] accessToken is required');
  }

  const authHeader = `OAuth ${accessToken}`;
  /** Кэш-пространство на токен (разные пользователи — разные ключи). */
  const tokenKey = accessToken.slice(-10);

  async function request<T>(
    url: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
  ): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });

    const text = await res.text();

    if (!res.ok) {
      // Пробуем распарсить error envelope
      let envelope: z.infer<typeof metrikaErrorSchema> | undefined;
      try {
        envelope = metrikaErrorSchema.parse(JSON.parse(text));
      } catch {
        throw new MetrikaTransportError(res.status, text);
      }
      throw new MetrikaApiError({
        status: res.status,
        code: envelope.code,
        message: envelope.message,
        errors: envelope.errors,
      });
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new MetrikaTransportError(res.status, text);
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new Error(
        `[YandexMetrika] schema mismatch: ${parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
      );
    }
    return parsed.data;
  }

  async function getCounters(): Promise<Counter[]> {
    const cacheKey = `metrika:counters:${tokenKey}`;
    const cached = directCache.get<Counter[]>(cacheKey);
    if (cached) return cached;

    // per_page=1000 — у обычного пользователя счётчиков десятки
    const url = `${MANAGEMENT_BASE}/counters?per_page=1000`;
    const { counters } = await request(url, counterListResponseSchema);
    directCache.set(cacheKey, counters, METRIKA_TTL.METADATA_MS);
    return counters;
  }

  async function getCounter(counterId: number): Promise<Counter> {
    const cacheKey = `metrika:counter:${tokenKey}:${counterId}`;
    const cached = directCache.get<Counter>(cacheKey);
    if (cached) return cached;

    const url = `${MANAGEMENT_BASE}/counter/${counterId}`;
    const { counter } = await request(url, counterResponseSchema);
    directCache.set(cacheKey, counter, METRIKA_TTL.METADATA_MS);
    return counter;
  }

  async function getGoals(counterId: number): Promise<Goal[]> {
    const cacheKey = `metrika:goals:${tokenKey}:${counterId}`;
    const cached = directCache.get<Goal[]>(cacheKey);
    if (cached) return cached;

    const url = `${MANAGEMENT_BASE}/counter/${counterId}/goals`;
    const { goals } = await request(url, goalListResponseSchema);
    directCache.set(cacheKey, goals, METRIKA_TTL.METADATA_MS);
    return goals;
  }

  async function getReport(opts: GetReportOptions): Promise<ReportResponse> {
    const params = new URLSearchParams();
    params.set('ids', String(opts.counterId));
    params.set('metrics', opts.metrics.join(','));
    if (opts.dimensions?.length) {
      params.set('dimensions', opts.dimensions.join(','));
    }
    params.set('date1', opts.date1);
    params.set('date2', opts.date2);
    if (opts.filters) params.set('filters', opts.filters);
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.offset != null) params.set('offset', String(opts.offset));
    if (opts.lang) params.set('lang', opts.lang);
    if (opts.accuracy) params.set('accuracy', opts.accuracy);
    if (opts.sort) params.set('sort', opts.sort);

    const qs = params.toString();
    const cacheKey = `metrika:report:${tokenKey}:${qs}`;
    const cached = directCache.get<ReportResponse>(cacheKey);
    if (cached) return cached;

    const url = `${STAT_BASE}?${qs}`;
    const report = await request(url, reportResponseSchema);
    directCache.set(cacheKey, report, METRIKA_TTL.REPORT_MS);
    return report;
  }

  return { getCounters, getCounter, getGoals, getReport };
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/**
 * Мэппинг имени цели → id через getGoals.
 * Имя сравнивается case-insensitive (Метрика допускает любые имена).
 *
 * Пример:
 *   await resolveGoalId(client, 108525306, 'order_submit')
 */
export async function resolveGoalId(
  client: MetrikaClient,
  counterId: number,
  goalName: string,
): Promise<number | null> {
  const goals = await client.getGoals(counterId);
  const needle = goalName.trim().toLowerCase();
  const hit = goals.find((g) => g.name.trim().toLowerCase() === needle);
  return hit?.id ?? null;
}

/** Штрафометровский счётчик. */
export const SHTRAFOMETER_COUNTER_ID = 108525306;

/** 7 целей, которые уже установлены в layout.tsx Штрафометра. */
export const SHTRAFOMETER_GOALS = [
  'free_check',
  'order_form_open',
  'order_submit',
  'payment_success',
  'user_register',
  'user_login',
  'pdf_download',
] as const;

export type ShtrafometerGoalName = (typeof SHTRAFOMETER_GOALS)[number];
