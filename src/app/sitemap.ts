import type { MetadataRoute } from 'next'
import { posts } from '@/content/blog'

const BASE_URL = 'https://shtrafometer.ru'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date('2026-04-14'), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/blog`, lastModified: new Date('2026-04-14'), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date('2026-04-14'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date('2026-03-01'), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/offer`, lastModified: new Date('2026-03-01'), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/requisites`, lastModified: new Date('2026-03-01'), changeFrequency: 'yearly', priority: 0.3 },
  ]

  const blogPages: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...blogPages]
}
