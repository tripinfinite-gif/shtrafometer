/**
 * Yandex.Direct API v5 thin client (read-only).
 *
 * Phase 3A — docs/plan-ai-consultant.md
 *
 * Design notes:
 *   - Transport: POST https://api.direct.yandex.com/json/v5/<service>
 *     body: { method, params: {...} }, header Authorization: Bearer <token>.
 *   - Response shape: `{ result: ... }` | `{ error: {...} }`.
 *     Ошибки кидаем как typed `DirectApiError`.
 *   - Все результаты парсим через Zod (R8 — явный crash при смене схемы).
 *   - Кэш метаданных — 5 мин (R7). Статистика кэшируется 1 мин.
 *   - Read-only. Mutating методы (add/update/delete/stop) — отдельная задача.
 *
 * Usage:
 *   const client = createDirectClient(accessToken, { clientLogin: 'shtrafometer' });
 *   const campaigns = await client.getCampaigns();
 */

import {
  AdGroupsGetResultSchema,
  AdsGetResultSchema,
  CampaignsGetResultSchema,
  DirectApiErrorSchema,
  KeywordsGetResultSchema,
  StatisticsRowSchema,
  type Ad,
  type AdGroup,
  type Campaign,
  type Keyword,
  type StatisticsRow,
} from './direct.schemas';
import { DirectApiError, DirectTransportError } from './direct-errors';
import { TTL, directCache } from './cache';

// ─── Public API ───────────────────────────────────────────────────

export interface GetReportOptions {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  /** Колонки отчёта: Date, CampaignId, Impressions, Clicks, Cost, ... */
  fieldNames: string[];
  /** Произвольный фильтр (Filter в Reports API). */
  filter?: unknown;
  /** ReportType (default: CAMPAIGN_PERFORMANCE_REPORT). */
  reportType?:
    | 'CUSTOM_REPORT'
    | 'CAMPAIGN_PERFORMANCE_REPORT'
    | 'ADGROUP_PERFORMANCE_REPORT'
    | 'AD_PERFORMANCE_REPORT'
    | 'SEARCH_QUERY_PERFORMANCE_REPORT';
  /** Имя отчёта (обязательно в Reports API — уникально на cache_request). */
  reportName?: string;
  /** Включать ли НДС (default: NO — статистика без НДС). */
  includeVat?: 'YES' | 'NO';
}

export interface DirectClient {
  getCampaigns(ids?: number[]): Promise<Campaign[]>;
  getAdGroups(campaignIds: number[]): Promise<AdGroup[]>;
  getAds(adGroupIds: number[]): Promise<Ad[]>;
  getKeywords(adGroupIds: number[]): Promise<Keyword[]>;
  getReport(opts: GetReportOptions): Promise<StatisticsRow[]>;
}

export interface DirectClientOptions {
  /** Логин клиентского аккаунта (обязателен для агентских OAuth-токенов). */
  clientLogin?: string;
  /** Accept-Language. По умолчанию 'ru'. */
  lang?: 'ru' | 'en';
  /** Переопределение базового URL (для тестов/песочницы). */
  baseUrl?: string;
  /** Тайм-аут запроса в мс (default 30_000). */
  timeoutMs?: number;
}

export function createDirectClient(
  accessToken: string,
  opts: DirectClientOptions = {},
): DirectClient {
  if (!accessToken || accessToken.trim() === '') {
    throw new Error('[YandexDirect] accessToken is required');
  }

  const baseUrl = opts.baseUrl ?? 'https://api.direct.yandex.com/json/v5';
  const lang = opts.lang ?? 'ru';
  const timeoutMs = opts.timeoutMs ?? 30_000;

  const cacheScope = `${opts.clientLogin ?? '_self_'}`;

  async function callJson<T>(
    service: string,
    method: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    const url = `${baseUrl}/${service}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Accept-Language': lang,
      'Content-Type': 'application/json; charset=utf-8',
    };
    if (opts.clientLogin) headers['Client-Login'] = opts.clientLogin;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ method, params }),
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      throw new DirectTransportError(
        0,
        e instanceof Error ? e.message : 'fetch failed',
      );
    }
    clearTimeout(timer);

    const text = await res.text();

    // Парсим JSON; Direct всегда возвращает JSON на JSON-endpoints (для
    // JSON-методов). Если res.ok == false и тело не-JSON — transport error.
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new DirectTransportError(res.status, text);
    }

    // Проверяем ошибочный envelope независимо от HTTP-кода.
    const err = DirectApiErrorSchema.safeParse(json);
    if (err.success) {
      throw new DirectApiError({
        errorCode: err.data.error.error_code,
        errorString: err.data.error.error_string,
        errorDetail: err.data.error.error_detail,
        requestId: err.data.error.request_id,
      });
    }

    if (!res.ok) {
      throw new DirectTransportError(res.status, text);
    }

    // { result: ... }
    if (
      typeof json !== 'object' ||
      json === null ||
      !('result' in (json as Record<string, unknown>))
    ) {
      throw new DirectTransportError(
        res.status,
        `Unexpected response shape (no 'result' field): ${text.slice(0, 200)}`,
      );
    }
    return (json as { result: T }).result;
  }

  // ─── Metadata: campaigns ────────────────────────────────────────

  async function getCampaigns(ids?: number[]): Promise<Campaign[]> {
    const key = `campaigns:${cacheScope}:${ids ? ids.slice().sort().join(',') : 'all'}`;
    const cached = directCache.get<Campaign[]>(key);
    if (cached) return cached;

    const selectionCriteria: Record<string, unknown> = {};
    if (ids && ids.length > 0) selectionCriteria.Ids = ids;

    const result = await callJson<unknown>('campaigns', 'get', {
      SelectionCriteria: selectionCriteria,
      FieldNames: [
        'Id',
        'Name',
        'State',
        'Status',
        'Type',
        'StartDate',
        'EndDate',
        'DailyBudget',
        'Funds',
      ],
    });

    const parsed = CampaignsGetResultSchema.parse(result);
    directCache.set(key, parsed.Campaigns, TTL.METADATA_MS);
    return parsed.Campaigns;
  }

  // ─── Metadata: ad groups ────────────────────────────────────────

  async function getAdGroups(campaignIds: number[]): Promise<AdGroup[]> {
    if (campaignIds.length === 0) return [];
    const key = `adgroups:${cacheScope}:${campaignIds.slice().sort().join(',')}`;
    const cached = directCache.get<AdGroup[]>(key);
    if (cached) return cached;

    const result = await callJson<unknown>('adgroups', 'get', {
      SelectionCriteria: { CampaignIds: campaignIds },
      FieldNames: ['Id', 'Name', 'CampaignId', 'Status', 'Type'],
    });

    const parsed = AdGroupsGetResultSchema.parse(result);
    directCache.set(key, parsed.AdGroups, TTL.METADATA_MS);
    return parsed.AdGroups;
  }

  // ─── Metadata: ads ──────────────────────────────────────────────

  async function getAds(adGroupIds: number[]): Promise<Ad[]> {
    if (adGroupIds.length === 0) return [];
    const key = `ads:${cacheScope}:${adGroupIds.slice().sort().join(',')}`;
    const cached = directCache.get<Ad[]>(key);
    if (cached) return cached;

    const result = await callJson<unknown>('ads', 'get', {
      SelectionCriteria: { AdGroupIds: adGroupIds },
      FieldNames: ['Id', 'AdGroupId', 'CampaignId', 'Type', 'Status', 'State'],
      TextAdFieldNames: ['Title', 'Title2', 'Text', 'Href', 'DisplayUrlPath', 'Mobile'],
    });

    const parsed = AdsGetResultSchema.parse(result);
    directCache.set(key, parsed.Ads, TTL.METADATA_MS);
    return parsed.Ads;
  }

  // ─── Metadata: keywords ─────────────────────────────────────────

  async function getKeywords(adGroupIds: number[]): Promise<Keyword[]> {
    if (adGroupIds.length === 0) return [];
    const key = `keywords:${cacheScope}:${adGroupIds.slice().sort().join(',')}`;
    const cached = directCache.get<Keyword[]>(key);
    if (cached) return cached;

    const result = await callJson<unknown>('keywords', 'get', {
      SelectionCriteria: { AdGroupIds: adGroupIds },
      FieldNames: [
        'Id',
        'AdGroupId',
        'CampaignId',
        'Keyword',
        'Bid',
        'ContextBid',
        'State',
        'Status',
        'ServingStatus',
      ],
    });

    const parsed = KeywordsGetResultSchema.parse(result);
    directCache.set(key, parsed.Keywords, TTL.METADATA_MS);
    return parsed.Keywords;
  }

  // ─── Statistics (Reports service) ───────────────────────────────

  /**
   * Reports возвращает TSV-отчёт (не JSON). Заголовки включают колонки
   * из `fieldNames`, строки разделены `\n`, колонки — табами.
   *
   * Мы отправляем запрос с `processingMode: online` и `returnMoneyInMicros: false`,
   * чтобы получить отчёт сразу, а денежные поля — в базовых единицах (рубли).
   */
  async function getReport(optsR: GetReportOptions): Promise<StatisticsRow[]> {
    // Короткий кэш — 60 сек. Для одинаковых запросов в рамках одной сессии.
    const cacheKey = `report:${cacheScope}:${JSON.stringify(optsR)}`;
    const cached = directCache.get<StatisticsRow[]>(cacheKey);
    if (cached) return cached;

    const reportName =
      optsR.reportName ??
      `ai-consultant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const reportDefinition: Record<string, unknown> = {
      SelectionCriteria: {
        DateFrom: optsR.dateFrom,
        DateTo: optsR.dateTo,
        ...(optsR.filter ? { Filter: optsR.filter } : {}),
      },
      FieldNames: optsR.fieldNames,
      ReportName: reportName,
      ReportType: optsR.reportType ?? 'CAMPAIGN_PERFORMANCE_REPORT',
      DateRangeType: 'CUSTOM_DATE',
      Format: 'TSV',
      IncludeVAT: optsR.includeVat ?? 'NO',
    };

    const url = `${baseUrl}/reports`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Accept-Language': lang,
      'Content-Type': 'application/json; charset=utf-8',
      processingMode: 'online',
      returnMoneyInMicros: 'false',
      skipReportHeader: 'true',
      skipReportSummary: 'true',
    };
    if (opts.clientLogin) headers['Client-Login'] = opts.clientLogin;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ params: reportDefinition }),
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      throw new DirectTransportError(
        0,
        e instanceof Error ? e.message : 'fetch failed',
      );
    }
    clearTimeout(timer);

    const text = await res.text();

    // 200 — готовый TSV. 201/202 — отложенная генерация (повторить позже).
    if (res.status === 201 || res.status === 202) {
      throw new DirectApiError({
        errorCode: res.status,
        errorString: 'Report is being generated in offline mode',
        errorDetail:
          'Reports API вернул отложенный режим. Для консультанта нужен online-mode; повторите запрос через несколько секунд.',
      });
    }

    if (!res.ok) {
      // Попробовать распарсить как JSON-ошибку
      try {
        const json = JSON.parse(text);
        const err = DirectApiErrorSchema.safeParse(json);
        if (err.success) {
          throw new DirectApiError({
            errorCode: err.data.error.error_code,
            errorString: err.data.error.error_string,
            errorDetail: err.data.error.error_detail,
            requestId: err.data.error.request_id,
          });
        }
      } catch (e) {
        if (e instanceof DirectApiError) throw e;
        // not-JSON — прокинем transport error
      }
      throw new DirectTransportError(res.status, text);
    }

    const rows = parseTsvReport(text, optsR.fieldNames);
    directCache.set(cacheKey, rows, TTL.STATISTICS_MS);
    return rows;
  }

  return { getCampaigns, getAdGroups, getAds, getKeywords, getReport };
}

// ─── TSV parsing ──────────────────────────────────────────────────

/** Поля, которые в отчёте Reports приходят числами. */
const NUMERIC_FIELDS = new Set([
  'Impressions',
  'Clicks',
  'Cost',
  'Conversions',
  'Ctr',
  'AvgCpc',
  'AvgImpressionPosition',
  'CampaignId',
  'AdGroupId',
  'AdId',
  'CriterionId',
]);

function parseTsvReport(tsv: string, fieldNames: string[]): StatisticsRow[] {
  const lines = tsv.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];

  // Первая непустая строка — заголовок (совпадает с fieldNames, но
  // skipReportHeader может не всегда срезать его — проверим по первому полю).
  let startIdx = 0;
  const firstLine = lines[0] ?? '';
  const firstCols = firstLine.split('\t');
  if (firstCols[0] === fieldNames[0]) startIdx = 1;

  const rows: StatisticsRow[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split('\t');
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < fieldNames.length; c++) {
      const name = fieldNames[c];
      if (!name) continue;
      const raw = cols[c];
      if (raw === undefined || raw === '' || raw === '--') continue;
      if (NUMERIC_FIELDS.has(name)) {
        const n = Number(raw);
        obj[name] = Number.isFinite(n) ? n : raw;
      } else {
        obj[name] = raw;
      }
    }
    const parsed = StatisticsRowSchema.safeParse(obj);
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}
