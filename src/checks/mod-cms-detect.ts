import type * as cheerio from 'cheerio';

// ─── CMS Detection ─────────────────────────────────────────────────

export type CmsType =
  | 'wordpress'
  | 'bitrix'
  | 'tilda'
  | 'wix'
  | 'joomla'
  | 'drupal'
  | 'opencart'
  | 'shopify'
  | 'squarespace'
  | 'modx'
  | 'netcat'
  | 'umi'
  | 'hostcms'
  | 'static'
  | 'unknown';

interface CmsSignature {
  type: CmsType;
  label: string;
  /** Strings to search in HTML (case-insensitive) */
  htmlPatterns: string[];
  /** Strings to search in response headers */
  headerPatterns?: string[];
  /** CSS/JS URL patterns */
  resourcePatterns?: string[];
}

const CMS_SIGNATURES: CmsSignature[] = [
  {
    type: 'wordpress',
    label: 'WordPress',
    htmlPatterns: ['wp-content', 'wp-includes', 'wp-json', '/xmlrpc.php'],
    resourcePatterns: ['wp-content/themes/', 'wp-content/plugins/'],
  },
  {
    type: 'bitrix',
    label: '1C-Bitrix',
    htmlPatterns: ['/bitrix/', 'bitrix/js/', 'bitrix/cache/', 'bx-core', 'BX.message'],
    resourcePatterns: ['/bitrix/templates/', '/bitrix/components/'],
  },
  {
    type: 'tilda',
    label: 'Tilda',
    htmlPatterns: ['tilda--', 'tildacdn.com', 't-records', 'tilda.ws', 't-tildalabel'],
    resourcePatterns: ['static.tildacdn.com'],
  },
  {
    type: 'wix',
    label: 'Wix',
    htmlPatterns: ['wix.com', '_wix_browser_sess', 'X-Wix', 'wixsite.com'],
    resourcePatterns: ['static.wixstatic.com', 'parastorage.com'],
  },
  {
    type: 'shopify',
    label: 'Shopify',
    htmlPatterns: ['cdn.shopify.com', 'Shopify.theme', 'myshopify.com'],
    resourcePatterns: ['cdn.shopify.com/s/files/'],
  },
  {
    type: 'joomla',
    label: 'Joomla',
    htmlPatterns: ['/media/jui/', '/components/com_', 'Joomla!'],
    resourcePatterns: ['/media/system/js/', '/templates/'],
  },
  {
    type: 'drupal',
    label: 'Drupal',
    htmlPatterns: ['Drupal.settings', '/sites/default/files/', 'drupal.js'],
    resourcePatterns: ['/sites/all/themes/', '/sites/default/'],
  },
  {
    type: 'opencart',
    label: 'OpenCart',
    htmlPatterns: ['route=common', 'catalog/view/theme', 'opencart'],
    resourcePatterns: ['catalog/view/javascript/'],
  },
  {
    type: 'squarespace',
    label: 'Squarespace',
    htmlPatterns: ['squarespace.com', 'static1.squarespace.com', 'sqs-block'],
    resourcePatterns: ['static1.squarespace.com'],
  },
  {
    type: 'modx',
    label: 'MODX',
    htmlPatterns: ['/assets/components/', 'modx', 'MODX'],
    resourcePatterns: ['/assets/components/'],
  },
  {
    type: 'netcat',
    label: 'NetCat',
    htmlPatterns: ['netcat', '/netcat/', 'nc_script'],
  },
  {
    type: 'umi',
    label: 'UMI.CMS',
    htmlPatterns: ['umi:', '/umi-cms/', 'umiData'],
  },
  {
    type: 'hostcms',
    label: 'HostCMS',
    htmlPatterns: ['hostcms', '/hostcmsfiles/'],
  },
];

/** CMS price multipliers */
export const CMS_MULTIPLIERS: Record<CmsType, number> = {
  wordpress: 1.0,
  static: 1.0,
  joomla: 1.3,
  drupal: 1.5,
  opencart: 1.3,
  modx: 1.3,
  netcat: 1.5,
  umi: 1.5,
  hostcms: 1.5,
  bitrix: 1.5,
  shopify: 2.0,
  tilda: 2.0,
  wix: 2.5,
  squarespace: 2.5,
  unknown: 1.5,
};

export const CMS_LABELS: Record<CmsType, string> = {
  wordpress: 'WordPress',
  bitrix: '1C-Bitrix',
  tilda: 'Tilda',
  wix: 'Wix',
  joomla: 'Joomla',
  drupal: 'Drupal',
  opencart: 'OpenCart',
  shopify: 'Shopify',
  squarespace: 'Squarespace',
  modx: 'MODX',
  netcat: 'NetCat',
  umi: 'UMI.CMS',
  hostcms: 'HostCMS',
  static: 'Статический HTML',
  unknown: 'Не определена',
};

export interface CmsDetectResult {
  cmsType: CmsType;
  cmsLabel: string;
  cmsMultiplier: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect CMS from HTML content and response headers.
 */
export function detectCms(
  $: cheerio.CheerioAPI,
  html: string,
  headers?: Record<string, string>,
): CmsDetectResult {
  const htmlLower = html.toLowerCase();

  let bestMatch: { type: CmsType; score: number } = { type: 'unknown', score: 0 };

  for (const sig of CMS_SIGNATURES) {
    let score = 0;

    // Check HTML patterns
    for (const pattern of sig.htmlPatterns) {
      if (htmlLower.includes(pattern.toLowerCase())) score += 2;
    }

    // Check resource patterns (in src/href attributes)
    if (sig.resourcePatterns) {
      for (const pattern of sig.resourcePatterns) {
        if (htmlLower.includes(pattern.toLowerCase())) score += 1;
      }
    }

    // Check response headers
    if (sig.headerPatterns && headers) {
      const headerStr = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n').toLowerCase();
      for (const pattern of sig.headerPatterns) {
        if (headerStr.includes(pattern.toLowerCase())) score += 2;
      }
    }

    // Check meta generator tag
    const generator = $('meta[name="generator"]').attr('content') || '';
    if (generator.toLowerCase().includes(sig.type)) score += 3;

    if (score > bestMatch.score) {
      bestMatch = { type: sig.type, score };
    }
  }

  // If no CMS detected, check if it's a simple static site
  if (bestMatch.score === 0) {
    const hasNoFramework = !htmlLower.includes('react') && !htmlLower.includes('vue') && !htmlLower.includes('angular');
    const isSimple = $('script[src]').length < 5 && hasNoFramework;
    if (isSimple) {
      bestMatch = { type: 'static', score: 1 };
    }
  }

  const confidence = bestMatch.score >= 4 ? 'high' : bestMatch.score >= 2 ? 'medium' : 'low';

  return {
    cmsType: bestMatch.type,
    cmsLabel: CMS_LABELS[bestMatch.type],
    cmsMultiplier: CMS_MULTIPLIERS[bestMatch.type],
    confidence,
  };
}
