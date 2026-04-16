/**
 * Simple in-memory TTL cache for Yandex.Direct metadata calls.
 *
 * Назначение (R7 — лимиты API по баллам):
 *   - Метаданные кампаний/групп/ключей — кэш 5 мин
 *   - Статистика (отчёты) — кэш 60 сек или без кэша
 *
 * Скоуп — per-process (dev/prod Next.js instance). Этого достаточно
 * для админ-консультанта с одним пользователем.
 */

export type TtlCache = {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
  clear(): void;
};

interface Entry {
  value: unknown;
  expiresAt: number;
}

function createCache(): TtlCache {
  const store = new Map<string, Entry>();

  return {
    get<T>(key: string): T | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (hit.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return hit.value as T;
    },
    set<T>(key: string, value: T, ttlMs: number): void {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    delete(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
  };
}

/** Shared cache across all clients in this process. */
export const directCache: TtlCache = createCache();

export const TTL = {
  /** Метаданные (кампании, группы, объявления, ключи) — 5 мин. */
  METADATA_MS: 5 * 60 * 1000,
  /** Статистика — 1 мин (реальные цифры консультанту важнее, чем экономия баллов). */
  STATISTICS_MS: 60 * 1000,
} as const;
