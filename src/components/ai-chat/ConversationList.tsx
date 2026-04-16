'use client';

import { useEffect, useState } from 'react';
import type { Conversation } from './types';

interface Props {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  refreshKey?: number;
}

export default function ConversationList({ activeId, onSelect, onNew, refreshKey }: Props) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/ai/conversations');
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) setItems([]);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { conversations?: Conversation[] };
        if (!cancelled) setItems(data.conversations ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <aside className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Диалоги</h2>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors px-2 py-1 rounded-md hover:bg-primary-lighter cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Новый
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-[120px]">
        {loading && (
          <div className="text-xs text-gray-400 px-2 py-3">Загрузка…</div>
        )}
        {!loading && error && (
          <div className="text-xs text-gray-400 px-2 py-3">
            История появится после первого диалога
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="text-xs text-gray-400 px-2 py-3">
            История появится после первого диалога
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {items.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer truncate ${
                      active
                        ? 'bg-primary-lighter text-primary font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={c.title}
                  >
                    {c.title || 'Без названия'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
