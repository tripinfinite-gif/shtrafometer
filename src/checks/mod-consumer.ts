import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

const MODULE = 'consumer';
const LAW = 'ЗоЗПП';
const ARTICLE = 'ст. 14.8 КоАП';
const MIN_FINE = 5000;
const MAX_FINE = 20000;

function searchHtml(html: string, pattern: RegExp): RegExpMatchArray | null {
  return html.match(pattern);
}

function htmlContains(html: string, ...terms: string[]): boolean {
  const lower = html.toLowerCase();
  return terms.some((t) => lower.includes(t.toLowerCase()));
}

export function checkConsumer(
  $: CheerioAPI,
  html: string,
  siteType: string
): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passed: PassedCheck[] = [];

  const isEcommerce = siteType === 'ecommerce';
  const isService = siteType === 'service';
  const isInfo = siteType === 'informational';

  // con-01: Legal entity name
  const legalEntityRe =
    /(?:ООО|ОАО|ЗАО|ПАО|АО\s*[«"]|ИП\s+[А-ЯЁ][а-яё]+)/i;
  const hasLegalEntity = legalEntityRe.test(html);

  if (!hasLegalEntity) {
    if (isEcommerce || isService) {
      violations.push({
        id: 'con-01',
        module: MODULE,
        law: LAW,
        article: ARTICLE,
        severity: 'medium',
        title: 'Не указано наименование юридического лица',
        description:
          'На сайте не обнаружено наименование организации (ООО, ИП, АО и т.д.)',
        minFine: MIN_FINE,
        maxFine: MAX_FINE,
        details: [
          'Не найдены упоминания ООО, ОАО, ЗАО, ПАО, АО или ИП с наименованием',
        ],
        recommendation:
          'Укажите полное наименование юридического лица в подвале сайта или на странице «Контакты»',
      });
    } else {
      warnings.push({
        id: 'con-01',
        title: 'Не указано наименование юридического лица',
        description:
          'Рекомендуется указать наименование организации даже на информационном сайте',
        law: LAW,
        article: ARTICLE,
        potentialFine: '5 000 — 20 000 ₽',
        recommendation:
          'Добавьте наименование юридического лица в подвал сайта',
      });
    }
  } else {
    passed.push({
      id: 'con-01',
      title: 'Наименование юридического лица указано',
      module: MODULE,
    });
  }

  // con-02: OGRN number
  if (isEcommerce) {
    const hasOgrn =
      /ОГРН\s*[:\-]?\s*\d{13}/i.test(html) ||
      (/ОГРН/i.test(html) && /\b\d{13}\b/.test(html));

    if (!hasOgrn) {
      violations.push({
        id: 'con-02',
        module: MODULE,
        law: LAW,
        article: ARTICLE,
        severity: 'low',
        title: 'Не указан ОГРН',
        description:
          'На сайте интернет-магазина не обнаружен ОГРН (основной государственный регистрационный номер)',
        minFine: MIN_FINE,
        maxFine: MAX_FINE,
        details: ['Не найден 13-значный номер ОГРН рядом с соответствующей маркировкой'],
        recommendation:
          'Укажите ОГРН на странице «Реквизиты» или в подвале сайта',
      });
    } else {
      passed.push({
        id: 'con-02',
        title: 'ОГРН указан',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'con-02',
      title: 'Проверка ОГРН (не применимо для данного типа сайта)',
      module: MODULE,
    });
  }

  // con-03: Legal address
  if (isEcommerce) {
    const addressPatterns = [
      /г\.\s*[А-ЯЁа-яё]+/,
      /ул\.\s*[А-ЯЁа-яё]+/,
      /д\.\s*\d+/,
      /стр\.\s*\d+/,
      /корп\.\s*\d+/,
      /пр\.\s*[А-ЯЁа-яё]+/,
      /пер\.\s*[А-ЯЁа-яё]+/,
      /\b\d{6}\b/,
    ];

    const hasAddress =
      addressPatterns.some((re) => re.test(html)) ||
      (/адрес/i.test(html) &&
        (/г\.|ул\.|город|улиц/i.test(html)));

    if (!hasAddress) {
      violations.push({
        id: 'con-03',
        module: MODULE,
        law: LAW,
        article: ARTICLE,
        severity: 'low',
        title: 'Не указан юридический адрес',
        description:
          'На сайте интернет-магазина не обнаружен юридический адрес организации',
        minFine: MIN_FINE,
        maxFine: MAX_FINE,
        details: [
          'Не найдены паттерны адреса (г., ул., д., почтовый индекс и т.д.)',
        ],
        recommendation:
          'Укажите полный юридический адрес на странице «Контакты» или «Реквизиты»',
      });
    } else {
      passed.push({
        id: 'con-03',
        title: 'Юридический адрес указан',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'con-03',
      title: 'Проверка юридического адреса (не применимо для данного типа сайта)',
      module: MODULE,
    });
  }

  // con-05: Contact info (phone + email)
  const phoneRe =
    /\+?[78][\s\-()]?\(?\d{3}\)?[\s\-()]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/;
  const emailRe = /[\w.\-]+@[\w.\-]+\.\w{2,}/;
  const hasPhone = phoneRe.test(html);
  const hasEmail = emailRe.test(html);

  if (!hasPhone && !hasEmail) {
    const details: string[] = [];
    if (!hasPhone) details.push('Не найден номер телефона');
    if (!hasEmail) details.push('Не найден адрес электронной почты');

    violations.push({
      id: 'con-05',
      module: MODULE,
      law: LAW,
      article: ARTICLE,
      severity: 'medium',
      title: 'Не указана контактная информация',
      description:
        'На сайте не обнаружены контактные данные (телефон и/или email)',
      minFine: MIN_FINE,
      maxFine: MAX_FINE,
      details,
      recommendation:
        'Добавьте номер телефона и адрес электронной почты на сайт (желательно в шапку или подвал)',
    });
  } else {
    passed.push({
      id: 'con-05',
      title: 'Контактная информация указана',
      module: MODULE,
    });
  }

  // con-07: Prices in rubles (ecommerce only)
  if (isEcommerce) {
    const foreignCurrencyRe =
      /(?:\$\s*\d|\d\s*\$|€\s*\d|\d\s*€|\bUSD\b|\bEUR\b|\bdollar\b|\beuro\b)/i;
    const hasForeignCurrency = foreignCurrencyRe.test(html);
    const hasRubles =
      /(?:₽|руб|RUB|р\.)/i.test(html);

    if (hasForeignCurrency && !hasRubles) {
      const found: string[] = [];
      if (/\$/.test(html)) found.push('Символ доллара ($)');
      if (/€/.test(html)) found.push('Символ евро (€)');
      if (/\bUSD\b/i.test(html)) found.push('Обозначение USD');
      if (/\bEUR\b/i.test(html)) found.push('Обозначение EUR');
      if (/\bdollar\b/i.test(html)) found.push('Слово «dollar»');
      if (/\beuro\b/i.test(html)) found.push('Слово «euro»');

      violations.push({
        id: 'con-07',
        module: MODULE,
        law: LAW,
        article: ARTICLE,
        severity: 'low',
        title: 'Цены указаны в иностранной валюте без рублёвого эквивалента',
        description:
          'Обнаружены цены в иностранной валюте без указания стоимости в рублях',
        minFine: MIN_FINE,
        maxFine: MAX_FINE,
        details: found,
        recommendation:
          'Укажите цены в рублях. Допускается дублирование в иностранной валюте при наличии рублёвого эквивалента',
      });
    } else {
      passed.push({
        id: 'con-07',
        title: 'Цены указаны в рублях',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'con-07',
      title: 'Проверка валюты цен (не применимо для данного типа сайта)',
      module: MODULE,
    });
  }

  // con-08: Delivery/return info (ecommerce only)
  if (isEcommerce) {
    const deliveryLinks = [
      '/delivery', '/dostavka', '/shipping',
    ];
    const returnLinks = [
      '/return', '/vozvrat', '/refund', '/warranty', '/garantiya',
    ];

    const htmlLower = html.toLowerCase();

    const hasDeliveryLink = deliveryLinks.some((l) => htmlLower.includes(l));
    const hasDeliveryText = /доставк/i.test(html);
    const hasDelivery = hasDeliveryLink || hasDeliveryText;

    const hasReturnLink = returnLinks.some((l) => htmlLower.includes(l));
    const hasReturnText = /(?:возврат|обмен|гарантия)/i.test(html);
    const hasReturn = hasReturnLink || hasReturnText;

    if (!hasDelivery) {
      violations.push({
        id: 'con-08a',
        module: MODULE,
        law: LAW,
        article: ARTICLE,
        severity: 'medium',
        title: 'Отсутствует информация о доставке',
        description:
          'На сайте интернет-магазина не обнаружена информация об условиях доставки',
        minFine: MIN_FINE,
        maxFine: MAX_FINE,
        details: [
          'Не найдены ссылки на страницы доставки (/delivery, /dostavka, /shipping)',
          'Не найдено упоминание слова «доставка» в тексте',
        ],
        recommendation:
          'Добавьте страницу с условиями и сроками доставки',
      });
    } else {
      passed.push({
        id: 'con-08a',
        title: 'Информация о доставке присутствует',
        module: MODULE,
      });
    }

    if (!hasReturn) {
      violations.push({
        id: 'con-08b',
        module: MODULE,
        law: LAW,
        article: ARTICLE,
        severity: 'medium',
        title: 'Отсутствует информация о возврате и обмене',
        description:
          'На сайте интернет-магазина не обнаружена информация о возврате и обмене товаров',
        minFine: MIN_FINE,
        maxFine: MAX_FINE,
        details: [
          'Не найдены ссылки на страницы возврата (/return, /vozvrat, /refund)',
          'Не найдено упоминание слов «возврат», «обмен», «гарантия» в тексте',
        ],
        recommendation:
          'Добавьте страницу с условиями возврата и обмена товаров согласно ЗоЗПП',
      });
    } else {
      passed.push({
        id: 'con-08b',
        title: 'Информация о возврате и обмене присутствует',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'con-08a',
      title: 'Проверка информации о доставке (не применимо для данного типа сайта)',
      module: MODULE,
    });
    passed.push({
      id: 'con-08b',
      title: 'Проверка информации о возврате (не применимо для данного типа сайта)',
      module: MODULE,
    });
  }

  // con-04: Business hours listed
  {
    const hoursPatterns = [
      /режим\s+работ/i,
      /график/i,
      /пн-пт/i,
      /пн–пт/i,
      /часы\s+работы/i,
      /\d{1,2}:\d{2}\s*[—–-]\s*\d{1,2}:\d{2}/,
    ];

    const hasHours = hoursPatterns.some((p) => p.test(html));

    if (!hasHours) {
      if (isEcommerce || isService) {
        violations.push({
          id: 'con-04',
          module: MODULE,
          law: LAW,
          article: ARTICLE,
          severity: 'low',
          title: 'Не указан режим работы',
          description:
            'На сайте не обнаружена информация о режиме работы организации.',
          minFine: MIN_FINE,
          maxFine: MAX_FINE,
          details: [
            'Не найдены упоминания: «режим работы», «график», «часы работы», «пн-пт»',
            'Не найдены временные паттерны (например, 9:00–18:00)',
          ],
          recommendation:
            'Укажите режим работы организации на странице «Контакты» или в подвале сайта.',
        });
      } else {
        warnings.push({
          id: 'con-04',
          title: 'Не указан режим работы',
          description:
            'Рекомендуется указать режим работы даже на информационном сайте.',
          law: LAW,
          article: ARTICLE,
          potentialFine: '5 000 — 20 000 ₽',
          recommendation:
            'Добавьте информацию о режиме работы на сайт.',
        });
      }
    } else {
      passed.push({
        id: 'con-04',
        title: 'Режим работы указан',
        module: MODULE,
      });
    }
  }

  // con-06: Address for complaints
  {
    const complaintPatterns = [/претензи/i, /жалоб/i, /рекламаци/i];
    const hasComplaintInfo = complaintPatterns.some((p) => p.test(html));

    if (!hasComplaintInfo) {
      if (isEcommerce || isService) {
        warnings.push({
          id: 'con-06',
          title: 'Не указан адрес для направления претензий',
          description:
            'На сайте не обнаружена информация о порядке направления претензий и жалоб.',
          law: LAW,
          article: ARTICLE,
          potentialFine: '5 000 — 20 000 ₽',
          recommendation:
            'Укажите адрес (почтовый и/или электронный) для направления претензий и жалоб потребителей.',
        });
      }
    } else {
      passed.push({
        id: 'con-06',
        title: 'Информация для направления претензий обнаружена',
        module: MODULE,
      });
    }
  }

  // con-09: 7-day return for remote sales (ecommerce only)
  if (isEcommerce) {
    const returnPatterns = [
      /7\s*дней/i,
      /семь\s*дней/i,
    ];
    const hasReturnWord = /возврат/i.test(html);
    const hasReturnPeriod = returnPatterns.some((p) => p.test(html));

    if (!hasReturnWord || !hasReturnPeriod) {
      violations.push({
        id: 'con-09',
        module: MODULE,
        law: LAW,
        article: ARTICLE,
        severity: 'medium',
        title: 'Не указано право на возврат товара в течение 7 дней',
        description:
          'На сайте интернет-магазина не обнаружена информация о праве потребителя отказаться от товара ' +
          'в течение 7 дней после получения при дистанционной продаже (ст. 26.1 ЗоЗПП).',
        minFine: MIN_FINE,
        maxFine: MAX_FINE,
        details: [
          'Не найдено упоминание «7 дней» или «семь дней» в контексте возврата товара',
        ],
        recommendation:
          'Укажите на сайте право потребителя вернуть товар в течение 7 дней с момента получения ' +
          'при дистанционной продаже (ст. 26.1 Закона о защите прав потребителей).',
      });
    } else {
      passed.push({
        id: 'con-09',
        title: 'Информация о 7-дневном сроке возврата товара обнаружена',
        module: MODULE,
      });
    }
  } else {
    passed.push({
      id: 'con-09',
      title: 'Проверка 7-дневного возврата (не применимо для данного типа сайта)',
      module: MODULE,
    });
  }

  return { violations, warnings, passed };
}
