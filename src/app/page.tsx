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
    <div className="min-h-screen flex flex-col bg-white">
      {/* ────── Navigation ────── */}
      <nav className="bg-white sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-[980px] mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#6C5CE7" />
              <path d="M16 6L22 9.5V16.5L16 20L10 16.5V9.5L16 6Z" fill="white" fillOpacity="0.9" />
              <path d="M13 14L15 16.5L19.5 11.5" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 19L16 22.5L22 19" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 22L16 25.5L22 22" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[16px] font-bold tracking-tight text-gray-900 group-hover:text-primary transition-colors">
              Штрафометр
            </span>
          </a>
          <div className="flex items-center gap-4">
            {!isIdle && (
              <button
                onClick={() => { setAppState("idle"); setResult(null); setErrorMsg(""); setUrl(""); }}
                className="px-4 py-1.5 rounded-lg text-[13px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer"
              >
                Новая проверка
              </button>
            )}
            <span className="text-[12px] text-gray-400 hidden sm:block">
              Проверка сайта на штрафы по законам РФ
            </span>
          </div>
        </div>
      </nav>

      {/* ────── Hero / Form ────── */}
      <div className={`${isIdle ? "flex-1 flex items-center" : "pt-16 pb-10"} transition-all duration-500`}>
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

            {/* Total fines */}
            <div className="mb-8">
              <p className="text-[13px] text-gray-400 uppercase tracking-widest mb-2">
                Потенциальные штрафы
              </p>
              <p className="text-[40px] sm:text-[48px] font-semibold tracking-tight leading-none">
                <span className="text-gray-800">{formatMoney(result.totalMinFine)}</span>
                <span className="text-gray-300 mx-3">&mdash;</span>
                <span className="text-red">{formatMoney(result.totalMaxFine)}</span>
              </p>
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

          {/* Violations */}
          {result.violations.length > 0 && (
            <section className="mb-8 animate-fade-up animate-fade-up-delay-1">
              <h2 className="text-[13px] text-gray-400 uppercase tracking-widest mb-4 px-1">
                Нарушения
              </h2>
              <div className="space-y-2">
                {result.violations.map((v) => {
                  const sev = SEVERITY[v.severity];
                  const isOpen = expanded.has(v.id);
                  return (
                    <div
                      key={v.id}
                      className={`card rounded-2xl border-l-[3px] ${sev.css} overflow-hidden transition-all duration-300`}
                    >
                      <button
                        onClick={() => toggle(v.id)}
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
                            <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 font-mono shrink-0">
                              {v.id}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2 pl-0.5">
                            <span className="text-[14px] font-semibold tabular-nums" style={{ color: sev.color }}>
                              {formatMoney(v.minFine)} — {formatMoney(v.maxFine)}
                            </span>
                            <span className="text-[12px] text-gray-400">
                              {v.law} {v.article}
                            </span>
                          </div>
                        </div>
                        <ChevronDown open={isOpen} className="text-gray-400 mt-1.5" />
                      </button>

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
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <section className="mb-8 animate-fade-up animate-fade-up-delay-2">
              <h2 className="text-[13px] text-gray-400 uppercase tracking-widest mb-4 px-1">
                Предупреждения
              </h2>
              <div className="space-y-2">
                {result.warnings.map((w) => {
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
                })}
              </div>
            </section>
          )}

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

          {/* ────── Email-gate: Get detailed instructions ────── */}
          {result.violations.length > 0 && (
            <section className="mt-10 mb-6 animate-fade-up animate-fade-up-delay-3">
              {/* Email gate card */}
              {emailStatus !== "sent" && (
                <div className="card rounded-2xl p-8 sm:p-10 text-center">
                  <p className="text-[11px] text-primary uppercase tracking-widest mb-3">Бесплатно</p>
                  <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-gray-800 mb-3">
                    Получите инструкции по исправлению
                  </h2>
                  <p className="text-[14px] text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
                    Подробные рекомендации для каждого нарушения — бесплатно на ваш email.
                    Также отправим PDF-отчёт для руководства.
                  </p>

                  <div className="max-w-sm mx-auto flex gap-2">
                    <input
                      type="email"
                      placeholder="Ваш e-mail"
                      value={emailGate}
                      onChange={(e) => setEmailGate(e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-800 placeholder-gray-400 focus:border-primary transition-colors"
                    />
                    <button
                      onClick={async () => {
                        if (!emailGate.trim() || !emailGate.includes("@")) return;
                        setEmailStatus("sending");
                        try {
                          const res = await fetch("/api/order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email: emailGate.trim(),
                              siteUrl: result.url,
                              violations: result.stats.violations,
                              totalMaxFine: result.totalMaxFine,
                              productType: "email-lead",
                            }),
                          });
                          if (res.ok) setEmailStatus("sent");
                          else setEmailStatus("error");
                        } catch { setEmailStatus("error"); }
                      }}
                      disabled={!emailGate.trim() || !emailGate.includes("@") || emailStatus === "sending"}
                      className="px-6 py-3 bg-primary hover:bg-primary-hover disabled:bg-gray-300 disabled:opacity-50 rounded-xl text-[14px] font-medium text-white transition-all cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {emailStatus === "sending" ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                      ) : "Отправить"}
                    </button>
                  </div>
                  {emailStatus === "error" && (
                    <p className="text-[12px] text-red mt-2">Не удалось отправить. Попробуйте ещё раз.</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-3">
                    Нажимая кнопку, вы соглашаетесь с{" "}
                    <a href="/privacy" className="text-primary hover:underline">политикой конфиденциальности</a>
                  </p>
                </div>
              )}

              {emailStatus === "sent" && (
                <div className="card rounded-2xl p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path d="M7 15L11.5 19.5L21 9" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[18px] font-semibold text-gray-800 mb-1">Отправлено!</p>
                  <p className="text-[14px] text-gray-500">Инструкции и PDF-отчёт отправлены на {emailGate}</p>
                </div>
              )}
            </section>
          )}

          {/* ────── Pricing: Paid products ────── */}
          {result.violations.length > 0 && (
            <section className="mb-8 animate-fade-up animate-fade-up-delay-3">
              <div className="text-center mb-8">
                <p className="text-[11px] text-primary uppercase tracking-widest mb-3">
                  Устранить нарушения
                </p>
                <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-gray-800 mb-2">
                  Выберите подходящий вариант
                </h2>
                <p className="text-[14px] text-gray-500">
                  Потенциальные штрафы: до {formatMoney(result.totalMaxFine)} — дешевле исправить, чем платить
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1: PDF Report */}
                <div className="card rounded-2xl p-6 flex flex-col">
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">Отчёт</p>
                  <h3 className="text-[18px] font-semibold text-gray-800 mb-1">PDF для руководства</h3>
                  <p className="text-[12px] text-gray-500 leading-relaxed mb-4 flex-1">
                    Все нарушения, суммы штрафов, инструкции по исправлению. Готовый документ для передачи IT-отделу или подрядчику.
                  </p>
                  <p className="text-[28px] font-semibold text-gray-800 mb-1">
                    1 990 <span className="text-[16px] text-gray-400">&#8381;</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mb-4">Разовая покупка</p>
                  <button
                    onClick={() => {
                      setSelectedProduct("report");
                      setShowOrderForm(true);
                    }}
                    className="w-full py-3 rounded-xl text-[14px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer"
                  >
                    Скачать отчёт
                  </button>
                </div>

                {/* Card 2: Auto-fix (recommended) */}
                <div className="rounded-2xl p-6 flex flex-col relative overflow-hidden" style={{ background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)", border: "2px solid #6C5CE7" }}>
                  <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-semibold px-3 py-1 rounded-bl-xl">
                    Популярный
                  </span>
                  <p className="text-[11px] text-primary uppercase tracking-widest mb-2">Автоисправление</p>
                  <h3 className="text-[18px] font-semibold text-gray-800 mb-1">Исправим за вас</h3>
                  <p className="text-[12px] text-gray-500 leading-relaxed mb-4 flex-1">
                    Автоматическое устранение всех {result.stats.violations}{" "}
                    {pluralize(result.stats.violations, "нарушения", "нарушений", "нарушений")} через SSH/FTP.
                    Бэкап, отчёт, повторная проверка.
                  </p>
                  <p className="text-[28px] font-semibold text-gray-800 mb-1">
                    9 990 <span className="text-[16px] text-gray-400">&#8381;</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mb-4">Все нарушения, 3 дня</p>
                  <button
                    onClick={() => {
                      setSelectedProduct("autofix-std");
                      setShowOrderForm(true);
                    }}
                    className="w-full py-3 rounded-xl text-[14px] font-medium text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer shadow-md"
                  >
                    Оставить заявку
                  </button>
                </div>

                {/* Card 3: Monitoring */}
                <div className="card rounded-2xl p-6 flex flex-col">
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">Мониторинг</p>
                  <h3 className="text-[18px] font-semibold text-gray-800 mb-1">Защита от штрафов</h3>
                  <p className="text-[12px] text-gray-500 leading-relaxed mb-4 flex-1">
                    Автоматическая проверка по расписанию. Уведомления о новых нарушениях.
                    Отслеживание изменений в законодательстве.
                  </p>
                  <p className="text-[28px] font-semibold text-gray-800 mb-1">
                    490 <span className="text-[16px] text-gray-400">&#8381;/мес</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mb-4">Подписка, 1 сайт</p>
                  <button
                    onClick={() => {
                      setSelectedProduct("monitoring");
                      setShowOrderForm(true);
                    }}
                    className="w-full py-3 rounded-xl text-[14px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer"
                  >
                    Подключить
                  </button>
                </div>
              </div>

              {/* ────── Order Form (shared for all products) ────── */}
              {showOrderForm && orderStatus !== "sent" && (
                <div className="mt-6 card rounded-2xl p-8 sm:p-10 max-w-lg mx-auto animate-fade-up">
                  <h3 className="text-[17px] font-semibold text-gray-800 mb-1 text-center">
                    {selectedProduct === "report" ? "Оформление отчёта" :
                     selectedProduct === "monitoring" ? "Подключение мониторинга" :
                     "Заявка на исправление"}
                  </h3>
                  <p className="text-[12px] text-gray-400 text-center mb-6">
                    {selectedProduct === "report" ? "PDF-отчёт • 1 990 ₽" :
                     selectedProduct === "autofix-std" ? "Автоисправление • 9 990 ₽" :
                     selectedProduct === "monitoring" ? "Мониторинг • 490 ₽/мес" :
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
                        Даю согласие на{" "}
                        <a href="/privacy" target="_blank" className="text-primary hover:underline">
                          обработку персональных данных
                        </a>{" "}
                        в соответствии с Федеральным законом N 152-ФЗ
                      </span>
                    </label>

                    <button
                      onClick={async () => {
                        if (!orderForm.name.trim() || !orderForm.phone.trim() || !orderConsent) return;
                        setOrderStatus("sending");
                        try {
                          const res = await fetch("/api/order", {
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
                          if (res.ok) {
                            setOrderStatus("sent");
                          } else {
                            setOrderStatus("error");
                          }
                        } catch {
                          setOrderStatus("error");
                        }
                      }}
                      disabled={!orderForm.name.trim() || !orderForm.phone.trim() || !orderConsent || orderStatus === "sending"}
                      className="w-full px-8 py-3.5 bg-primary hover:bg-primary-hover disabled:bg-gray-300 disabled:opacity-50 rounded-xl text-[14px] font-medium text-white transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {orderStatus === "sending" ? (
                        <span className="flex items-center justify-center gap-2.5">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Отправляю
                        </span>
                      ) : (
                        "Отправить заявку"
                      )}
                    </button>

                    {orderStatus === "error" && (
                      <p className="text-[13px] text-red text-center">
                        Не удалось отправить. Позвоните нам: 8 (499) 110-55-49
                      </p>
                    )}
                  </div>
                </div>
              )}

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

      {/* ────── Footer ────── */}
      <footer className={`${isIdle ? "" : "mt-auto"} border-t border-gray-200 mt-12 bg-gray-50`}>
        <div className="max-w-[980px] mx-auto px-6 py-10">
          {/* Company info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Column 1: Company */}
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Организация</p>
              <p className="text-[13px] text-gray-800 font-medium mb-1">ООО &laquo;Инфологистик 24&raquo;</p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                ИНН 9701049890<br />
                ОГРН 1167746879486<br />
                КПП 772301001
              </p>
            </div>

            {/* Column 2: Contacts */}
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Контакты</p>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                <a href="tel:+74991105549" className="text-gray-800 hover:text-primary transition-colors">
                  8 (499) 110-55-49
                </a>
                <br />
                <a href="mailto:info@infolog24.ru" className="text-gray-800 hover:text-primary transition-colors">
                  info@infolog24.ru
                </a>
                <br />
                <span className="text-gray-400">Пн — Пт, 9:00 — 21:00</span>
              </p>
            </div>

            {/* Column 3: Address */}
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Адрес</p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                109044, г. Москва,<br />
                2-й Крутицкий пер., д. 18, стр. 1,<br />
                помещ. 2/1
              </p>
              <p className="text-[12px] text-gray-400 mt-2">
                Адрес для претензий совпадает с юридическим
              </p>
            </div>
          </div>

          {/* Links + copyright */}
          <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4 text-[12px]">
              <a href="/privacy" className="text-gray-500 hover:text-gray-800 transition-colors">
                Политика конфиденциальности
              </a>
              <a href="/privacy" className="text-gray-500 hover:text-gray-800 transition-colors">
                Согласие на обработку ПДн
              </a>
            </div>
            <p className="text-[11px] text-gray-400">
              &copy; {new Date().getFullYear()} ООО &laquo;Инфологистик 24&raquo;. Все права защищены.
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-gray-400 mt-6 leading-relaxed max-w-2xl">
            Сервис выполняет автоматическую проверку и не является юридической
            консультацией. Результаты носят информационный характер.
            Для получения квалифицированной помощи обратитесь к юристу,
            специализирующемуся на интернет-праве. 18+
          </p>
        </div>
      </footer>

      {/* Cookie Banner */}
      <CookieBanner />
    </div>
  );
}
