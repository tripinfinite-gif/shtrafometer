/**
 * Generate blog OG images (1200x630 PNG) for each article.
 * Run: node scripts/generate-blog-images.mjs
 */

import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'blog');

// Category themes
const THEMES = {
  'personal-data': { color: '#E03131', bg: '#FEF2F2', icon: '🔒', label: 'Персональные данные' },
  'advertising': { color: '#E8590C', bg: '#FFF4E6', icon: '📢', label: 'Реклама' },
  'localization': { color: '#6C5CE7', bg: '#F3F0FF', icon: '🌍', label: 'Локализация данных' },
  'consumer': { color: '#2F9E44', bg: '#EBFBEE', icon: '🛒', label: 'Защита потребителей' },
  'content-rating': { color: '#F08C00', bg: '#FFF9DB', icon: '🔞', label: 'Возрастная маркировка' },
  'security': { color: '#3B82F6', bg: '#EFF6FF', icon: '🛡️', label: 'Безопасность' },
};

// Article-specific icons (visual theme per article)
const ARTICLE_ICONS = {
  'pervyj-shtraf-za-reklamu-bez-markirovki': { emoji: '📱', scene: 'telegram' },
  'yurist-iz-krasnodara-reklama-v-instagram': { emoji: '⚖️', scene: 'instagram' },
  'spotify-i-10-millionov': { emoji: '🎵', scene: 'music' },
  'google-i-15-millionov-za-god': { emoji: '🔍', scene: 'search' },
  'bank-whatsapp-i-200-tysyach': { emoji: '🏦', scene: 'bank' },
  'novostnoj-portal-i-festival-krafta': { emoji: '📰', scene: 'news' },
  'gorodskoj-telekanal-i-detskie-kruzhki': { emoji: '📺', scene: 'tv' },
  'telekanal-tv3-vozrastnaya-markirovka': { emoji: '🎬', scene: 'media' },
  'whatsapp-i-18-millionov': { emoji: '💬', scene: 'messenger' },
  'tinder-i-10-millionov': { emoji: '❤️', scene: 'dating' },
  'yuridicheskaya-firma-iz-tambova': { emoji: '📋', scene: 'legal' },
  'zastrojshchiki-iz-astrahani': { emoji: '🏗️', scene: 'building' },
  'studiya-rastyazhki-v-tyumeni': { emoji: '🧘', scene: 'fitness' },
  'admin-pablika-vkontakte-post-pro-volejbol': { emoji: '🏐', scene: 'sport' },
  'nauchno-populyarnyj-kanal-100-tysyach': { emoji: '🔬', scene: 'science' },
  'regionalnyj-telekanal-v-tyumeni-partnery': { emoji: '📡', scene: 'broadcast' },
  'ip-iz-sverdlovskoj-oblasti-video-bez-erid': { emoji: '🎥', scene: 'video' },
  'produktovyj-magazin-i-rospotrebnadzor': { emoji: '🏪', scene: 'shop' },
  'shtrafy-za-sajt-bez-politiki-konfidencialnosti': { emoji: '📄', scene: 'document' },
  'google-analytics-shtraf-do-6-millionov': { emoji: '📊', scene: 'analytics' },
  'markirovka-reklamy-erid-kak-poluchit': { emoji: '🏷️', scene: 'tag' },
  'chek-list-10-veshchej-na-sajte-po-zakonu': { emoji: '✅', scene: 'checklist' },
  'kak-proverit-sajt-na-narusheniya-zakonodatelstva': { emoji: '🔎', scene: 'inspect' },
  'cookie-banner-trebovaniya-zakona': { emoji: '🍪', scene: 'cookie' },
  'shtrafy-dlya-internet-magazinov-polnyj-spisok': { emoji: '💰', scene: 'ecommerce' },
  'pochemu-nelzya-ispolzovat-google-fonts': { emoji: '🔤', scene: 'fonts' },
  'reestr-operatorov-personalnyh-dannyh': { emoji: '📝', scene: 'registry' },
  'forma-obratnoj-svyazi-kak-ne-poluchit-shtraf': { emoji: '✉️', scene: 'form' },
  'chto-proveryaet-roskomnadzor-na-sajtah': { emoji: '👁️', scene: 'oversight' },
  'blok-partnery-skrytaya-reklama-shtraf-fas': { emoji: '🤝', scene: 'partners' },
};

// Scene-specific decorative elements (SVG paths)
function getSceneElements(scene, color) {
  const light = color + '20';
  const mid = color + '40';

  const scenes = {
    telegram: `
      <rect x="900" y="80" width="220" height="160" rx="20" fill="${light}" />
      <circle cx="960" cy="140" r="30" fill="${mid}" />
      <rect x="1000" y="120" width="100" height="12" rx="6" fill="${mid}" />
      <rect x="1000" y="140" width="80" height="12" rx="6" fill="${light}" />
      <rect x="900" y="270" width="220" height="100" rx="16" fill="${light}" />
      <circle cx="940" cy="310" r="18" fill="${mid}" />
      <rect x="970" y="300" width="70" height="8" rx="4" fill="${mid}" />
      <rect x="970" y="314" width="120" height="8" rx="4" fill="${light}" />`,
    instagram: `
      <rect x="920" y="80" width="200" height="280" rx="24" fill="${light}" stroke="${mid}" stroke-width="2" />
      <circle cx="1020" cy="180" r="50" fill="${mid}" />
      <circle cx="1020" cy="180" r="35" fill="${light}" />
      <rect x="950" y="260" width="140" height="8" rx="4" fill="${mid}" />
      <rect x="970" y="278" width="100" height="8" rx="4" fill="${light}" />`,
    music: `
      <circle cx="1020" cy="180" r="80" fill="${light}" />
      <circle cx="1020" cy="180" r="55" fill="${mid}" />
      <circle cx="1020" cy="180" r="15" fill="${light}" />
      <rect x="1060" y="100" width="8" height="100" rx="4" fill="${mid}" />
      <circle cx="1064" cy="100" r="16" fill="${color}" opacity="0.3" />`,
    search: `
      <circle cx="1000" cy="170" r="60" fill="none" stroke="${mid}" stroke-width="8" />
      <line x1="1045" y1="210" x2="1090" y2="260" stroke="${mid}" stroke-width="8" stroke-linecap="round" />
      <rect x="910" y="290" width="180" height="10" rx="5" fill="${light}" />
      <rect x="930" y="310" width="140" height="10" rx="5" fill="${light}" />`,
    bank: `
      <rect x="920" y="130" width="200" height="150" rx="12" fill="${light}" stroke="${mid}" stroke-width="2" />
      <rect x="950" y="100" width="140" height="30" rx="6" fill="${mid}" />
      <rect x="940" y="170" width="60" height="40" rx="8" fill="${mid}" />
      <rect x="1020" y="170" width="80" height="12" rx="6" fill="${light}" />
      <rect x="1020" y="192" width="60" height="12" rx="6" fill="${light}" />`,
    default: `
      <circle cx="1020" cy="170" r="70" fill="${light}" />
      <circle cx="1020" cy="170" r="45" fill="${mid}" />
      <rect x="990" y="270" width="60" height="60" rx="12" fill="${light}" />
      <rect x="910" y="290" width="60" height="60" rx="12" fill="${mid}" />`,
  };

  return scenes[scene] || scenes.default;
}

// Word-wrap text for SVG
function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += ' ' + word;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines.slice(0, 3); // max 3 lines
}

// Escape XML special chars
function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateSVG(article) {
  const theme = THEMES[article.category] || THEMES['personal-data'];
  const iconData = ARTICLE_ICONS[article.slug] || { emoji: '📋', scene: 'default' };

  const titleLines = wrapText(article.title, 32);
  const sceneElements = getSceneElements(iconData.scene, theme.color);

  // Fine amount formatting
  const fineText = article.fineAmount || '';

  // Determine if case or SEO article
  const isCase = article.caseYear && article.caseYear > 0;
  const typeLabel = isCase ? `Кейс ${article.caseYear}` : 'Гайд';

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FAFAFA" />
      <stop offset="100%" stop-color="${theme.bg}" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.color}" />
      <stop offset="100%" stop-color="${theme.color}CC" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#00000015" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Top accent bar -->
  <rect width="1200" height="6" fill="url(#accent)" />

  <!-- Decorative grid pattern -->
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${theme.color}" stroke-width="0.3" opacity="0.1" />
  </pattern>
  <rect width="1200" height="630" fill="url(#grid)" />

  <!-- Scene illustration (right side) -->
  <g opacity="0.8">
    ${sceneElements}
  </g>

  <!-- Large emoji watermark -->
  <text x="1020" y="500" font-size="120" text-anchor="middle" opacity="0.08">${iconData.emoji}</text>

  <!-- Category badge -->
  <rect x="60" y="50" width="${theme.label.length * 11 + 40}" height="36" rx="18" fill="${theme.color}" />
  <text x="${60 + (theme.label.length * 11 + 40) / 2}" y="74" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="600" fill="white" text-anchor="middle">${esc(theme.label)}</text>

  <!-- Type badge -->
  <rect x="${theme.label.length * 11 + 115}" y="50" width="${typeLabel.length * 10 + 30}" height="36" rx="18" fill="${theme.color}20" stroke="${theme.color}40" stroke-width="1" />
  <text x="${theme.label.length * 11 + 115 + (typeLabel.length * 10 + 30) / 2}" y="74" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="500" fill="${theme.color}" text-anchor="middle">${esc(typeLabel)}</text>

  <!-- Title -->
  ${titleLines.map((line, i) => `<text x="60" y="${130 + i * 50}" font-family="Inter, Arial, sans-serif" font-size="40" font-weight="700" fill="#1a1a1a" letter-spacing="-0.5">${esc(line)}</text>`).join('\n  ')}

  <!-- Fine amount (if present) -->
  ${fineText ? `
  <rect x="60" y="${140 + titleLines.length * 50}" width="${fineText.length * 16 + 40}" height="44" rx="10" fill="${theme.color}15" />
  <text x="80" y="${170 + titleLines.length * 50}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="${theme.color}">${esc(fineText)}</text>
  ` : ''}

  <!-- Law reference -->
  ${article.law ? `<text x="60" y="${fineText ? 215 + titleLines.length * 50 : 160 + titleLines.length * 50}" font-family="Inter, Arial, sans-serif" font-size="16" fill="#868E96">${esc(article.law)}</text>` : ''}

  <!-- Bottom bar -->
  <rect y="580" width="1200" height="50" fill="#0D0F12" />

  <!-- Logo -->
  <rect x="52" y="593" width="24" height="24" rx="5" fill="#6C5CE7" />
  <text x="84" y="612" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" fill="white">Штрафометр</text>

  <!-- URL -->
  <text x="1140" y="612" font-family="Inter, Arial, sans-serif" font-size="13" fill="#868E96" text-anchor="end">shtrafometer.vercel.app</text>
</svg>`;

  return svg;
}

// Read articles from the TS source directly (simple parse)
function parseArticles() {
  const content = fs.readFileSync(path.join(process.cwd(), 'src', 'content', 'blog.ts'), 'utf-8');

  const articles = [];
  const slugRegex = /slug:\s*"([^"]+)"/g;
  const titleRegex = /title:\s*"([^"]+)"/g;
  const categoryRegex = /category:\s*"([^"]+)"/g;
  const lawRegex = /law:\s*"([^"]+)"/g;
  const fineAmountRegex = /fineAmount:\s*"([^"]+)"/g;
  const caseYearRegex = /caseYear:\s*(\d+)/g;

  let slugMatch, titleMatch, catMatch, lawMatch, fineMatch, yearMatch;
  const slugs = [], titles = [], cats = [], laws = [], fines = [], years = [];

  while ((slugMatch = slugRegex.exec(content))) slugs.push(slugMatch[1]);
  while ((titleMatch = titleRegex.exec(content))) titles.push(titleMatch[1]);
  while ((catMatch = categoryRegex.exec(content))) cats.push(catMatch[1]);
  while ((lawMatch = lawRegex.exec(content))) laws.push(lawMatch[1]);
  while ((fineMatch = fineAmountRegex.exec(content))) fines.push(fineMatch[1]);
  while ((yearMatch = caseYearRegex.exec(content))) years.push(parseInt(yearMatch[1]));

  // titles includes interface field "title" — skip first one
  // laws includes violation.law — take every other

  for (let i = 0; i < slugs.length; i++) {
    articles.push({
      slug: slugs[i],
      title: titles[i] || `Статья ${i + 1}`,
      category: cats[i] || 'personal-data',
      law: laws[i * 2] || '', // skip violation.law entries
      fineAmount: fines[i] || '',
      caseYear: years[i] || 0,
    });
  }

  return articles;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const articles = parseArticles();
  console.log(`Generating ${articles.length} blog images...`);

  let generated = 0;
  for (const article of articles) {
    const svg = generateSVG(article);
    const outputPath = path.join(OUTPUT_DIR, `${article.slug}.png`);

    try {
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: 1200 },
        font: {
          loadSystemFonts: true,
        },
      });

      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      fs.writeFileSync(outputPath, pngBuffer);
      generated++;
      console.log(`  ✅ ${article.slug}.png (${Math.round(pngBuffer.length / 1024)}KB)`);
    } catch (err) {
      console.error(`  ❌ ${article.slug}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${generated}/${articles.length} images generated in public/blog/`);
}

main().catch(console.error);
