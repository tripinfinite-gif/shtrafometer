/**
 * AI provider shared contract (Phase 2A, extended Phase 3).
 *
 * Все три LLM-адаптера (OpenAI / Anthropic / YandexGPT) экспортируют
 * единый `chat: StreamChat` и работают с одними и теми же типами.
 *
 * Phase 3: Anthropic-провайдер поддерживает tool-use agentic loop через
 * опциональные `tools` + `executeToolCall`. Остальные провайдеры tools
 * пока игнорируют.
 */

import type { NormalizedTool } from './tools';

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_calls?: unknown;
  tool_result?: unknown;
}

export interface StreamUsage {
  input: number;
  output: number;
  /** Claude prompt caching: сколько токенов прочитано из кэша. */
  cacheRead?: number;
}

/** Событие вызова инструмента — для UI-индикатора. */
export interface ToolUseEvent {
  id: string;
  name: string;
  status: 'start' | 'done' | 'error';
  summary?: string;
  error?: string;
}

/**
 * Stream chunk. Два варианта:
 *   1) Обычный text-delta / финальный usage-chunk (delta может быть пустой).
 *   2) Tool-use событие (delta отсутствует).
 *
 * Поле `delta` остаётся optional — чтобы существующий код
 * (`if (chunk.delta) ...`) продолжал работать без изменений.
 */
export interface StreamChunk {
  delta?: string;
  finishReason?: string;
  usage?: StreamUsage;
  toolUse?: ToolUseEvent;
}

/** Результат выполнения tool_use блока, возвращаемый из executeToolCall. */
export type ExecuteToolResult = { output: unknown } | { error: string };

/** Параметры запроса tool_use блока (из provider в chat-route). */
export interface ToolUseRequest {
  id: string;
  name: string;
  input: unknown;
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  /** System prompt (большой корпус знаний — кэшируется у Anthropic). */
  system?: string;
  /** Tool definitions (Phase 3). Используется только Anthropic-провайдером. */
  tools?: NormalizedTool[];
  /**
   * Исполнитель tool_use-блока. Chat-route подставляет свою реализацию
   * с audit-логом и HITL-гейтом. Если провайдер решит вызвать инструмент,
   * а `executeToolCall` не передан — tool_use игнорируется.
   */
  executeToolCall?: (req: ToolUseRequest) => Promise<ExecuteToolResult>;
}

export type StreamChat = (opts: StreamChatOptions) => AsyncIterable<StreamChunk>;

/** Идентификаторы провайдеров для роутера и persistence слоя. */
export type AiProviderId = 'openai' | 'anthropic' | 'yandexgpt';
