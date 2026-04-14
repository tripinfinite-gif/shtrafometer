import type { Metadata } from "next";
import Link from "next/link";
import LandingCheckForm from "@/components/LandingCheckForm";

export const metadata: Metadata = {
  title: "Штраф ИП за сайт 2026: проверьте лендинг на 152-ФЗ — Штрафометр",
  description:
    "С 2026 года ИП штрафуют как юрлиц за нарушения 152-ФЗ на сайте. Форма записи = сбор персданных. Штраф до 700 000 ₽. Проверьте лендинг бесплатно за 30 секунд.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Штраф ИП за сайт: проверьте лендинг на 152-ФЗ",
    description: "С 2026 года ИП приравняли к юрлицам. Форма на лендинге = персданные. Проверьте бесплатно.",
    url: "https://shtrafometer.ru/agentstvo",
    siteName: "Штрафометр",
  },
};

const TYPICAL_VIOLATIONS = [
  {
    what: "Форма без чекбокса согласия",
    example: "«Оставьте телефон — я перезвоню»",
    fine: "до 150 000 ₽",
    severity: "critical",
  },
  {
    what: "Нет политики конфиденциальности",
    example: "Любой сайт, где есть форма",
    fine: "до 700 000 ₽",
    severity: "critical",
  },
  {
    what: "Cookie без баннера согласия",
    example: "Google Analytics, Яндекс.Метрика, пиксели",
    fine: "до 60 000 ₽",
    severity: "high",
  },
  {
    what: "Нет ссылки на политику под формой",
    example: "Форма «Записаться», «Получить консультацию»",
    fine: "до 150 000 ₽",
    severity: "high",
  },
];

const MYTHS = [
  {
    myth: "«Я ИП — меня не штрафуют как юрлицо»",
    truth:
      "С 1 января 2026 года ИП приравняли к юридическим лицам по штрафам за персональные данные. Теперь суммы одинаковые: до 700 000 ₽ за отсутствие политики конфиденциальности.",
  },
  {
    myth: "«У меня просто форма записи — это не персданные»",
    truth:
      "Любой сбор ФИО, телефона или email — это обработка персональных данных по 152-ФЗ. Не важно, что вы потом с ними делаете. Факт сбора уже требует соблюдения закона.",
  },
  {
    myth: "«РКН проверяет только крупных — меня не видят»",
    truth:
      "С 2025 года РКН использует автоматический сканер. Он не разбирает размер бизнеса — он парсит сайты и фиксирует нарушения. Жалоба конкурентов или клиентов запускает проверку мгновенно.",
  },
  {
    myth: "«Если придёт проверка — быстро исправлю»",
    truth:
      "Штраф выписывается на дату проверки. Если РКН зафиксировал нарушение во вторник, исправление в среду не отменяет штраф за вторник. Нарушение должно быть устранено до проверки.",
  },
];

const STEPS = [
  { num: "01", title: "Введите URL лендинга", desc: "Любой сайт, лендинг на Tilda, WP или конструкторе." },
  { num: "02", title: "Автоматический анализ", desc: "Сервис находит конкретные нарушения 152-ФЗ и других законов." },
  { num: "03", title: "Список с суммами", desc: "Что именно нарушено, какой штраф грозит, что исправить." },
  { num: "04", title: "Исправьте или доверьте нам", desc: "Инструкции для самостоятельного исправления или автоисправление под ключ." },
];

const FAQS = [
  {
    q: "Мне правда могут выписать штраф как ИП?",
    a: "Да. С 1 января 2026 года ИП несут ответственность наравне с юридическими лицами по статьям 13.11 КоАП (нарушение 152-ФЗ). Минимальный штраф — 100 000 ₽, максимальный — 700 000 ₽ за отсутствие политики конфиденциальности.",
  },
  {
    q: "У меня только один лендинг с формой записи — нужна проверка?",
    a: "Да, именно для таких сайтов это наиболее актуально. Форма «Оставьте номер — я перезвоню» уже является сбором персданных. Без политики конфиденциальности, чекбокса согласия и cookie-баннера — три отдельных нарушения.",
  },
  {
    q: "Что именно будет в отчёте?",
    a: "Конкретный список: какое нарушение, какая статья закона, какой штраф грозит и что нужно исправить. Бесплатная версия показывает все нарушения. PDF-отчёт (1 990 ₽) — детальные инструкции по каждому пункту.",
  },
  {
    q: "Сколько стоит исправить нарушения?",
    a: "Политика конфиденциальности + cookie-баннер + чекбоксы на формах: автоисправление от 4 990 ₽. Это дешевле, чем один штраф. Мы сами вносим изменения на ваш сайт через SSH/FTP, делаем бэкап и присылаем отчёт.",
  },
  {
    q: "Как РКН может найти мой небольшой сайт?",
    a: "Три пути: 1) автоматический сканер (парсит сайты по категориям), 2) жалоба конкурента или клиента, 3) плановая проверка по реестру ИП/ООО. Размер бизнеса не защищает от проверки.",
  },
];

export default function AgentstvoLanding() {
  return (
    <main>
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-[#fffbf0] to-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-400/5 rounded-full -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#6C5CE7]/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="relative max-w-[1120px] mx-auto px-6 pt-16 pb-20">
          {/* Law badge */}
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-[13px] font-medium px-4 py-2 rounded-full mb-8">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            С 2026 года ИП штрафуют наравне с юрлицами по 152-ФЗ
          </div>

          <h1 className="text-[38px] sm:text-[52px] lg:text-[58px] font-bold text-gray-900 leading-[1.1] tracking-tight mb-6 max-w-3xl">
            Вы думали, что ваш лендинг не попадает под 152-ФЗ.{" "}
            <span className="text-[#6C5CE7]">С 2026 — попадает.</span>
          </h1>

          <p className="text-[17px] sm:text-[19px] text-gray-600 leading-relaxed mb-6 max-w-2xl">
            Форма «оставьте телефон» на вашем сайте — это уже сбор персональных данных. РКН
            сканирует сайты автоматически. Штраф ИП — до{" "}
            <strong className="text-gray-900">700 000 ₽</strong>.
          </p>

          <p className="text-[15px] text-gray-500 mb-10 max-w-xl">
            Проверьте сайт за 30 секунд — узнайте, есть ли нарушения и сколько они могут стоить.
          </p>

          <LandingCheckForm
            placeholder="https://ваш-лендинг.ru"
            ctaText="Проверить бесплатно"
            className="max-w-xl"
          />

          <p className="text-[13px] text-gray-400 mt-4">
            Без регистрации. Без оплаты. Только URL вашего сайта.
          </p>
        </div>
      </section>

      {/* ─── THE REVELATION ───────────────────────────────────── */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="max-w-3xl">
            <p className="text-[12px] font-semibold text-orange-400 uppercase tracking-widest mb-6">
              Что изменилось с 2026 года
            </p>
            <h2 className="text-[28px] sm:text-[36px] font-bold leading-[1.2] mb-8">
              «Я психолог / тренер / юрист. У меня лендинг-визитка.
              Какой 152-ФЗ? Меня это не касается.»
            </h2>
            <p className="text-[16px] text-gray-400 leading-relaxed mb-8">
              Именно так думают большинство ИП и самозанятых с небольшим сайтом. И именно поэтому
              они оказываются в зоне риска — они не знают, что правила изменились.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  icon: "⚖️",
                  title: "ИП = юрлицо по штрафам",
                  desc: "С 01.01.2026 ИП несут ответственность по тем же статьям КоАП, что и ООО.",
                },
                {
                  icon: "🤖",
                  title: "РКН сканирует автоматически",
                  desc: "Не нужна жалоба. Робот-сканер обходит сайты и фиксирует нарушения без участия человека.",
                },
                {
                  icon: "📋",
                  title: "Форма = персданные",
                  desc: "Телефон, email, имя на форме — оператор персональных данных. Без оформления — штраф.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <span className="text-2xl mb-3 block">{item.icon}</span>
                  <h3 className="text-[15px] font-bold mb-2">{item.title}</h3>
                  <p className="text-[13px] text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TYPICAL VIOLATIONS ───────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-4">
              Типичные нарушения лендинга
            </p>
            <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-[1.15] mb-6">
              Что именно проверяет РКН на небольших сайтах
            </h2>
            <p className="text-[15px] text-gray-600 leading-relaxed mb-8">
              Ниже — четыре самых распространённых нарушения на лендингах ИП и малого бизнеса.
              95% сайтов с формами имеют хотя бы одно из них.
            </p>
            <div className="space-y-4">
              {TYPICAL_VIOLATIONS.map((v) => (
                <div
                  key={v.what}
                  className={`rounded-xl p-5 border ${
                    v.severity === "critical"
                      ? "bg-red-50 border-red-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3
                      className={`text-[14px] font-bold leading-snug ${
                        v.severity === "critical" ? "text-red-800" : "text-orange-800"
                      }`}
                    >
                      {v.what}
                    </h3>
                    <span
                      className={`text-[13px] font-bold shrink-0 tabular-nums ${
                        v.severity === "critical" ? "text-red-700" : "text-orange-700"
                      }`}
                    >
                      {v.fine}
                    </span>
                  </div>
                  <p
                    className={`text-[12px] ${
                      v.severity === "critical" ? "text-red-600" : "text-orange-600"
                    }`}
                  >
                    Пример: {v.example}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual: before/after */}
          <div className="space-y-4">
            <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest">
              Типичный лендинг психолога
            </p>

            {/* Fake landing screenshot */}
            <div className="bg-gradient-to-b from-purple-50 to-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3" />
                <p className="text-[18px] font-bold text-gray-900">Анна Иванова</p>
                <p className="text-[13px] text-gray-500">Психолог • Онлайн и офлайн</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <p className="text-[13px] font-semibold text-gray-900 mb-3">Запишитесь на консультацию</p>
                <div className="space-y-2 mb-3">
                  <div className="h-9 bg-gray-100 rounded-lg" />
                  <div className="h-9 bg-gray-100 rounded-lg" />
                </div>
                <div className="h-9 bg-purple-600 rounded-lg" />
                {/* No checkbox, no privacy link */}
              </div>
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-[12px] text-red-700 leading-snug">
                  Нет чекбокса согласия, нет политики конфиденциальности, нет cookie-баннера.{" "}
                  <strong>3 нарушения. До 910 000 ₽.</strong>
                </p>
              </div>
            </div>
            <p className="text-[12px] text-gray-400 text-center">
              Штрафометр найдёт нарушения за 30 секунд — и покажет, как исправить.
            </p>
          </div>
        </div>
      </section>

      {/* ─── MYTH BREAKING ────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-3">
              Часто слышим
            </p>
            <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
              Четыре мифа, которые стоят сотни тысяч рублей
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {MYTHS.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-gray-500 italic leading-snug">
                    {m.myth}
                  </p>
                </div>
                <div className="h-px bg-gray-100 mb-4" />
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.5 2.5l-7.5 9-3.5-3.5-1 1 4.5 4.5 8.5-10z" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{m.truth}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-3">
            Как это работает
          </p>
          <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
            Проверка лендинга за 30 секунд
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="text-center">
              <div className="w-12 h-12 bg-[#6C5CE7]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-[15px] font-black text-[#6C5CE7]">{s.num}</span>
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">{s.title}</h3>
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
              Стоимость
            </p>
            <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
              Дешевле одного штрафа
            </h2>
            <p className="text-[15px] text-gray-500 mt-3">
              Исправление нарушений стоит в 50–100 раз меньше, чем штраф за них.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              {
                name: "Проверка",
                price: "Бесплатно",
                desc: "Полный список нарушений с суммами штрафов. Без регистрации и оплаты.",
                items: ["35+ проверок", "Все нарушения с суммами", "Без регистрации"],
                cta: "Проверить сейчас",
                href: "#check-form-bottom",
                highlight: false,
              },
              {
                name: "PDF-отчёт",
                price: "1 990 ₽",
                desc: "Подробный отчёт с пошаговыми инструкциями. Передайте программисту или исправьте сами.",
                items: ["Все нарушения", "Пошаговые инструкции", "Ссылки на законы", "PDF для подрядчика"],
                cta: "Получить отчёт",
                href: "/#check",
                highlight: true,
              },
              {
                name: "Автоисправление",
                price: "от 4 990 ₽",
                desc: "Мы сами исправляем нарушения на вашем сайте. Бэкап. Гарантия. Отчёт.",
                items: ["Исправляем за вас", "Бэкап сайта", "Гарантия + повтор. проверка"],
                cta: "Исправить за меня",
                href: "/#check",
                highlight: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-6 border ${
                  p.highlight
                    ? "bg-[#6C5CE7] border-[#6C5CE7] text-white shadow-xl ring-2 ring-[#6C5CE7]/30 ring-offset-2"
                    : "bg-white border-gray-200"
                }`}
              >
                {p.highlight && (
                  <div className="text-[11px] font-bold text-[#A29BFE] uppercase tracking-widest mb-3">
                    Популярный выбор
                  </div>
                )}
                <p className={`text-[12px] font-semibold uppercase tracking-widest mb-2 ${p.highlight ? "text-[#C5BDFF]" : "text-gray-400"}`}>
                  {p.name}
                </p>
                <p className={`text-[28px] font-black mb-3 ${p.highlight ? "text-white" : "text-gray-900"}`}>
                  {p.price}
                </p>
                <p className={`text-[13px] leading-relaxed mb-5 ${p.highlight ? "text-[#E0DEFF]" : "text-gray-500"}`}>
                  {p.desc}
                </p>
                <ul className="space-y-2 mb-6">
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
                  className={`block text-center py-2.5 px-4 rounded-xl text-[14px] font-semibold transition-all ${
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

          {/* ROI note */}
          <div className="mt-10 bg-orange-50 border border-orange-200 rounded-2xl p-6 max-w-2xl mx-auto text-center">
            <p className="text-[14px] text-orange-800 leading-relaxed">
              <strong>Простая математика:</strong> PDF-отчёт стоит 1 990 ₽. Минимальный штраф за
              отсутствие политики конфиденциальности — 100 000 ₽. Проверка обходится в 50 раз дешевле
              первого же штрафа.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 py-20">
        <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight mb-12 text-center">
          Вопросы и ответы
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
      <section id="check-form-bottom" className="bg-gray-900 text-white py-20">
        <div className="max-w-[1120px] mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-[13px] font-medium px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shrink-0" />
            Новые правила для ИП — с 1 января 2026
          </div>
          <h2 className="text-[32px] sm:text-[44px] font-bold leading-tight mb-4">
            Проверьте лендинг.
            <br />
            <span className="text-[#A29BFE]">Бесплатно. Сейчас. За 30 секунд.</span>
          </h2>
          <p className="text-[16px] text-gray-400 mb-10 max-w-lg mx-auto">
            Узнайте, есть ли нарушения на вашем сайте — и сколько они могут стоить, если РКН
            найдёт их раньше вас.
          </p>
          <LandingCheckForm
            placeholder="https://ваш-лендинг.ru"
            ctaText="Проверить бесплатно"
            className="max-w-xl mx-auto"
          />
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            {["Без регистрации", "Без доступа к серверу", "Только URL"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-[13px] text-gray-500">
                <svg className="w-3.5 h-3.5 text-[#6C5CE7]" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.5 2.5l-7.5 9-3.5-3.5-1 1 4.5 4.5 8.5-10z" />
                </svg>
                {t}
              </div>
            ))}
          </div>
          <p className="text-[12px] text-gray-600 mt-6">
            Проверка бесплатная.{" "}
            <Link href="/privacy" className="underline hover:text-gray-400">
              Политика конфиденциальности
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
