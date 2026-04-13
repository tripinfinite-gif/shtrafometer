import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Штрафометр — Проверка сайта на штрафы по законам РФ",
  description:
    "Бесплатный анализ сайта по 8 законам Российской Федерации. 35+ автоматических проверок, расчёт штрафов, рекомендации по исправлению. Реальные кейсы штрафов и разборы нарушений.",
  metadataBase: new URL("https://shtrafometer.ru"),
  openGraph: {
    title: "Штрафометр — Проверка сайта на штрафы по законам РФ",
    description: "Бесплатный анализ сайта по 8 законам РФ. 35+ проверок, расчёт штрафов, рекомендации.",
    url: "https://shtrafometer.ru",
    siteName: "Штрафометр",
    locale: "ru_RU",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get('user_session')?.value;
  return (
    <html lang="ru">
      <body className="min-h-screen bg-white text-gray-800">
        {/* ────── Global Navigation ────── */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
          <div className="max-w-[980px] mx-auto px-6 h-14 flex items-center justify-between">
            {/* Left: Logo + Nav links */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="32" height="32" rx="8" fill="#6C5CE7" />
                  <path d="M16 6L22 9.5V16.5L16 20L10 16.5V9.5L16 6Z" fill="white" fillOpacity="0.9" />
                  <path d="M13 14L15 16.5L19.5 11.5" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 19L16 22.5L22 19" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 22L16 25.5L22 22" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[16px] font-bold tracking-tight text-gray-900 group-hover:text-[#6C5CE7] transition-colors">
                  Штрафометр
                </span>
              </Link>
              <Link
                href="/blog"
                className="text-[13px] font-medium text-gray-500 hover:text-[#6C5CE7] transition-colors hidden sm:block"
              >
                Блог
              </Link>
            </div>

            {/* Right: Phone + CTA */}
            <div className="flex items-center gap-4">
              <a
                href="tel:+79851313323"
                className="text-[13px] font-medium text-gray-700 hover:text-[#6C5CE7] transition-colors hidden md:flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M6.5 2.5C6.5 2.5 7 1 8 1s1.5 1.5 1.5 1.5M3.5 5.5s-1.5 3 0 5.5 4 3.5 4 3.5 3.5-1 4.5-2-1-2.5-1-2.5L9 8.5s-1.5 1-2 0S5.5 6 5.5 6L3.5 5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                +7 (985) 131-33-23
              </a>
              <Link
                href="/#check"
                className="px-4 py-2 bg-[#6C5CE7] hover:bg-[#5A4BD1] rounded-lg text-[13px] font-medium text-white transition-colors"
              >
                Проверить сайт
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/cabinet"
                  className="text-[13px] font-medium text-gray-600 hover:text-[#6C5CE7] transition-colors hidden sm:block"
                >
                  Кабинет
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="text-[13px] font-medium text-gray-600 hover:text-[#6C5CE7] transition-colors hidden sm:block"
                >
                  Войти
                </Link>
              )}
            </div>
          </div>
        </nav>

        <div className="pt-14">{children}</div>

        {/* ────── Global Footer ────── */}
        <footer className="border-t border-gray-200 bg-gray-50 mt-auto">
          <div className="max-w-[980px] mx-auto px-6 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Организация</p>
                <p className="text-[13px] text-gray-800 font-medium mb-1">ООО &laquo;Инворк&raquo;</p>
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  ИНН 7806618194<br />
                  ОГРН 1247800025032<br />
                  КПП 770501001
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Контакты</p>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  <a href="tel:+79851313323" className="text-gray-800 hover:text-[#6C5CE7] transition-colors">
                    +7 (985) 131-33-23
                  </a>
                  <br />
                  <a href="mailto:info@shtrafometer.ru" className="text-gray-800 hover:text-[#6C5CE7] transition-colors">
                    info@shtrafometer.ru
                  </a>
                  <br />
                  <span className="text-gray-400">Пн — Пт, 9:00 — 21:00</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Адрес</p>
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  115054, г. Москва,<br />
                  ул. Большая Пионерская, д. 20,<br />
                  помещ. 2/1
                </p>
                <p className="text-[12px] text-gray-400 mt-2">
                  Адрес для претензий совпадает с юридическим
                </p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4 text-[12px]">
                <Link href="/offer" className="text-gray-500 hover:text-gray-800 transition-colors">
                  Публичная оферта
                </Link>
                <Link href="/privacy" className="text-gray-500 hover:text-gray-800 transition-colors">
                  Политика конфиденциальности
                </Link>
                <Link href="/requisites" className="text-gray-500 hover:text-gray-800 transition-colors">
                  Реквизиты
                </Link>
                <Link href="/blog" className="text-gray-500 hover:text-gray-800 transition-colors">
                  Блог
                </Link>
              </div>
              <p className="text-[11px] text-gray-400">
                &copy; {new Date().getFullYear()}{" "}ООО &laquo;Инворк&raquo;. Все права защищены.
              </p>
            </div>
            <p className="text-[11px] text-gray-400 mt-6 leading-relaxed max-w-2xl">
              Сервис выполняет автоматическую проверку и не является юридической
              консультацией. Результаты носят информационный характер.
              Для получения квалифицированной помощи обратитесь к юристу,
              специализирующемуся на интернет-праве. 18+
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
