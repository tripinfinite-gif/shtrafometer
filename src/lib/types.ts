// ─── Re-export check types ──────────────────────────────────────────
export type {
  Severity,
  RiskLevel,
  SiteType,
  Violation,
  Warning,
  PassedCheck,
  CheckResult,
  CheckResponse,
  FineRecord,
} from '@/checks/types';

// ─── Order ──────────────────────────────────────────────────────────

export type OrderStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

export type ProductType =
  | 'fix'           // Исправление нарушений (старый формат, 9900)
  | 'report'        // PDF-отчёт для руководства (1990)
  | 'autofix-basic' // Автоисправление — 1 категория (4990)
  | 'autofix-std'   // Автоисправление — все нарушения (9990)
  | 'autofix-prem'  // Автоисправление + ручная проверка (14990)
  | 'monitoring'    // Мониторинг-подписка (490/мес)
  | 'consulting'    // Консалтинг (15000)
  | 'email-lead';   // Лид через email-gate (бесплатно)

export interface Order {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  siteUrl: string;
  domain: string; // normalized domain for indexing (e.g. "habr.com")
  violations: number;
  totalMaxFine: number;
  price: number;
  status: OrderStatus;
  /** Product type / tier */
  productType?: ProductType;
  /** Full check results saved at order time */
  checkResult?: import('@/checks/types').CheckResponse;
  /** Notes from admin */
  notes?: string;
  /** Fix plan (phase 4+) */
  fixPlan?: FixPlan;
}

// ─── User history (aggregated from orders) ──────────────────────────

export interface DomainHistory {
  domain: string;
  checks: DomainCheck[];
  lastCheckedAt: string;
  totalOrders: number;
}

export interface DomainCheck {
  orderId: string;
  checkedAt: string;
  name: string;
  email: string;
  phone: string;
  violations: number;
  totalMaxFine: number;
  status: OrderStatus;
}

// ─── Fix types (phase 4+) ───────────────────────────────────────────

export type FixType =
  | 'cookie-banner'
  | 'privacy-policy'
  | 'consent-checkbox'
  | 'consent-document'
  | 'footer-links'
  | 'age-rating'
  | 'ad-marking'
  | 'remove-service';

export type FixStatus = 'pending' | 'applied' | 'failed' | 'skipped';

export interface Fix {
  id: string;
  type: FixType;
  violationId: string;
  title: string;
  description: string;
  /** Generated code to insert/replace */
  code: string;
  /** Target file path on the remote server */
  targetPath: string;
  /** Where to insert: 'before-close-body', 'inside-footer', 'new-file', etc. */
  insertionPoint: string;
  status: FixStatus;
  appliedAt?: string;
  error?: string;
}

export interface FixPlan {
  orderId: string;
  createdAt: string;
  fixes: Fix[];
  connection?: ConnectionConfig;
}

export type ConnectionType = 'ssh' | 'ftp';

export interface ConnectionConfig {
  type: ConnectionType;
  host: string;
  port: number;
  username: string;
  /** Password or private key — never persisted to disk */
  credential: string;
  /** Remote document root (e.g. /var/www/html) */
  remotePath: string;
}

// ─── Check logs (visitor check history) ─────────────────────────

export interface CheckLog {
  id: string;
  createdAt: string;
  url: string;
  domain: string;
  ip: string;
  userAgent: string;
  violations: number;
  warnings: number;
  totalMaxFine: number;
  siteType: string;
  riskLevel: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface CheckLogsResponse {
  logs: CheckLog[];
  total: number;
  stats: {
    totalChecks: number;
    uniqueDomains: number;
    todayChecks: number;
    avgViolations: number;
  };
}

// ─── User (personal cabinet) ────────────────────────────────────────

export interface User {
  id: string;
  createdAt: string;
  name: string;
  phone: string | null;        // +7XXXXXXXXXX, null for OAuth-only users
  email: string | null;
  emailVerified: boolean;
  companyName: string | null;
  companyInn: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  yandexId?: string | null;
  vkId?: string | null;
  authProvider?: string;       // 'phone' | 'email' | 'yandex' | 'vk'
}

export interface UserSession {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
}

export interface OtpCode {
  id: string;
  phone: string;
  code: string;
  purpose: 'login' | 'email_verify';
  createdAt: string;
  expiresAt: string;
  used: boolean;
  attempts: number;
}

export interface UserSite {
  id: string;
  userId: string;
  domain: string;
  addedAt: string;
  lastCheckAt: string | null;
  lastViolations: number;
  lastMaxFine: number;
  lastCheckResult: import('@/checks/types').CheckResponse | null;
  monitoringEnabled: boolean;
}

// ─── Auth ───────────────────────────────────────────────────────────

export interface SessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

// ─── API responses ──────────────────────────────────────────────────

export interface OrderListItem {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  siteUrl: string;
  domain: string;
  violations: number;
  totalMaxFine: number;
  status: OrderStatus;
  productType?: string;
  userId?: string;
}

export interface OrdersListResponse {
  orders: OrderListItem[];
  total: number;
}

export interface AdminStatsResponse {
  totalOrders: number;
  newOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  uniqueDomains: number;
}

// ─── AI Consultant (Phase 1A) ───────────────────────────────────────
// План: docs/plan-ai-consultant.md

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export type AiMessageRole = 'user' | 'assistant' | 'tool' | 'system';

export type AiModelId =
  | 'openai-gpt-4o'
  | 'claude-sonnet-4.5'
  | 'yandexgpt-5-pro';

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  toolCalls: unknown | null;
  toolResult: unknown | null;
  modelUsed: AiModelId | null;
  tokensInput: number;
  tokensOutput: number;
  cacheReadTokens: number;
  createdAt: string;
}

export type AiKnowledgeSourceType = 'rss' | 'blog' | 'tg' | 'manual' | 'api-doc';
export type AiKnowledgeLayer = 'facts' | 'practices' | 'cases' | 'news' | 'legal';

export interface AiKnowledgeChunk {
  id: string;
  sourceId: string | null;
  sourceUrl: string | null;
  sourceType: AiKnowledgeSourceType;
  title: string;
  content: string;
  /** vector(1024) — обычно не вытаскивается клиенту */
  embedding?: number[] | null;
  tags: string[];
  layer: AiKnowledgeLayer;
  publishedAt: string | null;
  ingestedAt: string;
  ttlDays: number | null;
}

export type AiOAuthProvider = 'yandex-direct' | 'yandex-metrika' | 'yandex-webmaster';

export interface AiClientOAuthToken {
  id: string;
  userId: string;
  provider: AiOAuthProvider;
  /** bytea — pgp_sym_encrypt; никогда не сериализуется на клиент */
  accessTokenEncrypted: Buffer;
  refreshTokenEncrypted: Buffer | null;
  expiresAt: string | null;
  scope: string | null;
  clientLogin: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export type AiAuditAction =
  | 'tool_proposed'
  | 'tool_approved'
  | 'tool_denied'
  | 'tool_executed';

export interface AiAuditLogEntry {
  id: string;
  userId: string;
  conversationId: string | null;
  action: AiAuditAction;
  toolName: string;
  toolArgs: unknown | null;
  toolResult: unknown | null;
  createdAt: string;
}

// ─── Decision Log (Phase D1) ────────────────────────────────────────

export type AdDecisionType = 'bid_change' | 'budget_change' | 'campaign_toggle' | 'creative_change' | 'strategy_change' | 'targeting_change' | 'negative_keywords' | 'other';
export type AdDecisionOutcome = 'pending' | 'positive' | 'negative' | 'neutral' | 'inconclusive';

export interface AdDecision {
  id: string;
  createdAt: string;
  decisionType: AdDecisionType;
  channelId: string;
  campaignId: string | null;
  campaignName: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  hypothesis: string | null;
  tags: string[];
  outcome: AdDecisionOutcome;
  outcomeComment: string | null;
  outcomeAssessedAt: string | null;
  actor: 'admin' | 'ai-consultant';
  conversationId: string | null;
  auditLogId: string | null;
  metadata: unknown;
}

export interface AdDecisionSnapshot {
  id: string;
  decisionId: string;
  snapshotType: 'before' | 'after';
  periodStart: string;
  periodEnd: string;
  metrics: {
    impressions?: number;
    clicks?: number;
    spend_kopecks?: number;
    conversions?: number;
    ctr?: number;
    cpa_kopecks?: number;
    roi_percent?: number;
  };
}

export interface AdDecisionAnnotation {
  id: string;
  createdAt: string;
  decisionType: AdDecisionType;
  channelId: string;
  campaignName: string | null;
  hypothesis: string | null;
  outcome: AdDecisionOutcome;
}
