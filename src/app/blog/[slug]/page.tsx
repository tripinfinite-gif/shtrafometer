import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { posts } from "@/content/blog";
import BlogArticle from "@/components/blog/BlogArticle";
import BlogCard from "@/components/blog/BlogCard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return { title: "Статья не найдена — Штрафометр" };

  return {
    title: `${post.title} — Штрафометр`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      images: [`/blog/${post.slug}.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [`/blog/${post.slug}.png`],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  // Related posts: same category, exclude current, max 3
  let related = posts.filter(
    (p) => p.category === post.category && p.slug !== post.slug
  );
  if (related.length < 3) {
    const extra = posts.filter(
      (p) => p.slug !== post.slug && p.category !== post.category
    );
    related = [...related, ...extra].slice(0, 3);
  } else {
    related = related.slice(0, 3);
  }

  return (
    <>
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/blog"
          className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors"
        >
          &larr; Все статьи
        </Link>
      </div>

      <BlogArticle post={post} />

      {/* Related posts */}
      {related.length > 0 && (
        <div className="max-w-[720px] mx-auto mt-14">
          <h2 className="text-lg font-bold text-gray-900 mb-5">
            Похожие статьи
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
