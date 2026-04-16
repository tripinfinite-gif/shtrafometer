/**
 * AI router — классификатор «какому провайдеру отдать запрос».
 *
 * Правила (по приоритету):
 *  1. AI_ROUTER_MODE=openai-only|claude-only|yandexgpt-only — форс.
 *  2. Маркеры tool-use (цифры кампаний, «покажи статистику», «вчера» и т.д.) → Claude.
 *  3. Короткие FAQ (≤40 символов / «что такое», «как», «помоги настроить») → OpenAI.
 *  4. Default → Claude Sonnet 4.5.
 */

import { getOptionalEnv } from '@/lib/env';
import type { AiProviderId } from './types';

/** Слова/паттерны, требующие доступа к реальным данным кабинетов. */
const TOOL_USE_MARKERS: RegExp[] = [
  /\bпокажи\b/i,
  /\bсколько\b/i,
  /\bстатистик/i,
  /\bвчера\b/i,
  /\bсегодня\b/i,
  /\bза\s+(неделю|месяц|день|вчера|сегодня)/i,
  /\bбюджет/i,
  /\bкликов?\b/i,
  /\bпоказ(ов|ы)?\b/i,
  /\bконверси/i,
  /\bкампани/i,
  /\bобъявлен/i,
  /\bгрупп(а|ы|у)?\s+объявлений/i,
  /\bCPA|CPC|CTR|ROI|ROMI\b/i,
  /\bметрик/i,
  /\bвебмастер/i,
  /\b\d{7,}\b/, // id кампаний (7+ цифр)
];

/** FAQ-стартеры: дешёвые запросы для GPT-4o-mini. */
const FAQ_STARTERS: RegExp[] = [
  /^\s*что\s+такое\b/i,
  /^\s*как\b/i,
  /^\s*зачем\b/i,
  /^\s*почему\b/i,
  /^\s*помоги\s+(настроить|понять|разобраться)/i,
  /^\s*объясни\b/i,
  /^\s*расскажи\b/i,
];

const SHORT_QUESTION_LIMIT = 40;

export function routeQuery(userMessage: string): AiProviderId {
  const { AI_ROUTER_MODE } = getOptionalEnv();

  // 1. Force mode
  if (AI_ROUTER_MODE === 'openai-only') return 'openai';
  if (AI_ROUTER_MODE === 'claude-only') return 'anthropic';
  if (AI_ROUTER_MODE === 'yandexgpt-only') return 'yandexgpt';

  const msg = (userMessage ?? '').trim();

  // 2. Tool-use markers → Claude (лучший tool use в индустрии)
  for (const rx of TOOL_USE_MARKERS) {
    if (rx.test(msg)) return 'anthropic';
  }

  // 3. Короткий FAQ → OpenAI mini
  if (msg.length <= SHORT_QUESTION_LIMIT) return 'openai';
  for (const rx of FAQ_STARTERS) {
    if (rx.test(msg)) return 'openai';
  }

  // 4. Default → Claude
  return 'anthropic';
}
