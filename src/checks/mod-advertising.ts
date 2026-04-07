import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

const MODULE = 'advertising';
const LAW = '38-ФЗ';

export function checkAdvertising($: CheerioAPI, html: string): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passed: PassedCheck[] = [];

  const htmlLower = html.toLowerCase();

  // ─── adv-01: Маркировка рекламы (Закон о рекламе) ──────────────────
  const adIndicators = [
    /\.adfox\./i,
    /\.adriver\./i,
    /googlesyndication/i,
    /doubleclick\.net/i,
    /ads\.google/i,
    /yandex.*direct/i,
    /an\.yandex/i,
    /adf\.media/i,
    /begun\.ru/i,
    /criteo/i,
  ];

  const hasAds = adIndicators.some((p) => p.test(html));

  if (hasAds) {
    const markerPatterns = [
      /реклама/i,
      /рекламодатель/i,
      /erid/i,
      /erid\s*[:=]\s*\S+/i,
      /токен\s+рекламы/i,
    ];

    const hasAdMarkers = markerPatterns.some((p) => p.test(html));

    if (!hasAdMarkers) {
      violations.push({
        id: 'adv-01',
        module: MODULE,
        law: LAW,
        article: 'ст. 14.3 КоАП',
        severity: 'high',
        title: 'Рекламные блоки без маркировки',
        description:
          'На сайте обнаружены рекламные блоки, но отсутствует маркировка «Реклама» ' +
          'и идентификатор токена (erid). С 01.09.2023 вся интернет-реклама подлежит обязательной маркировке.',
        minFine: 200000,
        maxFine: 500000,
        details: [
          'Обнаружены рекламные скрипты/блоки',
          'Не найдена пометка «Реклама»',
          'Не найден токен erid',
        ],
        recommendation:
          'Добавьте к каждому рекламному блоку пометку «Реклама», сведения о рекламодателе и токен erid через ОРД.',
      });
    } else {
      passed.push({
        id: 'adv-01',
        title: 'Рекламные блоки содержат маркировку',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'adv-01',
      title: 'Рекламные блоки не обнаружены',
      module: MODULE,
    });
  }

  // ─── adv-02: Слово «Акция» без условий ─────────────────────────────
  const hasPromotion =
    htmlLower.includes('акция') ||
    htmlLower.includes('скидка') ||
    htmlLower.includes('распродажа') ||
    htmlLower.includes('специальное предложение');

  if (hasPromotion) {
    const hasPromoConditions =
      htmlLower.includes('условия акции') ||
      htmlLower.includes('срок акции') ||
      htmlLower.includes('период проведения') ||
      htmlLower.includes('подробности акции') ||
      htmlLower.includes('организатор акции') ||
      htmlLower.includes('подробные условия');

    if (!hasPromoConditions) {
      warnings.push({
        id: 'adv-02',
        title: 'Акции/скидки без указания условий',
        description:
          'На сайте упоминаются акции или скидки, но не найдены условия их проведения. ' +
          'Реклама акций должна содержать существенные условия.',
        law: LAW,
        article: 'ст. 9, ст. 14.3 КоАП',
        potentialFine: '100 000 — 500 000 руб.',
        recommendation:
          'Укажите срок проведения, условия и организатора акции рядом с рекламным сообщением.',
      });
    } else {
      passed.push({
        id: 'adv-02',
        title: 'Условия акций указаны',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'adv-02',
      title: 'Акции/скидки не обнаружены',
      module: MODULE,
    });
  }

  return { violations, warnings, passed };
}
