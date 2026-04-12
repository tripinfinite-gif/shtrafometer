import type * as cheerio from 'cheerio';

// ─── Page Count Estimation ──────────────────────────────────────────

export interface PageCountResult {
  estimatedPages: number;
  method: 'sitemap' | 'navigation' | 'fallback';
}

/**
 * Estimate number of pages on the site.
 * 1. Try sitemap.xml
 * 2. Count internal navigation links
 * 3. Fallback to 1
 */
export async function estimatePageCount(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): Promise<PageCountResult> {
  // 1. Try sitemap.xml
  try {
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;
    const res = await fetch(sitemapUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Shtrafometer/1.0' },
    });
    if (res.ok) {
      const text = await res.text();
      // Count <loc> entries
      const locCount = (text.match(/<loc>/gi) || []).length;
      if (locCount > 0) {
        return { estimatedPages: locCount, method: 'sitemap' };
      }
    }
  } catch {
    // Sitemap not available, continue
  }

  // 2. Count unique internal links from navigation
  const hostname = new URL(baseUrl).hostname;
  const internalLinks = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      // Resolve relative URLs
      const url = new URL(href, baseUrl);
      if (url.hostname === hostname || url.hostname === `www.${hostname}` || hostname === `www.${url.hostname}`) {
        // Normalize: remove hash, query, trailing slash
        const path = url.pathname.replace(/\/$/, '') || '/';
        internalLinks.add(path);
      }
    } catch {
      // Relative URL without scheme
      if (href.startsWith('/') && !href.startsWith('//')) {
        const path = href.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
        internalLinks.add(path);
      }
    }
  });

  if (internalLinks.size > 1) {
    return { estimatedPages: internalLinks.size, method: 'navigation' };
  }

  // 3. Fallback
  return { estimatedPages: 1, method: 'fallback' };
}

/** Get volume surcharge based on page count */
export function getVolumeSurcharge(pages: number): number {
  if (pages <= 10) return 0;
  if (pages <= 50) return 2000;
  if (pages <= 200) return 5000;
  return 10000;
}
