import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

const MODULE = 'content';

export function checkContent($: CheerioAPI, html: string): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passed: PassedCheck[] = [];

  const htmlLower = html.toLowerCase();

  // ─── cnt-01: Возрастная маркировка (436-ФЗ) ────────────────────────
  const ageMarkers = ['0+', '6+', '12+', '16+', '18+'];
  const hasAgeRating = ageMarkers.some((m) => html.includes(m));

  // Проверяем мета-тег rating
  const metaRating = $('meta[name="rating"]').attr('content') || '';
  const hasMetaRating = /general|mature|restricted|14\s*years/i.test(metaRating);

  if (!hasAgeRating && !hasMetaRating) {
    violations.push({
      id: 'cnt-01',
      module: MODULE,
      law: '436-ФЗ',
      article: 'ст. 6.17 КоАП',
      severity: 'medium',
      title: 'Отсутствует возрастная маркировка контента',
      description:
        'На сайте не обнаружена возрастная маркировка информационной продукции (0+, 6+, 12+, 16+, 18+). ' +
        'Согласно 436-ФЗ, информационная продукция подлежит обязательной классификации.',
      minFine: 20000,
      maxFine: 50000,
      details: [
        'Не найдены знаки возрастной маркировки: 0+, 6+, 12+, 16+, 18+',
        'Не найден мета-тег <meta name="rating">',
      ],
      recommendation:
        'Добавьте возрастную маркировку на сайт. Минимально — мета-тег <meta name="rating" content="general"> и видимый знак (например, «18+» в подвале).',
    });
  } else {
    passed.push({
      id: 'cnt-01',
      title: 'Возрастная маркировка найдена',
      module: MODULE,
    });
  }

  // ─── cnt-02: Копирайт ──────────────────────────────────────────────
  const hasCopyright =
    htmlLower.includes('©') ||
    htmlLower.includes('&copy;') ||
    htmlLower.includes('copyright') ||
    htmlLower.includes('все права защищены') ||
    htmlLower.includes('all rights reserved');

  if (!hasCopyright) {
    warnings.push({
      id: 'cnt-02',
      title: 'Отсутствует знак копирайта',
      description:
        'На сайте не обнаружен знак охраны авторского права (©) и указание правообладателя. ' +
        'Хотя знак © не является обязательным, его наличие упрощает защиту авторских прав.',
      law: 'ГК РФ ч.4',
      article: 'ст. 1271',
      potentialFine: 'от 10 000 руб. (при нарушении авторских прав)',
      recommendation:
        'Добавьте в подвал сайта знак копирайта: © [Год] [Наименование правообладателя]. Все права защищены.',
    });
  } else {
    passed.push({
      id: 'cnt-02',
      title: 'Знак копирайта найден',
      module: MODULE,
    });
  }

  // ─── cnt-03: Запрещённый контент ───────────────────────────────────
  const prohibitedPatterns = [
    { pattern: /казино|casino|игровые?\s+автомат/i, name: 'азартные игры' },
    { pattern: /ставки?\s+на\s+спорт|букмекер/i, name: 'букмекерская деятельность' },
  ];

  const foundProhibited: string[] = [];
  for (const { pattern, name } of prohibitedPatterns) {
    if (pattern.test(html)) {
      foundProhibited.push(name);
    }
  }

  if (foundProhibited.length > 0) {
    warnings.push({
      id: 'cnt-03',
      title: 'Обнаружен потенциально регулируемый контент',
      description:
        `На сайте обнаружены упоминания: ${foundProhibited.join(', ')}. ` +
        'Данные виды деятельности подлежат лицензированию и особому регулированию.',
      law: '244-ФЗ',
      article: 'ст. 14.1.1 КоАП',
      potentialFine: 'от 300 000 руб. (для юридических лиц)',
      recommendation:
        'Убедитесь, что деятельность ведётся на основании соответствующей лицензии.',
    });
  } else {
    passed.push({
      id: 'cnt-03',
      title: 'Запрещённый контент не обнаружен',
      module: MODULE,
    });
  }

  return { violations, warnings, passed };
}
