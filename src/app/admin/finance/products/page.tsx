'use client';

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  { name: 'PDF-отчёт', price: 1990, sold: 28, revenue: 55720, margin: 92 },
  { name: 'Автофикс Базовый', price: 4990, sold: 8, revenue: 39920, margin: 75 },
  { name: 'Автофикс Стандарт', price: 9990, sold: 4, revenue: 39960, margin: 70 },
  { name: 'Автофикс Премиум', price: 14990, sold: 1, revenue: 14990, margin: 65 },
  { name: 'Мониторинг', price: 490, sold: 12, revenue: 5880, margin: 85, period: 'мес' },
  { name: 'Консалтинг', price: 29900, sold: 1, revenue: 29900, margin: 50 },
];

const COLORS = ['#6C5CE7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#fd79a8'];

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

// ─── Page ────────────────────────────────────────────────────────────

export default function FinanceProductsPage() {
  const totalRevenue = MOCK_PRODUCTS.reduce((a, p) => a + p.revenue, 0);

  // Find top product
  const top = [...MOCK_PRODUCTS].sort((a, b) => b.revenue - a.revenue)[0];
  const topShare = totalRevenue > 0 ? (top.revenue / totalRevenue * 100).toFixed(0) : '0';

  // For segmented bar
  const segments = MOCK_PRODUCTS.map((p, i) => ({
    ...p,
    share: totalRevenue > 0 ? (p.revenue / totalRevenue * 100) : 0,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">По продуктам</h1>
        <p className="text-gray-500 text-sm mt-1">Апрель 2026</p>
      </div>

      {/* Top product card */}
      <div className="rounded-xl border border-violet-200 shadow-sm bg-violet-50 p-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="rounded-lg bg-violet-100 p-3 shrink-0">
          <TrophyIcon className="w-7 h-7 text-violet-600" />
        </div>
        <div>
          <p className="text-sm text-violet-600 font-medium">Топ продукт</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">
            {top.name}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {topShare}% выручки &middot; {top.margin}% маржа &middot; {fmt(top.revenue)}
          </p>
        </div>
      </div>

      {/* Segmented bar (pie-chart replacement) */}
      <div className="rounded-xl border border-gray-200 shadow-sm p-5 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Доли выручки</h2>

        {/* Bar */}
        <div className="flex rounded-lg overflow-hidden h-8 mb-4">
          {segments.map((s) => (
            <div
              key={s.name}
              className="relative group transition-all"
              style={{ width: `${s.share}%`, backgroundColor: s.color, minWidth: s.share > 0 ? '2px' : '0' }}
              title={`${s.name}: ${s.share.toFixed(1)}%`}
            >
              {s.share > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold">
                  {s.share.toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {segments.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              {s.name} ({s.share.toFixed(1)}%)
            </span>
          ))}
        </div>
      </div>

      {/* Products table */}
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Выручка по продуктам</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Продукт</th>
                <th className="px-5 py-3 font-medium text-right">Цена</th>
                <th className="px-5 py-3 font-medium text-right">Продано</th>
                <th className="px-5 py-3 font-medium text-right">Выручка</th>
                <th className="px-5 py-3 font-medium text-right hidden sm:table-cell">Маржа</th>
                <th className="px-5 py-3 font-medium text-right hidden sm:table-cell">Доля</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PRODUCTS.map((p, i) => {
                const share = totalRevenue > 0 ? (p.revenue / totalRevenue * 100) : 0;
                return (
                  <tr key={p.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                        <span className="font-medium text-gray-900">{p.name}</span>
                        {'period' in p && (
                          <span className="text-xs text-gray-400">/ {(p as { period: string }).period}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">{fmt(p.price)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{p.sold}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(p.revenue)}</td>
                    <td className="px-5 py-3 text-right hidden sm:table-cell">
                      <MarginBadge margin={p.margin} />
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 hidden sm:table-cell">
                      {share.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-5 py-3 text-gray-900">Итого</td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3 text-right text-gray-700">
                  {MOCK_PRODUCTS.reduce((a, p) => a + p.sold, 0)}
                </td>
                <td className="px-5 py-3 text-right text-gray-900">{fmt(totalRevenue)}</td>
                <td className="px-5 py-3 hidden sm:table-cell" />
                <td className="px-5 py-3 text-right text-gray-500 hidden sm:table-cell">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function MarginBadge({ margin }: { margin: number }) {
  let colors = 'bg-emerald-100 text-emerald-700';
  if (margin < 60) colors = 'bg-amber-100 text-amber-700';
  if (margin < 40) colors = 'bg-red-100 text-red-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors}`}>
      {margin}%
    </span>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14M9 3v2a3 3 0 003 3m0 0a3 3 0 003-3V3m-3 5v4m-4 4h8m-8 0a2 2 0 01-2-2v-2h12v2a2 2 0 01-2 2m-8 0v3m8-3v3m-8 0h8" />
    </svg>
  );
}
