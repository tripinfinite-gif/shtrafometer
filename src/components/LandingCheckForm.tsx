"use client";

import { useState, FormEvent } from "react";

declare global { interface Window { ym?: (...args: unknown[]) => void; } }

interface Props {
  placeholder?: string;
  ctaText?: string;
  size?: "lg" | "md";
  className?: string;
}

export default function LandingCheckForm({
  placeholder = "https://ваш-сайт.ru",
  ctaText = "Проверить бесплатно",
  size = "lg",
  className = "",
}: Props) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    window.ym?.(108525306, "reachGoal", "free_check");
    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;
    window.location.href = `/?url=${encodeURIComponent(target)}`;
  }

  const inputCls =
    size === "lg"
      ? "flex-1 px-5 py-4 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent text-[15px] shadow-sm"
      : "flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent text-[14px]";

  const btnCls =
    size === "lg"
      ? "px-7 py-4 bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white font-semibold rounded-xl transition-all text-[15px] whitespace-nowrap shadow-sm hover:shadow-md"
      : "px-5 py-3 bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white font-semibold rounded-lg transition-all text-[14px] whitespace-nowrap";

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col sm:flex-row gap-3 w-full ${className}`}>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      <button type="submit" className={btnCls}>
        {ctaText}
      </button>
    </form>
  );
}
