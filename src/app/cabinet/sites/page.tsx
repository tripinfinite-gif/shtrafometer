'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Site {
  id: string;
  domain: string;
  lastCheckAt: string | null;
  lastViolations: number;
  lastMaxFine: number;
  monitoringEnabled: boolean;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/cabinet/sites')
      .then(r => r.json())
      .then(data => { setSites(data.sites || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleAddSite() {
    if (!newUrl.trim()) return;
    setError('');
    setAdding(true);

    try {
      const res = await fetch('/api/cabinet/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка');
        return;
      }

      // Refresh sites
      const sitesRes = await fetch('/api/cabinet/sites');
      const sitesData = await sitesRes.json();
      setSites(sitesData.sites || []);
      setNewUrl('');
      setShowAddForm(false);
    } catch {
      setError('Ошибка сети');
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Мои сайты</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 rounded-lg bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5B4BD5] transition-colors"
        >
          + Добавить сайт
        </button>
      </div>

      {/* Add site form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex gap-3">
            <input
              type="url"
              value={newUrl}
              onChange={e => { setNewUrl(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSite(); }}
              placeholder="example.ru"
              className="flex-1 h-11 px-4 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleAddSite}
              disabled={adding || !newUrl.trim()}
              className="px-5 h-11 rounded-lg bg-[#6C5CE7] text-white text-sm font-medium
                         hover:bg-[#5B4BD5] disabled:opacity-50 transition-colors"
            >
              {adding ? 'Проверяем...' : 'Проверить'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewUrl(''); setError(''); }}
              className="px-3 h-11 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          {adding && <p className="text-sm text-gray-400 mt-2">Проверка может занять до 30 секунд...</p>}
        </div>
      )}

      {/* Sites list */}
      {sites.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
          </div>
          <p className="text-gray-500 mb-2">У вас пока нет сайтов</p>
          <p className="text-sm text-gray-400">Добавьте сайт для проверки на соответствие законам</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map(site => (
            <Link
              key={site.id}
              href={`/cabinet/sites/${encodeURIComponent(site.domain)}`}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-[#6C5CE7]/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <StatusLight violations={site.lastViolations} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{site.domain}</p>
                  <p className="text-xs text-gray-400">
                    {site.lastCheckAt
                      ? `Проверен ${new Date(site.lastCheckAt).toLocaleDateString('ru-RU')}`
                      : 'Проверка не проводилась'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {site.lastCheckAt && (
                  <>
                    <p className="text-sm font-medium text-gray-900">{site.lastViolations} нарушений</p>
                    <p className="text-xs text-gray-400">до {site.lastMaxFine.toLocaleString('ru-RU')} &#8381;</p>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusLight({ violations }: { violations: number }) {
  const color = violations === 0 ? 'bg-green-500' : violations < 5 ? 'bg-yellow-500' : 'bg-red-500';
  return <div className={`w-3 h-3 rounded-full ${color} shrink-0`} />;
}
