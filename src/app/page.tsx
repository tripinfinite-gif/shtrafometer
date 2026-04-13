"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────

interface Violation {
  id: string;
  module: string;
  law: string;
  article: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  minFine: number;
  maxFine: number;
  details: string[];
  recommendation: string;
}

interface Warning {
  id: string;
  title: string;
  description: string;
  law: string;
  article: string;
  potentialFine: string;
  recommendation: string;
}

interface PassedCheck {
  id: string;
  title: string;
  module: string;
}

interface CheckResponse {
  url: string;
  checkedAt: string;
  siteType: "ecommerce" | "service" | "informational" | "unknown";
  riskLevel: "low" | "medium" | "high" | "critical";
  totalMinFine: number;
  totalMaxFine: number;
  violations: Violation[];
  warnings: Warning[];
  passed: PassedCheck[];
  stats: {
    totalChecks: number;
    violations: number;
    warnings: number;
    passed: number;
  };
  finesByLaw: Record<string, { min: number; max: number; count: number }>;
  complianceScore: number;
}

type AppState = "idle" | "loading" | "success" | "error";

// ─── Helpers ────────────────────────────────────────────────────────────

function formatMoney(n: number): string {
  return n.toLocaleString("ru-RU") + " \u20BD";
}

function pluralize(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

const SEVERITY = {
  critical: { label: "Критично", color: "#EF4444", bg: "#FEF2F2", css: "severity-critical" },
  high: { label: "Высокий", color: "#F59E0B", bg: "#FFFBEB", css: "severity-high" },
  medium: { label: "Средний", color: "#EAB308", bg: "#FEFCE8", css: "severity-medium" },
  low: { label: "Низкий", color: "#7B68EE", bg: "#F5F3FF", css: "severity-low" },
} as const;

const RISK = {
  critical: { label: "Критический риск", color: "#EF4444", bg: "#FEF2F2" },
  high: { label: "Высокий риск", color: "#F59E0B", bg: "#FFFBEB" },
  medium: { label: "Средний риск", color: "#EAB308", bg: "#FEFCE8" },
  low: { label: "Низкий риск", color: "#22C55E", bg: "#F0FDF4" },
} as const;

const SITE_LABELS: Record<string, string> = {
  ecommerce: "Интернет-магазин",
  service: "Сервис",
  informational: "Информационный",
  unknown: "Сайт",
};

const STAGES = [
  "Загрузка сайта",
  "Анализ персональных данных",
  "Проверка зарубежных сервисов",
  "Проверка русского языка",
  "Анализ рекламных блоков",
  "Проверка прав потребителей",
  "Технический SEO",
  "Расчёт штрафов",
];

// ─── Icons ──────────────────────────────────────────────────────────────

function ChevronDown({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={`transition-transform duration-300 ${open ? "rotate-180" : ""} ${className}`}
    >
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 shrink-0">
      <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Cookie Banner ──────────────────────────────────────────────────────

function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("cookie_consent")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie_consent", "declined");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-[680px] mx-auto card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-lg">
        <p className="text-[13px] text-gray-500 flex-1 leading-relaxed">
          Мы используем файлы cookie для обеспечения работы сайта.
          Подробнее в{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Политике конфиденциальности
          </a>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-xl text-[13px] text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Отклонить
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-xl text-[13px] text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function Home() {
  const [url, setUrl] = useState("");
  const [appState, setAppState] = useState<AppState>("idle");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showPassed, setShowPassed] = useState(false);
  const [stage, setStage] = useState(0);
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", email: "" });
  const [orderConsent, setOrderConsent] = useState(false);
  const [orderStatus, setOrderStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [emailGate, setEmailGate] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [selectedProduct, setSelectedProduct] = useState<string>("autofix-std");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Freemium: track which violations are shown fully (first 3)
  const FREE_VIOLATIONS_LIMIT = 3;
  const violationIndex = { current: 0 }; // mutable counter across renders

  useEffect(() => {
    if (appState !== "loading") return;
    setStage(0);
    const t = setInterval(() => {
      setStage((p) => (p < STAGES.length - 1 ? p + 1 : p));
    }, 1800);
    return () => clearInterval(t);
  }, [appState]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }, []);

  async function handleCheck() {
    if (!url.trim()) return;
    setAppState("loading");
    setErrorMsg("");
    setResult(null);
    setExpanded(new Set());
    setShowPassed(false);
    setEmailGate("");
    setEmailStatus("idle");
    setOrderStatus("idle");
    setShowOrderForm(false);
    setSelectedProduct("autofix-std");

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Ошибка при проверке");
        setAppState("error");
      } else {
        setResult(data);
        setAppState("success");
      }
    } catch {
      setErrorMsg("Не удалось выполнить запрос. Проверьте подключение к интернету.");
      setAppState("error");
    }
  }

  const isIdle = appState === "idle";

  return (
    <div className="flex flex-col bg-white">
      {/* ────── Hero / Form ────── */}
      <div id="check" className={`${isIdle ? "min-h-[calc(100vh-56px)] flex items-center" : "pt-8 pb-6"} transition-all duration-500`}>
        <div className="max-w-[980px] mx-auto px-6 w-full">
          {isIdle && (
            <div className="text-center mb-16 animate-fade-up">
              <h1 className="text-[56px] sm:text-[72px] leading-[1.05] font-semibold tracking-tight text-gray-800 mb-4">
                Проверка сайта
                <br />
                <span className="bg-gradient-to-r from-primary to-[#A78BFA] bg-clip-text text-transparent">
                  на штрафы.
                </span>
              </h1>
              <p className="text-[21px] text-gray-500 font-normal max-w-xl mx-auto leading-relaxed">
                Мгновенный анализ вашего сайта на соответствие
                законодательству Российской Федерации.
              </p>
            </div>
          )}

          {/* Search bar */}
          <div className={`max-w-[680px] mx-auto ${isIdle ? "animate-fade-up animate-fade-up-delay-1" : ""}`}>
            <div className="card rounded-2xl p-1.5 flex flex-col sm:flex-row gap-1.5 shadow-md">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !appState.includes("loading") && url.trim() && handleCheck()}
                placeholder="Введите адрес сайта"
                disabled={appState === "loading"}
                className="flex-1 bg-transparent px-5 py-3.5 text-[17px] text-gray-800 placeholder-gray-400 border-0 focus:ring-0 focus:shadow-none disabled:opacity-40 rounded-xl"
              />
              <button
                onClick={handleCheck}
                disabled={appState === "loading" || !url.trim()}
                className="px-8 py-3.5 bg-primary hover:bg-primary-hover disabled:bg-gray-300 disabled:opacity-50 rounded-xl text-[15px] font-medium text-white transition-all duration-200 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
              >
                {appState === "loading" ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Проверяю
                  </span>
                ) : (
                  "Проверить"
                )}
              </button>
            </div>
          </div>

          {isIdle && (
            <div className="flex flex-wrap justify-center gap-2 mt-8 animate-fade-up animate-fade-up-delay-2">
              {["152-ФЗ", "168-ФЗ", "38-ФЗ", "ЗоЗПП", "54-ФЗ", "436-ФЗ", "149-ФЗ", "ГК РФ"].map((t) => (
                <span key={t} className="px-3 py-1 rounded-full text-[12px] text-gray-500 bg-gray-100 border border-gray-200">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ────── Loading ────── */}
      {appState === "loading" && (
        <div className="max-w-[680px] mx-auto px-6 pb-20 animate-fade-up">
          <div className="text-center mb-6">
            <p className="text-[17px] text-gray-800 font-medium">{STAGES[stage]}</p>
            <p className="text-[13px] text-gray-400 mt-1">{stage + 1} из {STAGES.length}</p>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full progress-shimmer rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ────── Error ────── */}
      {appState === "error" && (
        <div className="max-w-[680px] mx-auto px-6 pb-20 animate-fade-up">
          <div className="card rounded-2xl p-6 text-center border-red/20">
            <p className="text-[15px] text-red">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ────── Results ────── */}
      {appState === "success" && result && (
        <div className="max-w-[980px] mx-auto px-6 pb-20">

          {/* Summary */}
          <div className="card rounded-2xl p-8 sm:p-10 mb-8 animate-fade-up">
            {/* Risk + site type */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <span
                className="px-3.5 py-1 rounded-full text-[12px] font-semibold tracking-wide"
                style={{ color: RISK[result.riskLevel].color, background: RISK[result.riskLevel].bg, border: `1px solid ${RISK[result.riskLevel].color}30` }}
              >
                {RISK[result.riskLevel].label}
              </span>
              <span className="px-3.5 py-1 rounded-full text-[12px] text-gray-500 bg-gray-100 border border-gray-200">
                {SITE_LABELS[result.siteType]}
              </span>
              <span className="text-[12px] text-gray-400 sm:ml-auto">
                {result.url}
              </span>
            </div>

            {/* Compliance Score + Total fines */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 mb-8">
              {/* Score ring */}
              <div className="relative w-28 h-28 shrink-0 mx-auto sm:mx-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={result.complianceScore > 80 ? '#22C55E' : result.complianceScore > 60 ? '#EAB308' : result.complianceScore > 30 ? '#F97316' : '#EF4444'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(result.complianceScore / 100) * 327} 327`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[28px] font-bold text-gray-800">{result.complianceScore}</span>
                  <span className="text-[10px] text-gray-400">из 100</span>
                </div>
              </div>
              {/* Fines */}
              <div className="flex-1">
                <p className="text-[13px] text-gray-400 uppercase tracking-widest mb-2">
                  Потенциальные штрафы
                </p>
                <p className="text-[36px] sm:text-[44px] font-semibold tracking-tight leading-none">
                  <span className="text-gray-800">{formatMoney(result.totalMinFine)}</span>
                  <span className="text-gray-300 mx-3">&mdash;</span>
                  <span className="text-red">{formatMoney(result.totalMaxFine)}</span>
                </p>
                <p className="text-[13px] text-gray-500 mt-2">
                  {result.complianceScore > 80 ? 'Сайт в хорошем состоянии, есть небольшие замечания' :
                   result.complianceScore > 60 ? 'Есть существенные нарушения, рекомендуем исправить' :
                   result.complianceScore > 30 ? 'Много нарушений — риск штрафов при проверке' :
                   'Критический уровень нарушений — высокий риск штрафов'}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { n: result.stats.violations, label: pluralize(result.stats.violations, "нарушение", "нарушения", "нарушений"), color: "#EF4444" },
                { n: result.stats.warnings, label: pluralize(result.stats.warnings, "предупреждение", "предупреждения", "предупреждений"), color: "#F59E0B" },
                { n: result.stats.passed, label: pluralize(result.stats.passed, "проверка пройдена", "проверки пройдены", "проверок пройдено"), color: "#22C55E" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-[32px] sm:text-[40px] font-semibold tracking-tight" style={{ color: s.color }}>{s.n}</p>
                  <p className="text-[12px] text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* By law */}
            {Object.keys(result.finesByLaw).length > 0 && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">По законам</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(result.finesByLaw).map(([law, d]) => (
                    <div key={law} className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[14px] font-medium text-gray-800">{law}</span>
                        <span className="text-[11px] text-gray-400">{d.count}</span>
                      </div>
                      <span className="text-[13px] text-gray-500 tabular-nums">
                        {formatMoney(d.max)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ────── Grouped Results by Category ────── */}
          {(result.violations.length > 0 || result.warnings.length > 0) && (() => {
            // Category config
            const CATEGORY_ORDER = [
              'personal-data', 'localization', 'info-law', 'advertising',
              'language', 'consumer', 'content', 'ecommerce', 'tech', 'seo',
            ] as const;

            const CATEGORY_CONFIG: Record<string, { label: string; sublabel: string; isTech: boolean }> = {
              'personal-data': { label: 'Персональные данные', sublabel: '152-ФЗ', isTech: false },
              'localization': { label: 'Локализация данных', sublabel: '152-ФЗ', isTech: false },
              'info-law': { label: 'Информационная безопасность', sublabel: '149-ФЗ', isTech: false },
              'advertising': { label: 'Реклама', sublabel: '38-ФЗ', isTech: false },
              'language': { label: 'Русский язык', sublabel: '168-ФЗ', isTech: false },
              'consumer': { label: 'Права потребителей', sublabel: 'ЗоЗПП', isTech: false },
              'content': { label: 'Контент и маркировка', sublabel: '436-ФЗ', isTech: false },
              'ecommerce': { label: 'Электронная коммерция', sublabel: '54-ФЗ', isTech: false },
              'tech': { label: 'Техническая защита', sublabel: 'Рекомендации по безопасности', isTech: true },
              'seo': { label: 'Технический SEO', sublabel: 'Рекомендации по оптимизации', isTech: true },
            };

            function getCategory(id: string): string {
              if (['sec-04','sec-05','sec-06','sec-07','sec-08','sec-09','sec-10'].includes(id)) return 'tech';
              if (id.startsWith('seo-')) return 'seo';
              if (id.startsWith('pd-') || id.startsWith('hidden-')) return 'personal-data';
              if (id.startsWith('loc-')) return 'localization';
              if (id.startsWith('ad-')) return 'advertising';
              if (id.startsWith('lang-')) return 'language';
              if (id.startsWith('con-')) return 'consumer';
              if (id.startsWith('cnt-')) return 'content';
              if (id.startsWith('ecom-')) return 'ecommerce';
              if (id.startsWith('sec-')) return 'info-law';
              return 'personal-data';
            }

            // Group violations & warnings
            const grouped: Record<string, { violations: Violation[]; warnings: Warning[] }> = {};
            for (const v of result.violations) {
              const cat = getCategory(v.id);
              if (!grouped[cat]) grouped[cat] = { violations: [], warnings: [] };
              grouped[cat].violations.push(v);
            }
            for (const w of result.warnings) {
              const cat = getCategory(w.id);
              if (!grouped[cat]) grouped[cat] = { violations: [], warnings: [] };
              grouped[cat].warnings.push(w);
            }

            // Sort: law-based first, then tech
            const sortedKeys = CATEGORY_ORDER.filter((k) => grouped[k]);
            // Add any uncategorized
            Object.keys(grouped).forEach((k) => {
              if (!sortedKeys.includes(k as any)) sortedKeys.push(k as any);
            });

            const lawCategories = sortedKeys.filter((k) => !CATEGORY_CONFIG[k]?.isTech);
            const techCategories = sortedKeys.filter((k) => CATEGORY_CONFIG[k]?.isTech);

            function renderViolation(v: Violation) {
              const sev = SEVERITY[v.severity];
              const isOpen = expanded.has(v.id);
              const idx = violationIndex.current++;
              const isLocked = idx >= FREE_VIOLATIONS_LIMIT;

              return (
                <div
                  key={v.id}
                  className={`card rounded-2xl border-l-[3px] ${sev.css} overflow-hidden transition-all duration-300 ${isLocked ? 'relative' : ''}`}
                >
                  <button
                    onClick={() => isLocked ? setShowAuthModal(true) : toggle(v.id)}
                    className="w-full text-left px-6 py-5 flex items-start gap-4 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ color: sev.color, background: sev.bg }}
                          >
                            {sev.label}
                          </span>
                          <h3 className="text-[15px] font-medium text-gray-800 leading-snug">
                            {v.title}
                          </h3>
                        </div>
                        {!isLocked && (
                          <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 font-mono shrink-0">
                            {v.id}
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-[10px] text-[#6C5CE7] bg-[#6C5CE7]/10 rounded px-2 py-0.5 font-medium shrink-0">
                            Подробнее после регистрации
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 pl-0.5">
                        {v.maxFine > 0 ? (
                          <>
                            <span className="text-[14px] font-semibold tabular-nums" style={{ color: sev.color }}>
                              {formatMoney(v.minFine)} — {formatMoney(v.maxFine)}
                            </span>
                            <span className="text-[12px] text-gray-400">
                              {v.law} {v.article}
                            </span>
                          </>
                        ) : (
                          <span className="text-[12px] text-gray-400">
                            {v.article || v.law}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isLocked && <ChevronDown open={isOpen} className="text-gray-400 mt-1.5" />}
                  </button>

                  {/* Locked: blur overlay */}
                  {isLocked && (
                    <div className="px-6 pb-5">
                      <div className="relative">
                        <div className="blur-[6px] select-none pointer-events-none opacity-50">
                          <p className="text-[14px] text-gray-500 leading-relaxed">
                            {v.description.slice(0, 80)}...
                          </p>
                          <div className="mt-2 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                            <p className="text-[13px] text-gray-500">Рекомендация по исправлению...</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowAuthModal(true)}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <span className="px-4 py-2 rounded-xl bg-[#6C5CE7] text-white text-[13px] font-medium shadow-lg hover:bg-[#5B4BD5] transition-colors">
                            Зарегистрироваться бесплатно
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Unlocked: full details */}
                  {!isLocked && (
                    <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden">
                        <div className="px-6 pb-6 pt-2 space-y-4 border-t border-gray-100">
                          <p className="text-[14px] text-gray-500 leading-relaxed">{v.description}</p>

                          {v.details.length > 0 && (
                            <div className="space-y-2">
                              {v.details.map((d, i) => (
                                <div key={i} className="flex items-start gap-2.5 text-[13px] text-gray-500">
                                  <span className="w-1 h-1 rounded-full bg-gray-300 mt-2 shrink-0" />
                                  <span className="break-all">{d}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {v.recommendation && (
                            <div className="flex items-start gap-2.5 rounded-xl bg-primary-lighter border border-primary-light px-4 py-3">
                              <ArrowIcon />
                              <p className="text-[13px] text-gray-700 leading-relaxed">{v.recommendation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            function renderWarning(w: Warning) {
              const isOpen = expanded.has(w.id);
              return (
                <div key={w.id} className="card rounded-2xl border-l-[3px] severity-medium overflow-hidden">
                  <button
                    onClick={() => toggle(w.id)}
                    className="w-full text-left px-6 py-5 flex items-start gap-4 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-medium text-gray-800 leading-snug mb-2">{w.title}</h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[14px] font-semibold text-orange">{w.potentialFine}</span>
                        <span className="text-[12px] text-gray-400">{w.law} {w.article}</span>
                      </div>
                    </div>
                    <ChevronDown open={isOpen} className="text-gray-400 mt-1.5" />
                  </button>

                  <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <div className="px-6 pb-6 pt-2 space-y-4 border-t border-gray-100">
                        <p className="text-[14px] text-gray-500 leading-relaxed">{w.description}</p>
                        {w.recommendation && (
                          <div className="flex items-start gap-2.5 rounded-xl bg-primary-lighter border border-primary-light px-4 py-3">
                            <ArrowIcon />
                            <p className="text-[13px] text-gray-700 leading-relaxed">{w.recommendation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            function renderCategorySection(catKey: string, idx: number, isTechGroup: boolean) {
              const cfg = CATEGORY_CONFIG[catKey] || { label: catKey, sublabel: '', isTech: false };
              const g = grouped[catKey];
              const totalIssues = g.violations.length + g.warnings.length;
              const totalMaxFine = g.violations.reduce((s, v) => s + v.maxFine, 0);

              return (
                <section key={catKey} className={`mb-6 animate-fade-up ${idx > 0 ? 'animate-fade-up-delay-1' : ''}`}>
                  {/* Category Header */}
                  <div className={`flex items-center justify-between mb-3 px-1 ${isTechGroup ? '' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: isTechGroup ? '#7B68EE' : '#EF4444' }}
                      />
                      <div>
                        <h2 className="text-[15px] font-semibold text-gray-800 leading-tight">
                          {cfg.label}
                        </h2>
                        <p className="text-[11px] text-gray-400">{cfg.sublabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[12px] text-gray-400">
                        {totalIssues} {pluralize(totalIssues, 'проблема', 'проблемы', 'проблем')}
                      </span>
                      {totalMaxFine > 0 && (
                        <span className="text-[13px] font-semibold text-red tabular-nums">
                          до {formatMoney(totalMaxFine)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {g.violations.map(renderViolation)}
                    {g.warnings.map(renderWarning)}
                  </div>
                </section>
              );
            }

            // Reset violation counter for this render
            violationIndex.current = 0;

            return (
              <>
                {/* Law-based violations */}
                {lawCategories.length > 0 && (
                  <div className="mb-10 animate-fade-up animate-fade-up-delay-1">
                    <div className="flex items-center gap-3 mb-6 px-1">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                        <path d="M8 1L2 4V7.5C2 11 4.5 13.8 8 15C11.5 13.8 14 11 14 7.5V4L8 1Z" stroke="#EF4444" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                      <h2 className="text-[13px] text-gray-400 uppercase tracking-widest">
                        Нарушения законодательства
                      </h2>
                    </div>
                    {lawCategories.map((k, i) => renderCategorySection(k, i, false))}
                  </div>
                )}

                {/* Technical checks */}
                {techCategories.length > 0 && (
                  <div className="mb-10 animate-fade-up animate-fade-up-delay-2">
                    <div className="flex items-center gap-3 mb-6 px-1">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                        <path d="M6.5 1.5L2.5 5.5V10.5L6.5 14.5H10.5L14.5 10.5V5.5L10.5 1.5H6.5Z" stroke="#7B68EE" strokeWidth="1.5" strokeLinejoin="round" />
                        <path d="M8 5V8.5M8 10.5V11" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <h2 className="text-[13px] text-gray-400 uppercase tracking-widest">
                        Технические рекомендации
                      </h2>
                    </div>
                    {techCategories.map((k, i) => renderCategorySection(k, i, true))}
                  </div>
                )}
              </>
            );
          })()}

          {/* No issues */}
          {result.violations.length === 0 && result.warnings.length === 0 && (
            <div className="card rounded-2xl p-10 text-center mb-8 animate-fade-up">
              <p className="text-[21px] font-medium text-green mb-2">Нарушений не найдено</p>
              <p className="text-[15px] text-gray-500">
                Сайт соответствует основным требованиям законодательства РФ
              </p>
            </div>
          )}

          {/* Passed */}
          {result.passed.length > 0 && (
            <section className="animate-fade-up animate-fade-up-delay-3">
              <button
                onClick={() => setShowPassed((p) => !p)}
                className="w-full card rounded-2xl px-6 py-4 flex items-center justify-between cursor-pointer"
              >
                <span className="text-[14px] font-medium text-green">
                  {result.passed.length} {pluralize(result.passed.length, "проверка пройдена", "проверки пройдены", "проверок пройдено")}
                </span>
                <ChevronDown open={showPassed} className="text-gray-400" />
              </button>

              <div className={`grid transition-all duration-300 ${showPassed ? "grid-rows-[1fr] mt-2" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="card rounded-2xl px-6 py-4 space-y-2.5">
                    {result.passed.map((c) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <CheckIcon />
                        <span className="text-[13px] text-gray-500">{c.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ────── SEO Audit Summary ────── */}
          {(() => {
            const seoViolations = result.violations.filter((v) => v.module === "seo");
            const seoPassed = result.passed.filter((c) => c.module === "seo");
            if (seoViolations.length === 0 && seoPassed.length === 0) return null;
            const seoScore = Math.max(0, Math.min(100, 100 - seoViolations.length * 7));
            const scoreColor = seoScore >= 80 ? "#22C55E" : seoScore >= 50 ? "#EAB308" : "#EF4444";
            const scoreBg = seoScore >= 80 ? "#F0FDF4" : seoScore >= 50 ? "#FEFCE8" : "#FEF2F2";
            return (
              <section className="mt-10 mb-8 animate-fade-up">
                <div className="card rounded-2xl p-8 sm:p-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[21px] sm:text-[24px] font-semibold tracking-tight text-gray-800">
                      Технический SEO-аудит
                    </h2>
                    <span
                      className="px-4 py-2 rounded-full text-[20px] font-bold"
                      style={{ color: scoreColor, background: scoreBg, border: `1px solid ${scoreColor}30` }}
                    >
                      {seoScore}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Passed SEO checks */}
                    {seoPassed.length > 0 && (
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Что хорошо</p>
                        <div className="space-y-2.5">
                          {seoPassed.slice(0, 5).map((c) => (
                            <div key={c.id} className="flex items-center gap-3">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                                <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="text-[13px] text-gray-500">{c.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SEO violations */}
                    {seoViolations.length > 0 && (
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Что плохо</p>
                        <div className="space-y-2.5">
                          {seoViolations.slice(0, 5).map((v) => (
                            <div key={v.id} className="flex items-center gap-3">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                                <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                              <span className="text-[13px] text-gray-500">{v.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PDF teaser */}
                  <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                    <p className="text-[13px] text-gray-400">
                      Подробные рекомендации — в PDF-отчёте
                    </p>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ────── CTA: Register for full report ────── */}
          {result.violations.length > 0 && result.stats.violations > FREE_VIOLATIONS_LIMIT && (
            <section className="mt-10 mb-6 animate-fade-up animate-fade-up-delay-3">
              <div className="card rounded-2xl p-8 sm:p-10 text-center bg-gradient-to-b from-[#6C5CE7]/5 to-transparent border-[#6C5CE7]/20">
                <div className="w-14 h-14 rounded-2xl bg-[#6C5CE7]/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                </div>
                <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-gray-800 mb-2">
                  {result.stats.violations} {pluralize(result.stats.violations, 'нарушение', 'нарушения', 'нарушений')} на сумму до {formatMoney(result.totalMaxFine)}
                </h2>
                <p className="text-[14px] text-gray-500 max-w-lg mx-auto leading-relaxed mb-6">
                  Зарегистрируйтесь бесплатно, чтобы увидеть подробности всех нарушений, получить план исправления и ежемесячный мониторинг
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                  <a
                    href={`/auth/register?returnUrl=${encodeURIComponent('/cabinet')}&site=${encodeURIComponent(result.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}`}
                    className="px-8 py-3.5 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4BD5] text-white text-[15px] font-medium transition-colors"
                  >
                    Создать аккаунт за 15 секунд
                  </a>
                  <a
                    href="/auth/login"
                    className="text-[13px] text-gray-500 hover:text-[#6C5CE7] transition-colors"
                  >
                    Уже есть аккаунт? Войти
                  </a>
                </div>
                <div className="flex items-center justify-center gap-6 text-[12px] text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Все нарушения с рекомендациями
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Технический аудит
                  </span>
                  <span className="flex items-center gap-1.5 hidden sm:flex">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Мониторинг бесплатно
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ────── Pricing: Paid products ────── */}
          {result.violations.length > 0 && (
            <section className="mb-8 animate-fade-up animate-fade-up-delay-3">
              <div className="text-center mb-4">
                <p className="text-[11px] text-primary uppercase tracking-widest mb-3">
                  Устранить нарушения
                </p>
                <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-gray-800 mb-2">
                  Исправим за вас — выберите тариф
                </h2>
                <p className="text-[14px] text-gray-500">
                  Потенциальные штрафы: до {formatMoney(result.totalMaxFine)} — дешевле исправить, чем платить
                </p>
              </div>

              {/* ── Savings badge ── */}
              {result.totalMaxFine > 9990 && (
                <div className="flex justify-center mb-6">
                  <span className="inline-flex items-center gap-1.5 bg-green/10 text-green text-[12px] font-medium px-4 py-1.5 rounded-full">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M4 4l3-3 3 3M4 10l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Экономия до {formatMoney(result.totalMaxFine - 4990)} по сравнению со штрафами
                  </span>
                </div>
              )}

              {/* ── 3 Autofix tiers ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                {/* Tier 1: Basic */}
                <div className="card rounded-2xl p-6 flex flex-col">
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">Базовый</p>
                  <h3 className="text-[18px] font-semibold text-gray-800 mb-1">1 категория</h3>
                  <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                    Автоисправление нарушений в одной категории на выбор: ПДн, локализация или реклама.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Бэкап перед изменениями
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Отчёт о работах на e-mail
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 6h.01" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/></svg>
                      <span className="text-gray-300">Повторная проверка</span>
                    </div>
                  </div>
                  <p className="text-[28px] font-semibold text-gray-800 mb-1">
                    4 990 <span className="text-[16px] text-gray-400">&#8381;</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mb-4">Разовая покупка</p>
                  <button
                    onClick={() => {
                      setSelectedProduct("autofix-basic");
                      setShowOrderForm(true);
                    }}
                    className="w-full py-3 rounded-xl text-[14px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer"
                  >
                    Выбрать
                  </button>
                </div>

                {/* Tier 2: Standard (recommended) */}
                <div className="rounded-2xl p-6 flex flex-col relative overflow-hidden sm:scale-[1.03] sm:-my-1 sm:shadow-lg z-10" style={{ background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)", border: "2px solid #6C5CE7" }}>
                  <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-semibold px-3 py-1 rounded-bl-xl">
                    Популярный
                  </span>
                  <p className="text-[11px] text-primary uppercase tracking-widest mb-2">Стандарт</p>
                  <h3 className="text-[18px] font-semibold text-gray-800 mb-1">Все нарушения</h3>
                  <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                    Автоматическое устранение всех {result.stats.violations}{" "}
                    {pluralize(result.stats.violations, "нарушения", "нарушений", "нарушений")} через SSH/FTP.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Бэкап перед изменениями
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Отчёт о работах на e-mail
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Повторная проверка через 3 дня
                    </div>
                  </div>
                  <p className="text-[28px] font-semibold text-gray-800 mb-1">
                    9 990 <span className="text-[16px] text-gray-400">&#8381;</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mb-4">Все категории, до 3 дней</p>
                  <button
                    onClick={() => {
                      setSelectedProduct("autofix-std");
                      setShowOrderForm(true);
                    }}
                    className="w-full py-3 rounded-xl text-[14px] font-medium text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer shadow-md"
                  >
                    Выбрать
                  </button>
                </div>

                {/* Tier 3: Premium */}
                <div className="card rounded-2xl p-6 flex flex-col">
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">Премиум</p>
                  <h3 className="text-[18px] font-semibold text-gray-800 mb-1">Всё + эксперт</h3>
                  <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                    Автоисправление всех нарушений + ручная проверка экспертом по интернет-праву.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Бэкап перед изменениями
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Повторная проверка + отчёт
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Персональные рекомендации эксперта
                    </div>
                  </div>
                  <p className="text-[28px] font-semibold text-gray-800 mb-1">
                    14 990 <span className="text-[16px] text-gray-400">&#8381;</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mb-4">Все категории + экспертиза</p>
                  <button
                    onClick={() => {
                      setSelectedProduct("autofix-prem");
                      setShowOrderForm(true);
                    }}
                    className="w-full py-3 rounded-xl text-[14px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer"
                  >
                    Выбрать
                  </button>
                </div>
              </div>

              {/* ── Feature comparison table ── */}
              <div className="card rounded-2xl overflow-hidden mb-6">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left p-3 pl-5 text-gray-400 font-medium">Что входит</th>
                      <th className="p-3 text-center text-gray-400 font-medium">Базовый</th>
                      <th className="p-3 text-center text-primary font-semibold bg-primary/5">Стандарт</th>
                      <th className="p-3 text-center text-gray-400 font-medium">Премиум</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600">
                    {[
                      ["Автоисправление нарушений", "1 категория", "Все", "Все"],
                      ["Бэкап данных", true, true, true],
                      ["Отчёт о работах", true, true, true],
                      ["Повторная проверка", false, true, true],
                      ["Ручная проверка экспертом", false, false, true],
                      ["Персональные рекомендации", false, false, true],
                    ].map(([feature, basic, std, prem], i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="p-3 pl-5 text-gray-600">{feature as string}</td>
                        {[basic, std, prem].map((val, j) => (
                          <td key={j} className={`p-3 text-center ${j === 1 ? "bg-primary/5" : ""}`}>
                            {val === true ? (
                              <svg className="inline" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            ) : val === false ? (
                              <span className="text-gray-300">&mdash;</span>
                            ) : (
                              <span className="text-[11px] font-medium">{val as string}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Additional services ── */}
              <div className="mb-6">
                <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3 text-center">Дополнительно</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => { setSelectedProduct("report"); setShowOrderForm(true); }}
                    className="card rounded-xl p-4 flex items-center gap-4 text-left hover:border-primary/30 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 2h6l4 4v10a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#6C5CE7" strokeWidth="1.2" strokeLinejoin="round"/><path d="M11 2v4h4M7 10h4M7 13h2" stroke="#6C5CE7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 group-hover:text-primary transition-colors">PDF-отчёт</p>
                      <p className="text-[11px] text-gray-400">Все нарушения + инструкции</p>
                    </div>
                    <p className="text-[15px] font-semibold text-gray-800 whitespace-nowrap">1 990 &#8381;</p>
                  </button>
                  <button
                    onClick={() => { setSelectedProduct("monitoring"); setShowOrderForm(true); }}
                    className="card rounded-xl p-4 flex items-center gap-4 text-left hover:border-primary/30 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 16A7 7 0 109 2a7 7 0 000 14z" stroke="#22C55E" strokeWidth="1.2"/><path d="M9 5v4l2.5 2.5" stroke="#22C55E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 group-hover:text-primary transition-colors">Мониторинг</p>
                      <p className="text-[11px] text-gray-400">Ежемесячная проверка + алерты</p>
                    </div>
                    <p className="text-[15px] font-semibold text-gray-800 whitespace-nowrap">490 &#8381;/мес</p>
                  </button>
                  <button
                    onClick={() => { setSelectedProduct("consulting"); setShowOrderForm(true); }}
                    className="card rounded-xl p-4 flex items-center gap-4 text-left hover:border-primary/30 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2a5 5 0 015 5c0 1.5-.7 2.8-1.7 3.7L12 14H6l-.3-3.3A5 5 0 019 2z" stroke="#F59E0B" strokeWidth="1.2" strokeLinejoin="round"/><path d="M7 14v1a2 2 0 004 0v-1" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 group-hover:text-primary transition-colors">Консалтинг</p>
                      <p className="text-[11px] text-gray-400">Экспертный аудит + документы</p>
                    </div>
                    <p className="text-[15px] font-semibold text-gray-800 whitespace-nowrap">15 000 &#8381;</p>
                  </button>
                </div>
              </div>

              {/* ────── Order Form (shared for all products) ────── */}
              {showOrderForm && orderStatus !== "sent" && (
                <div className="mt-6 card rounded-2xl p-8 sm:p-10 max-w-lg mx-auto animate-fade-up">
                  {/* Cabinet shortcut */}
                  <div className="mb-5 text-center">
                    <a
                      href={`/auth/register?returnUrl=${encodeURIComponent('/cabinet')}&product=${selectedProduct}&site=${encodeURIComponent(result?.url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || '')}`}
                      className="text-[13px] text-[#6C5CE7] hover:underline"
                    >
                      Оформить через личный кабинет &rarr;
                    </a>
                  </div>
                  <h3 className="text-[17px] font-semibold text-gray-800 mb-1 text-center">
                    {selectedProduct === "report" ? "Оформление отчёта" :
                     selectedProduct === "monitoring" ? "Подключение мониторинга" :
                     selectedProduct === "consulting" ? "Заявка на консалтинг" :
                     "Заявка на исправление"}
                  </h3>
                  <p className="text-[12px] text-gray-400 text-center mb-6">
                    {selectedProduct === "report" ? "PDF-отчёт • 1 990 ₽" :
                     selectedProduct === "autofix-basic" ? "Автоисправление Базовый • 4 990 ₽" :
                     selectedProduct === "autofix-std" ? "Автоисправление Стандарт • 9 990 ₽" :
                     selectedProduct === "autofix-prem" ? "Автоисправление Премиум • 14 990 ₽" :
                     selectedProduct === "monitoring" ? "Мониторинг • 490 ₽/мес" :
                     selectedProduct === "consulting" ? "Консалтинг • 15 000 ₽" :
                     ""}
                  </p>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Ваше имя"
                      value={orderForm.name}
                      onChange={(e) => setOrderForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3 text-[14px] text-gray-800 placeholder-gray-400 focus:border-primary transition-colors"
                    />
                    <input
                      type="tel"
                      placeholder="Телефон"
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3 text-[14px] text-gray-800 placeholder-gray-400 focus:border-primary transition-colors"
                    />
                    <input
                      type="email"
                      placeholder="E-mail"
                      value={orderForm.email}
                      onChange={(e) => setOrderForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3 text-[14px] text-gray-800 placeholder-gray-400 focus:border-primary transition-colors"
                    />

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orderConsent}
                        onChange={(e) => setOrderConsent(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 bg-transparent text-primary focus:ring-primary cursor-pointer accent-[#7B68EE]"
                      />
                      <span className="text-[12px] text-gray-500 leading-relaxed">
                        Принимаю условия{" "}
                        <a href="/offer" target="_blank" className="text-primary hover:underline">
                          публичной оферты
                        </a>{" "}
                        и даю согласие на{" "}
                        <a href="/privacy" target="_blank" className="text-primary hover:underline">
                          обработку персональных данных
                        </a>
                      </span>
                    </label>

                    <button
                      onClick={async () => {
                        if (!orderForm.name.trim() || !orderForm.phone.trim() || !orderConsent) return;
                        setOrderStatus("sending");
                        try {
                          const res = await fetch("/api/payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              ...orderForm,
                              siteUrl: result.url,
                              violations: result.stats.violations,
                              totalMaxFine: result.totalMaxFine,
                              productType: selectedProduct,
                            }),
                          });
                          const data = await res.json();
                          if (res.ok && data.paymentUrl) {
                            // Redirect to YooKassa payment page
                            window.location.href = data.paymentUrl;
                          } else {
                            setOrderStatus("error");
                          }
                        } catch {
                          setOrderStatus("error");
                        }
                      }}
                      disabled={!orderForm.name.trim() || !orderForm.phone.trim() || !orderForm.email.trim() || !orderConsent || orderStatus === "sending"}
                      className="w-full px-8 py-3.5 bg-primary hover:bg-primary-hover disabled:bg-gray-300 disabled:opacity-50 rounded-xl text-[14px] font-medium text-white transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {orderStatus === "sending" ? (
                        <span className="flex items-center justify-center gap-2.5">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Переход к оплате...
                        </span>
                      ) : (
                        "Оплатить и начать"
                      )}
                    </button>

                    {orderStatus === "error" && (
                      <p className="text-[13px] text-red text-center">
                        Не удалось отправить. Позвоните нам: +7 (985) 131-33-23
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ────── Trust signals ────── */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card rounded-2xl p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2L3 5.5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V5.5L10 2Z" stroke="#22C55E" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M7 10.5L9 12.5L13 8" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-gray-800 mb-1">Безопасная оплата</p>
                  <p className="text-[12px] text-gray-500">Защита PCI DSS через ЮKassa. Данные карт не хранятся на наших серверах.</p>
                </div>
                <div className="card rounded-2xl p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 18C14.4 18 18 14.4 18 10S14.4 2 10 2 2 5.6 2 10s3.6 8 8 8z" stroke="#6C5CE7" strokeWidth="1.5" />
                      <path d="M7 10.5L9 12.5L13 7.5" stroke="#6C5CE7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-gray-800 mb-1">Гарантия возврата</p>
                  <p className="text-[12px] text-gray-500">Если результат не устроит — вернём деньги в течение 24 часов.</p>
                </div>
                <div className="card rounded-2xl p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2L12.5 7.5L18 8L14 12L15 18L10 15L5 18L6 12L2 8L7.5 7.5L10 2Z" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-gray-800 mb-1">2 500+ проверок</p>
                  <p className="text-[12px] text-gray-500">Нам доверяют владельцы сайтов и агентства по всей России.</p>
                </div>
              </div>

              {/* Success */}
              {orderStatus === "sent" && (
                <div className="mt-6 card rounded-2xl p-8 text-center animate-fade-up">
                  <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path d="M7 15L11.5 19.5L21 9" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[18px] font-semibold text-gray-800 mb-1">Заявка отправлена</p>
                  <p className="text-[14px] text-gray-500">
                    Мы свяжемся с вами в ближайшее время для уточнения деталей
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ────── FAQ ────── */}
      {appState === "success" && result && result.violations.length > 0 && (
        <section className="max-w-[680px] mx-auto px-6 pb-16">
          <div className="text-center mb-8">
            <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-gray-800 mb-2">
              Частые вопросы
            </h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "Как я получу отчёт?",
                a: "PDF-отчёт отправляется на ваш e-mail автоматически в течение 10 минут после оплаты. Также вы получите подтверждение заказа на почту.",
              },
              {
                q: "Что входит в автоисправление?",
                a: "Мы подключаемся к вашему серверу через SSH/FTP, создаём резервную копию, устраняем все выявленные нарушения, затем проводим повторную проверку через 3 дня. Вы получите подробный отчёт о выполненных работах.",
              },
              {
                q: "Могу ли я вернуть деньги?",
                a: "Да. Для PDF-отчёта — возврат в течение 24 часов. Для автоисправления — возврат до начала работ, или пропорционально невыполненному объёму. Подробности в публичной оферте.",
              },
              {
                q: "Какие способы оплаты поддерживаются?",
                a: "Банковские карты (Visa, MasterCard, МИР), СБП и ЮMoney. Оплата проходит через защищённый сервис ЮKassa — данные карт не хранятся на наших серверах.",
              },
              {
                q: "Насколько точна проверка?",
                a: "Сервис проверяет сайт по 35+ критериям на соответствие 8 федеральным законам РФ. Проверка автоматическая и не заменяет юридическую консультацию, но выявляет все основные нарушения, за которые назначаются штрафы.",
              },
            ].map((item, i) => (
              <details key={i} className="card rounded-2xl group">
                <summary className="px-6 py-4 cursor-pointer flex items-center justify-between text-[15px] font-medium text-gray-800 list-none [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-gray-400 transition-transform group-open:rotate-180">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-[14px] text-gray-500 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ────── Sticky mobile bar ────── */}
      {appState === "success" && result && result.violations.length > FREE_VIOLATIONS_LIMIT && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 py-3 px-4 sm:hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold text-gray-800">
                {result.stats.violations} {pluralize(result.stats.violations, 'нарушение', 'нарушения', 'нарушений')}
              </p>
              <p className="text-[12px] text-gray-500">до {formatMoney(result.totalMaxFine)}</p>
            </div>
            <a
              href={`/auth/register?returnUrl=${encodeURIComponent('/cabinet')}&site=${encodeURIComponent(result.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}`}
              className="px-5 py-2.5 rounded-xl bg-[#6C5CE7] text-white text-[13px] font-medium"
            >
              Полный отчёт
            </a>
          </div>
        </div>
      )}

      {/* ────── Auth Modal ────── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-up">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#6C5CE7]/10 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <h3 className="text-[20px] font-semibold text-gray-800 mb-1">Подробности нарушений</h3>
              <p className="text-[14px] text-gray-500">
                Зарегистрируйтесь бесплатно, чтобы увидеть описание, рекомендации и план исправления всех нарушений
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                'Полный отчёт по всем нарушениям',
                'Технический аудит (SEO, безопасность)',
                'Ежемесячный мониторинг бесплатно',
                'История проверок в личном кабинете',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-[13px] text-gray-600">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5L6 11L12.5 4.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {item}
                </div>
              ))}
            </div>

            <a
              href={`/auth/register?returnUrl=${encodeURIComponent('/cabinet')}${result ? `&site=${encodeURIComponent(result.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}` : ''}`}
              className="block w-full text-center px-6 py-3.5 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4BD5] text-white text-[15px] font-medium transition-colors mb-3"
            >
              Создать аккаунт за 15 секунд
            </a>
            <a
              href="/auth/login"
              className="block w-full text-center text-[13px] text-gray-500 hover:text-[#6C5CE7] transition-colors"
            >
              Уже есть аккаунт? Войти
            </a>
          </div>
        </div>
      )}

      {/* Cookie Banner */}
      <CookieBanner />
    </div>
  );
}
