import Link from "next/link";
import { type BlogPost, CATEGORY_LABELS, CATEGORY_COLORS } from "@/content/blog";

export default function BlogCard({ post }: { post: BlogPost }) {
  const categoryColor = CATEGORY_COLORS[post.category];
  const categoryLabel = CATEGORY_LABELS[post.category];

  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <article className="card p-5 h-full flex flex-col transition-shadow duration-200">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="blog-category-badge"
            style={{
              backgroundColor: `${categoryColor}14`,
              color: categoryColor,
            }}
          >
            {categoryLabel}
          </span>
          <span className="text-xs text-gray-400">{post.caseYear}</span>
        </div>

        <h3 className="text-base font-semibold text-gray-800 mb-2 leading-snug line-clamp-2">
          {post.title}
        </h3>

        <p className="text-sm text-gray-500 mb-4 leading-relaxed line-clamp-3 flex-1">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <span
            className="text-xs font-semibold px-2 py-1 rounded-md"
            style={{
              backgroundColor: `${categoryColor}14`,
              color: categoryColor,
            }}
          >
            {post.fineAmount}
          </span>
          <span className="text-xs text-gray-400">{post.region}</span>
        </div>
      </article>
    </Link>
  );
}
