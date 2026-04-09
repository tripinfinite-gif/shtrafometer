"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { CATEGORY_LABELS, CATEGORY_COLORS, type BlogCategory } from "@/content/blog";

const categories = Object.keys(CATEGORY_LABELS) as BlogCategory[];

export default function CategoryFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = searchParams.get("category") || "all";

  function handleClick(category: string) {
    if (category === "all") {
      router.push("/blog", { scroll: false });
    } else {
      router.push(`/blog?category=${category}`, { scroll: false });
    }
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
      <button
        onClick={() => handleClick("all")}
        className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
        style={
          active === "all"
            ? { backgroundColor: "#6C5CE7", color: "#fff" }
            : { backgroundColor: "#F1F3F5", color: "#495057" }
        }
      >
        Все
      </button>
      {categories.map((cat) => {
        const isActive = active === cat;
        const color = CATEGORY_COLORS[cat];
        return (
          <button
            key={cat}
            onClick={() => handleClick(cat)}
            className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={
              isActive
                ? { backgroundColor: color, color: "#fff" }
                : { backgroundColor: "#F1F3F5", color: "#495057" }
            }
          >
            {CATEGORY_LABELS[cat]}
          </button>
        );
      })}
    </div>
  );
}
