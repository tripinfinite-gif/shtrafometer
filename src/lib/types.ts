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
  | 'report'        // PDF-отчёт для руководства (990–1990)
  | 'autofix-basic' // Автоисправление — 1 категория (4990)
  | 'autofix-std'   // Автоисправление — все нарушения (9990)
  | 'autofix-prem'  // Автоисправление + ручная проверка (14990)
  | 'monitoring'    // Мониторинг-подписка (490–1990/мес)
  | 'consulting'    // Консалтинг (15000–50000)
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
