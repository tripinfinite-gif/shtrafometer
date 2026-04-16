'use client';

import { useState } from 'react';

// ─── Mock Data ───────────────────────────────────────────────────────

interface Statement {
  id: string;
  filename: string;
  uploadedAt: string;
  periodFrom: string;
  periodTo: string;
  txCount: number;
  income: number;
  expense: number;
  status: 'processed' | 'pending' | 'error';
}

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

const MOCK_STATEMENTS: Statement[] = [
  { id: '1', filename: 'tinkoff_april_2026.csv', uploadedAt: '2026-04-15', periodFrom: '2026-04-01', periodTo: '2026-04-15', txCount: 47, income: 420000, expense: 109100, status: 'processed' },
  { id: '2', filename: 'tinkoff_march_2026.csv', uploadedAt: '2026-04-01', periodFrom: '2026-03-01', periodTo: '2026-03-31', txCount: 89, income: 380000, expense: 95000, status: 'processed' },
];

const MOCK_TRANSACTIONS: Record<string, Transaction[]> = {
  '1': [
    { date: '2026-04-15', description: 'YooKassa: оплата заказа #A1B2', amount: 9990, type: 'income' },
    { date: '2026-04-15', description: 'YooKassa: оплата заказа #F5G6', amount: 1990, type: 'income' },
    { date: '2026-04-14', description: 'Яндекс.Директ: списание', amount: 3200, type: 'expense' },
    { date: '2026-04-14', description: 'YooKassa: оплата заказа #C3D4', amount: 1990, type: 'income' },
    { date: '2026-04-13', description: 'YooKassa: оплата заказа #E7F8', amount: 4990, type: 'income' },
    { date: '2026-04-13', description: 'VK Реклама: списание', amount: 1800, type: 'expense' },
    { date: '2026-04-12', description: 'YooKassa: оплата заказа #G9H0', amount: 14990, type: 'income' },
    { date: '2026-04-12', description: 'SMS.ru: пополнение баланса', amount: 500, type: 'expense' },
    { date: '2026-04-11', description: 'YooKassa: оплата заказа #I1J2', amount: 9990, type: 'income' },
    { date: '2026-04-11', description: 'Beget: оплата VPS', amount: 3500, type: 'expense' },
    { date: '2026-04-10', description: 'Яндекс.Директ: списание', amount: 2800, type: 'expense' },
    { date: '2026-04-10', description: 'YooKassa: оплата заказа #K3L4', amount: 1990, type: 'income' },
    { date: '2026-04-09', description: 'OpenAI: списание за API', amount: 1500, type: 'expense' },
    { date: '2026-04-09', description: 'YooKassa: оплата заказа #M5N6', amount: 29900, type: 'income' },
  ],
  '2': [
    { date: '2026-03-31', description: 'YooKassa: оплата заказа #O7P8', amount: 4990, type: 'income' },
    { date: '2026-03-30', description: 'Яндекс.Директ: списание', amount: 3100, type: 'expense' },
    { date: '2026-03-30', description: 'YooKassa: оплата заказа #Q9R0', amount: 1990, type: 'income' },
    { date: '2026-03-29', description: 'YooKassa: оплата заказа #S1T2', amount: 9990, type: 'income' },
    { date: '2026-03-28', description: 'VK Реклама: списание', amount: 1500, type: 'expense' },
  ],
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  processed: { label: 'Обработана', color: '#16A34A', bg: '#F0FDF4' },
  pending: { label: 'В обработке', color: '#D97706', bg: '#FFFBEB' },
  error: { label: 'Ошибка', color: '#DC2626', bg: '#FEF2F2' },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// ─── Page ────────────────────────────────────────────────────────────

export default function FinanceBankPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Банковские выписки</h1>
          <p className="text-gray-500 text-sm mt-1">Импорт и просмотр транзакций</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer w-full sm:w-auto justify-center"
        >
          <UploadIcon className="w-4 h-4" />
          Загрузить выписку
        </button>
      </div>

      {/* Statements table */}
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 font-medium">Файл</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Период</th>
                <th className="px-5 py-3 font-medium text-right hidden md:table-cell">Транзакций</th>
                <th className="px-5 py-3 font-medium text-right">Приход</th>
                <th className="px-5 py-3 font-medium text-right">Расход</th>
                <th className="px-5 py-3 font-medium text-center">Статус</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_STATEMENTS.map((s) => {
                const isExpanded = expandedId === s.id;
                const txList = MOCK_TRANSACTIONS[s.id] ?? [];
                const stCfg = STATUS_CONFIG[s.status];
                return (
                  <StatementRow
                    key={s.id}
                    statement={s}
                    statusConfig={stCfg}
                    isExpanded={isExpanded}
                    transactions={txList}
                    onToggle={() => setExpandedId(isExpanded ? null : s.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Загрузить выписку</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                dragOver
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
            >
              <UploadCloudIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Перетащите CSV сюда
              </p>
              <p className="text-xs text-gray-400">
                Тинькофф, 1С, Сбер — CSV или XLS
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer">
                Выбрать файл
              </button>
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function StatementRow({
  statement: s,
  statusConfig: stCfg,
  isExpanded,
  transactions,
  onToggle,
}: {
  statement: Statement;
  statusConfig: { label: string; color: string; bg: string };
  isExpanded: boolean;
  transactions: Transaction[];
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <ChevronIcon className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            <div>
              <p className="font-medium text-gray-900">{s.filename}</p>
              <p className="text-xs text-gray-400 sm:hidden">
                {fmtDate(s.periodFrom)} — {fmtDate(s.periodTo)}
              </p>
            </div>
          </div>
        </td>
        <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">
          {fmtDate(s.periodFrom)} — {fmtDate(s.periodTo)}
        </td>
        <td className="px-5 py-3 text-right text-gray-600 hidden md:table-cell">{s.txCount}</td>
        <td className="px-5 py-3 text-right font-medium text-emerald-600">{fmt(s.income)}</td>
        <td className="px-5 py-3 text-right font-medium text-red-600">{fmt(s.expense)}</td>
        <td className="px-5 py-3 text-center">
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-medium"
            style={{ color: stCfg.color, backgroundColor: stCfg.bg }}
          >
            {stCfg.label}
          </span>
        </td>
      </tr>

      {/* Expanded transactions */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-gray-50 border-y border-gray-100">
              <div className="px-5 py-3 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Транзакции ({transactions.length})
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {transactions.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-100/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        tx.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{tx.description}</p>
                        <p className="text-xs text-gray-400">{fmtDate(tx.date)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ml-4 ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Inline icons ────────────────────────────────────────────────────

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3 3 0 013.438 3.42A3.75 3.75 0 0118 19.5H6.75z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
