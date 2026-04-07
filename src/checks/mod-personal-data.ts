import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

export function checkPersonalData($: CheerioAPI, html: string): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passed: PassedCheck[] = [];

  const MODULE = 'personal-data';
  const LAW = '152-ФЗ';

  // ─── pd-01: Privacy policy exists ───────────────────────────────────
  let privacyLinkFound = false;
  let privacyLinkInFooter = false;

  const textPatterns = [
    /политик/i,
    /конфиденциальн/i,
    /персональн\S*\s+данн/i,
    /privacy/i,
    /обработк\S*\s+персональн/i,
  ];

  const hrefPatterns = [
    /\/privacy/i,
    /\/politika/i,
    /\/confidential/i,
    /\/personal-data/i,
  ];

  $('a').each((_, el) => {
    const $el = $(el);
    const text = $el.text();
    const href = $el.attr('href') || '';

    const matchesText = textPatterns.some((p) => p.test(text));
    const matchesHref = hrefPatterns.some((p) => p.test(href));

    if (matchesText || matchesHref) {
      privacyLinkFound = true;
      // Check if inside footer
      if ($el.closest('footer').length > 0) {
        privacyLinkInFooter = true;
      }
    }
  });

  if (!privacyLinkFound) {
    violations.push({
      id: 'pd-01',
      module: MODULE,
      law: LAW,
      article: 'ст. 13.11 ч.3 КоАП',
      severity: 'high',
      title: 'Политика конфиденциальности не найдена',
      description:
        'На сайте не обнаружена ссылка на политику конфиденциальности (обработки персональных данных). ' +
        'Оператор обязан опубликовать документ, определяющий политику в отношении обработки персональных данных.',
      minFine: 150000,
      maxFine: 300000,
      details: [
        'Не найдена ссылка с текстом, содержащим: "политик", "конфиденциальн", "персональн данн", "privacy", "обработк персональн"',
        'Не найдена ссылка с href, содержащим: /privacy, /politika, /confidential, /personal-data',
      ],
      recommendation:
        'Разместите на сайте документ "Политика в отношении обработки персональных данных" и добавьте ссылку на него, доступную с каждой страницы сайта (в подвале).',
    });
  } else {
    passed.push({
      id: 'pd-01',
      title: 'Политика конфиденциальности найдена',
      module: MODULE,
    });
  }

  // ─── pd-02: Privacy policy link in footer ──────────────────────────
  if (privacyLinkFound && !privacyLinkInFooter) {
    violations.push({
      id: 'pd-02',
      module: MODULE,
      law: LAW,
      article: 'ст. 13.11 ч.3 КоАП',
      severity: 'medium',
      title: 'Ссылка на политику конфиденциальности не в подвале сайта',
      description:
        'Ссылка на политику конфиденциальности найдена, но не расположена в подвале (footer) страницы. ' +
        'Рекомендуется размещать ссылку в footer для обеспечения доступности с каждой страницы.',
      minFine: 150000,
      maxFine: 300000,
      details: [
        'Ссылка на политику конфиденциальности обнаружена, но вне элемента <footer>',
      ],
      recommendation:
        'Переместите ссылку на политику конфиденциальности в подвал (footer) сайта, чтобы она была доступна с каждой страницы.',
    });
  } else if (privacyLinkFound && privacyLinkInFooter) {
    passed.push({
      id: 'pd-02',
      title: 'Ссылка на политику конфиденциальности размещена в подвале сайта',
      module: MODULE,
    });
  }

  // ─── pd-05: Forms have consent checkbox ────────────────────────────
  const personalDataInputPatterns = [
    /email/i,
    /tel/i,
    /phone/i,
    /name/i,
    /фамил/i,
    /имя/i,
    /телефон/i,
  ];

  const forms = $('form');
  let formsWithPdCount = 0;
  let formsPassedCount = 0;

  forms.each((_, formEl) => {
    const $form = $(formEl);

    // Check if form collects personal data
    let collectsPD = false;
    const pdIndicators: string[] = [];

    $form.find('input').each((_, inputEl) => {
      const $input = $(inputEl);
      const type = ($input.attr('type') || '').toLowerCase();
      const name = ($input.attr('name') || '').toLowerCase();

      if (type === 'email' || type === 'tel') {
        collectsPD = true;
        pdIndicators.push(`input type="${type}"`);
      }

      if (personalDataInputPatterns.some((p) => p.test(name))) {
        collectsPD = true;
        pdIndicators.push(`input name="${$input.attr('name')}"`);
      }
    });

    if (!collectsPD) return;
    formsWithPdCount++;

    // Check for consent checkbox
    const checkboxes = $form.find('input[type="checkbox"]');
    let hasConsentCheckbox = false;
    let preCheckedViolation = false;

    checkboxes.each((_, cbEl) => {
      const $cb = $(cbEl);
      // Look for consent text near the checkbox: in parent, label, or sibling
      const parent = $cb.parent();
      const parentText = parent.text();
      const label = $form.find(`label[for="${$cb.attr('id')}"]`);
      const labelText = label.text();
      const nearbyText = (parentText + ' ' + labelText).toLowerCase();

      const hasConsent = /соглас/i.test(nearbyText);
      const hasProcessing =
        /обработк/i.test(nearbyText) || /персональн/i.test(nearbyText);

      if (hasConsent && hasProcessing) {
        hasConsentCheckbox = true;

        // hidden-02: check if pre-checked
        if ($cb.attr('checked') !== undefined) {
          preCheckedViolation = true;
        }
      }
    });

    if (!hasConsentCheckbox) {
      violations.push({
        id: 'pd-05',
        module: MODULE,
        law: LAW,
        article: 'ст. 13.11 ч.2 КоАП',
        severity: 'critical',
        title: 'Форма собирает персональные данные без согласия',
        description:
          'Обнаружена форма, собирающая персональные данные, но не содержащая чекбокса получения согласия на обработку персональных данных.',
        minFine: 300000,
        maxFine: 700000,
        details: [
          `Форма содержит поля: ${pdIndicators.join(', ')}`,
          'Чекбокс согласия на обработку персональных данных не обнаружен',
        ],
        recommendation:
          'Добавьте в форму обязательный чекбокс (не отмеченный по умолчанию) с текстом согласия на обработку персональных данных и ссылкой на политику конфиденциальности.',
      });
    } else {
      formsPassedCount++;
    }

    if (preCheckedViolation) {
      violations.push({
        id: 'hidden-02',
        module: MODULE,
        law: LAW,
        article: 'ст. 13.11 ч.2 КоАП',
        severity: 'high',
        title: 'Чекбокс согласия предварительно отмечен',
        description:
          'Чекбокс согласия на обработку персональных данных установлен по умолчанию (checked). ' +
          'Согласие должно быть активным действием пользователя.',
        minFine: 300000,
        maxFine: 700000,
        details: [
          'Обнаружен input[type="checkbox"] с атрибутом checked',
          'Предварительно отмеченный чекбокс не является валидным согласием по 152-ФЗ',
        ],
        recommendation:
          'Уберите атрибут checked у чекбокса согласия. Пользователь должен самостоятельно отметить согласие.',
      });
    }
  });

  if (formsWithPdCount > 0 && formsPassedCount === formsWithPdCount) {
    passed.push({
      id: 'pd-05',
      title: 'Формы содержат чекбокс согласия на обработку персональных данных',
      module: MODULE,
    });
  } else if (formsWithPdCount === 0) {
    passed.push({
      id: 'pd-05',
      title: 'Формы сбора персональных данных не обнаружены',
      module: MODULE,
    });
  }

  // ─── pd-09: Cookie banner exists ───────────────────────────────────
  let cookieBannerFound = false;
  const cookieDetails: string[] = [];

  // Check id/class attributes
  const cookieSelectors = [
    '[id*="cookie" i]',
    '[class*="cookie" i]',
    '[id*="consent" i]',
    '[class*="consent" i]',
    '[id*="gdpr" i]',
    '[class*="gdpr" i]',
    '[id*="ccpa" i]',
    '[class*="ccpa" i]',
  ];

  for (const sel of cookieSelectors) {
    try {
      if ($(sel).length > 0) {
        cookieBannerFound = true;
        cookieDetails.push(`Найден элемент: ${sel}`);
        break;
      }
    } catch {
      // Some selectors with case-insensitive flag may not be supported;
      // fall through to regex-based checks below.
    }
  }

  // Check for known CMP classes
  if (!cookieBannerFound) {
    const cmpClasses = [
      'cookiebot',
      'onetrust',
      'complianz',
      'cookie-notice',
      'cc-banner',
    ];
    for (const cls of cmpClasses) {
      if ($(`[class*="${cls}"]`).length > 0 || $(`[id*="${cls}"]`).length > 0) {
        cookieBannerFound = true;
        cookieDetails.push(`Найден CMP: ${cls}`);
        break;
      }
    }
  }

  // Check text content
  if (!cookieBannerFound) {
    const cookieTextPatterns = [/cookie/i, /куки/i, /файлы\s+cookie/i, /используем\s+cookie/i];
    const bodyText = $('body').text();
    for (const p of cookieTextPatterns) {
      if (p.test(bodyText)) {
        cookieBannerFound = true;
        cookieDetails.push(`Найден текст: ${p.source}`);
        break;
      }
    }
  }

  // Also check raw HTML for cookie-related attributes (case insensitive)
  if (!cookieBannerFound) {
    const htmlLower = html.toLowerCase();
    const attrPatterns = ['cookie', 'consent', 'gdpr', 'ccpa', 'cookiebot', 'onetrust', 'complianz', 'cookie-notice', 'cc-banner'];
    for (const pat of attrPatterns) {
      if (htmlLower.includes(pat)) {
        cookieBannerFound = true;
        cookieDetails.push(`Найдено в HTML: "${pat}"`);
        break;
      }
    }
  }

  if (!cookieBannerFound) {
    violations.push({
      id: 'pd-09',
      module: MODULE,
      law: LAW,
      article: 'ст. 13.11 ч.2 КоАП',
      severity: 'high',
      title: 'Баннер cookie не обнаружен',
      description:
        'На сайте не обнаружен баннер уведомления об использовании файлов cookie. ' +
        'Оператор обязан получить согласие пользователя на обработку cookie, содержащих персональные данные.',
      minFine: 300000,
      maxFine: 700000,
      details: [
        'Не найдены элементы с id/class, содержащими: cookie, consent, gdpr, ccpa',
        'Не найдены известные CMP: cookiebot, onetrust, complianz, cookie-notice, cc-banner',
        'Не найден текст: "cookie", "куки", "файлы cookie", "используем cookie"',
      ],
      recommendation:
        'Установите баннер cookie с возможностью явного согласия/отказа. Рекомендуемые решения: CookieBot, CookieYes или собственная реализация.',
    });
  } else {
    passed.push({
      id: 'pd-09',
      title: 'Баннер cookie обнаружен',
      module: MODULE,
    });
  }

  // ─── hidden-01: Passive consent detected ───────────────────────────
  const passiveConsentPatterns = [
    /продолжая\s+использовать/i,
    /продолжая\s+пользоваться/i,
    /продолжая\s+просмотр/i,
    /продолжая\s+навигацию/i,
  ];

  const bodyText = $('body').text();
  const passiveMatches: string[] = [];

  for (const p of passiveConsentPatterns) {
    const match = bodyText.match(p);
    if (match) {
      passiveMatches.push(`"${match[0]}"`);
    }
  }

  // Also check raw HTML for these patterns (e.g. in hidden elements)
  for (const p of passiveConsentPatterns) {
    const match = html.match(p);
    if (match && !passiveMatches.includes(`"${match[0]}"`)) {
      passiveMatches.push(`"${match[0]}"`);
    }
  }

  if (passiveMatches.length > 0) {
    violations.push({
      id: 'hidden-01',
      module: MODULE,
      law: LAW,
      article: 'ст. 13.11 ч.2 КоАП',
      severity: 'high',
      title: 'Пассивное согласие не является валидным',
      description:
        'На сайте обнаружены формулировки пассивного согласия ("продолжая использовать сайт, вы соглашаетесь..."). ' +
        'Продолжение использования сайта не является надлежащим согласием на обработку персональных данных по 152-ФЗ. ' +
        'Согласие должно быть конкретным, информированным и сознательным.',
      minFine: 300000,
      maxFine: 700000,
      details: passiveMatches.map((m) => `Обнаружена формулировка: ${m}`),
      recommendation:
        'Замените пассивное согласие на активное: добавьте баннер cookie с кнопками "Принять" и "Отклонить". ' +
        'Не загружайте трекеры до получения явного согласия.',
    });
  } else {
    passed.push({
      id: 'hidden-01',
      title: 'Пассивное согласие не обнаружено',
      module: MODULE,
    });
  }

  return { violations, warnings, passed };
}
