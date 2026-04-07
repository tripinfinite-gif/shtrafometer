import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Штрафометр — Проверка сайта на штрафы по законам РФ",
  description:
    "Бесплатный анализ сайта по 8 законам Российской Федерации. 35+ автоматических проверок, расчёт штрафов, рекомендации по исправлению.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
