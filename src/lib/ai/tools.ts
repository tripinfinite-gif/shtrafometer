/**
 * Normalized tool registry (Phase 3 integration).
 *
 * Агрегирует 3 группы Яндекс-тулов (Direct / Metrika / Webmaster) в единый
 * массив `NormalizedTool[]` с JSON Schema input и простым `execute(input, ctx)`.
 *
 * Клиенты каждой группы создаются один раз за запрос (в getAvailableTools),
 * чтобы не пересоздавать их в каждом execute.
 *
 * Если OAuth-токен провайдера отсутствует — группа tools не регистрируется
 * (Claude в prompt не увидит этих инструментов).
 */

import { z } from 'zod';
import { getToken } from '@/lib/yandex/token-vault';
import { createDirectClient } from '@/lib/yandex/direct';
import { createMetrikaClient } from '@/lib/yandex/metrika';
import { createWebmasterClient } from '@/lib/yandex/webmaster';
import { directTools } from '@/lib/yandex/direct.tools';
import { metrikaTools } from '@/lib/yandex/metrika.tools';
import { webmasterTools } from '@/lib/yandex/webmaster.tools';

// ─── Types ────────────────────────────────────────────────────────

export interface NormalizedTool {
  name: string;
  description: string;
  /** JSON Schema для Anthropic tools API. */
  input_schema: Record<string, unknown>;
  /** `true` — инструмент изменяющий, нужен HITL-апрув. На Phase 3 все false. */
  mutating: boolean;
  execute: (input: unknown, ctx: { userId: string }) => Promise<unknown>;
}

// ─── Zod → JSON Schema ────────────────────────────────────────────

/**
 * Конвертер Zod → JSON Schema. В Zod v4 есть `z.toJSONSchema`.
 * Если по какой-то причине он недоступен — минимальный fallback, покрывающий
 * только те конструкции, что используют текущие webmaster-tools
 * (object + z.string / z.number / z.enum + .optional / .default).
 */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Zod v4 API
  const converter = (z as unknown as { toJSONSchema?: (s: z.ZodType) => Record<string, unknown> })
    .toJSONSchema;
  if (typeof converter === 'function') {
    try {
      const json = converter(schema);
      // Anthropic tools API не любит top-level $schema
      const { $schema: _ignored, ...rest } = json as Record<string, unknown>;
      void _ignored;
      return rest;
    } catch {
      /* fallthrough to minimal */
    }
  }
  // Minimal fallback
  return { type: 'object', properties: {}, additionalProperties: true };
}

// ─── Build normalized tools ───────────────────────────────────────

const ADMIN_USER_ID_DEFAULT = 'admin';

/**
 * Соберёт список инструментов, доступных данному пользователю.
 * Для каждого Yandex-провайдера, если есть сохранённый OAuth-токен,
 * создаст клиент и завернёт tools этой группы в NormalizedTool.
 */
export async function getAvailableTools(
  userId: string = ADMIN_USER_ID_DEFAULT,
): Promise<NormalizedTool[]> {
  const out: NormalizedTool[] = [];

  // ── Decision Log tools — всегда доступны (внутренняя БД) ────────
  const { decisionTools } = await import('@/lib/ads/decisions.tools');
  for (const tool of decisionTools) {
    out.push({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
      mutating: tool.mutating ?? false,
      execute: async (input) => tool.execute(input, { userId }),
    });
  }

  // ── Direct ──────────────────────────────────────────────────────
  const directToken = await getToken(userId, 'yandex-direct');
  if (directToken) {
    const client = createDirectClient(directToken.accessToken, {
      clientLogin: directToken.clientLogin ?? undefined,
    });
    for (const t of directTools) {
      out.push({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
        mutating: t.mutating ?? false,
        execute: (input) => t.execute(input, { client }),
      });
    }
  }

  // ── Metrika ─────────────────────────────────────────────────────
  const metrikaToken = await getToken(userId, 'yandex-metrika');
  if (metrikaToken) {
    const client = createMetrikaClient(metrikaToken.accessToken);
    for (const t of metrikaTools) {
      out.push({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
        mutating: t.mutating ?? false,
        execute: (input) => t.execute(input, { client }),
      });
    }
  }

  // ── Webmaster (Zod inputSchema → JSON Schema) ───────────────────
  const webmasterToken = await getToken(userId, 'yandex-webmaster');
  if (webmasterToken) {
    const accessToken = webmasterToken.accessToken;
    for (const t of webmasterTools) {
      out.push({
        name: t.name,
        description: t.description,
        input_schema: zodToJsonSchema(t.inputSchema),
        mutating: false,
        execute: (input) => t.execute(input as never, { accessToken }),
      });
    }
  }

  return out;
}
