import { type BlogPost, CATEGORY_LABELS, CATEGORY_COLORS } from "@/content/blog";
import BlogCTA from "./BlogCTA";

export default function BlogArticle({ post }: { post: BlogPost }) {
  const categoryColor = CATEGORY_COLORS[post.category];
  const categoryLabel = CATEGORY_LABELS[post.category];

  return (
    <article className="max-w-[720px] mx-auto">
      {/* Hero image */}
      <div className="rounded-2xl overflow-hidden mb-6 -mx-4 sm:mx-0">
        <img
          src={`/blog/${post.slug}.png`}
          alt={post.title}
          className="w-full aspect-[1200/630] object-cover"
        />
      </div>

      {/* Category badge */}
      <div className="mb-4">
        <span
          className="blog-category-badge"
          style={{
            backgroundColor: `${categoryColor}14`,
            color: categoryColor,
          }}
        >
          {categoryLabel}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight">
        {post.title}
      </h1>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-200">
        <span>{post.region}</span>
        <span className="w-1 h-1 rounded-full bg-gray-300" />
        <span>{post.caseYear} год</span>
        <span className="w-1 h-1 rounded-full bg-gray-300" />
        <span>{post.law}</span>
      </div>

      {/* Article content */}
      <div
        className="blog-prose mb-8"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Violation block */}
      <div className="blog-violation-block mb-4">
        <h4 className="text-sm font-semibold text-red-700 mb-2">
          Что нарушено
        </h4>
        <p className="text-sm text-gray-700 mb-1">
          <span className="font-medium">Закон:</span> {post.violation.law}
        </p>
        <p className="text-sm text-gray-700 mb-1">
          <span className="font-medium">Статья:</span>{" "}
          {post.violation.article}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Штраф:</span> {post.violation.fine}
        </p>
      </div>

      {/* Objection block */}
      <div className="blog-objection-block mb-10">
        <h4 className="text-sm font-semibold text-amber-700 mb-2">
          Возражение, которое не сработало
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {post.objection}
        </p>
      </div>

      {/* CTA */}
      <BlogCTA />
    </article>
  );
}
