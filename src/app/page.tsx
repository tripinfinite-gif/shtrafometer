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
  critical: { label: "Критично", color: "#ff3b30", css: "severity-critical" },
  high: { label: "Высокий", color: "#ff9500", css: "severity-high" },
  medium: { label: "Средний", color: "#ffd60a", css: "severity-medium" },
  low: { label: "Низкий", color: "#0071e3", css: "severity-low" },
} as const;

const RISK = {
  critical: { label: "Критический риск", color: "#ff3b30" },
  high: { label: "Высокий риск", color: "#ff9500" },
  medium: { label: "Средний риск", color: "#ffd60a" },
  low: { label: "Низкий риск", color: "#30d158" },
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
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="#30d158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 shrink-0">
      <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="#0071e3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
      <div className="max-w-[680px] mx-auto glass rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-[13px] text-apple-gray-2 flex-1 leading-relaxed">
          Мы используем файлы cookie для обеспечения работы сайта.
          Подробнее в{" "}
          <a href="/privacy" className="text-apple-blue hover:underline">
            Политике конфиденциальности
          </a>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-xl text-[13px] text-apple-gray-2 border border-white/[0.08] hover:border-white/[0.15] transition-colors cursor-pointer"
          >
            Отклонить
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-xl text-[13px] text-white bg-apple-blue hover:bg-apple-blue-hover transition-colors cursor-pointer"
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
    <div className="min-h-screen flex flex-col">
      {/* ────── Navigation ────── */}
      <nav className="glass sticky top-0 z-50 border-b border-white/[0.06]">
        <div className="max-w-[980px] mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-[13px] font-medium tracking-tight text-apple-gray-1">
            Штрафометр
          </span>
          <span className="text-[11px] text-apple-gray-2">
            Проверка сайта на штрафы по законам РФ
          </span>
        </div>
      </nav>

      {/* ────── Hero / Form ────── */}
      <div className={`${isIdle ? "flex-1 flex items-center" : "pt-16 pb-10"} transition-all duration-500`}>
        <div className="max-w-[980px] mx-auto px-6 w-full">
          {isIdle && (
            <div className="text-center mb-16 animate-fade-up">
              <h1 className="text-[56px] sm:text-[72px] leading-[1.05] font-semibold tracking-tight text-apple-gray-1 mb-4">
                Проверка сайта
                <br />
                <span className="bg-gradient-to-r from-apple-blue to-[#40c8e0] bg-clip-text text-transparent">
                  на штрафы.
                </span>
              </h1>
              <p className="text-[21px] text-apple-gray-2 font-normal max-w-xl mx-auto leading-relaxed">
                Мгновенный анализ вашего сайта на соответствие
                законодательству Российской Федерации.
              </p>
            </div>
          )}

          {/* Search bar */}
          <div className={`max-w-[680px] mx-auto ${isIdle ? "animate-fade-up animate-fade-up-delay-1" : ""}`}>
            <div className="glass rounded-2xl p-1.5 flex flex-col sm:flex-row gap-1.5">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !appState.includes("loading") && url.trim() && handleCheck()}
                placeholder="Введите адрес сайта"
                disabled={appState === "loading"}
                className="flex-1 bg-transparent px-5 py-3.5 text-[17px] text-apple-gray-1 placeholder-apple-gray-3 border-0 focus:ring-0 focus:shadow-none disabled:opacity-40 rounded-xl"
              />
              <button
                onClick={handleCheck}
                disabled={appState === "loading" || !url.trim()}
                className="px-8 py-3.5 bg-apple-blue hover:bg-apple-blue-hover disabled:bg-apple-gray-3 disabled:opacity-50 rounded-xl text-[15px] font-medium text-white transition-all duration-200 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
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
                <span key={t} className="px-3 py-1 rounded-full text-[12px] text-apple-gray-2 border border-white/[0.06]">
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
            <p className="text-[17px] text-apple-gray-1 font-medium">{STAGES[stage]}</p>
            <p className="text-[13px] text-apple-gray-3 mt-1">{stage + 1} из {STAGES.length}</p>
          </div>
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
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
          <div className="glass rounded-2xl p-6 text-center border-apple-red/20">
            <p className="text-[15px] text-apple-red">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ────── Results ────── */}
      {appState === "success" && result && (
        <div className="max-w-[980px] mx-auto px-6 pb-20">

          {/* Summary */}
          <div className="glass rounded-2xl p-8 sm:p-10 mb-8 animate-fade-up">
            {/* Risk + site type */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <span
                className="px-3.5 py-1 rounded-full text-[12px] font-semibold tracking-wide"
                style={{ color: RISK[result.riskLevel].color, background: `${RISK[result.riskLevel].color}15`, border: `1px solid ${RISK[result.riskLevel].color}30` }}
              >
                {RISK[result.riskLevel].label}
              </span>
              <span className="px-3.5 py-1 rounded-full text-[12px] text-apple-gray-2 border border-white/[0.06]">
                {SITE_LABELS[result.siteType]}
              </span>
              <span className="text-[12px] text-apple-gray-3 sm:ml-auto">
                {result.url}
              </span>
            </div>

            {/* Total fines */}
            <div className="mb-8">
              <p className="text-[13px] text-apple-gray-2 uppercase tracking-widest mb-2">
                Потенциальные штрафы
              </p>
              <p className="text-[40px] sm:text-[48px] font-semibold tracking-tight leading-none">
                <span className="text-apple-gray-1">{formatMoney(result.totalMinFine)}</span>
                <span className="text-apple-gray-3 mx-3">—</span>
                <span className="text-apple-red">{formatMoney(result.totalMaxFine)}</span>
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { n: result.stats.violations, label: pluralize(result.stats.violations, "нарушение", "нарушения", "нарушений"), color: "#ff3b30" },
                { n: result.stats.warnings, label: pluralize(result.stats.warnings, "предупреждение", "предупреждения", "предупреждений"), color: "#ff9500" },
                { n: result.stats.passed, label: pluralize(result.stats.passed, "проверка пройдена", "проверки пройдены", "проверок пройдено"), color: "#30d158" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-[32px] sm:text-[40px] font-semibold tracking-tight" style={{ color: s.color }}>{s.n}</p>
                  <p className="text-[12px] text-apple-gray-2 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* By law */}
            {Object.keys(result.finesByLaw).length > 0 && (
              <div>
                <p className="text-[11px] text-apple-gray-3 uppercase tracking-widest mb-3">По законам</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(result.finesByLaw).map(([law, d]) => (
                    <div key={law} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-4 py-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[14px] font-medium text-apple-gray-1">{law}</span>
                        <span className="text-[11px] text-apple-gray-3">{d.count}</span>
                      </div>
                      <span className="text-[13px] text-apple-gray-2 tabular-nums">
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
              <h2 className="text-[13px] text-apple-gray-3 uppercase tracking-widest mb-4 px-1">
                Нарушения
              </h2>
              <div className="space-y-2">
                {result.violations.map((v) => {
                  const sev = SEVERITY[v.severity];
                  const isOpen = expanded.has(v.id);
                  return (
                    <div
                      key={v.id}
                      className={`glass rounded-2xl border-l-[3px] ${sev.css} overflow-hidden transition-all duration-300`}
                    >
                      <button
                        onClick={() => toggle(v.id)}
                        className="w-full text-left px-6 py-5 flex items-start gap-4 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-[15px] font-medium text-apple-gray-1 leading-snug">
                              {v.title}
                            </h3>
                            <span className="text-[10px] text-apple-gray-3 bg-white/[0.04] rounded px-1.5 py-0.5 font-mono shrink-0">
                              {v.id}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="text-[14px] font-semibold tabular-nums" style={{ color: sev.color }}>
                              {formatMoney(v.minFine)} — {formatMoney(v.maxFine)}
                            </span>
                            <span className="text-[12px] text-apple-gray-3">
                              {v.law} {v.article}
                            </span>
                          </div>
                        </div>
                        <ChevronDown open={isOpen} className="text-apple-gray-3 mt-1.5" />
                      </button>

                      <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <div className="px-6 pb-6 pt-2 space-y-4 border-t border-white/[0.04]">
                            <p className="text-[14px] text-apple-gray-2 leading-relaxed">{v.description}</p>

                            {v.details.length > 0 && (
                              <div className="space-y-2">
                                {v.details.map((d, i) => (
                                  <div key={i} className="flex items-start gap-2.5 text-[13px] text-apple-gray-2">
                                    <span className="w-1 h-1 rounded-full bg-apple-gray-3 mt-2 shrink-0" />
                                    <span className="break-all">{d}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {v.recommendation && (
                              <div className="flex items-start gap-2.5 rounded-xl bg-apple-blue/[0.06] border border-apple-blue/[0.1] px-4 py-3">
                                <ArrowIcon />
                                <p className="text-[13px] text-apple-gray-1 leading-relaxed">{v.recommendation}</p>
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
              <h2 className="text-[13px] text-apple-gray-3 uppercase tracking-widest mb-4 px-1">
                Предупреждения
              </h2>
              <div className="space-y-2">
                {result.warnings.map((w) => {
                  const isOpen = expanded.has(w.id);
                  return (
                    <div key={w.id} className="glass rounded-2xl border-l-[3px] severity-medium overflow-hidden">
                      <button
                        onClick={() => toggle(w.id)}
                        className="w-full text-left px-6 py-5 flex items-start gap-4 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-medium text-apple-gray-1 leading-snug mb-2">{w.title}</h3>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[14px] font-semibold text-apple-orange">{w.potentialFine}</span>
                            <span className="text-[12px] text-apple-gray-3">{w.law} {w.article}</span>
                          </div>
                        </div>
                        <ChevronDown open={isOpen} className="text-apple-gray-3 mt-1.5" />
                      </button>

                      <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <div className="px-6 pb-6 pt-2 space-y-4 border-t border-white/[0.04]">
                            <p className="text-[14px] text-apple-gray-2 leading-relaxed">{w.description}</p>
                            {w.recommendation && (
                              <div className="flex items-start gap-2.5 rounded-xl bg-apple-blue/[0.06] border border-apple-blue/[0.1] px-4 py-3">
                                <ArrowIcon />
                                <p className="text-[13px] text-apple-gray-1 leading-relaxed">{w.recommendation}</p>
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
            <div className="glass rounded-2xl p-10 text-center mb-8 animate-fade-up">
              <p className="text-[21px] font-medium text-apple-green mb-2">Нарушений не найдено</p>
              <p className="text-[15px] text-apple-gray-2">
                Сайт соответствует основным требованиям законодательства РФ
              </p>
            </div>
          )}

          {/* Passed */}
          {result.passed.length > 0 && (
            <section className="animate-fade-up animate-fade-up-delay-3">
              <button
                onClick={() => setShowPassed((p) => !p)}
                className="w-full glass rounded-2xl px-6 py-4 flex items-center justify-between cursor-pointer"
              >
                <span className="text-[14px] font-medium text-apple-green">
                  {result.passed.length} {pluralize(result.passed.length, "проверка пройдена", "проверки пройдены", "проверок пройдено")}
                </span>
                <ChevronDown open={showPassed} className="text-apple-gray-3" />
              </button>

              <div className={`grid transition-all duration-300 ${showPassed ? "grid-rows-[1fr] mt-2" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="glass rounded-2xl px-6 py-4 space-y-2.5">
                    {result.passed.map((c) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <CheckIcon />
                        <span className="text-[13px] text-apple-gray-2">{c.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ────── CTA: Order Fix ────── */}
          {result.violations.length > 0 && (
            <section className="mt-10 mb-8 animate-fade-up animate-fade-up-delay-3">
              <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(0,113,227,0.12) 0%, rgba(64,200,224,0.08) 100%)", border: "1px solid rgba(0,113,227,0.15)" }}>
                <div className="px-8 py-10 sm:px-10 sm:py-12">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <p className="text-[11px] text-apple-blue uppercase tracking-widest mb-3">
                      Исправить все нарушения
                    </p>
                    <h2 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-apple-gray-1 mb-3">
                      Приведём ваш сайт
                      <br />
                      в соответствие за 3 дня
                    </h2>
                    <p className="text-[15px] text-apple-gray-2 max-w-md mx-auto leading-relaxed">
                      Наши специалисты устранят все {result.stats.violations}{" "}
                      {pluralize(result.stats.violations, "нарушение", "нарушения", "нарушений")} и
                      избавят вас от штрафов на сумму до {formatMoney(result.totalMaxFine)}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-8">
                    <p className="text-[48px] sm:text-[56px] font-semibold tracking-tight text-apple-gray-1">
                      9 900 <span className="text-[28px] text-apple-gray-2">&#8381;</span>
                    </p>
                    <p className="text-[13px] text-apple-gray-3 mt-1">
                      Фиксированная цена за все исправления
                    </p>
                  </div>

                  {/* Benefits */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 max-w-xl mx-auto">
                    {[
                      { title: "3 дня", desc: "Срок выполнения" },
                      { title: "Гарантия", desc: "Повторная проверка" },
                      { title: "Документы", desc: "Политика, согласия" },
                    ].map((b) => (
                      <div key={b.title} className="text-center">
                        <p className="text-[17px] font-semibold text-apple-gray-1">{b.title}</p>
                        <p className="text-[12px] text-apple-gray-3">{b.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Toggle form */}
                  {!showOrderForm && orderStatus !== "sent" && (
                    <div className="text-center">
                      <button
                        onClick={() => setShowOrderForm(true)}
                        className="px-10 py-4 bg-apple-blue hover:bg-apple-blue-hover rounded-2xl text-[17px] font-medium text-white transition-all duration-200 cursor-pointer"
                      >
                        Оставить заявку
                      </button>
                    </div>
                  )}

                  {/* Order form */}
                  {showOrderForm && orderStatus !== "sent" && (
                    <div className="max-w-md mx-auto space-y-4">
                      <input
                        type="text"
                        placeholder="Ваше имя"
                        value={orderForm.name}
                        onChange={(e) => setOrderForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-5 py-3.5 text-[15px] text-apple-gray-1 placeholder-apple-gray-3 focus:border-apple-blue transition-colors"
                      />
                      <input
                        type="tel"
                        placeholder="Телефон"
                        value={orderForm.phone}
                        onChange={(e) => setOrderForm((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-5 py-3.5 text-[15px] text-apple-gray-1 placeholder-apple-gray-3 focus:border-apple-blue transition-colors"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={orderForm.email}
                        onChange={(e) => setOrderForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-5 py-3.5 text-[15px] text-apple-gray-1 placeholder-apple-gray-3 focus:border-apple-blue transition-colors"
                      />

                      {/* Consent checkbox */}
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={orderConsent}
                          onChange={(e) => setOrderConsent(e.target.checked)}
                          className="mt-1 w-4 h-4 rounded border-white/[0.15] bg-transparent text-apple-blue focus:ring-apple-blue cursor-pointer accent-[#0071e3]"
                        />
                        <span className="text-[12px] text-apple-gray-2 leading-relaxed">
                          Даю согласие на{" "}
                          <a href="/privacy" target="_blank" className="text-apple-blue hover:underline">
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
                        className="w-full px-8 py-4 bg-apple-blue hover:bg-apple-blue-hover disabled:bg-apple-gray-3 disabled:opacity-50 rounded-xl text-[15px] font-medium text-white transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
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
                        <p className="text-[13px] text-apple-red text-center">
                          Не удалось отправить. Позвоните нам: 8 (499) 110-55-49
                        </p>
                      )}
                    </div>
                  )}

                  {/* Success */}
                  {orderStatus === "sent" && (
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-apple-green/10 flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                          <path d="M8 17L13 22L24 10" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-[21px] font-semibold text-apple-gray-1 mb-2">
                        Заявка отправлена
                      </p>
                      <p className="text-[15px] text-apple-gray-2">
                        Мы свяжемся с вами в ближайшее время для уточнения деталей
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ────── Footer ────── */}
      <footer className={`${isIdle ? "" : "mt-auto"} border-t border-white/[0.04] mt-12`}>
        <div className="max-w-[980px] mx-auto px-6 py-10">
          {/* Company info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Column 1: Company */}
            <div>
              <p className="text-[11px] text-apple-gray-3 uppercase tracking-widest mb-3">Организация</p>
              <p className="text-[13px] text-apple-gray-1 font-medium mb-1">ООО &laquo;Инфологистик 24&raquo;</p>
              <p className="text-[12px] text-apple-gray-2 leading-relaxed">
                ИНН 9701049890<br />
                ОГРН 1167746879486<br />
                КПП 772301001
              </p>
            </div>

            {/* Column 2: Contacts */}
            <div>
              <p className="text-[11px] text-apple-gray-3 uppercase tracking-widest mb-3">Контакты</p>
              <p className="text-[13px] text-apple-gray-2 leading-relaxed">
                <a href="tel:+74991105549" className="text-apple-gray-1 hover:text-apple-blue transition-colors">
                  8 (499) 110-55-49
                </a>
                <br />
                <a href="mailto:info@infolog24.ru" className="text-apple-gray-1 hover:text-apple-blue transition-colors">
                  info@infolog24.ru
                </a>
                <br />
                <span className="text-apple-gray-3">Пн — Пт, 9:00 — 21:00</span>
              </p>
            </div>

            {/* Column 3: Address */}
            <div>
              <p className="text-[11px] text-apple-gray-3 uppercase tracking-widest mb-3">Адрес</p>
              <p className="text-[12px] text-apple-gray-2 leading-relaxed">
                109044, г. Москва,<br />
                2-й Крутицкий пер., д. 18, стр. 1,<br />
                помещ. 2/1
              </p>
              <p className="text-[12px] text-apple-gray-3 mt-2">
                Адрес для претензий совпадает с юридическим
              </p>
            </div>
          </div>

          {/* Links + copyright */}
          <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4 text-[12px]">
              <a href="/privacy" className="text-apple-gray-2 hover:text-apple-gray-1 transition-colors">
                Политика конфиденциальности
              </a>
              <a href="/privacy" className="text-apple-gray-2 hover:text-apple-gray-1 transition-colors">
                Согласие на обработку ПДн
              </a>
            </div>
            <p className="text-[11px] text-apple-gray-3">
              &copy; {new Date().getFullYear()} ООО &laquo;Инфологистик 24&raquo;. Все права защищены.
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-apple-gray-3 mt-6 leading-relaxed max-w-2xl">
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
