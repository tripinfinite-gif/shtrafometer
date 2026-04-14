import type { MetadataRoute } from 'next'

const DISALLOW = ['/admin/', '/api/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*',               allow: '/', disallow: DISALLOW },
      // OpenAI
      { userAgent: 'GPTBot',          allow: '/', disallow: DISALLOW },
      { userAgent: 'OAI-SearchBot',   allow: '/', disallow: DISALLOW },
      { userAgent: 'ChatGPT-User',    allow: '/', disallow: DISALLOW },
      // Anthropic
      { userAgent: 'ClaudeBot',       allow: '/', disallow: DISALLOW },
      { userAgent: 'anthropic-ai',    allow: '/', disallow: DISALLOW },
      { userAgent: 'Claude-Web',      allow: '/', disallow: DISALLOW },
      // Google
      { userAgent: 'Googlebot',       allow: '/', disallow: DISALLOW },
      { userAgent: 'Google-Extended', allow: '/', disallow: DISALLOW },
      { userAgent: 'GoogleOther',     allow: '/', disallow: DISALLOW },
      // Yandex
      { userAgent: 'YandexBot',       allow: '/', disallow: DISALLOW },
      { userAgent: 'YandexGPT',       allow: '/', disallow: DISALLOW },
      // Microsoft
      { userAgent: 'Bingbot',         allow: '/', disallow: DISALLOW },
      { userAgent: 'bingbot',         allow: '/', disallow: DISALLOW },
      // Perplexity
      { userAgent: 'PerplexityBot',   allow: '/', disallow: DISALLOW },
      // Meta AI
      { userAgent: 'Meta-ExternalAgent', allow: '/', disallow: DISALLOW },
      // Common Crawl (обучение LLM)
      { userAgent: 'CCBot',           allow: '/', disallow: DISALLOW },
      // Applebot (Siri)
      { userAgent: 'Applebot',        allow: '/', disallow: DISALLOW },
    ],
    sitemap: 'https://shtrafometer.ru/sitemap.xml',
  }
}
