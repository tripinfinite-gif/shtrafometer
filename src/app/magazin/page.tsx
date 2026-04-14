import type { Metadata } from "next";
import Link from "next/link";
import LandingCheckForm from "@/components/LandingCheckForm";

export const metadata: Metadata = {
  title: "Проверьте интернет-магазин на штрафы РКН — Штрафометр",
  description:
    "Бесплатная проверка интернет-магазина по 152-ФЗ, 38-ФЗ, ЗоЗПП. РКН сканирует сайты автоматически — штрафы до 18 млн ₽. Результат за 30 секунд.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Проверьте интернет-магазин на штрафы РКН",
    description: "Штрафы до 18 млн ₽ за нарушения, о которых вы не знали. Проверьте бесплатно за 30 секунд.",
    url: "https://shtrafometer.ru/magazin",
    siteName: "Штрафометр",
  },
};

const VIOLATIONS = [
  { law: "152-ФЗ", name: "Google Analytics", fine: "до 6 000 000 ₽", icon: "🔴" },
  { law: "152-ФЗ", name: "Политика конфиденциальности", fine: "до 700 000 ₽", icon: "🔴" },
  { law: "152-ФЗ", name: "Согласие на формах", fine: "до 150 000 ₽", icon: "🟠" },
  { law: "152-ФЗ", name: "Cookie-баннер", fine: "до 60 000 ₽", icon: "🟠" },
  { law: "38-ФЗ", name: "Маркировка рекламы (erid)", fine: "до 500 000 ₽", icon: "🔴" },
  { law: "ЗоЗПП", name: "Реквизиты продавца", fine: "до 300 000 ₽", icon: "🟠" },
  { law: "54-ФЗ", name: "Онлайн-касса / чеки", fine: "до 100% выручки", icon: "🔴" },
  { law: "436-ФЗ", name: "Возрастная маркировка", fine: "до 300 000 ₽", icon: "🟡" },
];

const MYTHS = [
  {
    myth: "«Я небольшой магазин — меня не проверят»",
    truth:
      "РКН запустил автоматический сканер сайтов в 2025 году. Он не знает, большой вы или маленький. Он просто проверяет всех в очереди.",
  },
  {
    myth: "«У меня есть политика конфиденциальности — значит всё в порядке»",
    truth:
      "Шаблон 2019-2022 года не соответствует требованиям сегодня. В 152-ФЗ с тех пор вносились поправки. Кроме того, политика — лишь один из 10 пунктов по персданным.",
  },
  {
    myth: "«Онлайн-сервис за 2000 ₽ не может знать всего»",
    truth:
      "Штрафометр проверяет 35+ конкретных пунктов по реальным требованиям РКН. По тем же критериям, по которым инспектора выписывают штрафы прямо сейчас.",
  },
];

const STEPS = [
  { num: "01", title: "Введите URL магазина", desc: "Никакой регистрации. Просто вставьте адрес сайта." },
  { num: "02", title: "Проверка за 30 секунд", desc: "35+ автоматических проверок по 8 законам РФ одновременно." },
  { num: "03", title: "Список нарушений со штрафами", desc: "Конкретно: что нарушено, какой закон, какой штраф грозит." },
  { num: "04", title: "Решите что делать", desc: "Исправьте сами по инструкциям или закажите автоисправление." },
];

const FAQS = [
  {
    q: "Реально ли РКН штрафует небольшие магазины?",
    a: "Да. В 2024-2025 годах зафиксированы сотни штрафов для ИП и ООО с оборотом до 5 млн ₽/мес. Автоматический сканер РКН не разбирает размер бизнеса — он ищет нарушения на сайте.",
  },
  {
    q: "Что именно проверяет Штрафометр?",
    a: "35+ проверок: политика конфиденциальности, cookie-баннер, согласие на формах, наличие Google Analytics / рeCAPTCHA / Google Fonts (зарубежные сервисы), маркировка рекламы, реквизиты продавца, чеки (54-ФЗ), возрастная маркировка и другие.",
  },
  {
    q: "Что будет после проверки?",
    a: "Вы увидите список нарушений с суммами штрафов и рекомендациями по исправлению. Можете исправить сами, скачать PDF-отчёт для юриста или заказать автоисправление — мы внесём изменения на ваш сайт через SSH/FTP.",
  },
  {
    q: "Вы не сломаете сайт при автоисправлении?",
    a: "Перед любым изменением мы делаем полный бэкап. Все доступы зашифрованы и удаляются сразу после работы. Если что-то пойдёт не так — восстановим из бэкапа и вернём деньги.",
  },
  {
    q: "Как быстро нужно исправить нарушения?",
    a: "Чем быстрее — тем лучше. Штраф выписывают на дату проверки, а не на дату когда вы узнали. Если РКН зафиксировал нарушение сегодня, исправление завтра уже не отменит штраф за сегодня.",
  },
];

export default function MagazinLanding() {
  return (
    <main>
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-[#fdf8ff] to-white overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#6C5CE7]/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-500/3 rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative max-w-[1120px] mx-auto px-6 pt-16 pb-20">
          {/* Alert badge */}
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
            РКН запустил автоматическое сканирование сайтов
          </div>

          <h1 className="text-[40px] sm:text-[52px] lg:text-[60px] font-bold text-gray-900 leading-[1.1] tracking-tight mb-6 max-w-3xl">
            Ваш магазин уже в очереди на проверку РКН.{" "}
            <span className="text-[#6C5CE7]">Узнайте, что он найдёт.</span>
          </h1>

          <p className="text-[17px] sm:text-[19px] text-gray-600 leading-relaxed mb-10 max-w-2xl">
            Штрафы до{" "}
            <strong className="text-gray-900">18 000 000 ₽</strong> за нарушения, о которых вы,
            возможно, не знали. Проверьте магазин бесплатно — результат за 30 секунд.
          </p>

          <LandingCheckForm
            placeholder="https://ваш-магазин.ru"
            ctaText="Проверить магазин"
            className="max-w-xl"
          />

          <p className="text-[13px] text-gray-400 mt-4">
            Без регистрации. Без доступов к серверу. Только URL.
          </p>

          {/* Social proof micro */}
          <div className="flex flex-wrap items-center gap-6 mt-10">
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <svg className="w-4 h-4 text-green-500" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 2.5l-7.5 9-3.5-3.5-1 1 4.5 4.5 8.5-10z" />
              </svg>
              35+ проверок по закону
            </div>
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <svg className="w-4 h-4 text-green-500" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 2.5l-7.5 9-3.5-3.5-1 1 4.5 4.5 8.5-10z" />
              </svg>
              8 законов РФ
            </div>
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <svg className="w-4 h-4 text-green-500" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 2.5l-7.5 9-3.5-3.5-1 1 4.5 4.5 8.5-10z" />
              </svg>
              95% магазинов имеют нарушения
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────── */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-[1120px] mx-auto px-6 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: "18 млн ₽", label: "максимальный штраф по 152-ФЗ" },
              { num: "35+", label: "автоматических проверок" },
              { num: "8 законов", label: "РФ в одной проверке" },
              { num: "30 сек", label: "время проверки сайта" },
            ].map((s) => (
              <div key={s.num}>
                <p className="text-[32px] font-bold text-[#A29BFE] leading-none mb-1">{s.num}</p>
                <p className="text-[13px] text-gray-400 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PAIN ─────────────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-4">
              Что происходит прямо сейчас
            </p>
            <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-[1.15] mb-6">
              «Пришло письмо от Роскомнадзора. Предписание.»
            </h2>
            <div className="space-y-4 text-[15px] text-gray-600 leading-relaxed">
              <p>
                Вы открываете почту. Официальный конверт. Читаете: «Выявлены нарушения требований
                федерального законодательства... обязать устранить...»
              </p>
              <p>
                У вас 40 000 клиентов в CRM. Телефоны, адреса, история заказов. Юрист говорит:
                «Могут до 3 миллионов. Это три месяца вашей выручки.»
              </p>
              <p>
                Начинаете гуглить. Находите шаблон политики конфиденциальности 2019 года. Ставите
                его. Достаточно ли этого? <strong className="text-gray-900">Никто не знает.</strong>
              </p>
              <p className="text-gray-900 font-medium">
                Проверьте сайт сейчас — и знайте точно, что нашёл бы инспектор.
              </p>
            </div>
          </div>

          {/* Visual: fake letter */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 lg:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] text-gray-400 mb-1">Типичные нарушения магазина</p>
                <p className="text-[15px] font-semibold text-gray-900">Что находит РКН</p>
              </div>
            </div>
            <div className="space-y-3">
              {VIOLATIONS.map((v) => (
                <div key={v.name} className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{v.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{v.name}</p>
                      <p className="text-[11px] text-gray-400">{v.law}</p>
                    </div>
                  </div>
                  <span className="text-[12px] font-medium text-red-600 shrink-0 tabular-nums">
                    {v.fine}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── MYTH BREAKING ────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[12px] font-semibold text-[#6C5CE7] uppercase tracking-widest mb-3">
              Разбираем заблуждения
            </p>
            <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
              Три мифа, которые стоят денег
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {MYTHS.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-red-500" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 4.5l1.5 1.5 1.5-1.5 1 1-1.5 1.5 1.5 1.5-1 1L8 8l-1.5 1.5-1-1 1.5-1.5-1.5-1.5 1-1z" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-gray-500 italic mb-4 leading-snug">
                  {m.myth}
                </p>
                <div className="h-px bg-gray-100 mb-4" />
                <div className="flex gap-2">
                  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.5 2.5l-7.5 9-3.5-3.5-1 1 4.5 4.5 8.5-10z" />
                  </svg>
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
            От URL до полной картины — за 30 секунд
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="relative">
              <p className="text-[48px] font-black text-[#6C5CE7]/10 leading-none mb-3">{s.num}</p>
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
              Что вы получаете
            </p>
            <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
              Начните бесплатно. Исправьте быстро.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              {
                name: "Бесплатная проверка",
                price: "0 ₽",
                desc: "Полный список нарушений с суммами штрафов. Без регистрации.",
                cta: "Проверить сейчас",
                href: "#check-form",
                highlight: false,
              },
              {
                name: "PDF-отчёт",
                price: "1 990 ₽",
                desc: "Детальный отчёт с рекомендациями по каждому нарушению. Для вас и юриста.",
                cta: "Получить отчёт",
                href: "/#check",
                highlight: true,
              },
              {
                name: "Автоисправление",
                price: "от 4 990 ₽",
                desc: "Мы сами вносим исправления на ваш сайт. Бэкап до и после. Гарантия.",
                cta: "Исправить за меня",
                href: "/#check",
                highlight: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-6 border ${
                  p.highlight
                    ? "bg-[#6C5CE7] border-[#6C5CE7] text-white shadow-xl"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <p className={`text-[12px] font-semibold uppercase tracking-widest mb-3 ${p.highlight ? "text-[#A29BFE]" : "text-gray-400"}`}>
                  {p.name}
                </p>
                <p className={`text-[32px] font-black mb-3 ${p.highlight ? "text-white" : "text-gray-900"}`}>
                  {p.price}
                </p>
                <p className={`text-[13px] leading-relaxed mb-6 ${p.highlight ? "text-[#E0DEFF]" : "text-gray-500"}`}>
                  {p.desc}
                </p>
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
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-[32px] sm:text-[38px] font-bold text-gray-900 leading-tight">
            Часто спрашивают
          </h2>
        </div>
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
      <section id="check-form" className="bg-gray-900 text-white py-20">
        <div className="max-w-[1120px] mx-auto px-6 text-center">
          <h2 className="text-[32px] sm:text-[44px] font-bold leading-tight mb-4">
            Проверьте магазин сейчас.
            <br />
            <span className="text-[#A29BFE]">До того, как это сделает РКН.</span>
          </h2>
          <p className="text-[16px] text-gray-400 mb-10 max-w-lg mx-auto">
            Бесплатно. Без регистрации. 30 секунд. Результат — конкретный список нарушений
            с суммами штрафов.
          </p>
          <LandingCheckForm
            placeholder="https://ваш-магазин.ru"
            ctaText="Проверить магазин"
            className="max-w-xl mx-auto"
          />
          <p className="text-[12px] text-gray-500 mt-4">
            Проверка бесплатная.{" "}
            <Link href="/privacy" className="underline hover:text-gray-300">
              Политика конфиденциальности
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
