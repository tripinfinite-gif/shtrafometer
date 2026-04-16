'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Mock Data ───────────────────────────────────────────────────────

type Campaign = {
  id: string;
  name: string;
  status: 'active' | 'paused';
  spend: number;
  clicks: number;
  conversions: number;
  cpa: number;
};

type ChannelStats = {
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roi: number;
};

type Channel = {
  id: string;
  name: string;
  connected: boolean;
  icon: string;
  stats: ChannelStats | null;
  campaigns: Campaign[];
};

const MOCK_CHANNELS: Channel[] = [
  {
    id: 'yandex-direct',
    name: 'Яндекс.Директ',
    connected: true,
    icon: '🟡',
    stats: {
      spend: 85000,
      clicks: 1420,
      impressions: 28400,
      ctr: 5.0,
      conversions: 42,
      cpa: 2024,
      roi: 394,
    },
    campaigns: [
      { id: '709014339', name: 'Поиск — проверка сайта', status: 'active', spend: 45000, clicks: 890, conversions: 28, cpa: 1607 },
      { id: '709014340', name: 'РСЯ — комплаенс', status: 'active', spend: 25000, clicks: 380, conversions: 10, cpa: 2500 },
      { id: '709014341', name: 'Поиск — штрафы', status: 'paused', spend: 15000, clicks: 150, conversions: 4, cpa: 3750 },
    ],
  },
  { id: 'vk-ads', name: 'VK Ads', connected: false, icon: '🔵', stats: null, campaigns: [] },
  { id: 'telegram-ads', name: 'Telegram Ads', connected: false, icon: '✈️', stats: null, campaigns: [] },
  { id: 'google-ads', name: 'Google Ads', connected: false, icon: '🔴', stats: null, campaigns: [] },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

function rub(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

// ─── Component ──────────────────────────────────────────────────────

export default function AdsClient() {
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  // Aggregate stats from connected channels
  const connected = MOCK_CHANNELS.filter((c) => c.connected && c.stats);
  const totalSpend = connected.reduce((s, c) => s + (c.stats?.spend ?? 0), 0);
  const totalClicks = connected.reduce((s, c) => s + (c.stats?.clicks ?? 0), 0);
  const totalConversions = connected.reduce((s, c) => s + (c.stats?.conversions ?? 0), 0);
  const avgCpa = totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0;
  const avgRoi = connected.length > 0
    ? Math.round(connected.reduce((s, c) => s + (c.stats?.roi ?? 0), 0) / connected.length)
    : 0;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Дашборд каналов</h1>
          <p className="text-gray-500 text-sm mt-1">Рекламные каналы и кампании</p>
        </div>
        <Link
          href="/admin/ai-consultant"
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 1.5" />
          </svg>
          Перейти в AI-консультант
        </Link>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-900">{rub(totalSpend)}</p>
          <p className="text-gray-400 text-xs mt-1">Расходы</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-900">{fmt(totalClicks)}</p>
          <p className="text-gray-400 text-xs mt-1">Клики</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-900">{fmt(totalConversions)}</p>
          <p className="text-gray-400 text-xs mt-1">Конверсии</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-900">{rub(avgCpa)}</p>
          <p className="text-gray-400 text-xs mt-1">Средний CPA</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-semibold text-green-600">{avgRoi}%</p>
          <p className="text-gray-400 text-xs mt-1">ROI</p>
        </div>
      </div>

      {/* ── Channels Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Каналы</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Канал</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium text-right">Расходы</th>
                <th className="px-4 py-3 font-medium text-right">Клики</th>
                <th className="px-4 py-3 font-medium text-right">CTR%</th>
                <th className="px-4 py-3 font-medium text-right">Конверсии</th>
                <th className="px-4 py-3 font-medium text-right">CPA</th>
                <th className="px-4 py-3 font-medium text-right">ROI%</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CHANNELS.map((ch) => {
                const isExpanded = expandedChannel === ch.id;
                const isConnected = ch.connected && ch.stats;

                return (
                  <tr key={ch.id}>
                    <td colSpan={8} className="p-0">
                      {isConnected ? (
                        <button
                          type="button"
                          onClick={() => setExpandedChannel(isExpanded ? null : ch.id)}
                          className="w-full text-left hover:bg-violet-50/50 cursor-pointer transition-colors"
                        >
                          <div className="grid grid-cols-8 items-center">
                            <span className="px-4 py-3 flex items-center gap-2">
                              <span>{ch.icon}</span>
                              <span className="text-gray-800 font-medium">{ch.name}</span>
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              >
                                <path d="M3 4.5 L6 7.5 L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                            <span className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Подключён
                              </span>
                            </span>
                            <span className="px-4 py-3 text-right text-gray-800">{rub(ch.stats!.spend)}</span>
                            <span className="px-4 py-3 text-right text-gray-800">{fmt(ch.stats!.clicks)}</span>
                            <span className="px-4 py-3 text-right text-gray-800">{ch.stats!.ctr.toFixed(1)}%</span>
                            <span className="px-4 py-3 text-right text-gray-800">{fmt(ch.stats!.conversions)}</span>
                            <span className="px-4 py-3 text-right text-gray-800">{rub(ch.stats!.cpa)}</span>
                            <span className="px-4 py-3 text-right text-green-600 font-medium">{ch.stats!.roi}%</span>
                          </div>
                        </button>
                      ) : (
                        <div className="grid grid-cols-8 items-center text-gray-400">
                          <span className="px-4 py-3 flex items-center gap-2">
                            <span className="opacity-50">{ch.icon}</span>
                            <span>{ch.name}</span>
                          </span>
                          <span className="px-4 py-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-violet-100 hover:text-violet-700 transition-colors cursor-pointer"
                            >
                              Подключить
                            </button>
                          </span>
                          <span className="px-4 py-3 text-right">—</span>
                          <span className="px-4 py-3 text-right">—</span>
                          <span className="px-4 py-3 text-right">—</span>
                          <span className="px-4 py-3 text-right">—</span>
                          <span className="px-4 py-3 text-right">—</span>
                          <span className="px-4 py-3 text-right">—</span>
                        </div>
                      )}

                      {/* Expanded campaigns */}
                      {isExpanded && ch.campaigns.length > 0 && (
                        <div className="bg-gray-50 border-t border-gray-100">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-200">
                                <th className="px-6 py-2 font-medium text-left">ID</th>
                                <th className="px-4 py-2 font-medium text-left">Кампания</th>
                                <th className="px-4 py-2 font-medium text-left">Статус</th>
                                <th className="px-4 py-2 font-medium text-right">Расходы</th>
                                <th className="px-4 py-2 font-medium text-right">Клики</th>
                                <th className="px-4 py-2 font-medium text-right">Конверсии</th>
                                <th className="px-4 py-2 font-medium text-right">CPA</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ch.campaigns.map((camp) => (
                                <tr key={camp.id} className="border-b border-gray-100 last:border-b-0">
                                  <td className="px-6 py-2 text-gray-400 font-mono">{camp.id}</td>
                                  <td className="px-4 py-2 text-gray-700 font-medium">{camp.name}</td>
                                  <td className="px-4 py-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        camp.status === 'active'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                      }`}
                                    >
                                      {camp.status === 'active' ? 'Активна' : 'Пауза'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right text-gray-700">{rub(camp.spend)}</td>
                                  <td className="px-4 py-2 text-right text-gray-700">{fmt(camp.clicks)}</td>
                                  <td className="px-4 py-2 text-right text-gray-700">{fmt(camp.conversions)}</td>
                                  <td className="px-4 py-2 text-right text-gray-700">{rub(camp.cpa)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
