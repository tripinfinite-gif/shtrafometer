/**
 * Generate blog OG images (1200x630 PNG) with rich visual design.
 * Uses embedded Inter font for Cyrillic + thematic visual compositions.
 * Run: node scripts/generate-blog-images.mjs
 */

import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'blog');
const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');

// ─── Category themes ──────────────────────────────────────────────

const THEMES = {
  'personal-data': {
    color: '#E03131', accent: '#FF6B6B', label: 'Персональные данные',
    grad1: '#1a0505', grad2: '#3d0a0a', grad3: '#5c1010',
  },
  'advertising': {
    color: '#E8590C', accent: '#FF922B', label: 'Реклама',
    grad1: '#1a0d03', grad2: '#3d1f08', grad3: '#5c2f0c',
  },
  'localization': {
    color: '#6C5CE7', accent: '#A78BFA', label: 'Локализация данных',
    grad1: '#0d0a1a', grad2: '#1a153d', grad3: '#27205c',
  },
  'consumer': {
    color: '#2F9E44', accent: '#69DB7C', label: 'Защита потребителей',
    grad1: '#051a0d', grad2: '#0a3d1a', grad3: '#105c27',
  },
  'content-rating': {
    color: '#F08C00', accent: '#FFD43B', label: 'Возрастная маркировка',
    grad1: '#1a1203', grad2: '#3d2a08', grad3: '#5c3f0c',
  },
  'security': {
    color: '#3B82F6', accent: '#93C5FD', label: 'Безопасность',
    grad1: '#030d1a', grad2: '#081a3d', grad3: '#0c275c',
  },
};

// ─── Visual scenes per article ────────────────────────────────────

const SCENES = {
  'pervyj-shtraf-za-reklamu-bez-markirovki': 'phone',
  'yurist-iz-krasnodara-reklama-v-instagram': 'gavel',
  'spotify-i-10-millionov': 'headphones',
  'google-i-15-millionov-za-god': 'servers',
  'bank-whatsapp-i-200-tysyach': 'bank',
  'novostnoj-portal-i-festival-krafta': 'newspaper',
  'gorodskoj-telekanal-i-detskie-kruzhki': 'tv',
  'telekanal-tv3-vozrastnaya-markirovka': 'film',
  'whatsapp-i-18-millionov': 'chat',
  'tinder-i-10-millionov': 'heart',
  'yuridicheskaya-firma-iz-tambova': 'scales',
  'zastrojshchiki-iz-astrahani': 'building',
  'studiya-rastyazhki-v-tyumeni': 'yoga',
  'admin-pablika-vkontakte-post-pro-volejbol': 'ball',
  'nauchno-populyarnyj-kanal-100-tysyach': 'flask',
  'regionalnyj-telekanal-v-tyumeni-partnery': 'antenna',
  'ip-iz-sverdlovskoj-oblasti-video-bez-erid': 'camera',
  'produktovyj-magazin-i-rospotrebnadzor': 'cart',
  'shtrafy-za-sajt-bez-politiki-konfidencialnosti': 'shield',
  'google-analytics-shtraf-do-6-millionov': 'chart',
  'markirovka-reklamy-erid-kak-poluchit': 'tag',
  'chek-list-10-veshchej-na-sajte-po-zakonu': 'checklist',
  'kak-proverit-sajt-na-narusheniya-zakonodatelstva': 'magnifier',
  'cookie-banner-trebovaniya-zakona': 'cookie',
  'shtrafy-dlya-internet-magazinov-polnyj-spisok': 'shop',
  'pochemu-nelzya-ispolzovat-google-fonts': 'font',
  'reestr-operatorov-personalnyh-dannyh': 'folder',
  'forma-obratnoj-svyazi-kak-ne-poluchit-shtraf': 'envelope',
  'chto-proveryaet-roskomnadzor-na-sajtah': 'eye',
  'blok-partnery-skrytaya-reklama-shtraf-fas': 'handshake',
};

// ─── Scene SVG illustrations (right side) ─────────────────────────

function sceneIllustration(scene, color, accent) {
  const o = 0.15; // base opacity
  const scenes = {
    phone: `
      <rect x="940" y="100" width="160" height="300" rx="20" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.2}"/>
      <rect x="955" y="130" width="130" height="200" rx="4" fill="${accent}" opacity="${o}"/>
      <circle cx="1020" cy="370" r="12" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.1}"/>
      <rect x="990" y="108" width="60" height="6" rx="3" fill="${accent}" opacity="${o+0.1}"/>`,
    gavel: `
      <rect x="960" y="200" width="140" height="20" rx="4" fill="${accent}" opacity="${o+0.2}" transform="rotate(-35 1030 210)"/>
      <rect x="940" y="140" width="30" height="60" rx="6" fill="${accent}" opacity="${o+0.15}" transform="rotate(-35 955 170)"/>
      <ellipse cx="1040" cy="330" rx="80" ry="12" fill="${accent}" opacity="${o}"/>
      <rect x="1000" y="280" width="80" height="50" rx="6" fill="${accent}" opacity="${o+0.1}"/>`,
    headphones: `
      <path d="M960 240 Q960 160 1020 140 Q1080 160 1080 240" fill="none" stroke="${accent}" stroke-width="6" opacity="${o+0.2}"/>
      <rect x="940" y="230" width="30" height="60" rx="10" fill="${accent}" opacity="${o+0.2}"/>
      <rect x="1070" y="230" width="30" height="60" rx="10" fill="${accent}" opacity="${o+0.2}"/>
      <circle cx="1020" cy="200" r="50" fill="${accent}" opacity="${o*0.5}"/>`,
    servers: `
      <rect x="940" y="120" width="170" height="50" rx="8" fill="${accent}" opacity="${o+0.1}"/>
      <rect x="940" y="185" width="170" height="50" rx="8" fill="${accent}" opacity="${o+0.15}"/>
      <rect x="940" y="250" width="170" height="50" rx="8" fill="${accent}" opacity="${o+0.1}"/>
      <circle cx="965" cy="145" r="5" fill="${accent}" opacity="${o+0.3}"/>
      <circle cx="965" cy="210" r="5" fill="${color}" opacity="${o+0.4}"/>
      <circle cx="965" cy="275" r="5" fill="${accent}" opacity="${o+0.3}"/>`,
    bank: `
      <rect x="950" y="230" width="160" height="120" rx="4" fill="${accent}" opacity="${o}"/>
      <path d="M940 230 L1030 160 L1120 230" fill="none" stroke="${accent}" stroke-width="3" opacity="${o+0.2}"/>
      <rect x="970" y="250" width="20" height="80" rx="4" fill="${accent}" opacity="${o+0.15}"/>
      <rect x="1010" y="250" width="20" height="80" rx="4" fill="${accent}" opacity="${o+0.15}"/>
      <rect x="1050" y="250" width="20" height="80" rx="4" fill="${accent}" opacity="${o+0.15}"/>`,
    shield: `
      <path d="M1020 120 L1090 155 L1090 260 Q1090 320 1020 360 Q950 320 950 260 L950 155 Z" fill="${accent}" opacity="${o}" />
      <path d="M1020 120 L1090 155 L1090 260 Q1090 320 1020 360 Q950 320 950 260 L950 155 Z" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.2}"/>
      <path d="M1000 230 L1015 250 L1050 200" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="${o+0.3}"/>`,
    chart: `
      <rect x="950" y="300" width="30" height="60" rx="4" fill="${accent}" opacity="${o+0.1}"/>
      <rect x="990" y="240" width="30" height="120" rx="4" fill="${accent}" opacity="${o+0.2}"/>
      <rect x="1030" y="200" width="30" height="160" rx="4" fill="${color}" opacity="${o+0.25}"/>
      <rect x="1070" y="270" width="30" height="90" rx="4" fill="${accent}" opacity="${o+0.15}"/>
      <line x1="940" y1="365" x2="1110" y2="365" stroke="${accent}" stroke-width="2" opacity="${o+0.1}"/>`,
    checklist: `
      <rect x="950" y="130" width="150" height="240" rx="12" fill="${accent}" opacity="${o}"/>
      <rect x="970" y="160" width="14" height="14" rx="3" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.3}"/>
      <path d="M973 168 L977 172 L983 162" fill="none" stroke="${color}" stroke-width="2" opacity="${o+0.4}"/>
      <rect x="995" y="163" width="80" height="8" rx="4" fill="${accent}" opacity="${o+0.15}"/>
      <rect x="970" y="200" width="14" height="14" rx="3" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.3}"/>
      <path d="M973 208 L977 212 L983 202" fill="none" stroke="${color}" stroke-width="2" opacity="${o+0.4}"/>
      <rect x="995" y="203" width="60" height="8" rx="4" fill="${accent}" opacity="${o+0.15}"/>
      <rect x="970" y="240" width="14" height="14" rx="3" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.2}"/>
      <rect x="995" y="243" width="90" height="8" rx="4" fill="${accent}" opacity="${o+0.1}"/>
      <rect x="970" y="280" width="14" height="14" rx="3" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.15}"/>
      <rect x="995" y="283" width="70" height="8" rx="4" fill="${accent}" opacity="${o+0.1}"/>`,
    magnifier: `
      <circle cx="1010" cy="210" r="60" fill="none" stroke="${accent}" stroke-width="4" opacity="${o+0.2}"/>
      <circle cx="1010" cy="210" r="40" fill="${accent}" opacity="${o*0.6}"/>
      <line x1="1055" y1="255" x2="1100" y2="310" stroke="${accent}" stroke-width="6" stroke-linecap="round" opacity="${o+0.2}"/>`,
    envelope: `
      <rect x="930" y="170" width="180" height="130" rx="10" fill="${accent}" opacity="${o}"/>
      <path d="M930 180 L1020 250 L1110 180" fill="none" stroke="${accent}" stroke-width="3" opacity="${o+0.25}"/>
      <path d="M930 300 L990 240" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.1}"/>
      <path d="M1110 300 L1050 240" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.1}"/>`,
    eye: `
      <ellipse cx="1020" cy="230" rx="80" ry="50" fill="none" stroke="${accent}" stroke-width="3" opacity="${o+0.2}"/>
      <circle cx="1020" cy="230" r="30" fill="${accent}" opacity="${o+0.15}"/>
      <circle cx="1020" cy="230" r="12" fill="${color}" opacity="${o+0.25}"/>`,
    tag: `
      <rect x="950" y="170" width="130" height="70" rx="10" fill="${accent}" opacity="${o+0.1}"/>
      <circle cx="980" cy="205" r="10" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.3}"/>
      <path d="M1080 170 L1120 205 L1080 240" fill="${accent}" opacity="${o+0.1}"/>
      <rect x="960" y="260" width="90" height="10" rx="5" fill="${accent}" opacity="${o+0.08}"/>`,
    cookie: `
      <circle cx="1020" cy="220" r="70" fill="${accent}" opacity="${o+0.1}"/>
      <circle cx="1000" cy="200" r="8" fill="${color}" opacity="${o+0.2}"/>
      <circle cx="1040" cy="190" r="6" fill="${accent}" opacity="${o+0.25}"/>
      <circle cx="1010" cy="240" r="7" fill="${color}" opacity="${o+0.2}"/>
      <circle cx="1050" cy="230" r="5" fill="${accent}" opacity="${o+0.15}"/>
      <circle cx="990" cy="260" r="6" fill="${accent}" opacity="${o+0.2}"/>`,
    shop: `
      <rect x="940" y="200" width="160" height="140" rx="8" fill="${accent}" opacity="${o}"/>
      <path d="M930 200 L1020 140 L1110 200" fill="none" stroke="${accent}" stroke-width="3" opacity="${o+0.2}"/>
      <rect x="990" y="270" width="40" height="70" rx="4" fill="${accent}" opacity="${o+0.15}"/>
      <rect x="950" y="220" width="30" height="30" rx="4" fill="${accent}" opacity="${o+0.1}"/>
      <rect x="1060" y="220" width="30" height="30" rx="4" fill="${accent}" opacity="${o+0.1}"/>`,
    folder: `
      <path d="M940 190 L940 340 L1110 340 L1110 170 L1020 170 L1000 190 Z" fill="${accent}" opacity="${o+0.1}"/>
      <path d="M940 190 L940 340 L1110 340 L1110 170 L1020 170 L1000 190 Z" fill="none" stroke="${accent}" stroke-width="2" opacity="${o+0.15}"/>
      <rect x="960" y="230" width="120" height="10" rx="5" fill="${accent}" opacity="${o+0.1}"/>
      <rect x="960" y="260" width="80" height="10" rx="5" fill="${accent}" opacity="${o+0.08}"/>`,
    font: `
      <text x="1020" y="270" font-family="serif" font-size="120" font-weight="700" fill="${accent}" opacity="${o+0.15}" text-anchor="middle">Aa</text>`,
    handshake: `
      <path d="M940 250 Q980 200 1020 250 Q1060 200 1100 250" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" opacity="${o+0.2}"/>
      <circle cx="940" cy="250" r="20" fill="${accent}" opacity="${o+0.1}"/>
      <circle cx="1100" cy="250" r="20" fill="${accent}" opacity="${o+0.1}"/>`,
  };

  // Aliases for similar scenes
  const aliases = {
    newspaper: 'folder', tv: 'phone', film: 'camera', chat: 'phone',
    heart: 'eye', scales: 'gavel', building: 'bank', yoga: 'heart',
    ball: 'eye', flask: 'magnifier', antenna: 'tv', camera: 'phone', cart: 'shop',
  };

  const key = scenes[scene] ? scene : (aliases[scene] || 'shield');
  return scenes[key] || scenes.shield;
}

// ─── Decorative background pattern ────────────────────────────────

function bgPattern(color, accent) {
  return `
    <!-- Radial glow -->
    <radialGradient id="glow" cx="0.8" cy="0.3" r="0.6">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
    <rect width="1200" height="630" fill="url(#glow)"/>

    <!-- Subtle dots grid -->
    <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="15" cy="15" r="0.8" fill="${accent}" opacity="0.06"/>
    </pattern>
    <rect width="1200" height="630" fill="url(#dots)"/>

    <!-- Diagonal lines -->
    <pattern id="lines" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
      <line x1="0" y1="0" x2="0" y2="60" stroke="${accent}" stroke-width="0.4" opacity="0.04"/>
    </pattern>
    <rect width="1200" height="630" fill="url(#lines)"/>`;
}

// ─── Text utilities ───────────────────────────────────────────────

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line += ' ' + word;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 3);
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// ─── SVG generator ────────────────────────────────────────────────

function generateSVG(article) {
  const theme = THEMES[article.category] || THEMES['personal-data'];
  const scene = SCENES[article.slug] || 'shield';
  const titleLines = wrapText(article.title, 30);
  const fineText = article.fineAmount || '';
  const isCase = article.caseYear > 0;
  const typeLabel = isCase ? 'Кейс ' + article.caseYear : 'Гайд';
  const illustration = sceneIllustration(scene, theme.color, theme.accent);
  const pattern = bgPattern(theme.color, theme.accent);

  const catBadgeW = theme.label.length * 9.5 + 28;
  const typeBadgeW = typeLabel.length * 8.5 + 22;
  const fineBadgeW = fineText ? fineText.length * 11 + 32 : 0;

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.grad1}"/>
      <stop offset="50%" stop-color="${theme.grad2}"/>
      <stop offset="100%" stop-color="${theme.grad3}"/>
    </linearGradient>
    ${pattern}
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Top accent bar -->
  <rect width="1200" height="4" fill="${theme.color}"/>

  <!-- Scene illustration -->
  <g>${illustration}</g>

  <!-- Category badge -->
  <rect x="60" y="50" width="${catBadgeW}" height="30" rx="15" fill="${theme.color}"/>
  <text x="${60 + catBadgeW/2}" y="70" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="white" text-anchor="middle">${esc(theme.label)}</text>

  <!-- Type badge -->
  <rect x="${catBadgeW + 72}" y="50" width="${typeBadgeW}" height="30" rx="15" fill="rgba(255,255,255,0.1)"/>
  <text x="${catBadgeW + 72 + typeBadgeW/2}" y="70" font-family="Inter, sans-serif" font-size="12" font-weight="500" fill="rgba(255,255,255,0.7)" text-anchor="middle">${esc(typeLabel)}</text>

  <!-- Title -->
  ${titleLines.map((line, i) => `<text x="60" y="${130 + i * 50}" font-family="Inter, sans-serif" font-size="40" font-weight="700" fill="white" letter-spacing="-0.5">${esc(line)}</text>`).join('\n  ')}

  <!-- Fine badge -->
  ${fineText ? `
  <rect x="60" y="${145 + titleLines.length * 50}" width="${fineBadgeW}" height="36" rx="8" fill="${theme.color}" opacity="0.9"/>
  <text x="${60 + fineBadgeW/2}" y="${170 + titleLines.length * 50}" font-family="Inter, sans-serif" font-size="17" font-weight="700" fill="white" text-anchor="middle">${esc(fineText)}</text>
  ` : ''}

  <!-- Law reference -->
  ${article.law ? `<text x="60" y="${fineText ? 210 + titleLines.length * 50 : 165 + titleLines.length * 50}" font-family="Inter, sans-serif" font-size="15" fill="rgba(255,255,255,0.45)">${esc(article.law)}</text>` : ''}

  <!-- Bottom bar -->
  <rect y="590" width="1200" height="40" fill="rgba(0,0,0,0.4)"/>
  <rect x="50" y="602" width="18" height="18" rx="4" fill="#6C5CE7"/>
  <text x="76" y="616" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="white">Штрафометр</text>
  <text x="1140" y="616" font-family="Inter, sans-serif" font-size="11" fill="rgba(255,255,255,0.4)" text-anchor="end">shtrafometer.vercel.app</text>
</svg>`;
}

// ─── Parse articles from blog.ts ──────────────────────────────────

function parseArticles() {
  const content = fs.readFileSync(path.join(process.cwd(), 'src', 'content', 'blog.ts'), 'utf-8');
  const slugs = [], titles = [], cats = [], laws = [], fines = [], years = [];

  for (const m of content.matchAll(/slug:\s*"([^"]+)"/g)) slugs.push(m[1]);
  for (const m of content.matchAll(/(?<!\w)title:\s*"([^"]+)"/g)) titles.push(m[1]);
  for (const m of content.matchAll(/category:\s*"([^"]+)"/g)) cats.push(m[1]);
  for (const m of content.matchAll(/(?<!\w)law:\s*"([^"]+)"/g)) laws.push(m[1]);
  for (const m of content.matchAll(/fineAmount:\s*"([^"]+)"/g)) fines.push(m[1]);
  for (const m of content.matchAll(/caseYear:\s*(\d+)/g)) years.push(parseInt(m[1]));

  const articles = [];
  for (let i = 0; i < slugs.length; i++) {
    articles.push({
      slug: slugs[i],
      title: titles[i] || 'Статья',
      category: cats[i] || 'personal-data',
      law: laws[i * 2] || '',
      fineAmount: fines[i] || '',
      caseYear: years[i] || 0,
    });
  }
  return articles;
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load Inter fonts for resvg
  const fontRegular = fs.readFileSync(path.join(FONTS_DIR, 'Inter-Regular.ttf'));
  const fontBold = fs.readFileSync(path.join(FONTS_DIR, 'Inter-Bold.ttf'));
  const fontSemiBold = fs.readFileSync(path.join(FONTS_DIR, 'Inter-SemiBold.ttf'));

  const articles = parseArticles();
  console.log(`Generating ${articles.length} blog images...\n`);

  let ok = 0;
  for (const article of articles) {
    const svg = generateSVG(article);
    const outputPath = path.join(OUTPUT_DIR, `${article.slug}.png`);

    try {
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: 1200 },
        font: {
          fontBuffers: [fontRegular, fontBold, fontSemiBold],
          loadSystemFonts: false,
          defaultFontFamily: 'Inter',
        },
      });

      const pngBuffer = resvg.render().asPng();
      fs.writeFileSync(outputPath, pngBuffer);
      ok++;
      console.log(`  ✅ ${article.slug}.png (${Math.round(pngBuffer.length / 1024)}KB)`);
    } catch (err) {
      console.error(`  ❌ ${article.slug}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${ok}/${articles.length} images in public/blog/`);
}

main().catch(console.error);
