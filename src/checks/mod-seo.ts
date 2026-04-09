import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

const MODULE = 'seo';
const LAW = 'SEO';

export function checkSeo($: CheerioAPI, html: string, finalUrl: string): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passed: PassedCheck[] = [];

  // ─── seo-01: SSL/HTTPS ───────────────────────────────────────────────
  const usesHttps = finalUrl.startsWith('https://');

  if (!usesHttps) {
    violations.push({
      id: 'seo-01',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'critical',
      title: 'Сайт не использует HTTPS',
      description:
        'Сайт работает по незащищённому протоколу HTTP. ' +
        'Поисковые системы понижают такие сайты в выдаче, а браузеры помечают их как небезопасные.',
      minFine: 0,
      maxFine: 0,
      details: [
        `Итоговый URL: ${finalUrl}`,
        'Протокол: HTTP (незащищённый)',
      ],
      recommendation:
        'Установите SSL-сертификат и настройте принудительное перенаправление на HTTPS.',
    });
  } else {
    passed.push({
      id: 'seo-01',
      title: 'Сайт использует HTTPS',
      module: MODULE,
    });
  }

  // ─── seo-02: Title tag ───────────────────────────────────────────────
  const titleText = $('title').first().text().trim();

  if (!titleText) {
    violations.push({
      id: 'seo-02',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'high',
      title: 'Отсутствует тег <title>',
      description:
        'На странице не найден тег <title> или он пустой. ' +
        'Title — один из важнейших факторов ранжирования и отображается в поисковой выдаче.',
      minFine: 0,
      maxFine: 0,
      details: ['Тег <title> отсутствует или пуст'],
      recommendation:
        'Добавьте уникальный и информативный тег <title> длиной от 10 до 70 символов.',
    });
  } else if (titleText.length < 10 || titleText.length > 70) {
    violations.push({
      id: 'seo-02',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'high',
      title: 'Неоптимальная длина тега <title>',
      description:
        'Длина тега <title> выходит за рекомендуемые пределы (10–70 символов). ' +
        'Слишком короткий title не информативен, слишком длинный — обрезается в выдаче.',
      minFine: 0,
      maxFine: 0,
      details: [
        `Текущий title: «${titleText}»`,
        `Длина: ${titleText.length} символов (рекомендуется 10–70)`,
      ],
      recommendation:
        'Скорректируйте длину тега <title> до 10–70 символов. Включите ключевые слова и название бренда.',
    });
  } else {
    passed.push({
      id: 'seo-02',
      title: 'Тег <title> присутствует и оптимальной длины',
      module: MODULE,
    });
  }

  // ─── seo-03: Meta description ────────────────────────────────────────
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() ?? '';

  if (!metaDesc) {
    violations.push({
      id: 'seo-03',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'high',
      title: 'Отсутствует мета-тег description',
      description:
        'На странице не найден мета-тег description. ' +
        'Он используется поисковыми системами для формирования сниппета в выдаче.',
      minFine: 0,
      maxFine: 0,
      details: ['Мета-тег <meta name="description"> отсутствует или пуст'],
      recommendation:
        'Добавьте мета-тег description длиной от 50 до 160 символов с кратким описанием страницы.',
    });
  } else if (metaDesc.length < 50 || metaDesc.length > 160) {
    violations.push({
      id: 'seo-03',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'high',
      title: 'Неоптимальная длина мета-тега description',
      description:
        'Длина мета-тега description выходит за рекомендуемые пределы (50–160 символов). ' +
        'Слишком короткое описание не информативно, слишком длинное — обрезается.',
      minFine: 0,
      maxFine: 0,
      details: [
        `Текущий description: «${metaDesc.slice(0, 80)}${metaDesc.length > 80 ? '…' : ''}»`,
        `Длина: ${metaDesc.length} символов (рекомендуется 50–160)`,
      ],
      recommendation:
        'Скорректируйте длину description до 50–160 символов. Опишите содержание страницы с использованием ключевых слов.',
    });
  } else {
    passed.push({
      id: 'seo-03',
      title: 'Мета-тег description присутствует и оптимальной длины',
      module: MODULE,
    });
  }

  // ─── seo-04: H1 tag ─────────────────────────────────────────────────
  const h1Count = $('h1').length;

  if (h1Count === 0) {
    violations.push({
      id: 'seo-04',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'medium',
      title: 'Отсутствует заголовок H1',
      description:
        'На странице не найден заголовок первого уровня (H1). ' +
        'H1 — ключевой элемент для поисковых систем и структуры контента.',
      minFine: 0,
      maxFine: 0,
      details: ['Заголовок <h1> не найден на странице'],
      recommendation:
        'Добавьте один заголовок <h1>, отражающий основную тему страницы.',
    });
  } else if (h1Count > 1) {
    violations.push({
      id: 'seo-04',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'medium',
      title: 'Несколько заголовков H1 на странице',
      description:
        'На странице обнаружено несколько заголовков H1. ' +
        'Рекомендуется использовать ровно один H1 для чёткой иерархии контента.',
      minFine: 0,
      maxFine: 0,
      details: [`Найдено заголовков <h1>: ${h1Count} (рекомендуется 1)`],
      recommendation:
        'Оставьте один основной заголовок <h1>. Остальные замените на <h2> или другие уровни.',
    });
  } else {
    passed.push({
      id: 'seo-04',
      title: 'На странице ровно один заголовок H1',
      module: MODULE,
    });
  }

  // ─── seo-05: Sitemap.xml ─────────────────────────────────────────────
  const htmlLower = html.toLowerCase();
  const hasSitemapLink =
    /sitemap\.xml/i.test(html) ||
    $('a[href*="sitemap"]').length > 0;

  if (!hasSitemapLink) {
    warnings.push({
      id: 'seo-05',
      title: 'Ссылка на sitemap.xml не обнаружена в HTML',
      description:
        'В HTML-коде страницы не найдена ссылка на файл sitemap.xml. ' +
        'Sitemap помогает поисковым системам эффективнее индексировать сайт.',
      law: LAW,
      article: 'Технический аудит',
      potentialFine: 'Нет штрафа — рекомендация SEO',
      recommendation:
        'Создайте файл sitemap.xml и разместите ссылку на него в robots.txt и/или в HTML.',
    });
  } else {
    passed.push({
      id: 'seo-05',
      title: 'Ссылка на sitemap.xml найдена',
      module: MODULE,
    });
  }

  // ─── seo-06: Robots meta tag (noindex) ───────────────────────────────
  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? '';

  if (robotsMeta.includes('noindex')) {
    violations.push({
      id: 'seo-06',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'high',
      title: 'Страница закрыта от индексации (noindex)',
      description:
        'Мета-тег robots содержит директиву noindex. ' +
        'Страница не будет индексироваться поисковыми системами.',
      minFine: 0,
      maxFine: 0,
      details: [
        `Значение мета-тега robots: «${robotsMeta}»`,
        'Директива noindex запрещает индексацию',
      ],
      recommendation:
        'Удалите директиву noindex из мета-тега robots, если страница должна быть в поисковой выдаче.',
    });
  } else {
    passed.push({
      id: 'seo-06',
      title: 'Страница не закрыта от индексации',
      module: MODULE,
    });
  }

  // ─── seo-07: Schema.org ──────────────────────────────────────────────
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
  const hasItemscope = $('[itemscope]').length > 0;
  const hasSchemaOrg = hasJsonLd || hasItemscope;

  if (!hasSchemaOrg) {
    violations.push({
      id: 'seo-07',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'low',
      title: 'Микроразметка Schema.org не обнаружена',
      description:
        'На странице не найдена структурированная разметка Schema.org ' +
        '(ни JSON-LD, ни microdata). Микроразметка помогает поисковым системам лучше понимать контент.',
      minFine: 0,
      maxFine: 0,
      details: [
        'Не найден <script type="application/ld+json">',
        'Не найдены атрибуты itemscope/itemtype',
      ],
      recommendation:
        'Добавьте структурированную разметку Schema.org в формате JSON-LD. ' +
        'Как минимум — Organization, WebSite или BreadcrumbList.',
    });
  } else {
    const methods: string[] = [];
    if (hasJsonLd) methods.push('JSON-LD');
    if (hasItemscope) methods.push('Microdata');
    passed.push({
      id: 'seo-07',
      title: `Микроразметка Schema.org обнаружена (${methods.join(', ')})`,
      module: MODULE,
    });
  }

  // ─── seo-08: Viewport ───────────────────────────────────────────────
  const hasViewport = $('meta[name="viewport"]').length > 0;

  if (!hasViewport) {
    violations.push({
      id: 'seo-08',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'high',
      title: 'Отсутствует мета-тег viewport',
      description:
        'На странице не найден мета-тег viewport. ' +
        'Без него сайт некорректно отображается на мобильных устройствах, ' +
        'что негативно влияет на ранжирование в mobile-first индексации.',
      minFine: 0,
      maxFine: 0,
      details: ['Мета-тег <meta name="viewport"> не найден'],
      recommendation:
        'Добавьте мета-тег <meta name="viewport" content="width=device-width, initial-scale=1">.',
    });
  } else {
    passed.push({
      id: 'seo-08',
      title: 'Мета-тег viewport присутствует',
      module: MODULE,
    });
  }

  // ─── seo-09: Image alt tags ──────────────────────────────────────────
  const allImages = $('img');
  const totalImages = allImages.length;

  if (totalImages > 0) {
    let missingAlt = 0;
    allImages.each((_, el) => {
      const alt = $(el).attr('alt');
      if (alt === undefined || alt.trim() === '') {
        missingAlt++;
      }
    });

    const missingPercent = Math.round((missingAlt / totalImages) * 100);

    if (missingPercent > 30) {
      violations.push({
        id: 'seo-09',
        module: MODULE,
        law: LAW,
        article: 'Технический аудит',
        severity: 'medium',
        title: 'Большое количество изображений без атрибута alt',
        description:
          'Значительная часть изображений на странице не имеет атрибута alt. ' +
          'Это ухудшает доступность и SEO — поисковые системы не могут понять содержание картинок.',
        minFine: 0,
        maxFine: 0,
        details: [
          `Всего изображений: ${totalImages}`,
          `Без атрибута alt: ${missingAlt} (${missingPercent}%)`,
          'Порог: более 30% изображений без alt',
        ],
        recommendation:
          'Добавьте информативные атрибуты alt ко всем изображениям. ' +
          'Для декоративных изображений используйте пустой alt="".',
      });
    } else {
      passed.push({
        id: 'seo-09',
        title: `Атрибуты alt заполнены (${missingPercent}% без alt)`,
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'seo-09',
      title: 'Изображения на странице не найдены (проверка alt пропущена)',
      module: MODULE,
    });
  }

  // ─── seo-10: Canonical URL ──────────────────────────────────────────
  const hasCanonical = $('link[rel="canonical"]').length > 0;

  if (!hasCanonical) {
    violations.push({
      id: 'seo-10',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'medium',
      title: 'Отсутствует тег canonical',
      description:
        'На странице не указан канонический URL через <link rel="canonical">. ' +
        'Это может привести к проблемам с дублированием контента в индексе поисковых систем.',
      minFine: 0,
      maxFine: 0,
      details: ['Тег <link rel="canonical"> не найден'],
      recommendation:
        'Добавьте тег <link rel="canonical" href="..."> с каноническим URL страницы.',
    });
  } else {
    const canonicalHref = $('link[rel="canonical"]').attr('href') ?? '';
    passed.push({
      id: 'seo-10',
      title: `Канонический URL указан${canonicalHref ? `: ${canonicalHref}` : ''}`,
      module: MODULE,
    });
  }

  // ─── seo-11: Open Graph ─────────────────────────────────────────────
  const hasOgTitle = $('meta[property="og:title"]').length > 0;
  const hasOgDesc = $('meta[property="og:description"]').length > 0;
  const missingOg: string[] = [];

  if (!hasOgTitle) missingOg.push('og:title');
  if (!hasOgDesc) missingOg.push('og:description');

  if (missingOg.length > 0) {
    violations.push({
      id: 'seo-11',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'low',
      title: 'Неполная разметка Open Graph',
      description:
        'На странице отсутствуют важные мета-теги Open Graph. ' +
        'Без них ссылка на сайт будет некорректно отображаться при публикации в соцсетях и мессенджерах.',
      minFine: 0,
      maxFine: 0,
      details: [
        `Отсутствующие теги: ${missingOg.join(', ')}`,
      ],
      recommendation:
        'Добавьте мета-теги og:title и og:description для корректного отображения при шеринге в соцсетях.',
    });
  } else {
    passed.push({
      id: 'seo-11',
      title: 'Разметка Open Graph (og:title, og:description) присутствует',
      module: MODULE,
    });
  }

  // ─── seo-12: Favicon ────────────────────────────────────────────────
  const hasFavicon =
    $('link[rel="icon"]').length > 0 ||
    $('link[rel="shortcut icon"]').length > 0;

  if (!hasFavicon) {
    violations.push({
      id: 'seo-12',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'low',
      title: 'Фавикон не найден',
      description:
        'На странице не обнаружен тег подключения фавикона (favicon). ' +
        'Фавикон отображается во вкладке браузера и в поисковой выдаче, повышая узнаваемость сайта.',
      minFine: 0,
      maxFine: 0,
      details: ['Не найден <link rel="icon"> или <link rel="shortcut icon">'],
      recommendation:
        'Добавьте фавикон: <link rel="icon" href="/favicon.ico">. ' +
        'Рекомендуется также добавить иконки для различных устройств (apple-touch-icon и т.д.).',
    });
  } else {
    passed.push({
      id: 'seo-12',
      title: 'Фавикон подключён',
      module: MODULE,
    });
  }

  // ─── seo-13: Lang attribute ─────────────────────────────────────────
  const langAttr = $('html').attr('lang')?.trim() ?? '';

  if (!langAttr) {
    violations.push({
      id: 'seo-13',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'medium',
      title: 'Не указан атрибут lang у тега <html>',
      description:
        'У тега <html> отсутствует атрибут lang. ' +
        'Это важно для доступности (screen readers) и помогает поисковым системам определять язык контента.',
      minFine: 0,
      maxFine: 0,
      details: ['Атрибут lang не найден в теге <html>'],
      recommendation:
        'Добавьте атрибут lang к тегу <html>: <html lang="ru"> для русскоязычных сайтов.',
    });
  } else {
    passed.push({
      id: 'seo-13',
      title: `Атрибут lang указан: «${langAttr}»`,
      module: MODULE,
    });
  }

  // ─── seo-14: Heading hierarchy ──────────────────────────────────────
  const hasH1 = $('h1').length > 0;
  const hasH2 = $('h2').length > 0;

  if (hasH1 && !hasH2) {
    violations.push({
      id: 'seo-14',
      module: MODULE,
      law: LAW,
      article: 'Технический аудит',
      severity: 'low',
      title: 'Нарушена иерархия заголовков',
      description:
        'На странице есть заголовок H1, но отсутствуют заголовки H2. ' +
        'Правильная иерархия заголовков улучшает структуру контента и SEO.',
      minFine: 0,
      maxFine: 0,
      details: [
        'Найден заголовок <h1>, но заголовки <h2> отсутствуют',
        'Рекомендуется логическая иерархия: H1 → H2 → H3',
      ],
      recommendation:
        'Добавьте заголовки <h2> для основных разделов страницы, чтобы выстроить логическую структуру контента.',
    });
  } else {
    passed.push({
      id: 'seo-14',
      title: 'Иерархия заголовков корректна',
      module: MODULE,
    });
  }

  return { violations, warnings, passed };
}
