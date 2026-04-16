/**
 * Anthropic provider — Claude Sonnet 4.5.
 *
 * Основной провайдер для tool-heavy запросов (Phase 3) и сложного reasoning.
 *
 * PROMPT CACHING: system prompt помечен `cache_control: { type: 'ephemeral' }`.
 * Это заставляет Anthropic кэшировать большой KB-корпус на 5 минут и
 * переиспользовать его между запросами. На 2-м запросе `cache_read_input_tokens > 0`.
 *
 * PHASE 3 — TOOL USE LOOP:
 * Если в опциях пришёл непустой `tools[]`, провайдер запускает agentic loop:
 *   1. messages.stream({ tools, ... }) — стримим text_delta наружу.
 *   2. Если stop_reason === 'tool_use' — для каждого tool_use блока зовём
 *      `executeToolCall(block)`, шлём tool-use события наружу, накапливаем
 *      результаты, формируем новое сообщение с role=user + tool_result блоками,
 *      идём в следующую итерацию.
 *   3. Останавливаемся на stop_reason === 'end_turn' либо на 5-й итерации.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getLlmEnv } from '@/lib/env';
import type {
  ChatMessage,
  StreamChat,
  StreamChunk,
  ToolUseRequest,
  ExecuteToolResult,
} from '../types';
import type { NormalizedTool } from '../tools';

/** Claude Sonnet 4.5 — актуальный snapshot 2025-09-29. */
export const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';
/** Алиас без даты (Anthropic принимает и это тоже). */
export const ANTHROPIC_MODEL_ALIAS = 'claude-sonnet-4-5';

/** Минимальный порог токенов для ephemeral cache (меньше — Anthropic не кэширует). */
const CACHE_MIN_CHARS = 4000;

/** Защита от зацикливания tool-loop. */
const MAX_TOOL_ITERATIONS = 5;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const { ANTHROPIC_API_KEY } = getLlmEnv();
    _client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return _client;
}

function toAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue; // system идёт отдельным полем
    if (m.role === 'tool') {
      // Упрощённая форма: сохранённый tool-result из прошлых сессий —
      // просто вставим как user-сообщение (полноценный round-trip строится
      // внутри одной итерации ниже).
      out.push({ role: 'user', content: `[tool result] ${m.content}` });
      continue;
    }
    out.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    });
  }
  return out;
}

function buildSystem(system?: string): string | Anthropic.TextBlockParam[] | undefined {
  if (!system || !system.trim()) return undefined;
  if (system.length >= CACHE_MIN_CHARS) {
    return [
      {
        type: 'text',
        text: system,
        cache_control: { type: 'ephemeral' },
      },
    ];
  }
  return system;
}

function toolsToAnthropic(tools: NormalizedTool[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));
}

/** Короткое резюме результата инструмента для UI-индикатора. */
function summarizeToolResult(result: ExecuteToolResult): string {
  if ('error' in result) return `error: ${result.error}`;
  const out = result.output;
  if (out == null) return 'ok';
  if (typeof out === 'object') {
    const o = out as Record<string, unknown>;
    if (typeof o.count === 'number') return `${o.count} rows`;
    const keys = Object.keys(o).slice(0, 3).join(', ');
    return keys ? `{${keys}}` : 'ok';
  }
  return String(out).slice(0, 60);
}

/** Содержимое tool_result-блока — Anthropic ожидает string либо content-array. */
function toolResultContent(result: ExecuteToolResult): string {
  if ('error' in result) {
    return JSON.stringify({ error: result.error });
  }
  try {
    return JSON.stringify(result.output);
  } catch {
    return String(result.output);
  }
}

export const chat: StreamChat = async function* (opts): AsyncIterable<StreamChunk> {
  const client = getClient();
  const systemParam = buildSystem(opts.system);

  const messagesAcc: Anthropic.MessageParam[] = toAnthropicMessages(opts.messages);
  const hasTools = !!(opts.tools && opts.tools.length > 0);
  const anthropicTools = hasTools ? toolsToAnthropic(opts.tools!) : undefined;

  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let lastStopReason: string | undefined;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemParam,
      messages: messagesAcc,
      ...(anthropicTools ? { tools: anthropicTools } : {}),
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const delta = event.delta.text;
        if (delta) yield { delta };
      } else if (event.type === 'message_delta') {
        if (event.delta.stop_reason) {
          lastStopReason = event.delta.stop_reason;
        }
      }
    }

    const finalMsg = await stream.finalMessage();
    const usage = finalMsg.usage;
    totalInput += usage.input_tokens ?? 0;
    totalOutput += usage.output_tokens ?? 0;
    totalCacheRead += usage.cache_read_input_tokens ?? 0;
    lastStopReason = finalMsg.stop_reason ?? lastStopReason;

    // Если tools не подключены или ассистент не запросил инструмент — выходим.
    if (!hasTools || finalMsg.stop_reason !== 'tool_use') {
      break;
    }

    // Собираем tool_use-блоки.
    const toolUseBlocks = finalMsg.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    if (toolUseBlocks.length === 0) break;

    // Ассистентское сообщение (весь content как есть) — важно сохранить все блоки.
    messagesAcc.push({
      role: 'assistant',
      content: finalMsg.content,
    });

    // Выполняем инструменты и собираем tool_result-блоки в одном user-сообщении.
    const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      const req: ToolUseRequest = {
        id: block.id,
        name: block.name,
        input: block.input,
      };

      // Событие start в UI.
      yield {
        toolUse: { id: block.id, name: block.name, status: 'start' },
      };

      let result: ExecuteToolResult;
      if (!opts.executeToolCall) {
        result = { error: 'executeToolCall not provided' };
      } else {
        try {
          result = await opts.executeToolCall(req);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
      }

      const errorMsg = 'error' in result ? result.error : undefined;
      yield {
        toolUse: {
          id: block.id,
          name: block.name,
          status: errorMsg ? 'error' : 'done',
          summary: summarizeToolResult(result),
          ...(errorMsg ? { error: errorMsg } : {}),
        },
      };

      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: toolResultContent(result),
        ...(errorMsg ? { is_error: true } : {}),
      });
    }

    messagesAcc.push({
      role: 'user',
      content: toolResultBlocks,
    });

    // Следующая итерация: Claude увидит результаты и либо ответит текстом
    // (stop_reason=end_turn), либо запросит ещё инструменты.
  }

  yield {
    delta: '',
    finishReason: lastStopReason,
    usage: {
      input: totalInput,
      output: totalOutput,
      cacheRead: totalCacheRead,
    },
  };
};
