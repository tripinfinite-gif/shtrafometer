import Link from "next/link";

export default function BlogCTA() {
  return (
    <div className="blog-cta">
      <h3 className="text-xl font-bold text-white mb-2">
        Проверьте свой сайт бесплатно
      </h3>
      <p className="text-white/80 text-sm mb-5 max-w-md mx-auto leading-relaxed">
        Узнайте, на какую сумму штрафов рискует ваш сайт. 35+ автоматических
        проверок по 8 законам РФ.
      </p>
      <Link
        href="/"
        className="inline-block bg-white text-[#6C5CE7] font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        Проверить сайт
      </Link>
    </div>
  );
}
