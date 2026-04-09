/**
 * Generate blog OG images (1200x630 PNG) with realistic photo backgrounds.
 * Uses Unsplash source for royalty-free photos + SVG text overlay.
 * Run: node scripts/generate-blog-images.mjs
 */

import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import https from 'https';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'blog');

// Category themes
const THEMES = {
  'personal-data': { color: '#E03131', label: 'Персональные данные', gradient: ['#1a0000', '#3d0000'] },
  'advertising': { color: '#E8590C', label: 'Реклама', gradient: ['#1a0d00', '#3d1f00'] },
  'localization': { color: '#6C5CE7', label: 'Локализация данных', gradient: ['#0d0a1a', '#1a153d'] },
  'consumer': { color: '#2F9E44', label: 'Защита потребителей', gradient: ['#001a0d', '#003d1a'] },
  'content-rating': { color: '#F08C00', label: 'Возрастная маркировка', gradient: ['#1a1200', '#3d2a00'] },
  'security': { color: '#3B82F6', label: 'Безопасность', gradient: ['#000d1a', '#001a3d'] },
};

// Photo keywords for each article (Unsplash search terms)
const ARTICLE_PHOTOS = {
  'pervyj-shtraf-za-reklamu-bez-markirovki': 'smartphone,social-media',
  'yurist-iz-krasnodara-reklama-v-instagram': 'courthouse,law',
  'spotify-i-10-millionov': 'headphones,music-streaming',
  'google-i-15-millionov-za-god': 'server-room,data-center',
  'bank-whatsapp-i-200-tysyach': 'banking,office',
  'novostnoj-portal-i-festival-krafta': 'newspaper,press',
  'gorodskoj-telekanal-i-detskie-kruzhki': 'children,education',
  'telekanal-tv3-vozrastnaya-markirovka': 'television,broadcast',
  'whatsapp-i-18-millionov': 'messaging,chat',
  'tinder-i-10-millionov': 'dating,mobile-app',
  'yuridicheskaya-firma-iz-tambova': 'legal,documents',
  'zastrojshchiki-iz-astrahani': 'construction,buildings',
  'studiya-rastyazhki-v-tyumeni': 'yoga,fitness',
  'admin-pablika-vkontakte-post-pro-volejbol': 'volleyball,sports',
  'nauchno-populyarnyj-kanal-100-tysyach': 'science,laboratory',
  'regionalnyj-telekanal-v-tyumeni-partnery': 'broadcasting,tv-studio',
  'ip-iz-sverdlovskoj-oblasti-video-bez-erid': 'video-production,camera',
  'produktovyj-magazin-i-rospotrebnadzor': 'grocery,store',
  'shtrafy-za-sajt-bez-politiki-konfidencialnosti': 'privacy,security-lock',
  'google-analytics-shtraf-do-6-millionov': 'analytics,dashboard',
  'markirovka-reklamy-erid-kak-poluchit': 'advertising,marketing',
  'chek-list-10-veshchej-na-sajte-po-zakonu': 'checklist,business',
  'kak-proverit-sajt-na-narusheniya-zakonodatelstva': 'computer,audit',
  'cookie-banner-trebovaniya-zakona': 'cookies,web-browser',
  'shtrafy-dlya-internet-magazinov-polnyj-spisok': 'ecommerce,shopping',
  'pochemu-nelzya-ispolzovat-google-fonts': 'typography,design',
  'reestr-operatorov-personalnyh-dannyh': 'registry,filing-cabinet',
  'forma-obratnoj-svyazi-kak-ne-poluchit-shtraf': 'contact-form,email',
  'chto-proveryaet-roskomnadzor-na-sajtah': 'inspection,magnifying-glass',
  'blok-partnery-skrytaya-reklama-shtraf-fas': 'business-handshake,partnership',
};

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchImage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

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
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateSVG(article, photoBase64) {
  const theme = THEMES[article.category] || THEMES['personal-data'];
  const titleLines = wrapText(article.title, 34);
  const fineText = article.fineAmount || '';
  const isCase = article.caseYear && article.caseYear > 0;
  const typeLabel = isCase ? `Кейс ${article.caseYear}` : 'Гайд';

  const photoTag = photoBase64
    ? `<image href="data:image/jpeg;base64,${photoBase64}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice" />`
    : '';

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="overlay" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.85" />
      <stop offset="60%" stop-color="#000000" stop-opacity="0.7" />
      <stop offset="100%" stop-color="${theme.gradient[1]}" stop-opacity="0.65" />
    </linearGradient>
    <linearGradient id="bottomFade" x1="0" y1="0.7" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.5" />
    </linearGradient>
  </defs>

  <!-- Photo background -->
  ${photoTag}
  ${!photoBase64 ? `<rect width="1200" height="630" fill="${theme.gradient[1]}" />` : ''}

  <!-- Dark overlay for text readability -->
  <rect width="1200" height="630" fill="url(#overlay)" />
  <rect width="1200" height="630" fill="url(#bottomFade)" />

  <!-- Top accent line -->
  <rect width="1200" height="4" fill="${theme.color}" />

  <!-- Category badge -->
  <rect x="60" y="50" width="${theme.label.length * 10 + 32}" height="32" rx="16" fill="${theme.color}" />
  <text x="${60 + (theme.label.length * 10 + 32) / 2}" y="71" font-family="Inter, Arial, Helvetica, sans-serif" font-size="13" font-weight="600" fill="white" text-anchor="middle">${esc(theme.label)}</text>

  <!-- Type badge -->
  <rect x="${theme.label.length * 10 + 105}" y="50" width="${typeLabel.length * 9 + 24}" height="32" rx="16" fill="rgba(255,255,255,0.15)" />
  <text x="${theme.label.length * 10 + 105 + (typeLabel.length * 9 + 24) / 2}" y="71" font-family="Inter, Arial, Helvetica, sans-serif" font-size="13" font-weight="500" fill="rgba(255,255,255,0.9)" text-anchor="middle">${esc(typeLabel)}</text>

  <!-- Title -->
  ${titleLines.map((line, i) => `<text x="60" y="${135 + i * 52}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="white" letter-spacing="-0.5">${esc(line)}</text>`).join('\n  ')}

  <!-- Fine badge -->
  ${fineText ? `
  <rect x="60" y="${150 + titleLines.length * 52}" width="${fineText.length * 14 + 36}" height="40" rx="8" fill="${theme.color}" opacity="0.9" />
  <text x="${60 + (fineText.length * 14 + 36) / 2}" y="${177 + titleLines.length * 52}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle">${esc(fineText)}</text>
  ` : ''}

  <!-- Law reference -->
  ${article.law ? `<text x="60" y="${fineText ? 218 + titleLines.length * 52 : 168 + titleLines.length * 52}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="15" fill="rgba(255,255,255,0.6)">${esc(article.law)}</text>` : ''}

  <!-- Bottom bar -->
  <rect y="588" width="1200" height="42" fill="rgba(0,0,0,0.6)" />
  <rect x="50" y="600" width="20" height="20" rx="4" fill="#6C5CE7" />
  <text x="78" y="615" font-family="Inter, Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="white">Штрафометр</text>
  <text x="1140" y="615" font-family="Inter, Arial, Helvetica, sans-serif" font-size="12" fill="rgba(255,255,255,0.5)" text-anchor="end">shtrafometer.vercel.app</text>
</svg>`;
}

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
      title: titles[i] || `Статья ${i + 1}`,
      category: cats[i] || 'personal-data',
      law: laws[i * 2] || '',
      fineAmount: fines[i] || '',
      caseYear: years[i] || 0,
    });
  }
  return articles;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const articles = parseArticles();
  console.log(`Generating ${articles.length} blog images with photo backgrounds...`);

  let generated = 0;
  for (const article of articles) {
    const outputPath = path.join(OUTPUT_DIR, `${article.slug}.png`);

    // Try to fetch a photo from Unsplash
    let photoBase64 = null;
    const keywords = ARTICLE_PHOTOS[article.slug] || 'business,office';
    const photoUrl = `https://source.unsplash.com/1200x630/?${keywords}`;

    try {
      console.log(`  📷 Fetching photo for ${article.slug}...`);
      const photoBuffer = await fetchImage(photoUrl);
      if (photoBuffer.length > 5000) {
        photoBase64 = photoBuffer.toString('base64');
      }
    } catch {
      console.log(`  ⚠️  Photo fetch failed, using solid background`);
    }

    const svg = generateSVG(article, photoBase64);

    try {
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: 1200 },
        font: { loadSystemFonts: true },
      });
      const pngBuffer = resvg.render().asPng();
      fs.writeFileSync(outputPath, pngBuffer);
      generated++;
      console.log(`  ✅ ${article.slug}.png (${Math.round(pngBuffer.length / 1024)}KB)`);
    } catch (err) {
      console.error(`  ❌ ${article.slug}: ${err.message}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone: ${generated}/${articles.length} images generated in public/blog/`);
}

main().catch(console.error);
