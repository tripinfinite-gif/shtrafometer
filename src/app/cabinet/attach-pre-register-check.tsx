'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StoredCheck {
  domain: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  ts: number;
}

const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY = 'shtraf_last_check';

/**
 * Runs once on the cabinet dashboard when the user has just arrived from a
 * pre-registration site check (URL carries ?site=…). Reads the stored
 * CheckResponse from localStorage, attaches it to the freshly created
 * site record, and refreshes the page so the dashboard shows real numbers.
 *
 * Falls back to triggering a fresh check via /api/cabinet/sites/:domain/check
 * if localStorage is empty or stale.
 */
export default function AttachPreRegisterCheck({ domain }: { domain: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running');
  const [message, setMessage] = useState('Подгружаем результаты проверки…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const cleanDomain = domain.replace(/^www\./, '').toLowerCase();

      // 1. Try to reuse the result the user already saw before registration
      let stored: StoredCheck | null = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredCheck;
          const storedDomain = parsed.domain?.replace(/^www\./, '').toLowerCase();
          const fresh = Date.now() - (parsed.ts || 0) < MAX_AGE_MS;
          if (storedDomain === cleanDomain && fresh && parsed.result) {
            stored = parsed;
          }
        }
      } catch {}

      try {
        if (stored) {
          // Attach the existing result — instant, no re-analysis
          const res = await fetch(
            `/api/cabinet/sites/${encodeURIComponent(cleanDomain)}/attach-result`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ result: stored.result }),
            },
          );
          if (!res.ok) throw new Error(`attach-result ${res.status}`);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
        } else {
          // No cached result — run a fresh server-side check
          setMessage('Запускаем проверку сайта…');
          const res = await fetch(
            `/api/cabinet/sites/${encodeURIComponent(cleanDomain)}/check`,
            { method: 'POST' },
          );
          if (!res.ok) throw new Error(`check ${res.status}`);
        }

        if (cancelled) return;
        setStatus('done');
        // Clean the ?site= param from URL and reload server data
        router.replace('/cabinet');
        router.refresh();
      } catch (err) {
        if (cancelled) return;
        console.error('[AttachPreRegisterCheck] failed:', err);
        setStatus('error');
        setMessage('Не удалось подгрузить результаты. Сайт добавлен — запустите проверку из карточки.');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [domain, router]);

  if (status === 'done') return null;

  return (
    <div
      className={`rounded-2xl border p-4 flex items-center gap-3 ${
        status === 'error'
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-[#6C5CE7]/5 border-[#6C5CE7]/20 text-gray-700'
      }`}
      role="status"
      aria-live="polite"
    >
      {status === 'running' && (
        <div className="w-5 h-5 border-2 border-[#6C5CE7]/30 border-t-[#6C5CE7] rounded-full animate-spin shrink-0" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        {status === 'running' && (
          <p className="text-xs text-gray-500 mt-0.5">Обычно это занимает 5–10 секунд.</p>
        )}
      </div>
    </div>
  );
}
