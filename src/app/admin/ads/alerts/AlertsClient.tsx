'use client';

import { useState } from 'react';

// ─── Mock Data ───────────────────────────────────────────────────────

type AlertSeverity = 'critical' | 'warning' | 'info';

type Alert = {
  id: string;
  date: string;
  channel: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
};

const INITIAL_ALERTS: Alert[] = [
  { id: '1', date: '2026-04-15 14:30', channel: 'Яндекс.Директ', type: 'budget_warning', severity: 'warning', message: 'Дневной бюджет израсходован на 80%', acknowledged: false },
  { id: '2', date: '2026-04-14 22:15', channel: 'Яндекс.Директ', type: 'cpa_spike', severity: 'critical', message: 'CPA кампании "Поиск — штрафы" вырос на 45% (3 750 ₽ vs целевой 2 600 ₽)', acknowledged: false },
  { id: '3', date: '2026-04-13 09:00', channel: 'Яндекс.Директ', type: 'roi_drop', severity: 'info', message: 'ROI за неделю снизился на 12%', acknowledged: true },
  { id: '4', date: '2026-04-10 16:45', channel: 'Яндекс.Директ', type: 'budget_exceeded', severity: 'critical', message: 'Месячный бюджет превышен на 5%', acknowledged: true },
  { id: '5', date: '2026-04-09 11:20', channel: 'Яндекс.Директ', type: 'ctr_drop', severity: 'warning', message: 'CTR кампании "РСЯ — комплаенс" упал ниже 2% (1.8%)', acknowledged: false },
  { id: '6', date: '2026-04-08 08:00', channel: 'Яндекс.Директ', type: 'impressions_low', severity: 'info', message: 'Показы кампании "Поиск — штрафы" снизились на 30% за 3 дня', acknowledged: true },
  { id: '7', date: '2026-04-07 19:30', channel: 'Яндекс.Директ', type: 'conversion_drop', severity: 'warning', message: 'Конверсия "Поиск — проверка сайта" снизилась с 3.2% до 2.1%', acknowledged: true },
];

const SEVERITY_CFG: Record<AlertSeverity, { label: string; dot: string; badge: string }> = {
  critical: { label: 'Критичный', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  warning: { label: 'Внимание', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  info: { label: 'Инфо', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
};

type FilterSeverity = 'all' | AlertSeverity;
type FilterRead = 'all' | 'unread' | 'read';

// ─── Component ──────────────────────────────────────────────────────

export default function AlertsClient() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');
  const [filterRead, setFilterRead] = useState<FilterRead>('all');
  const [showNotifModal, setShowNotifModal] = useState(false);

  const toggleAcknowledged = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: !a.acknowledged } : a))
    );
  };

  const filtered = alerts.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterRead === 'unread' && a.acknowledged) return false;
    if (filterRead === 'read' && !a.acknowledged) return false;
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Алерты</h1>
            <p className="text-gray-500 text-sm mt-1">Уведомления по рекламным каналам</p>
          </div>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowNotifModal(true)}
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors cursor-pointer w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 13a2 2 0 004 0M13 5a5 5 0 00-10 0c0 3-1.5 5-2 6h14c-.5-1-2-3-2-6z" />
          </svg>
          Настроить уведомления
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          {(['all', 'critical', 'warning', 'info'] as FilterSeverity[]).map((sv) => (
            <button
              key={sv}
              type="button"
              onClick={() => setFilterSeverity(sv)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filterSeverity === sv
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {sv === 'all' ? 'Все' : SEVERITY_CFG[sv].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          {(['all', 'unread', 'read'] as FilterRead[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilterRead(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filterRead === r
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {r === 'all' ? 'Все' : r === 'unread' ? 'Непрочитанные' : 'Прочитанные'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Alert Feed ── */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
            Нет алертов по выбранным фильтрам
          </div>
        )}
        {filtered.map((a) => {
          const cfg = SEVERITY_CFG[a.severity];
          return (
            <div
              key={a.id}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 transition-colors ${
                a.acknowledged
                  ? 'border-gray-200'
                  : 'border-yellow-300 bg-yellow-50/40'
              }`}
            >
              {/* Severity dot */}
              <div className="pt-1">
                <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-400">{a.channel}</span>
                  <span className="text-xs text-gray-300">{a.date}</span>
                </div>
                <p className={`text-sm ${a.acknowledged ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                  {a.message}
                </p>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={() => toggleAcknowledged(a.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  a.acknowledged
                    ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                }`}
              >
                {a.acknowledged ? 'Прочитано' : 'Отметить'}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Notification Settings Modal ── */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Настройки уведомлений</h3>
              <button
                type="button"
                onClick={() => setShowNotifModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Bot Token</label>
                <input
                  type="text"
                  placeholder="123456:ABC-DEF..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Chat ID</label>
                <input
                  type="text"
                  placeholder="-1001234567890"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email для уведомлений</label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  Уведомления будут отправляться при срабатывании алертов уровня &laquo;Критичный&raquo; и &laquo;Внимание&raquo;.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowNotifModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => setShowNotifModal(false)}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
