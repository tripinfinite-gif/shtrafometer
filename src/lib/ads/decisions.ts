/**
 * Ad Decision Log — persistence layer (Phase D1).
 *
 * Real PostgreSQL implementation. Tables created in `ensureSchema()`.
 * Exports backward-compatible types for decisions.tools.ts (snake_case)
 * + new camelCase functions for API routes.
 */

import { query } from '@/lib/db';
import type {
  AdDecision,
  AdDecisionType,
  AdDecisionOutcome,
  AdDecisionAnnotation,
} from '@/lib/types';

// ─── Row shape (snake_case from Postgres) ─────────────────────────────

type DecisionRow = {
  id: string;
  created_at: Date | string;
  decision_type: string;
  channel_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  before_value: unknown;
  after_value: unknown;
  hypothesis: string | null;
  tags: string[];
  outcome: string;
  outcome_comment: string | null;
  outcome_assessed_at: Date | string | null;
  actor: string;
  conversation_id: string | null;
  audit_log_id: string | null;
  metadata: unknown;
  [k: string]: unknown;
};

function toIso(v: Date | string | null): string | null {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

function rowToAdDecision(r: DecisionRow): AdDecision {
  return {
    id: r.id,
    createdAt: toIso(r.created_at)!,
    decisionType: r.decision_type as AdDecisionType,
    channelId: r.channel_id,
    campaignId: r.campaign_id,
    campaignName: r.campaign_name,
    beforeValue: r.before_value,
    afterValue: r.after_value,
    hypothesis: r.hypothesis,
    tags: r.tags ?? [],
    outcome: (r.outcome ?? 'pending') as AdDecisionOutcome,
    outcomeComment: r.outcome_comment,
    outcomeAssessedAt: toIso(r.outcome_assessed_at),
    actor: r.actor as AdDecision['actor'],
    conversationId: r.conversation_id,
    auditLogId: r.audit_log_id,
    metadata: r.metadata,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Backward-compatible types for decisions.tools.ts (snake_case)
// ═══════════════════════════════════════════════════════════════════════

export interface Decision {
  id: string;
  created_at: string;
  decision_type: string;
  channel_id: string;
  campaign_id?: string | null;
  campaign_name?: string | null;
  before_value?: Record<string, unknown> | null;
  after_value?: Record<string, unknown> | null;
  hypothesis: string;
  actor: string;
  conversation_id?: string | null;
  tags?: string[];
  snapshot_before?: Record<string, unknown> | null;
  snapshot_after?: Record<string, unknown> | null;
}

export interface AddDecisionInput {
  decision_type: string;
  channel_id: string;
  campaign_id?: string | null;
  campaign_name?: string | null;
  before_value?: Record<string, unknown> | null;
  after_value?: Record<string, unknown> | null;
  hypothesis: string;
  actor: string;
  conversation_id?: string | null;
  tags?: string[];
}

export interface GetDecisionsFilter {
  from?: string;
  to?: string;
  channel_id?: string;
  limit?: number;
}

/** Convert DB row to backward-compatible Decision (snake_case). */
function rowToDecision(r: DecisionRow): Decision {
  return {
    id: r.id,
    created_at: toIso(r.created_at)!,
    decision_type: r.decision_type,
    channel_id: r.channel_id,
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    before_value: r.before_value as Record<string, unknown> | null,
    after_value: r.after_value as Record<string, unknown> | null,
    hypothesis: r.hypothesis ?? '',
    actor: r.actor,
    conversation_id: r.conversation_id,
    tags: r.tags ?? [],
    snapshot_before: null, // filled by D3 cronjob via snapshots table
    snapshot_after: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Backward-compatible functions (used by decisions.tools.ts)
// ═══════════════════════════════════════════════════════════════════════

/** Insert a decision (backward-compatible snake_case interface). */
export async function addDecision(input: AddDecisionInput): Promise<Decision> {
  const { rows } = await query<DecisionRow>(
    `INSERT INTO ad_decisions
       (decision_type, channel_id, campaign_id, campaign_name,
        before_value, after_value, hypothesis, tags, actor,
        conversation_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      input.decision_type,
      input.channel_id,
      input.campaign_id ?? null,
      input.campaign_name ?? null,
      input.before_value ? JSON.stringify(input.before_value) : null,
      input.after_value ? JSON.stringify(input.after_value) : null,
      input.hypothesis,
      input.tags ?? [],
      input.actor,
      input.conversation_id ?? null,
    ],
  );
  return rowToDecision(rows[0]);
}

/** List decisions (backward-compatible — returns Decision[]). */
export async function getDecisions(filter: GetDecisionsFilter): Promise<Decision[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.channel_id) {
    conditions.push(`channel_id = $${idx++}`);
    params.push(filter.channel_id);
  }
  if (filter.from) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(filter.to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filter.limit ?? 50;

  const { rows } = await query<DecisionRow>(
    `SELECT * FROM ad_decisions ${where} ORDER BY created_at DESC LIMIT $${idx}`,
    [...params, limit],
  );

  return rows.map(rowToDecision);
}

/** Get one decision by ID (backward-compatible). */
export async function getDecision(id: string): Promise<Decision | null> {
  const { rows } = await query<DecisionRow>(
    `SELECT * FROM ad_decisions WHERE id = $1`,
    [id],
  );
  return rows.length ? rowToDecision(rows[0]) : null;
}

// ═══════════════════════════════════════════════════════════════════════
// New camelCase API (Phase D1 — used by API routes)
// ═══════════════════════════════════════════════════════════════════════

export interface CreateDecisionInput {
  decisionType: AdDecisionType;
  channelId: string;
  campaignId?: string | null;
  campaignName?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
  hypothesis?: string | null;
  tags?: string[];
  actor?: 'admin' | 'ai-consultant';
  conversationId?: string | null;
  auditLogId?: string | null;
  metadata?: unknown;
}

/** Insert a decision (camelCase API). */
export async function createDecision(input: CreateDecisionInput): Promise<AdDecision> {
  const { rows } = await query<DecisionRow>(
    `INSERT INTO ad_decisions
       (decision_type, channel_id, campaign_id, campaign_name,
        before_value, after_value, hypothesis, tags, actor,
        conversation_id, audit_log_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      input.decisionType,
      input.channelId,
      input.campaignId ?? null,
      input.campaignName ?? null,
      input.beforeValue ? JSON.stringify(input.beforeValue) : null,
      input.afterValue ? JSON.stringify(input.afterValue) : null,
      input.hypothesis ?? null,
      input.tags ?? [],
      input.actor ?? 'admin',
      input.conversationId ?? null,
      input.auditLogId ?? null,
      input.metadata ? JSON.stringify(input.metadata) : '{}',
    ],
  );
  return rowToAdDecision(rows[0]);
}

/** List decisions with pagination (camelCase API). */
export interface ListDecisionsFilters {
  channelId?: string;
  decisionType?: AdDecisionType;
  outcome?: AdDecisionOutcome;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function listDecisions(
  filters: ListDecisionsFilters = {},
): Promise<{ decisions: AdDecision[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.channelId) {
    conditions.push(`channel_id = $${idx++}`);
    params.push(filters.channelId);
  }
  if (filters.decisionType) {
    conditions.push(`decision_type = $${idx++}`);
    params.push(filters.decisionType);
  }
  if (filters.outcome) {
    conditions.push(`outcome = $${idx++}`);
    params.push(filters.outcome);
  }
  if (filters.from) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(filters.to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM ad_decisions ${where}`,
    params,
  );
  const total = parseInt(countRows[0].count, 10);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const { rows } = await query<DecisionRow>(
    `SELECT * FROM ad_decisions ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset],
  );

  return { decisions: rows.map(rowToAdDecision), total };
}

/** Get one decision by ID (camelCase). */
export async function getDecisionById(id: string): Promise<AdDecision | null> {
  const { rows } = await query<DecisionRow>(
    `SELECT * FROM ad_decisions WHERE id = $1`,
    [id],
  );
  return rows.length ? rowToAdDecision(rows[0]) : null;
}

/** Update outcome of a decision. */
export async function updateOutcome(
  id: string,
  outcome: AdDecisionOutcome,
  comment?: string | null,
): Promise<void> {
  await query(
    `UPDATE ad_decisions
     SET outcome = $2, outcome_comment = $3, outcome_assessed_at = NOW()
     WHERE id = $1`,
    [id, outcome, comment ?? null],
  );
}

/** Lightweight annotations for chart overlays. */
export async function getAnnotations(
  from: string,
  to: string,
  channelId?: string,
): Promise<AdDecisionAnnotation[]> {
  const conditions = [`created_at >= $1`, `created_at <= $2`];
  const params: unknown[] = [from, to];

  if (channelId) {
    conditions.push(`channel_id = $3`);
    params.push(channelId);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const { rows } = await query<DecisionRow>(
    `SELECT id, created_at, decision_type, channel_id, campaign_name, hypothesis, outcome
     FROM ad_decisions ${where}
     ORDER BY created_at`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    createdAt: toIso(r.created_at)!,
    decisionType: r.decision_type as AdDecisionType,
    channelId: r.channel_id,
    campaignName: r.campaign_name,
    hypothesis: r.hypothesis,
    outcome: (r.outcome ?? 'pending') as AdDecisionOutcome,
  }));
}
