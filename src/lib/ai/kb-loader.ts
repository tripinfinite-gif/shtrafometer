/**
 * Knowledge-base loader (Phase 2C).
 *
 * Читает статический корпус знаний `src/data/kb/direct-core.md` (Яндекс.Директ
 * 2025-2026, Метрика, SEO/AEO РФ, контекст Штрафометра) один раз и кэширует
 * в памяти процесса. На Фазе 4 будет дополнен RAG-слоем по `sources.json`.
 *
 * Работает в Node.js-рантайме Next.js API-роутов (не в Edge Runtime).
 */

import { readFileSync } from 'fs';
import path from 'path';

let _cached: string | null = null;

const CORPUS_REL_PATH = 'src/data/kb/direct-core.md';

const SYSTEM_HEADER = `Ты — AI-консультант в админпанели Штрафометра (shtrafometer.ru), SaaS проверки сайтов на соответствие законам РФ.

Твоя роль: помогать владельцу проекта с Яндекс.Директом, SEO, AEO. Ты имеешь доступ к реальным данным кабинетов через инструменты (будут добавлены на Фазе 3).

Правила:
- Любое изменяющее действие (создание кампании, правка ставки, остановка объявления) — только через предложение diff-а с обязательным подтверждением оператора. НЕ выполняй мутации молча.
- При генерации рекламных текстов — напоминай про ЕРИД-маркировку (38-ФЗ).
- При AI-генерации креативов — предупреждай о необходимости пометки «подготовлено с ИИ».
- Никогда не раскрывай OAuth-токены, client_secret, пароли.
- Если данные старше 5 минут — предлагай обновить через инструмент, не выдумывай цифры.
- Пиши по-русски, коротко и по делу.

--- ЖУРНАЛ РЕШЕНИЙ ---
Ты ведёшь журнал рекламных решений. Когда пользователь сообщает об изменении (ставка, бюджет, стратегия, кампания) — предложи записать в журнал через record_decision.
Спроси гипотезу: «Что ожидаете от этого изменения?»
При анализе метрик — проверяй журнал через get_decision_history, чтобы объяснить аномалии.
Пример: «3 дня назад вы увеличили бюджет на РСЯ — это объясняет рост расходов на 25%.»

--- БАЗА ЗНАНИЙ ---

`;

/**
 * Асинхронно возвращает «сырой» текст корпуса (без system-шапки).
 * Повторные вызовы берут значение из кэша.
 */
export async function loadCorpus(): Promise<string> {
  if (_cached !== null) return _cached;
  const filePath = path.join(process.cwd(), CORPUS_REL_PATH);
  _cached = readFileSync(filePath, 'utf-8');
  return _cached;
}

/**
 * Синхронная версия `loadCorpus()` — для мест, где нужен корпус
 * немедленно (например, внутри `buildSystemPrompt`).
 */
export function loadCorpusSync(): string {
  if (_cached !== null) return _cached;
  const filePath = path.join(process.cwd(), CORPUS_REL_PATH);
  _cached = readFileSync(filePath, 'utf-8');
  return _cached;
}

/**
 * Очищает кэш корпуса. Полезно в dev-режиме при правке markdown,
 * а также в unit-тестах.
 */
export function resetCorpusCache(): void {
  _cached = null;
}

/**
 * Статистика по текущему корпусу:
 * - `chars`: длина в символах
 * - `approxTokens`: грубая оценка числа токенов (~3.5 символа/токен для RU).
 * Если корпус ещё не загружен — возвращает нули (не читает с диска).
 */
export function getCorpusStats(): { chars: number; approxTokens: number } {
  const corpus = _cached ?? '';
  return {
    chars: corpus.length,
    approxTokens: Math.ceil(corpus.length / 3.5),
  };
}

/**
 * Собирает полный system-prompt: шапка с ролью/правилами HITL + корпус.
 * Подходит для передачи в Anthropic / Yandex GPT / OpenAI как `system`.
 */
export function buildSystemPrompt(): string {
  const corpus = loadCorpusSync();
  return SYSTEM_HEADER + corpus;
}
