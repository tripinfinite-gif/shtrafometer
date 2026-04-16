/**
 * Yandex.Direct API v5 — Zod schemas for read-only responses.
 *
 * Покрыты только поля, необходимые AI-консультанту для стандартных запросов
 * (список кампаний, группы, объявления, ключи, базовая статистика).
 * Полный словарь API НЕ дублируем — остальные поля допускаются через
 * `.passthrough()` в будущем при необходимости.
 *
 * Docs: https://yandex.ru/dev/direct/doc/ru/reference/overview
 * Phase 3A — docs/plan-ai-consultant.md
 */

import { z } from 'zod';

// ─── Scalars ──────────────────────────────────────────────────────

/** State/Status-поля Директа — enum-like строки. Держим как string,
 *  чтобы не падать на новых значениях (sanity-check cron — риск R8). */
const DirectEnum = z.string();

/** Денежные суммы в Директе приходят в «валютных единицах с двумя знаками»
 *  (micros = rub*1_000_000). Возвращаем как number — вызывающий сам решает
 *  переводить в рубли. */
const Money = z.number();

/** Даты — строки ISO `YYYY-MM-DD`. */
const IsoDate = z.string();

// ─── Campaign ─────────────────────────────────────────────────────

/**
 * Campaigns.get → CampaignGetItem.
 * Минимум полей для консультанта: id, имя, статусы, тип, дневной бюджет,
 * дата старта и состояние бюджета.
 */
export const CampaignSchema = z
  .object({
    Id: z.number(),
    Name: z.string(),
    /** ON | OFF | SUSPENDED | ENDED | CONVERTED | ARCHIVED */
    State: DirectEnum.optional(),
    /** DRAFT | MODERATION | ACCEPTED | REJECTED */
    Status: DirectEnum.optional(),
    /** TEXT_CAMPAIGN | SMART_CAMPAIGN | DYNAMIC_TEXT_CAMPAIGN | UNIFIED_CAMPAIGN | … */
    Type: DirectEnum.optional(),
    StartDate: IsoDate.optional(),
    EndDate: IsoDate.optional(),
    DailyBudget: z
      .object({
        Amount: Money,
        Mode: DirectEnum.optional(),
      })
      .partial()
      .optional(),
    Funds: z
      .object({
        Mode: DirectEnum.optional(),
        CampaignFunds: z
          .object({
            Balance: Money.optional(),
            SumAvailableForTransfer: Money.optional(),
          })
          .partial()
          .optional(),
        SharedAccountFunds: z
          .object({
            Refund: Money.optional(),
            Spend: Money.optional(),
          })
          .partial()
          .optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough();

export type Campaign = z.infer<typeof CampaignSchema>;

export const CampaignsGetResultSchema = z.object({
  Campaigns: z.array(CampaignSchema).default([]),
  LimitedBy: z.number().optional(),
});

// ─── AdGroup ──────────────────────────────────────────────────────

export const AdGroupSchema = z
  .object({
    Id: z.number(),
    Name: z.string(),
    CampaignId: z.number(),
    Status: DirectEnum.optional(),
    /** TEXT_AD_GROUP | DYNAMIC_TEXT_AD_GROUP | MOBILE_APP_AD_GROUP | … */
    Type: DirectEnum.optional(),
  })
  .passthrough();

export type AdGroup = z.infer<typeof AdGroupSchema>;

export const AdGroupsGetResultSchema = z.object({
  AdGroups: z.array(AdGroupSchema).default([]),
  LimitedBy: z.number().optional(),
});

// ─── Ad ───────────────────────────────────────────────────────────

const TextAdSchema = z
  .object({
    Title: z.string().optional(),
    Title2: z.string().optional(),
    Text: z.string().optional(),
    Href: z.string().optional(),
    DisplayUrlPath: z.string().optional(),
    Mobile: DirectEnum.optional(),
  })
  .passthrough();

export const AdSchema = z
  .object({
    Id: z.number(),
    AdGroupId: z.number(),
    CampaignId: z.number().optional(),
    /** TEXT_AD | DYNAMIC_TEXT_AD | MOBILE_APP_AD | IMAGE_AD | … */
    Type: DirectEnum.optional(),
    /** DRAFT | MODERATION | ACCEPTED | REJECTED | PREACCEPTED */
    Status: DirectEnum.optional(),
    State: DirectEnum.optional(),
    TextAd: TextAdSchema.optional(),
  })
  .passthrough();

export type Ad = z.infer<typeof AdSchema>;

export const AdsGetResultSchema = z.object({
  Ads: z.array(AdSchema).default([]),
  LimitedBy: z.number().optional(),
});

// ─── Keyword ──────────────────────────────────────────────────────

export const KeywordSchema = z
  .object({
    Id: z.number(),
    AdGroupId: z.number(),
    CampaignId: z.number().optional(),
    Keyword: z.string(),
    Bid: Money.optional(),
    ContextBid: Money.optional(),
    State: DirectEnum.optional(),
    Status: DirectEnum.optional(),
    ServingStatus: DirectEnum.optional(),
  })
  .passthrough();

export type Keyword = z.infer<typeof KeywordSchema>;

export const KeywordsGetResultSchema = z.object({
  Keywords: z.array(KeywordSchema).default([]),
  LimitedBy: z.number().optional(),
});

// ─── Statistics (Reports service) ─────────────────────────────────

/**
 * Строка отчёта Reports. Набор колонок задаётся в `fieldNames` запроса,
 * поэтому схема максимально «широкая» — все поля опциональны.
 *
 * Типичные колонки для консультанта:
 *   Date, CampaignId, CampaignName, Impressions, Clicks, Cost,
 *   Conversions, Ctr, AvgCpc, AvgImpressionPosition.
 *
 * Значения в CSV-отчёте приходят строками — адаптер в `direct.ts`
 * приводит числовые поля к `number`.
 */
export const StatisticsRowSchema = z
  .object({
    Date: z.string().optional(),
    CampaignId: z.number().optional(),
    CampaignName: z.string().optional(),
    AdGroupId: z.number().optional(),
    AdGroupName: z.string().optional(),
    AdId: z.number().optional(),
    Criterion: z.string().optional(),
    CriterionId: z.number().optional(),
    Impressions: z.number().optional(),
    Clicks: z.number().optional(),
    /** Cost в отчётах приходит в «микрорублях» (×1_000_000). Клиент делит. */
    Cost: z.number().optional(),
    Conversions: z.number().optional(),
    Ctr: z.number().optional(),
    AvgCpc: z.number().optional(),
    AvgImpressionPosition: z.number().optional(),
  })
  .passthrough();

export type StatisticsRow = z.infer<typeof StatisticsRowSchema>;

// ─── Error envelope ───────────────────────────────────────────────

export const DirectApiErrorSchema = z.object({
  error: z.object({
    error_code: z.union([z.number(), z.string()]),
    error_string: z.string(),
    error_detail: z.string().optional().default(''),
    request_id: z.string().optional(),
  }),
});

export type DirectApiErrorEnvelope = z.infer<typeof DirectApiErrorSchema>;
