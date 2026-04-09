"use client";

import { useSearchParams } from "next/navigation";
import { type BlogPost } from "@/content/blog";
import BlogCard from "./BlogCard";

export default function BlogGrid({ posts }: { posts: BlogPost[] }) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");

  const filtered = category
    ? posts.filter((p) => p.category === category)
    : posts;

  if (filtered.length === 0) {
    return (
      <p className="text-center text-gray-400 py-12">
        Нет статей в этой категории.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {filtered.map((post) => (
        <BlogCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
