"use client";

import { useState } from "react";
import Link from "next/link";
// @ts-expect-error -- react-dom types not installed
import { createPortal } from "react-dom";

// ─── Types ───────────────────────────────────────────────────────────

type ProductType = "report" | "autofix-basic" | "autofix-std" | "autofix-prem" | "monitoring" | "consulting";

const PRODUCT_LABELS: Record<ProductType, string> = {
  report: "PDF-отчёт • 1 990 ₽",
  "autofix-basic": "Автоисправление Базовый • 4 990 ₽",
  "autofix-std": "Автоисправление Стандарт • 9 990 ₽",
  "autofix-prem": "Автоисправление Премиум • 14 990 ₽",
  monitoring: "Мониторинг • 490 ₽/мес",
  consulting: "Консалтинг • 15 000 ₽",
};

const PRODUCT_TITLES: Record<ProductType, string> = {
  report: "Оформление отчёта",
  "autofix-basic": "Заявка на исправление",
  "autofix-std": "Заявка на исправление",
  "autofix-prem": "Заявка на исправление",
  monitoring: "Подключение мониторинга",
  consulting: "Заявка на консалтинг",
};

// ─── FAQ Data ────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "Что если нарушений на сайте не найдено?",
    a: "Мы проверяем сайт бесплатно. Если нарушений нет — вы получите отчёт с подтверждением соответствия. Платить ничего не нужно.",
  },
  {
    q: "Как быстро исправляются нарушения?",
    a: "Автоматическое исправление занимает от нескольких часов до 3 рабочих дней. Мы делаем бэкап перед любыми изменениями и проводим повторную проверку.",
  },
  {
    q: "Нужен ли доступ к сайту для исправлений?",
    a: "Для проверки — нет, мы анализируем только публичный HTML. Для исправлений понадобится SSH или FTP доступ. Все данные зашифрованы AES-256 и удаляются сразу после работы.",
  },
  {
    q: "Можно ли получить акт и счёт для бухгалтерии?",
    a: "Да. После оплаты мы предоставляем договор-оферту, акт выполненных работ и счёт-фактуру. Работаем с юрлицами и ИП.",
  },
  {
    q: "Какие законы вы проверяете?",
    a: "152-ФЗ (персональные данные), 38-ФЗ (реклама), 436-ФЗ (возрастная маркировка), ЗоЗПП (права потребителей), 168-ФЗ (русский язык), 54-ФЗ (онлайн-кассы) — всего 8 законов и 28 категорий штрафов.",
  },
  {
    q: "Что будет, если не исправлять нарушения?",
    a: "Роскомнадзор и ФАС проводят плановые и внеплановые проверки. Штрафы — от 100 000 до 18 000 000 ₽ в зависимости от нарушения. С мая 2025 года штрафы за нарушения 152-ФЗ выросли в 10 раз.",
  },
  {
    q: "Вы гарантируете результат?",
    a: "Да. Если результат не устроит — вернём деньги в течение 24 часов. Мы также проводим повторную бесплатную проверку после исправлений.",
  },
];

// ─── Component ───────────────────────────────────────────────────────

export default function PricingPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("autofix-std");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", email: "" });
  const [orderConsent, setOrderConsent] = useState(false);
  const [orderStatus, setOrderStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSelect = (product: ProductType) => {
    setSelectedProduct(product);
    setShowOrderForm(true);
  };

  // Checkmark SVG
  const Check = () => (
    <svg className="inline shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7.5L5.5 10L11 4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const Dash = () => <span className="text-gray-300">&mdash;</span>;

  return (
    <main className="bg-white">
      {/* ── Hero ── */}
      <section className="pt-16 pb-12 bg-gradient-to-b from-[#F5F3FF] to-white">
        <div className="max-w-[1120px] mx-auto px-6 text-center">
          <p className="text-[11px] text-primary uppercase tracking-widest mb-3">Каталог услуг</p>
          <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-gray-900 mb-3">
            Приведём ваш сайт в соответствие<br className="hidden sm:block" /> с законами РФ
          </h1>
          <p className="text-[15px] text-gray-500 max-w-xl mx-auto mb-6">
            Проверяем 28 категорий нарушений по 8 законам. Исправляем автоматически.
            Средний штраф за нарушение — 300 000 ₽. Исправить дешевле.
          </p>
          <Link
            href="/#check"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl text-[14px] font-medium text-white transition-colors"
          >
            Проверить сайт бесплатно
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
      </section>

      {/* ── Savings calculator ── */}
      <section className="py-10">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="card rounded-2xl p-6 sm:p-8 text-center bg-gradient-to-r from-red/5 to-green/5 border border-gray-100">
            <p className="text-[13px] text-gray-500 mb-2">Средний штраф за нарушения на сайте</p>
            <p className="text-[36px] sm:text-[48px] font-bold text-red mb-1">300 000 ₽</p>
            <p className="text-[13px] text-gray-400 mb-4">а исправить все нарушения — всего</p>
            <p className="text-[36px] sm:text-[48px] font-bold text-green">9 990 ₽</p>
            <p className="text-[13px] text-gray-500 mt-4">
              Экономия: <span className="font-semibold text-green">в 30 раз дешевле</span>, чем один штраф
            </p>
          </div>
        </div>
      </section>

      {/* ── Main pricing: 3 autofix tiers ── */}
      <section className="pb-6">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-[11px] text-primary uppercase tracking-widest mb-3">Исправление нарушений</p>
            <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-gray-800">
              Исправим за вас — выберите тариф
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Tier 1: Basic */}
            <div className="card rounded-2xl p-6 flex flex-col">
              <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">Базовый</p>
              <h3 className="text-[18px] font-semibold text-gray-800 mb-1">1 категория</h3>
              <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                Автоисправление нарушений в одной категории на выбор: персональные данные, локализация или реклама.
              </p>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Бэкап перед изменениями</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Отчёт о работах на e-mail</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-300">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 6h.01" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/></svg>
                  Повторная проверка
                </div>
              </div>
              <p className="text-[28px] font-semibold text-gray-800 mb-1">
                4 990 <span className="text-[16px] text-gray-400">&#8381;</span>
              </p>
              <p className="text-[11px] text-gray-400 mb-4">Разовая покупка</p>
              <button onClick={() => handleSelect("autofix-basic")} className="w-full py-3 rounded-xl text-[14px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer">
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
                Автоматическое устранение всех найденных нарушений через SSH/FTP. Полный охват.
              </p>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Бэкап перед изменениями</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Отчёт о работах на e-mail</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Повторная проверка через 3 дня</div>
              </div>
              <p className="text-[28px] font-semibold text-gray-800 mb-1">
                9 990 <span className="text-[16px] text-gray-400">&#8381;</span>
              </p>
              <p className="text-[11px] text-gray-400 mb-4">Все категории, до 3 дней</p>
              <button onClick={() => handleSelect("autofix-std")} className="w-full py-3 rounded-xl text-[14px] font-medium text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer shadow-md">
                Выбрать
              </button>
            </div>

            {/* Tier 3: Premium */}
            <div className="card rounded-2xl p-6 flex flex-col">
              <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">Премиум</p>
              <h3 className="text-[18px] font-semibold text-gray-800 mb-1">Все + эксперт</h3>
              <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                Автоисправление всех нарушений + ручная проверка экспертом по интернет-праву.
              </p>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Бэкап перед изменениями</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Повторная проверка + отчёт</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Персональные рекомендации эксперта</div>
              </div>
              <p className="text-[28px] font-semibold text-gray-800 mb-1">
                14 990 <span className="text-[16px] text-gray-400">&#8381;</span>
              </p>
              <p className="text-[11px] text-gray-400 mb-4">Все категории + экспертиза</p>
              <button onClick={() => handleSelect("autofix-prem")} className="w-full py-3 rounded-xl text-[14px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer">
                Выбрать
              </button>
            </div>
          </div>

          {/* ── Feature comparison table ── */}
          <div className="card rounded-2xl overflow-hidden mb-10">
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
                {([
                  ["Автоисправление нарушений", "1 категория", "Все", "Все"],
                  ["Бэкап данных", true, true, true],
                  ["Отчёт о работах", true, true, true],
                  ["Повторная проверка", false, true, true],
                  ["Ручная проверка экспертом", false, false, true],
                  ["Персональные рекомендации", false, false, true],
                  ["Срок выполнения", "до 3 дней", "до 3 дней", "до 5 дней"],
                ] as [string, string | boolean, string | boolean, string | boolean][]).map(([feature, basic, std, prem], i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="p-3 pl-5 text-gray-600">{feature}</td>
                    {[basic, std, prem].map((val, j) => (
                      <td key={j} className={`p-3 text-center ${j === 1 ? "bg-primary/5" : ""}`}>
                        {val === true ? <Check /> : val === false ? <Dash /> : <span className="text-[11px] font-medium">{val}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Additional services ── */}
      <section className="pb-10">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="text-center mb-6">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Дополнительные услуги</p>
            <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-gray-800">
              Отчёты, мониторинг и консалтинг
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* PDF Report */}
            <div className="card rounded-2xl p-6 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 2h7l4 5v11a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#6C5CE7" strokeWidth="1.3" strokeLinejoin="round"/><path d="M13 2v5h4M8 11h4M8 14h2" stroke="#6C5CE7" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 className="text-[16px] font-semibold text-gray-800 mb-1">PDF-отчёт для руководства</h3>
              <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                Все нарушения, суммы штрафов, пошаговые инструкции по исправлению. Готовый документ для IT-отдела или подрядчика.
              </p>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Инструкции по каждому нарушению</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Ссылки на статьи законов</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Доставка на e-mail за 10 минут</div>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <p className="text-[24px] font-semibold text-gray-800">1 990 <span className="text-[14px] text-gray-400">&#8381;</span></p>
                <button onClick={() => handleSelect("report")} className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer">
                  Заказать
                </button>
              </div>
            </div>

            {/* Monitoring */}
            <div className="card rounded-2xl p-6 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18A8 8 0 1010 2a8 8 0 000 16z" stroke="#22C55E" strokeWidth="1.3"/><path d="M10 5v5l3 3" stroke="#22C55E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 className="text-[16px] font-semibold text-gray-800 mb-1">Мониторинг &laquo;Защита от штрафов&raquo;</h3>
              <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                Ежемесячная автоматическая проверка. Уведомления о новых нарушениях и изменениях в законодательстве.
              </p>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Ежемесячный отчёт на e-mail</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Мгновенные уведомления</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Активация в течение 24 часов</div>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <p className="text-[24px] font-semibold text-gray-800">490 <span className="text-[14px] text-gray-400">&#8381;/мес</span></p>
                <button onClick={() => handleSelect("monitoring")} className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer">
                  Подключить
                </button>
              </div>
            </div>

            {/* Consulting */}
            <div className="card rounded-2xl p-6 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 016 6c0 1.8-.8 3.3-2 4.3L13.5 16h-7l-.5-3.7A6 6 0 0110 2z" stroke="#F59E0B" strokeWidth="1.3" strokeLinejoin="round"/><path d="M8 16v1a2 2 0 004 0v-1" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round"/></svg>
              </div>
              <h3 className="text-[16px] font-semibold text-gray-800 mb-1">Консалтинг</h3>
              <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                Экспертный аудит сайта специалистом по интернет-праву. Подготовка индивидуальных юридических документов.
              </p>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Персональный аудит экспертом</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Юридические документы под ключ</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500"><Check /> Письменные рекомендации</div>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <p className="text-[24px] font-semibold text-gray-800">15 000 <span className="text-[14px] text-gray-400">&#8381;</span></p>
                <button onClick={() => handleSelect("consulting")} className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-primary bg-primary-lighter hover:bg-primary-light border border-primary/20 transition-colors cursor-pointer">
                  Заказать
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals ── */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="text-center p-5">
              <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L3 5.5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V5.5L10 2Z" stroke="#22C55E" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 10.5L9 12.5L13 8" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-[14px] font-semibold text-gray-800 mb-1">Безопасная оплата</p>
              <p className="text-[12px] text-gray-500">PCI DSS через ЮKassa. Данные карт не хранятся.</p>
            </div>
            <div className="text-center p-5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18C14.4 18 18 14.4 18 10S14.4 2 10 2 2 5.6 2 10s3.6 8 8 8z" stroke="#6C5CE7" strokeWidth="1.5"/><path d="M7 10.5L9 12.5L13 7.5" stroke="#6C5CE7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-[14px] font-semibold text-gray-800 mb-1">Гарантия возврата</p>
              <p className="text-[12px] text-gray-500">Не устроит результат — вернём деньги за 24 часа.</p>
            </div>
            <div className="text-center p-5">
              <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L12.5 7.5L18 8L14 12L15 18L10 15L5 18L6 12L2 8L7.5 7.5L10 2Z" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-[14px] font-semibold text-gray-800 mb-1">2 500+ проверок</p>
              <p className="text-[12px] text-gray-500">Нам доверяют компании по всей России.</p>
            </div>
            <div className="text-center p-5">
              <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 16V4a1 1 0 011-1h6l4 4v9a1 1 0 01-1 1H5a1 1 0 01-1-1z" stroke="#3B82F6" strokeWidth="1.5" strokeLinejoin="round"/><path d="M11 3v4h4" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p className="text-[14px] font-semibold text-gray-800 mb-1">Документы для юрлиц</p>
              <p className="text-[12px] text-gray-500">Договор, акт, счёт-фактура для бухгалтерии.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-12">
        <div className="max-w-[720px] mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-[11px] text-primary uppercase tracking-widest mb-3">Вопросы и ответы</p>
            <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-gray-800">
              Частые вопросы
            </h2>
          </div>

          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="card rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[14px] font-medium text-gray-800 pr-4">{item.q}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    className={`shrink-0 text-gray-400 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-12 bg-gradient-to-b from-white to-[#F5F3FF]">
        <div className="max-w-[1120px] mx-auto px-6 text-center">
          <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-gray-800 mb-3">
            Начните с бесплатной проверки
          </h2>
          <p className="text-[14px] text-gray-500 mb-6 max-w-lg mx-auto">
            Узнайте, какие нарушения есть на вашем сайте и сколько могут составить штрафы. Проверка занимает 30 секунд.
          </p>
          <Link
            href="/#check"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary-hover rounded-xl text-[15px] font-medium text-white transition-colors shadow-md"
          >
            Проверить сайт бесплатно
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
      </section>

      {/* ── Sticky mobile CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3">
        <button
          onClick={() => handleSelect("autofix-std")}
          className="w-full py-3 rounded-xl text-[14px] font-medium text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer shadow-md"
        >
          Стандарт — 9 990 ₽ &middot; Исправить все нарушения
        </button>
      </div>

      {/* ── Order Modal ── */}
      {showOrderForm && orderStatus !== "sent" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowOrderForm(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-8 sm:p-10 w-full max-w-md shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowOrderForm(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <div className="mb-5 text-center">
              <a href={`/auth/register?returnUrl=${encodeURIComponent("/cabinet")}&product=${selectedProduct}`} className="text-[13px] text-[#6C5CE7] hover:underline">
                Оформить через личный кабинет &rarr;
              </a>
            </div>
            <h3 className="text-[17px] font-semibold text-gray-800 mb-1 text-center">{PRODUCT_TITLES[selectedProduct]}</h3>
            <p className="text-[12px] text-gray-400 text-center mb-6">{PRODUCT_LABELS[selectedProduct]}</p>

            <div className="space-y-3">
              <input type="text" placeholder="Ваше имя" value={orderForm.name} onChange={(e) => setOrderForm((p) => ({ ...p, name: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3 text-[14px] text-gray-800 placeholder-gray-400 focus:border-primary focus:outline-none transition-colors" />
              <input type="tel" placeholder="Телефон" value={orderForm.phone} onChange={(e) => setOrderForm((p) => ({ ...p, phone: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3 text-[14px] text-gray-800 placeholder-gray-400 focus:border-primary focus:outline-none transition-colors" />
              {selectedProduct === "report" && (
                <input type="email" placeholder="E-mail (для отправки отчёта)" value={orderForm.email} onChange={(e) => setOrderForm((p) => ({ ...p, email: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3 text-[14px] text-gray-800 placeholder-gray-400 focus:border-primary focus:outline-none transition-colors" />
              )}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={orderConsent} onChange={(e) => setOrderConsent(e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 bg-transparent text-primary focus:ring-primary cursor-pointer accent-[#7B68EE]" />
                <span className="text-[12px] text-gray-500 leading-relaxed">
                  Принимаю условия{" "}<a href="/offer" target="_blank" className="text-primary hover:underline">публичной оферты</a>{" "}и даю согласие на{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">обработку персональных данных</a>
                </span>
              </label>
              <button
                onClick={async () => {
                  if (!orderForm.name.trim() || !orderForm.phone.trim() || !orderConsent) return;
                  if (selectedProduct === "report" && !orderForm.email.trim()) return;
                  setOrderStatus("sending");
                  try {
                    const res = await fetch("/api/payment", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...orderForm, productType: selectedProduct }),
                    });
                    const data = await res.json();
                    if (res.ok && data.paymentUrl) {
                      window.location.href = data.paymentUrl;
                    } else {
                      setOrderStatus("error");
                    }
                  } catch {
                    setOrderStatus("error");
                  }
                }}
                disabled={!orderForm.name.trim() || !orderForm.phone.trim() || (selectedProduct === "report" && !orderForm.email.trim()) || !orderConsent || orderStatus === "sending"}
                className="w-full px-8 py-3.5 bg-primary hover:bg-primary-hover disabled:bg-gray-300 disabled:opacity-50 rounded-xl text-[14px] font-medium text-white transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
              >
                {orderStatus === "sending" ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Переход к оплате...
                  </span>
                ) : "Оплатить и начать"}
              </button>
              {orderStatus === "error" && (
                <p className="text-[13px] text-red text-center">Не удалось отправить. Позвоните нам: +7 (985) 131-33-23</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Success state */}
      {orderStatus === "sent" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-2xl animate-fade-up">
            <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M7 15L11.5 19.5L21 9" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="text-[18px] font-semibold text-gray-800 mb-1">Заявка отправлена</p>
            <p className="text-[14px] text-gray-500">Мы свяжемся с вами в ближайшее время</p>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
