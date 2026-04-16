/**
 * OpenAI provider — GPT-4o / GPT-4o-mini.
 *
 * Используется роутером для:
 *  - коротких FAQ-вопросов (≤40 символов)
 *  - простых вопросов «что такое / как / помоги настроить»
 *
 * Streaming через официальный SDK.
 */

import OpenAI from 'openai';
import { getLlmEnv } from '@/lib/env';
import type { ChatMessage, StreamChat, StreamChunk } from '../types';

/** Модель по умолчанию. GPT-4o-mini — дешёвая, быстрая, достаточная для FAQ. */
export const OPENAI_MODEL = 'gpt-4o-mini';
/** Snapshot для reasoning-задач (если понадобится переопределить). */
export const OPENAI_MODEL_FULL = 'gpt-4o';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const { OPENAI_API_KEY } = getLlmEnv();
    _client = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return _client;
}

function toOpenAiMessages(
  system: string | undefined,
  messages: ChatMessage[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (system && system.trim()) {
    out.push({ role: 'system', content: system });
  }
  for (const m of messages) {
    if (m.role === 'tool') {
      // Примитивная форма — без tool_call_id (фаза 3 дорастит).
      out.push({
        role: 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.tool_result),
      });
      continue;
    }
    out.push({
      role: m.role,
      content: m.content,
    } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
  }
  return out;
}

export const chat: StreamChat = async function* (opts): AsyncIterable<StreamChunk> {
  const client = getClient();
  const model = OPENAI_MODEL;

  const stream = await client.chat.completions.create({
    model,
    messages: toOpenAiMessages(opts.system, opts.messages),
    stream: true,
    stream_options: { include_usage: true },
  });

  let finishReason: string | undefined;
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    const choice = event.choices?.[0];
    if (choice) {
      const delta = choice.delta?.content ?? '';
      if (delta) {
        yield { delta };
      }
      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
    }
    if (event.usage) {
      inputTokens = event.usage.prompt_tokens ?? 0;
      outputTokens = event.usage.completion_tokens ?? 0;
    }
  }

  yield {
    delta: '',
    finishReason,
    usage: { input: inputTokens, output: outputTokens },
  };
};
