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
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}
