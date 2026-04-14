import type { Metadata } from "next";
import Link from "next/link";
import LandingCheckForm from "@/components/LandingCheckForm";

export const metadata: Metadata = {
  title: "Аудит сайта на соответствие 152-ФЗ и законам РФ — Штрафометр",
  description:
    "Профессиональный аудит сайта по 8 законам РФ. PDF-отчёт для руководства. Проверьте соответствие 152-ФЗ, 38-ФЗ, ЗоЗПП за 30 секунд. Снимите с себя ответственность.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Аудит сайта на соответствие законодательству РФ",
    description: "35+ проверок по 8 законам. PDF-отчёт для руководства. Результат за 30 секунд.",
    url: "https://shtrafometer.ru/proverka",
    siteName: "Штрафометр",
  },
};

const WHAT_YOU_GET = [
  {
    icon: "📋",
    title: "Полный список нарушений",
    desc: "Каждое нарушение с указанием закона, статьи и конкретной суммы штрафа.",
  },
  {
    icon: "📄",
    title: "PDF-отчёт для руководства",
    desc: "Документ, который можно передать директору, юристу или подрядчику.",
  },
  {
    icon: "🔧",
    title: "Пошаговые рекомендации",
    desc: "Что именно исправить, в каком порядке, со ссылками на актуальные требования.",
  },
  {
    icon: "🔄",
    title: "Автоисправление под ключ",
    desc: "Если не хотите разбираться сами — мы внесём изменения на сайт за вас.",
  },
];

const LAWS_COVERED = [
  { code: "152-ФЗ", name: "Персональные данные", checks: "10 проверок", severity: "critical" },
  { code: "38-ФЗ", name: "Реклама и маркировка", checks: "6 проверок", severity: "high" },
  { code: "168-ФЗ", name: "Государственный язык", checks: "3 проверки", severity: "medium" },
  { code: "436-ФЗ", name: "Защита детей от информации", checks: "4 проверки", severity: "medium" },
  { code: "ЗоЗПП", name: "Защита прав потребителей", checks: "9 проверок", severity: "high" },
  { code: "54-ФЗ", name: "Применение ККТ", checks: "3 проверки", severity: "critical" },
  { code: "Безопасность", name: "HTTPS, VPN-реклама", checks: "3 проверки", severity: "medium" },
  { code: "Локализация", name: "Зарубежные сервисы", checks: "11 проверок", severity: "high" },
];

const MYTHS = [
  {
    myth: "«Нам нужен юрист — это дорого и занимает недели»",
    truth:
      "Автоматический аудит Штрафометра занимает 30 секунд. Вы получаете конкретный список с нарушениями и рекомендациями — без ожидания и дорогостоящих консультаций.",
  },
  {
    myth: "«У нас есть политика конфиденциальности — значит мы защищены»",
    truth:
      "Политика — лишь один из 10 пунктов по 152-ФЗ. Ещё нужны: согласие на формах, cookie-баннер, локализация данных, уведомление в РКН. Проверьте, всё ли на месте.",
  },
  {
    myth: "«Штрафы платят крупные компании — нас это не касается»",
    truth:
      "Штрафуют ООО и ИП любого размера. Штраф за отсутствие политики конфиденциальности — от 100 000 ₽. Штраф за Google Analytics — до 6 000 000 ₽. Не зависит от оборота.",
  },
];

const STEPS = [
  { num: "01", title: "Введите URL сайта", desc: "Без регистрации, без доступов к серверу." },
  {
    num: "02",
    title: "Анализ за 30 секунд",
    desc: "35+ автоматических проверок по актуальным требованиям 2026 года.",
  },
  {
    num: "03",
    title: "Получите отчёт",
    desc: "Список нарушений, статьи законов, суммы штрафов, рекомендации по исправлению.",
  },
  {
    num: "04",
    title: "Передайте руководству",
    desc: "PDF-отчёт — документ, который можно показать директору или отправить юристу.",
  },
];

const FAQS = [
  {
    q: "Подходит ли для аудита корпоративного сайта?",
    a: "Да. Штрафометр анализирует любые сайты: лендинги, корпоративные порталы, интернет-магазины, сайты услуг. Проверка универсальна — по тем же критериям, по которым работает РКН.",
  },
  {
    q: "Отчёт можно отправить руководству?",
    a: "Да. PDF-отчёт содержит полный список нарушений, ссылки на законы и пошаговые рекомендации по исправлению. Его можно передать директору, юристу или IT-отделу.",
  },
  {
    q: "Насколько это юридически значимо?",
    a: "Сервис выполняет автоматическую проверку и не является юридической консультацией. Результаты носят информационный характер. Для юридически значимых документов — воспользуйтесь нашей услугой «Консалтинг» (15 000 ₽).",
  },
  {
    q: "Как часто нужно проверять сайт?",
    a: "Рекомендуем проверять раз в квартал или после каждого крупного обновления сайта. Законодательство меняется: в 152-ФЗ и 38-ФЗ регулярно вносятся поправки. Подписка на мониторинг — 490 ₽/мес: проверяем автоматически и уведомляем об изменениях.",
  },
  {
    q: "Что если нарушения уже есть — что делать?",
    a: "Исправьте как можно быстрее. Штраф выписывается на дату проверки. Штрафометр предлагает пошаговые инструкции по каждому нарушению, либо мы сделаем это за вас (автоисправление от 4 990 ₽).",
  },
];

const severityColor: Record<string, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function ProverkaLanding() {
  return (
    <main>
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-[#f0f4ff] to-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-[#6C5CE7]/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        </div>

        <div className="relative max-w-[1120px] mx-auto px-6 pt-16 pb-20">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-[#6C5CE7]/8 border border-[#6C5CE7]/20 text-[#6C5CE7] text-[13px] font-medium px-4 py-2 rounded-full mb-8">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1L2 3.5v5C2 11.5 4.7 14.3 8 15c3.3-.7 6-3.5 6-6.5v-5L8 1z" />
            </svg>
            35+ проверок по актуальным требованиям 2026 года
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-[38px] sm:text-[50px] lg:text-[56px] font-bold text-gray-900 leading-[1.1] tracking-tight mb-6">
                Директор спросил: у нас всё в порядке с сайтом?{" "}
                <span className="text-[#6C5CE7]">Дайте ему точный ответ.</span>
              </h1>

              <p className="text-[17px] text-gray-600 leading-relaxed mb-8">
                Профессиональный аудит сайта по 8 законам РФ. PDF-отчёт готов через 30 секунд.
                Передайте руководству — или юристу.
              </p>

              <LandingCheckForm
                placeholder="https://сайт-компании.ru"
                ctaText="Провести аудит"
                className="max-w-xl"
              />

              <p className="text-[13px] text-gray-400 mt-4">
                Без регистрации. Бесплатная проверка. PDF-отчёт — 1 990 ₽.
              </p>
            </div>

            {/* Visual: audit preview card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 max-w-sm mx-auto lg:mx-0 lg:ml-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[12px] text-gray-400 mb-0.5">Результат аудита</p>
                  <p className="text-[15px] font-bold text-gray-900">example-company.ru</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400 mb-0.5">Compliance Score</p>
                  <p className="text-[28px] font-black text-orange-500 leading-none">42</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: "42%" }} />
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: "🔴", text: "Google Analytics — нарушение 152-ФЗ", fine: "до 6 млн ₽" },
                  { icon: "🔴", text: "Нет маркировки рекламы (erid)", fine: "до 500 000 ₽" },
                  { icon: "🟠", text: "Cookie-баннер устарел", fine: "до 60 000 ₽" },
                  { icon: "🟡", text: "Отсутствует возрастная маркировка", fine: "до 300 000 ₽" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-sm shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-gray-700 leading-snug">{item.text}</p>
                      <p className="text-[11px] text-red-500 font-medium">{item.fine}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[12px] text-gray-400">
                    + ещё{" "}
                    <span className="text-gray-700 font-medium">7 нарушений</span> в полном отчёте
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-[1120px] mx-auto px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { num: "35+", label: "критериев проверки" },
              { num: "8", label: "законов РФ" },
              { num: "30 сек", label: "время анализа" },
              { num: "95%", label: "сайтов имеют нарушения" },
            ].map((s) => (
              <div key={s.num}>
                <p className="text-[28px] font-black text-[#6C5CE7] leading-none mb-1">{s.num}</p>
                <p className="text-[13px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PAIN ─────────────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-4">
            Знакомая ситуация?
          </p>
          <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-[1.15] mb-8">
            «Директор задал вопрос про сайт. Я кивнул. Но понятия не имел.»
          </h2>
          <div className="space-y-5 text-[15px] text-gray-600 leading-relaxed">
            <p>
              На совещании директор спросил: «У нас с сайтом всё в порядке по законодательству?»
              Вы кивнули. Уверенно. Но на самом деле — не знаете.
            </p>
            <p>
              Политику конфиденциальности копировали у конкурентов три года назад. Google Analytics
              стоит с 2019-го. Реклама в блоге — без маркировки erid. Если завтра придёт письмо
              от РКН — спросят с вас. Сайт — это ваш участок.
            </p>
            <p>
              Вы не юрист. Вы маркетолог. Но граница между маркетингом и юридической ответственностью
              за сайт — размытая. И вы в зоне риска.
            </p>
            <p className="text-gray-900 font-semibold text-[16px]">
              Штрафометр даёт вам конкретный ответ — что именно нарушено и что с этим делать.
              За 30 секунд.
            </p>
          </div>
        </div>
      </section>

      {/* ─── WHAT'S COVERED ───────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="mb-12">
            <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-3">
              Что проверяет сервис
            </p>
            <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
              8 законов. 35+ критериев. Актуальные требования 2026.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LAWS_COVERED.map((l) => (
              <div key={l.code} className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${severityColor[l.severity]}`}
                  >
                    {l.code}
                  </span>
                </div>
                <p className="text-[14px] font-semibold text-gray-900 mb-1">{l.name}</p>
                <p className="text-[12px] text-gray-400">{l.checks}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHAT YOU GET ─────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-3">
            Что вы получаете
          </p>
          <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
            Полная картина за 30 секунд
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {WHAT_YOU_GET.map((w) => (
            <div key={w.title} className="flex gap-5 p-6 rounded-2xl border border-gray-100 hover:border-[#6C5CE7]/30 transition-colors">
              <span className="text-3xl shrink-0">{w.icon}</span>
              <div>
                <h3 className="text-[16px] font-bold text-gray-900 mb-2">{w.title}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── MYTH BREAKING ────────────────────────────────────── */}
      <section className="bg-[#6C5CE7] py-20">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[32px] sm:text-[38px] font-bold text-white leading-tight">
              Три причины, по которым откладывают аудит
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {MYTHS.map((m, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-6">
                <p className="text-[14px] font-semibold text-[#E0DEFF] italic mb-4 leading-snug">
                  {m.myth}
                </p>
                <div className="h-px bg-white/20 mb-4" />
                <p className="text-[13px] text-white/80 leading-relaxed">{m.truth}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-3">
            Как работает
          </p>
          <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
            От URL к PDF-отчёту — четыре шага
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gray-200 -translate-x-4" />
              )}
              <div className="w-12 h-12 bg-[#6C5CE7]/10 rounded-xl flex items-center justify-center mb-4">
                <span className="text-[16px] font-black text-[#6C5CE7]">{s.num}</span>
              </div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-3">
              Тарифы
            </p>
            <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
              Дешевле одной консультации юриста
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
            {[
              {
                name: "Бесплатная проверка",
                price: "0 ₽",
                items: ["Список нарушений", "Суммы штрафов", "Базовые рекомендации"],
                cta: "Начать",
                href: "#audit-form",
                highlight: false,
              },
              {
                name: "PDF-отчёт",
                price: "1 990 ₽",
                items: ["Всё из бесплатной", "PDF для руководства", "Детальные инструкции", "Ссылки на законы"],
                cta: "Получить отчёт",
                href: "/#check",
                highlight: true,
              },
              {
                name: "Автоисправление",
                price: "от 9 990 ₽",
                items: ["Исправляем все нарушения", "Бэкап + отчёт", "Повторная проверка"],
                cta: "Исправить",
                href: "/#check",
                highlight: false,
              },
              {
                name: "Мониторинг",
                price: "490 ₽/мес",
                items: ["Проверка раз в месяц", "Email-уведомления", "Отчёт на руководство"],
                cta: "Подключить",
                href: "/#check",
                highlight: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-5 ${
                  p.highlight
                    ? "bg-[#6C5CE7] text-white ring-2 ring-[#6C5CE7] ring-offset-2"
                    : "bg-white border border-gray-200"
                }`}
              >
                <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${p.highlight ? "text-[#A29BFE]" : "text-gray-400"}`}>
                  {p.name}
                </p>
                <p className={`text-[24px] font-black mb-4 ${p.highlight ? "text-white" : "text-gray-900"}`}>
                  {p.price}
                </p>
                <ul className="space-y-2 mb-5">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <svg
                        className={`w-3.5 h-3.5 shrink-0 ${p.highlight ? "text-[#A29BFE]" : "text-[#6C5CE7]"}`}
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M13.5 2.5l-7.5 9-3.5-3.5-1 1 4.5 4.5 8.5-10z" />
                      </svg>
                      <span className={`text-[12px] ${p.highlight ? "text-[#E0DEFF]" : "text-gray-600"}`}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`block text-center py-2 px-3 rounded-lg text-[13px] font-semibold transition-all ${
                    p.highlight
                      ? "bg-white text-[#6C5CE7] hover:bg-gray-50"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 py-20">
        <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight mb-12 text-center">
          Ответы на вопросы
        </h2>
        <div className="max-w-2xl mx-auto space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-gray-100 pb-6">
              <h3 className="text-[16px] font-semibold text-gray-900 mb-2">{f.q}</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section id="audit-form" className="bg-gradient-to-br from-[#6C5CE7] to-[#5A4BD1] text-white py-20">
        <div className="max-w-[1120px] mx-auto px-6 text-center">
          <h2 className="text-[32px] sm:text-[44px] font-bold leading-tight mb-4">
            Дайте руководству точный ответ.
          </h2>
          <p className="text-[17px] text-[#E0DEFF] mb-10 max-w-xl mx-auto">
            Запустите аудит прямо сейчас. Результат через 30 секунд — список нарушений
            с суммами штрафов и рекомендациями.
          </p>
          <LandingCheckForm
            placeholder="https://сайт-компании.ru"
            ctaText="Запустить аудит"
            className="max-w-xl mx-auto"
          />
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            {["Без регистрации", "PDF-отчёт за 30 сек", "Актуальные требования 2026"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-[13px] text-[#A29BFE]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.5 2.5l-7.5 9-3.5-3.5-1 1 4.5 4.5 8.5-10z" />
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
