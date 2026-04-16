/**
 * AI persistence — conversations & messages (Phase 2A).
 *
 * Тонкие обёртки над `query()` из src/lib/db.ts.
 * Все таблицы уже созданы в `ensureSchema()` (Фаза 1A).
 */

import { query } from '@/lib/db';
import type {
  AiConversation,
  AiMessage,
  AiMessageRole,
  AiModelId,
} from '@/lib/types';

// ─── Row shapes (snake_case из Postgres) ─────────────────────────────

type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: Date | string;
  updated_at: Date | string;
  archived: boolean;
  [k: string]: unknown;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tool_calls: unknown | null;
  tool_result: unknown | null;
  model_used: string | null;
  tokens_input: number;
  tokens_output: number;
  cache_read_tokens: number;
  created_at: Date | string;
  [k: string]: unknown;
};

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

function rowToConversation(r: ConversationRow): AiConversation {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
    archived: r.archived,
  };
}

function rowToMessage(r: MessageRow): AiMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role as AiMessageRole,
    content: r.content,
    toolCalls: r.tool_calls,
    toolResult: r.tool_result,
    modelUsed: (r.model_used as AiModelId | null) ?? null,
    tokensInput: r.tokens_input,
    tokensOutput: r.tokens_output,
    cacheReadTokens: r.cache_read_tokens,
    createdAt: toIso(r.created_at),
  };
}

// ─── Conversations ───────────────────────────────────────────────────

export async function createConversation(
  userId: string,
  title = '',
): Promise<AiConversation> {
  const { rows } = await query<ConversationRow>(
    `INSERT INTO ai_conversations (user_id, title)
     VALUES ($1, $2)
     RETURNING id, user_id, title, created_at, updated_at, archived`,
    [userId, title],
  );
  return rowToConversation(rows[0]);
}

export async function getConversation(
  conversationId: string,
): Promise<AiConversation | null> {
  const { rows } = await query<ConversationRow>(
    `SELECT id, user_id, title, created_at, updated_at, archived
     FROM ai_conversations
     WHERE id = $1`,
    [conversationId],
  );
  return rows[0] ? rowToConversation(rows[0]) : null;
}

export async function listConversations(
  userId: string,
): Promise<AiConversation[]> {
  const { rows } = await query<ConversationRow>(
    `SELECT id, user_id, title, created_at, updated_at, archived
     FROM ai_conversations
     WHERE user_id = $1 AND archived = FALSE
     ORDER BY updated_at DESC
     LIMIT 100`,
    [userId],
  );
  return rows.map(rowToConversation);
}

export async function touchConversation(conversationId: string): Promise<void> {
  await query(
    `UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1`,
    [conversationId],
  );
}

export async function setConversationTitleIfEmpty(
  conversationId: string,
  title: string,
): Promise<void> {
  await query(
    `UPDATE ai_conversations
     SET title = $2
     WHERE id = $1 AND (title IS NULL OR title = '')`,
    [conversationId, title.slice(0, 200)],
  );
}

// ─── Messages ────────────────────────────────────────────────────────

export interface AddMessageMeta {
  toolCalls?: unknown;
  toolResult?: unknown;
  modelUsed?: AiModelId;
  tokensInput?: number;
  tokensOutput?: number;
  cacheReadTokens?: number;
}

export async function addMessage(
  conversationId: string,
  role: AiMessageRole,
  content: string,
  meta: AddMessageMeta = {},
): Promise<AiMessage> {
  const { rows } = await query<MessageRow>(
    `INSERT INTO ai_messages
       (conversation_id, role, content, tool_calls, tool_result,
        model_used, tokens_input, tokens_output, cache_read_tokens)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, conversation_id, role, content, tool_calls, tool_result,
               model_used, tokens_input, tokens_output, cache_read_tokens, created_at`,
    [
      conversationId,
      role,
      content,
      meta.toolCalls ? JSON.stringify(meta.toolCalls) : null,
      meta.toolResult ? JSON.stringify(meta.toolResult) : null,
      meta.modelUsed ?? null,
      meta.tokensInput ?? 0,
      meta.tokensOutput ?? 0,
      meta.cacheReadTokens ?? 0,
    ],
  );
  await touchConversation(conversationId);
  return rowToMessage(rows[0]);
}

// ─── Audit log (Phase 3 — HITL tool calls) ───────────────────────────

export type AuditAction =
  | 'tool_proposed'
  | 'tool_approved'
  | 'tool_denied'
  | 'tool_executed'
  | 'tool_failed';

export interface AuditEntryInput {
  userId: string;
  conversationId: string;
  action: AuditAction;
  toolName: string;
  toolArgs: unknown;
  toolResult: unknown;
}

/**
 * Записать entry в `ai_audit_log`. Возвращает id записи.
 * Best-effort: при ошибке логирования мы не ломаем tool-исполнение,
 * вызывающий код сам решает обрабатывать ли exception.
 */
export async function addAuditEntry(entry: AuditEntryInput): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO ai_audit_log
       (user_id, conversation_id, action, tool_name, tool_args, tool_result)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      entry.userId,
      entry.conversationId,
      entry.action,
      entry.toolName,
      entry.toolArgs == null ? null : JSON.stringify(entry.toolArgs),
      entry.toolResult == null ? null : JSON.stringify(entry.toolResult),
    ],
  );
  return rows[0].id;
}

/**
 * Обновить tool_result / action у уже существующей audit-записи
 * (используется после завершения вызова инструмента).
 */
export async function updateAuditEntry(
  id: string,
  patch: { action?: AuditAction; toolResult?: unknown },
): Promise<void> {
  await query(
    `UPDATE ai_audit_log
        SET action     = COALESCE($2, action),
            tool_result = COALESCE($3::jsonb, tool_result)
      WHERE id = $1`,
    [
      id,
      patch.action ?? null,
      patch.toolResult === undefined ? null : JSON.stringify(patch.toolResult),
    ],
  );
}

export async function getMessages(
  conversationId: string,
  limit = 20,
): Promise<AiMessage[]> {
  // Берём последние N, потом разворачиваем в хронологический порядок
  const { rows } = await query<MessageRow>(
    `SELECT id, conversation_id, role, content, tool_calls, tool_result,
            model_used, tokens_input, tokens_output, cache_read_tokens, created_at
     FROM (
       SELECT * FROM ai_messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) sub
     ORDER BY created_at ASC`,
    [conversationId, limit],
  );
  return rows.map(rowToMessage);
}
