/**
 * POST /api/admin/ai/chat — AI consultant chat (Phase 2A, extended Phase 3).
 *
 * Auth: admin JWT cookie, проверяется в src/proxy.ts для всего /api/admin/*.
 *
 * Body: { conversationId?: string; message: string }
 *
 * Response: streaming plain-text (NDJSON chunks).
 *   Каждая строка — JSON одного из типов:
 *     { type: 'meta',  conversationId, provider, model }
 *     { type: 'delta', text }
 *     { type: 'tool',  id, name, status: 'start'|'done'|'error', summary?, error? }   ← Phase 3
 *     { type: 'done',  usage: { input, output, cacheRead? }, finishReason }
 *     { type: 'error', message }
 *
 * Phase 3 tool-use:
 * Для провайдера `anthropic` (единственный tool-capable) мы подгружаем список
 * инструментов через `getAvailableTools(ADMIN_USER_ID)` — туда попадают только
 * те Yandex-провайдеры, для которых сохранён OAuth-токен. Каждый вызов
 * инструмента аудируется в `ai_audit_log`. Mutating-инструменты в этой фазе
 * отсутствуют, но HITL-gate предусмотрен на будущее (Phase 4).
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import {
  createConversation,
  getConversation,
  getMessages,
  addMessage,
  setConversationTitleIfEmpty,
  addAuditEntry,
  updateAuditEntry,
} from '@/lib/ai/storage';
import { routeQuery } from '@/lib/ai/router';
import { buildSystemPrompt, loadCorpus } from '@/lib/ai/kb-loader';
import { getAvailableTools, type NormalizedTool } from '@/lib/ai/tools';
import type {
  ChatMessage,
  AiProviderId,
  StreamChat,
  ToolUseRequest,
  ExecuteToolResult,
} from '@/lib/ai/types';
import type { AiModelId, AiMessage } from '@/lib/types';

// pg driver → Node.js runtime (НЕ edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_USER_ID = 'admin';
const HISTORY_LIMIT = 20;

// ─── Provider registry (lazy import, чтобы build не требовал ключей) ──

async function getProvider(id: AiProviderId): Promise<{
  chat: StreamChat;
  modelId: AiModelId;
}> {
  switch (id) {
    case 'openai': {
      const mod = await import('@/lib/ai/providers/openai');
      return { chat: mod.chat, modelId: 'openai-gpt-4o' };
    }
    case 'anthropic': {
      const mod = await import('@/lib/ai/providers/anthropic');
      return { chat: mod.chat, modelId: 'claude-sonnet-4.5' };
    }
    case 'yandexgpt': {
      const mod = await import('@/lib/ai/providers/yandexgpt');
      return { chat: mod.chat, modelId: 'yandexgpt-5-pro' };
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function aiMessagesToChat(history: AiMessage[]): ChatMessage[] {
  return history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
}

function ndjson(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

/**
 * Построить executeToolCall: ищет tool по имени, проверяет HITL-гейт,
 * пишет в audit log до и после, безопасно оборачивает ошибки.
 */
function makeExecuteToolCall(
  tools: NormalizedTool[],
  conversationId: string,
): (req: ToolUseRequest) => Promise<ExecuteToolResult> {
  const byName = new Map(tools.map((t) => [t.name, t]));

  return async (req) => {
    const tool = byName.get(req.name);
    if (!tool) {
      try {
        await addAuditEntry({
          userId: ADMIN_USER_ID,
          conversationId,
          action: 'tool_failed',
          toolName: req.name,
          toolArgs: req.input,
          toolResult: { error: 'Unknown tool' },
        });
      } catch {
        /* audit best-effort */
      }
      return { error: 'Unknown tool' };
    }

    // HITL gate для mutating-инструментов (Phase 4 framework).
    if (tool.mutating) {
      try {
        await addAuditEntry({
          userId: ADMIN_USER_ID,
          conversationId,
          action: 'tool_proposed',
          toolName: req.name,
          toolArgs: req.input,
          toolResult: null,
        });
      } catch {
        /* best-effort */
      }
      return {
        error:
          'HITL_REQUIRED: mutating tools не выполняются без approve. Phase 4.',
      };
    }

    // Audit: предзапись «tool_executed» (tool_result заполним после).
    let auditId: string | null = null;
    try {
      auditId = await addAuditEntry({
        userId: ADMIN_USER_ID,
        conversationId,
        action: 'tool_executed',
        toolName: req.name,
        toolArgs: req.input,
        toolResult: null,
      });
    } catch {
      /* best-effort */
    }

    try {
      const output = await tool.execute(req.input, { userId: ADMIN_USER_ID });
      if (auditId) {
        try {
          await updateAuditEntry(auditId, { toolResult: output });
        } catch {
          /* best-effort */
        }
      }
      return { output };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (auditId) {
        try {
          await updateAuditEntry(auditId, {
            action: 'tool_failed',
            toolResult: { error: message },
          });
        } catch {
          /* best-effort */
        }
      }
      return { error: message };
    }
  };
}

// ─── Route ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Defense-in-depth: proxy.ts уже проверяет /api/admin/*, но дублируем
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { conversationId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userMessage = (body.message ?? '').trim();
  if (!userMessage) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }

  try {
    await ensureSchema();
  } catch (e) {
    return NextResponse.json(
      { error: 'DB schema init failed', detail: (e as Error).message },
      { status: 500 },
    );
  }

  // 1. Conversation (create or resume)
  let conversationId = body.conversationId ?? '';
  if (!conversationId) {
    const conv = await createConversation(ADMIN_USER_ID, '');
    conversationId = conv.id;
  } else {
    const existing = await getConversation(conversationId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      );
    }
  }

  // 2. Persist user message
  await addMessage(conversationId, 'user', userMessage);
  // Автогенерация заголовка из первого сообщения (если ещё нет)
  await setConversationTitleIfEmpty(
    conversationId,
    userMessage.length > 60 ? userMessage.slice(0, 60) + '…' : userMessage,
  );

  // 3. Route → выбор провайдера
  const providerId = routeQuery(userMessage);

  // 4. Pull history for context (последние N сообщений)
  const history = await getMessages(conversationId, HISTORY_LIMIT);
  const chatHistory = aiMessagesToChat(history);

  // 5. System prompt: HITL-шапка + статический корпус знаний (Phase 2C).
  await loadCorpus();
  const system = buildSystemPrompt();

  // 6. Tools (только для Anthropic — единственный tool-capable провайдер).
  let tools: NormalizedTool[] | undefined;
  if (providerId === 'anthropic') {
    try {
      tools = await getAvailableTools(ADMIN_USER_ID);
    } catch {
      tools = [];
    }
  }
  const executeToolCall =
    tools && tools.length > 0
      ? makeExecuteToolCall(tools, conversationId)
      : undefined;

  // 7. Stream response
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = '';
      let usage = { input: 0, output: 0, cacheRead: 0 };
      let finishReason: string | undefined;
      let modelId: AiModelId = 'claude-sonnet-4.5';

      try {
        const provider = await getProvider(providerId);
        modelId = provider.modelId;

        controller.enqueue(
          ndjson({
            type: 'meta',
            conversationId,
            provider: providerId,
            model: modelId,
          }),
        );

        for await (const chunk of provider.chat({
          messages: chatHistory,
          system,
          tools,
          executeToolCall,
        })) {
          if (chunk.toolUse) {
            controller.enqueue(
              ndjson({
                type: 'tool',
                id: chunk.toolUse.id,
                name: chunk.toolUse.name,
                status: chunk.toolUse.status,
                ...(chunk.toolUse.summary
                  ? { summary: chunk.toolUse.summary }
                  : {}),
                ...(chunk.toolUse.error
                  ? { error: chunk.toolUse.error }
                  : {}),
              }),
            );
            continue;
          }
          if (chunk.delta) {
            fullText += chunk.delta;
            controller.enqueue(ndjson({ type: 'delta', text: chunk.delta }));
          }
          if (chunk.usage) {
            usage = {
              input: chunk.usage.input ?? 0,
              output: chunk.usage.output ?? 0,
              cacheRead: chunk.usage.cacheRead ?? 0,
            };
          }
          if (chunk.finishReason) {
            finishReason = chunk.finishReason;
          }
        }

        controller.enqueue(ndjson({ type: 'done', usage, finishReason }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(ndjson({ type: 'error', message: msg }));
      } finally {
        // 8. Persist assistant message (даже если стрим оборвался — сохраним что успели)
        if (fullText.trim().length > 0) {
          try {
            await addMessage(conversationId, 'assistant', fullText, {
              modelUsed: modelId,
              tokensInput: usage.input,
              tokensOutput: usage.output,
              cacheReadTokens: usage.cacheRead,
            });
          } catch (e) {
            controller.enqueue(
              ndjson({
                type: 'error',
                message: 'Persist failed: ' + (e as Error).message,
              }),
            );
          }
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
