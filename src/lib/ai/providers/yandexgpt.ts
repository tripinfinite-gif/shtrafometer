/**
 * YandexGPT v5 Pro — кастомный адаптер к REST API.
 *
 * Endpoint:  POST https://llm.api.cloud.yandex.net/foundationModels/v1/completion
 * Streaming: через `x-data-logging-enabled: false` + NDJSON-ответ
 *            (Yandex отдаёт стриминг в формате "один JSON на строку").
 * Auth:      Api-Key <YANDEX_GPT_API_KEY>
 * ModelURI:  gpt://<folder_id>/yandexgpt/latest
 *
 * Docs: https://yandex.cloud/ru/docs/foundation-models/concepts/yandexgpt/
 */

import { getLlmEnv } from '@/lib/env';
import type { ChatMessage, StreamChat, StreamChunk } from '../types';

export const YANDEX_GPT_URL =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

/** Какую модель использовать. `latest` — всегда актуальная версия YandexGPT Pro. */
export const YANDEX_GPT_MODEL = 'yandexgpt/latest';

interface YandexGptResponse {
  result?: {
    alternatives?: Array<{
      message?: { role: string; text: string };
      status?: string;
    }>;
    usage?: {
      inputTextTokens?: string | number;
      completionTokens?: string | number;
      totalTokens?: string | number;
    };
    modelVersion?: string;
  };
}

function mapRole(role: ChatMessage['role']): string {
  switch (role) {
    case 'assistant':
      return 'assistant';
    case 'system':
      return 'system';
    case 'tool':
      return 'assistant'; // Yandex не различает tool — склеиваем
    default:
      return 'user';
  }
}

export const chat: StreamChat = async function* (opts): AsyncIterable<StreamChunk> {
  const { YANDEX_GPT_API_KEY, YANDEX_GPT_FOLDER_ID } = getLlmEnv();

  const modelUri = `gpt://${YANDEX_GPT_FOLDER_ID}/${YANDEX_GPT_MODEL}`;

  const yaMessages: Array<{ role: string; text: string }> = [];
  if (opts.system && opts.system.trim()) {
    yaMessages.push({ role: 'system', text: opts.system });
  }
  for (const m of opts.messages) {
    if (m.role === 'system') continue;
    yaMessages.push({ role: mapRole(m.role), text: m.content });
  }

  const body = {
    modelUri,
    completionOptions: {
      stream: true,
      temperature: 0.3,
      maxTokens: '2000',
    },
    messages: yaMessages,
  };

  const res = await fetch(YANDEX_GPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${YANDEX_GPT_API_KEY}`,
      'x-folder-id': YANDEX_GPT_FOLDER_ID,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(`[yandexgpt] HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastText = '';
  let lastUsage: YandexGptResponse['result'] extends infer R
    ? R extends { usage?: infer U } ? U : undefined
    : undefined = undefined;
  let lastStatus: string | undefined;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Yandex стрим — NDJSON: разделитель "\n", каждая строка самостоятельный JSON.
      let nl = buffer.indexOf('\n');
      while (nl !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf('\n');
        if (!line) continue;
        try {
          const parsed = JSON.parse(line) as YandexGptResponse;
          const alt = parsed.result?.alternatives?.[0];
          const text = alt?.message?.text ?? '';
          if (text && text.length > lastText.length) {
            const delta = text.slice(lastText.length);
            lastText = text;
            yield { delta };
          } else if (text && text !== lastText) {
            // Если пришёл полный текст а не инкремент — диффим грубо.
            lastText = text;
            yield { delta: text };
          }
          if (alt?.status) lastStatus = alt.status;
          if (parsed.result?.usage) lastUsage = parsed.result.usage;
        } catch {
          // игнорим неполный JSON — он склеится в следующей итерации
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const input =
    typeof lastUsage?.inputTextTokens === 'string'
      ? parseInt(lastUsage.inputTextTokens, 10)
      : (lastUsage?.inputTextTokens as number | undefined) ?? 0;
  const output =
    typeof lastUsage?.completionTokens === 'string'
      ? parseInt(lastUsage.completionTokens, 10)
      : (lastUsage?.completionTokens as number | undefined) ?? 0;

  yield {
    delta: '',
    finishReason: lastStatus ?? 'stop',
    usage: { input: Number.isFinite(input) ? input : 0, output: Number.isFinite(output) ? output : 0 },
  };
};
