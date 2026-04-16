'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Provider = 'yandex-direct' | 'yandex-metrika' | 'yandex-webmaster';

type Props =
  | { action: 'disconnect'; provider: Provider }
  | { action: 'disconnect-all' };

export default function ConnectionsClient(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const label = props.action === 'disconnect-all' ? 'Отключить всё' : 'Отключить';

  async function handleClick() {
    if (busy) return;
    const confirmMsg =
      props.action === 'disconnect-all'
        ? 'Отключить все 3 подключения к Яндексу? Токены будут удалены из базы.'
        : 'Отключить подключение? Токен будет удалён из базы.';
    if (!confirm(confirmMsg)) return;

    setBusy(true);
    setErr(null);
    try {
      const body =
        props.action === 'disconnect-all'
          ? { provider: 'all' }
          : { provider: props.provider };
      const res = await fetch('/api/admin/ai/oauth/yandex/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {busy ? 'Отключаем…' : label}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
