import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Штрафометр — Проверка сайта на штрафы по законам РФ",
  description:
    "Бесплатный анализ сайта по 8 законам Российской Федерации. 35+ автоматических проверок, расчёт штрафов, рекомендации по исправлению. Реальные кейсы штрафов и разборы нарушений.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-white text-gray-800">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="text-lg font-bold text-gray-900 hover:text-[#6C5CE7] transition-colors"
            >
              Штрафометр
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-500 hover:text-[#6C5CE7] transition-colors"
            >
              Блог
            </Link>
          </div>
        </nav>
        <div className="pt-14 min-h-[calc(100vh-280px)]">{children}</div>

        {/* ────── Global Footer ────── */}
        <footer className="border-t border-gray-200 mt-12 bg-gray-50">
          <div className="max-w-[980px] mx-auto px-6 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Организация</p>
                <p className="text-[13px] text-gray-800 font-medium mb-1">ООО &laquo;Инфологистик 24&raquo;</p>
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  ИНН 9701049890<br />
                  ОГРН 1167746879486<br />
                  КПП 772301001
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Контакты</p>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  <a href="tel:+74991105549" className="text-gray-800 hover:text-[#6C5CE7] transition-colors">
                    8 (499) 110-55-49
                  </a>
                  <br />
                  <a href="mailto:info@infolog24.ru" className="text-gray-800 hover:text-[#6C5CE7] transition-colors">
                    info@infolog24.ru
                  </a>
                  <br />
                  <span className="text-gray-400">Пн — Пт, 9:00 — 21:00</span>
                </p>
              </div>
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
            <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4 text-[12px]">
                <Link href="/privacy" className="text-gray-500 hover:text-gray-800 transition-colors">
                  Политика конфиденциальности
                </Link>
                <Link href="/privacy" className="text-gray-500 hover:text-gray-800 transition-colors">
                  Согласие на обработку ПДн
                </Link>
                <Link href="/blog" className="text-gray-500 hover:text-gray-800 transition-colors">
                  Блог
                </Link>
              </div>
              <p className="text-[11px] text-gray-400">
                &copy; {new Date().getFullYear()} ООО &laquo;Инфологистик 24&raquo;. Все права защищены.
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
