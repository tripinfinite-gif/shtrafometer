import type { Metadata } from "next";
import { Suspense } from "react";
import { posts } from "@/content/blog";
import CategoryFilter from "@/components/blog/CategoryFilter";
import BlogGrid from "@/components/blog/BlogGrid";

export const metadata: Metadata = {
  title: "Реальные штрафы за нарушения на сайтах — Штрафометр",
  description:
    "Разбираем реальные случаи: кого оштрафовали, за что и на сколько. 18 историй о штрафах за нарушения на сайтах по законам РФ.",
  openGraph: {
    title: "Реальные штрафы за нарушения на сайтах — Штрафометр",
    description:
      "Разбираем реальные случаи: кого оштрафовали, за что и на сколько.",
  },
};

export default function BlogPage() {
  return (
    <>
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Реальные штрафы за нарушения на сайтах
        </h1>
        <p className="text-gray-500 text-base">
          Разбираем реальные случаи: кого оштрафовали, за что и на сколько
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-200">
        <span>4 600+ требований Роскомнадзора</span>
        <span className="hidden sm:inline">·</span>
        <span>376 штрафов за маркировку</span>
        <span className="hidden sm:inline">·</span>
        <span>80% дел — малый бизнес</span>
      </div>

      {/* Category filter */}
      <div className="mb-8">
        <Suspense fallback={null}>
          <CategoryFilter />
        </Suspense>
      </div>

      {/* Grid */}
      <Suspense fallback={<div className="text-center text-gray-400 py-12">Загрузка...</div>}>
        <BlogGrid posts={posts} />
      </Suspense>
    </>
  );
}
