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

  // ─── ad-03: ERID token in ads ──────────────────────────────────────
  if (hasAds) {
    const eridPatterns = [
      /erid[:=\s]\S+/i,
      /erid[:/]\S+/i,
    ];

    const hasErid = eridPatterns.some((p) => p.test(html));

    if (!hasErid) {
      violations.push({
        id: 'ad-03',
        module: MODULE,
        law: LAW,
        article: 'ст. 18.1 38-ФЗ',
        severity: 'high',
        title: 'Токен ERID не обнаружен в рекламных блоках',
        description:
          'На сайте обнаружены рекламные блоки, но не найден идентификатор токена ERID. ' +
          'С 01.09.2023 каждый рекламный материал должен содержать токен ERID, полученный через ОРД.',
        minFine: 200000,
        maxFine: 500000,
        details: [
          'Обнаружены рекламные скрипты/блоки',
          'Не найден токен ERID в формате erid:XXX, erid=XXX или erid/XXX',
        ],
        recommendation:
          'Получите токен ERID через оператора рекламных данных (ОРД) и добавьте его к каждому рекламному креативу.',
      });
    } else {
      passed.push({
        id: 'ad-03',
        title: 'Токен ERID обнаружен в рекламных материалах',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'ad-03',
      title: 'Рекламные блоки не обнаружены (проверка ERID не требуется)',
      module: MODULE,
    });
  }

  // ─── ad-05: No Meta advertising (Instagram/Facebook) ──────────────
  {
    const metaAdPatterns = [
      /instagram\.com/i,
      /facebook\.com/i,
    ];

    // Check in ad context — look for Meta links near ad-related elements
    const hasMetaAds = metaAdPatterns.some((p) => p.test(html));

    if (hasMetaAds) {
      const metaDetails: string[] = [];
      if (/instagram\.com/i.test(html)) metaDetails.push('Обнаружена ссылка на instagram.com');
      if (/facebook\.com/i.test(html)) metaDetails.push('Обнаружена ссылка на facebook.com');

      violations.push({
        id: 'ad-05',
        module: MODULE,
        law: LAW,
        article: 'ст. 14.3 КоАП',
        severity: 'high',
        title: 'Обнаружены ссылки на запрещённые социальные сети Meta',
        description:
          'На сайте обнаружены ссылки на социальные сети Instagram и/или Facebook (Meta Platforms Inc.), ' +
          'деятельность которых запрещена на территории РФ. Размещение рекламы в запрещённых соцсетях влечёт штраф.',
        minFine: 100000,
        maxFine: 500000,
        details: metaDetails,
        recommendation:
          'Удалите ссылки на Instagram и Facebook. При необходимости замените на разрешённые платформы (VK, Telegram, Одноклассники).',
      });
    } else {
      passed.push({
        id: 'ad-05',
        title: 'Ссылки на запрещённые социальные сети Meta не обнаружены',
        module: MODULE,
      });
    }
  }

  // ─── ad-06: Social advertising marked ─────────────────────────────
  {
    const hasSocialAd = /социальн/i.test(html) && hasAds;

    if (hasAds && !hasSocialAd) {
      warnings.push({
        id: 'ad-06',
        title: 'Социальная реклама не промаркирована',
        description:
          'При наличии рекламных блоков не обнаружена маркировка социальной рекламы. ' +
          'Если на сайте размещается социальная реклама, она должна быть соответствующим образом промаркирована.',
        law: LAW,
        article: 'ст. 10 38-ФЗ',
        potentialFine: '200 000 — 500 000 руб.',
        recommendation:
          'Если на сайте размещена социальная реклама, убедитесь, что она помечена как «социальная реклама» ' +
          'с указанием рекламодателя и источника финансирования.',
      });
    } else if (hasSocialAd) {
      passed.push({
        id: 'ad-06',
        title: 'Маркировка социальной рекламы обнаружена',
        module: MODULE,
      });
    } else {
      passed.push({
        id: 'ad-06',
        title: 'Рекламные блоки не обнаружены (проверка социальной рекламы не требуется)',
        module: MODULE,
      });
    }
  }

  return { violations, warnings, passed };
}
