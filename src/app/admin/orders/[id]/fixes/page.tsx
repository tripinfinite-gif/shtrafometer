'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import type { Order, Fix, FixPlan, FixStatus, FixType, ConnectionType, ConnectionConfig } from '@/lib/types';
import type { ExecutionReport } from '@/fixes/executor';

// ─── Helpers ───────────────────────────────────────────────────────

const FIX_TYPE_CONFIG: Record<FixType, { label: string; color: string }> = {
  'cookie-banner': { label: 'Cookie-баннер', color: '#3B82F6' },
  'privacy-policy': { label: 'Политика конф.', color: '#8B5CF6' },
  'consent-checkbox': { label: 'Чекбокс согласия', color: '#22C55E' },
  'consent-document': { label: 'Документ согласия', color: '#F59E0B' },
  'footer-links': { label: 'Ссылки в футере', color: '#06B6D4' },
  'age-rating': { label: 'Возр. маркировка', color: '#EAB308' },
  'ad-marking': { label: 'Маркировка рекл.', color: '#EF4444' },
  'remove-service': { label: 'Удаление сервиса', color: '#DC2626' },
};

const STATUS_CONFIG: Record<FixStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Ожидает', color: '#6B7280', bg: '#F3F4F6' },
  applied: { label: 'Применено', color: '#16A34A', bg: '#F0FDF4' },
  failed: { label: 'Ошибка', color: '#DC2626', bg: '#FEF2F2' },
  skipped: { label: 'Пропущено', color: '#D97706', bg: '#FFFBEB' },
};

// ─── Page ──────────────────────────────────────────────────────────

export default function FixesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Step 1: plan generation
  const [generating, setGenerating] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyInn, setCompanyInn] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');

  // Fix toggles (fix.id -> enabled)
  const [enabledFixes, setEnabledFixes] = useState<Record<string, boolean>>({});
  const [expandedFixes, setExpandedFixes] = useState<Record<string, boolean>>({});

  // Step 3: connection
  const [connType, setConnType] = useState<ConnectionType>('ssh');
  const [connHost, setConnHost] = useState('');
  const [connPort, setConnPort] = useState('22');
  const [connUsername, setConnUsername] = useState('');
  const [connCredential, setConnCredential] = useState('');
  const [connRemotePath, setConnRemotePath] = useState('/var/www/html');
  const [showCredential, setShowCredential] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Step 4: apply
  const [applying, setApplying] = useState(false);
  const [report, setReport] = useState<ExecutionReport | null>(null);

  // ─── Fetch order ──────────────────────────────────────────────────

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) {
        setError('Заявка не найдена');
        return;
      }
      const data: Order = await res.json();
      setOrder(data);

      // Initialize toggles from existing plan
      if (data.fixPlan) {
        const toggles: Record<string, boolean> = {};
        for (const fix of data.fixPlan.fixes) {
          toggles[fix.id] = fix.status !== 'skipped';
        }
        setEnabledFixes(toggles);
      }
    } catch {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // ─── Step 1: Generate plan ────────────────────────────────────────

  async function handleGeneratePlan() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/fixes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          companyName: companyName || undefined,
          companyInn: companyInn || undefined,
          companyEmail: companyEmail || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Ошибка генерации плана');
        return;
      }
      await fetchOrder();
    } catch {
      setError('Ошибка генерации плана');
    } finally {
      setGenerating(false);
    }
  }

  // ─── Step 3: Test connection ──────────────────────────────────────

  async function handleTestConnection() {
    setTestingConn(true);
    setConnTestResult(null);
    try {
      const res = await fetch('/api/admin/fixes/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: connType,
          host: connHost,
          port: parseInt(connPort, 10),
          username: connUsername,
          credential: connCredential,
          remotePath: connRemotePath,
        }),
      });
      const data = await res.json();
      setConnTestResult(data);
    } catch {
      setConnTestResult({ success: false, error: 'Ошибка подключения' });
    } finally {
      setTestingConn(false);
    }
  }

  // ─── Step 4: Apply fixes ──────────────────────────────────────────

  async function handleApplyFixes() {
    if (!order?.fixPlan) return;
    setApplying(true);
    setReport(null);
    setError('');
    try {
      const selectedIds = Object.entries(enabledFixes)
        .filter(([, enabled]) => enabled)
        .map(([fixId]) => fixId);

      const connection: ConnectionConfig = {
        type: connType,
        host: connHost,
        port: parseInt(connPort, 10),
        username: connUsername,
        credential: connCredential,
        remotePath: connRemotePath,
      };

      const res = await fetch('/api/admin/fixes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          connection,
          fixIds: selectedIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Ошибка применения фиксов');
        return;
      }

      const data: ExecutionReport = await res.json();
      setReport(data);
      await fetchOrder();
    } catch {
      setError('Ошибка применения фиксов');
    } finally {
      setApplying(false);
    }
  }

  // ─── Toggle helpers ───────────────────────────────────────────────

  function toggleFix(fixId: string) {
    setEnabledFixes((prev) => ({ ...prev, [fixId]: !prev[fixId] }));
  }

  function toggleExpand(fixId: string) {
    setExpandedFixes((prev) => ({ ...prev, [fixId]: !prev[fixId] }));
  }

  // ─── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        Загрузка...
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red">{error}</p>
        <button
          onClick={() => router.push(`/admin/orders/${id}`)}
          className="text-primary hover:underline text-sm cursor-pointer"
        >
          Назад к заявке
        </button>
      </div>
    );
  }

  if (!order) return null;

  const plan = order.fixPlan;
  const hasCheckResult = !!order.checkResult;
  const selectedCount = Object.values(enabledFixes).filter(Boolean).length;
  const connectionValid = connHost && connUsername && connCredential && connRemotePath;
  const connectionTested = connTestResult?.success === true;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <nav className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => router.push(`/admin/orders/${id}`)}
            className="text-primary hover:underline text-sm flex items-center gap-1 cursor-pointer"
          >
            <span>&larr;</span> Заявка
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 text-sm">
            Автоисправления — {order.domain || order.siteUrl}
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 border-l-4 border-l-red">
            <p className="text-sm text-red">{error}</p>
          </div>
        )}

        {/* Step 1: Generate plan */}
        {!plan && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Шаг 1: Генерация плана</h2>

            {!hasCheckResult ? (
              <p className="text-sm text-gray-500">
                У заявки нет результатов проверки. Сначала выполните проверку сайта.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Укажите данные компании для шаблонов (необязательно):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Название компании"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="ИНН"
                    value={companyInn}
                    onChange={(e) => setCompanyInn(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email компании"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary transition-colors"
                  />
                </div>
                <button
                  onClick={handleGeneratePlan}
                  disabled={generating}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {generating ? 'Генерация...' : 'Генерировать план фиксов'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 2: Review plan */}
        {plan && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Шаг 2: План фиксов ({plan.fixes.length})
              </h2>
              <span className="text-xs text-gray-400">
                Выбрано: {selectedCount} из {plan.fixes.length}
              </span>
            </div>

            {plan.fixes.length === 0 ? (
              <p className="text-sm text-gray-500">
                Автоматические фиксы не найдены для данных нарушений.
              </p>
            ) : (
              <div className="space-y-3">
                {plan.fixes.map((fix) => (
                  <FixCard
                    key={fix.id}
                    fix={fix}
                    enabled={enabledFixes[fix.id] ?? true}
                    expanded={expandedFixes[fix.id] ?? false}
                    onToggle={() => toggleFix(fix.id)}
                    onExpand={() => toggleExpand(fix.id)}
                    report={report}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Connection */}
        {plan && plan.fixes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Шаг 3: Подключение к серверу</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Connection type */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Тип подключения</label>
                <div className="flex gap-2">
                  {(['ssh', 'ftp'] as ConnectionType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setConnType(t);
                        setConnPort(t === 'ssh' ? '22' : '21');
                        setConnTestResult(null);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                      style={{
                        color: connType === t ? '#7B68EE' : '#6B7280',
                        background: connType === t ? '#F5F3FF' : '#F3F4F6',
                        border: `1px solid ${connType === t ? '#7B68EE40' : '#E5E7EB'}`,
                      }}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Host */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Хост</label>
                <input
                  type="text"
                  placeholder="example.com"
                  value={connHost}
                  onChange={(e) => { setConnHost(e.target.value); setConnTestResult(null); }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary transition-colors"
                />
              </div>

              {/* Port */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Порт</label>
                <input
                  type="text"
                  value={connPort}
                  onChange={(e) => { setConnPort(e.target.value); setConnTestResult(null); }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary transition-colors"
                />
              </div>

              {/* Username */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Имя пользователя</label>
                <input
                  type="text"
                  placeholder="root"
                  value={connUsername}
                  onChange={(e) => { setConnUsername(e.target.value); setConnTestResult(null); }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary transition-colors"
                />
              </div>

              {/* Credential */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">
                    {connType === 'ssh' ? 'Пароль / SSH-ключ' : 'Пароль'}
                  </label>
                  <button
                    onClick={() => setShowCredential(!showCredential)}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    {showCredential ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                {connType === 'ssh' && !showCredential ? (
                  <input
                    type="password"
                    placeholder="Пароль или вставьте приватный ключ"
                    value={connCredential}
                    onChange={(e) => { setConnCredential(e.target.value); setConnTestResult(null); }}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary transition-colors"
                  />
                ) : connType === 'ssh' && showCredential ? (
                  <textarea
                    placeholder="Пароль или вставьте приватный ключ"
                    value={connCredential}
                    onChange={(e) => { setConnCredential(e.target.value); setConnTestResult(null); }}
                    rows={4}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 font-mono resize-y focus:border-primary transition-colors"
                  />
                ) : (
                  <input
                    type={showCredential ? 'text' : 'password'}
                    placeholder="Пароль"
                    value={connCredential}
                    onChange={(e) => { setConnCredential(e.target.value); setConnTestResult(null); }}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary transition-colors"
                  />
                )}
              </div>

              {/* Remote path */}
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Путь к корню сайта</label>
                <input
                  type="text"
                  placeholder="/var/www/html"
                  value={connRemotePath}
                  onChange={(e) => { setConnRemotePath(e.target.value); setConnTestResult(null); }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 font-mono focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Test button + result */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleTestConnection}
                disabled={testingConn || !connectionValid}
                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {testingConn ? 'Проверка...' : 'Проверить подключение'}
              </button>

              {connTestResult && (
                <span
                  className="text-sm font-medium"
                  style={{ color: connTestResult.success ? '#22C55E' : '#EF4444' }}
                >
                  {connTestResult.success
                    ? 'Подключение успешно'
                    : connTestResult.error || 'Ошибка подключения'}
                </span>
              )}
            </div>

            {/* Warning */}
            <div className="bg-orange/10 border border-orange/20 rounded-lg p-3">
              <p className="text-xs text-orange font-medium">
                Перед применением убедитесь что у вас есть бэкап сайта
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Apply */}
        {plan && plan.fixes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Шаг 4: Применение</h2>

            <button
              onClick={handleApplyFixes}
              disabled={applying || !connectionTested || selectedCount === 0}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-green text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {applying
                ? 'Применение фиксов...'
                : `Применить выбранные фиксы (${selectedCount})`}
            </button>

            {!connectionTested && (
              <p className="text-xs text-gray-400 mt-2">
                Сначала проверьте подключение к серверу
              </p>
            )}

            {/* Report */}
            {report && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green/10 rounded-lg p-3 border border-green/20">
                    <p className="text-xs text-gray-500">Применено</p>
                    <p className="text-lg font-semibold text-green">{report.totalApplied}</p>
                  </div>
                  <div className="bg-red/10 rounded-lg p-3 border border-red/20">
                    <p className="text-xs text-gray-500">Ошибок</p>
                    <p className="text-lg font-semibold text-red">{report.totalFailed}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Fix Card Component ──────────────────────────────────────────────

function FixCard({
  fix,
  enabled,
  expanded,
  onToggle,
  onExpand,
  report,
}: {
  fix: Fix;
  enabled: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  report: ExecutionReport | null;
}) {
  const typeConfig = FIX_TYPE_CONFIG[fix.type];
  const statusConfig = STATUS_CONFIG[fix.status];

  // Find result from report if available
  const result = report?.results.find((r) => r.fixId === fix.id);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      style={{ opacity: enabled ? 1 : 0.5 }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-sm font-medium text-gray-800">{fix.title}</h3>
              {/* Type badge */}
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                style={{ color: typeConfig.color, background: typeConfig.color + '15' }}
              >
                {typeConfig.label}
              </span>
              {/* Status badge */}
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                style={{ color: statusConfig.color, background: statusConfig.bg }}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">{fix.description}</p>
            <p className="text-xs text-gray-400 font-mono">{fix.targetPath}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Toggle switch */}
            <button
              onClick={onToggle}
              className="relative w-10 h-6 rounded-full transition-colors cursor-pointer"
              style={{
                background: enabled ? '#22C55E' : '#D1D5DB',
              }}
              aria-label={enabled ? 'Отключить фикс' : 'Включить фикс'}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{
                  transform: enabled ? 'translateX(18px)' : 'translateX(2px)',
                }}
              />
            </button>

            {/* Expand button */}
            <button
              onClick={onExpand}
              className="text-gray-500 hover:text-gray-800 text-xs transition-colors cursor-pointer"
            >
              {expanded ? 'Свернуть' : 'Код'}
            </button>
          </div>
        </div>

        {/* Error from execution */}
        {fix.error && (
          <div className="mt-2 bg-red/10 rounded-lg px-3 py-2">
            <p className="text-xs text-red">{fix.error}</p>
          </div>
        )}

        {/* Result from report */}
        {result && !result.success && result.error && !fix.error && (
          <div className="mt-2 bg-red/10 rounded-lg px-3 py-2">
            <p className="text-xs text-red">{result.error}</p>
          </div>
        )}
      </div>

      {/* Expanded code view */}
      {expanded && (
        <div className="border-t border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">
            Точка вставки: <span className="font-mono text-gray-700">{fix.insertionPoint}</span>
          </p>
          <pre className="bg-gray-900 rounded-lg p-4 text-xs text-gray-100 font-mono overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
            {fix.code}
          </pre>
        </div>
      )}
    </div>
  );
}
