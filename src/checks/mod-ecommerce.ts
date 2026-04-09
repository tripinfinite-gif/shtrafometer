import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult, SiteType } from './types';

const MODULE = 'ecommerce';
const LAW = '54-ФЗ';

export function checkEcommerce(
  $: CheerioAPI,
  html: string,
  siteType: SiteType
): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passed: PassedCheck[] = [];

  const isEcommerce = siteType === 'ecommerce';
  const htmlLower = html.toLowerCase();

  // ─── ecom-01: Online cash register (KKT) ─────────────────────────────
  if (isEcommerce) {
    const kktPatterns = [
      /касс/i,
      /чек/i,
      /54-фз/i,
      /атол/i,
      /эвотор/i,
      /модулькасс/i,
    ];

    const hasKkt = kktPatterns.some((p) => p.test(html));

    if (!hasKkt) {
      warnings.push({
        id: 'ecom-01',
        title: 'Не обнаружено упоминание онлайн-кассы (ККТ)',
        description:
          'На сайте интернет-магазина не найдены упоминания контрольно-кассовой техники, ' +
          'чеков или соответствия 54-ФЗ. Убедитесь, что при расчётах используется онлайн-касса.',
        law: LAW,
        article: 'ст. 14.5 ч.2 КоАП',
        potentialFine: 'от 30 000 руб. для юридических лиц',
        recommendation:
          'Убедитесь, что интернет-магазин подключён к онлайн-кассе (АТОЛ, Эвотор, МодульКасса и др.) ' +
          'и покупателям выдаются электронные чеки в соответствии с 54-ФЗ.',
      });
    } else {
      passed.push({
        id: 'ecom-01',
        title: 'Упоминание онлайн-кассы (ККТ) обнаружено',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'ecom-01',
      title: 'Проверка онлайн-кассы (не применимо для данного типа сайта)',
      module: MODULE,
    });
  }

  // ─── ecom-02: Electronic receipt ──────────────────────────────────────
  if (isEcommerce) {
    const receiptPatterns = [
      /электронный\s+чек/i,
      /чек\s+на\s+email/i,
      /чек\s+на\s+sms/i,
      /чек\s+на\s+почту/i,
      /чек\s+на\s+e-mail/i,
    ];

    const hasReceipt = receiptPatterns.some((p) => p.test(html));

    if (!hasReceipt) {
      warnings.push({
        id: 'ecom-02',
        title: 'Не обнаружено упоминание электронного чека',
        description:
          'На сайте не найдены упоминания отправки электронного чека покупателю. ' +
          'По 54-ФЗ при дистанционной продаже покупателю должен направляться электронный чек.',
        law: LAW,
        article: 'ст. 14.5 ч.6 КоАП',
        potentialFine: 'до 10 000 руб. для юридических лиц',
        recommendation:
          'Укажите на сайте, что покупателю направляется электронный чек на email или по SMS.',
      });
    } else {
      passed.push({
        id: 'ecom-02',
        title: 'Упоминание электронного чека обнаружено',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'ecom-02',
      title: 'Проверка электронного чека (не применимо для данного типа сайта)',
      module: MODULE,
    });
  }

  // ─── ecom-03: Product marking (Честный ЗНАК) ─────────────────────────
  if (isEcommerce) {
    const markingPatterns = [
      /маркировк/i,
      /честный\s+знак/i,
    ];

    const hasMarking = markingPatterns.some((p) => p.test(html));

    if (!hasMarking) {
      warnings.push({
        id: 'ecom-03',
        title: 'Не обнаружено упоминание маркировки товаров',
        description:
          'На сайте не найдены упоминания системы маркировки товаров «Честный ЗНАК». ' +
          'Если вы продаёте товары, подлежащие обязательной маркировке, убедитесь в соответствии требованиям.',
        law: 'ФЗ-487',
        article: 'ст. 15.12 КоАП',
        potentialFine: 'до 50 000 руб. для юридических лиц',
        recommendation:
          'Если ваши товары подлежат обязательной маркировке, укажите на сайте информацию о работе с системой «Честный ЗНАК».',
      });
    } else {
      passed.push({
        id: 'ecom-03',
        title: 'Упоминание маркировки товаров обнаружено',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'ecom-03',
      title: 'Проверка маркировки товаров (не применимо для данного типа сайта)',
      module: MODULE,
    });
  }

  return { violations, warnings, passed };
}
