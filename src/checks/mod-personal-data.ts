import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

export async function checkPersonalData(
  $: CheerioAPI,
  html: string,
  baseUrl: string
): Promise<CheckResult> {
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
      // Check if inside footer — both <footer> tag and elements with class/id "footer"
      const inFooterTag = $el.closest('footer').length > 0;
      const inFooterClass = $el.closest('[class*="footer"], [id*="footer"]').length > 0;
      // Also check if in the bottom 20% of the DOM
      const allElements = $('body *');
      const totalElements = allElements.length;
      const elIndex = allElements.index($el);
      const inBottomPortion = totalElements > 0 && elIndex > totalElements * 0.8;
      if (inFooterTag || inFooterClass || inBottomPortion) {
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

  // ─── pd-03 & pd-04: Privacy policy content checks ─────────────────
  // Find the privacy policy URL for fetching
  let privacyUrl: string | null = null;
  $('a').each((_, el) => {
    if (privacyUrl) return;
    const $el = $(el);
    const text = $el.text();
    const href = $el.attr('href') || '';

    const matchesText = textPatterns.some((p) => p.test(text));
    const matchesHref = hrefPatterns.some((p) => p.test(href));

    if ((matchesText || matchesHref) && href) {
      try {
        privacyUrl = new URL(href, baseUrl).toString();
      } catch {
        // Ignore invalid URLs
      }
    }
  });

  let policyText = '';
  let policyFetched = false;

  if (privacyUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(privacyUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9',
        },
      });
      clearTimeout(timeout);
      if (response.ok) {
        policyText = await response.text();
        policyFetched = true;
      }
    } catch {
      // Fetch failed — will issue warnings instead of violations
    }
  }

  if (policyFetched && policyText) {
    const policyLower = policyText.toLowerCase();
    // pd-03: Required sections in privacy policy
    const requiredSections = [
      { keyword: 'цел', label: 'цели обработки' },
      { keyword: 'категори', label: 'категории данных' },
      { keyword: 'срок', label: 'сроки обработки' },
      { keyword: 'хранени', label: 'хранение данных' },
      { keyword: 'уничтожени', label: 'уничтожение данных' },
    ];

    const missingSections = requiredSections.filter(
      (s) => !policyLower.includes(s.keyword)
    );

    if (missingSections.length > 0) {
      violations.push({
        id: 'pd-03',
        module: MODULE,
        law: LAW,
        article: 'ст. 13.11 ч.3 КоАП',
        severity: 'medium',
        title: 'Политика конфиденциальности не содержит обязательных разделов',
        description:
          'В политике конфиденциальности отсутствуют обязательные разделы, ' +
          'предусмотренные ст. 18.1 152-ФЗ.',
        minFine: 150000,
        maxFine: 300000,
        details: missingSections.map(
          (s) => `Не найден раздел: ${s.label}`
        ),
        recommendation:
          'Дополните политику конфиденциальности разделами: цели обработки, категории данных, ' +
          'сроки обработки, условия хранения и уничтожения персональных данных.',
      });
    } else {
      passed.push({
        id: 'pd-03',
        title: 'Политика конфиденциальности содержит обязательные разделы',
        module: MODULE,
      });
    }

    // pd-04: Third parties listed in policy
    const thirdPartyPatterns = [/трет/i, /передач/i, /получател/i];
    const hasThirdParty = thirdPartyPatterns.some((p) => p.test(policyText));

    if (!hasThirdParty) {
      violations.push({
        id: 'pd-04',
        module: MODULE,
        law: LAW,
        article: 'ст. 13.11 ч.3 КоАП',
        severity: 'medium',
        title: 'В политике не указаны третьи лица — получатели данных',
        description:
          'В политике конфиденциальности не обнаружена информация о передаче персональных данных третьим лицам.',
        minFine: 150000,
        maxFine: 300000,
        details: [
          'Не найдены упоминания: «третьи лица», «передача», «получатели»',
        ],
        recommendation:
          'Укажите в политике перечень третьих лиц, которым могут передаваться персональные данные, и цели такой передачи.',
      });
    } else {
      passed.push({
        id: 'pd-04',
        title: 'В политике указаны третьи лица — получатели данных',
        module: MODULE,
      });
    }
  } else if (privacyLinkFound) {
    // Could not fetch policy — issue warnings instead
    warnings.push({
      id: 'pd-03',
      title: 'Не удалось проверить содержание политики конфиденциальности',
      description:
        'Ссылка на политику конфиденциальности найдена, но не удалось загрузить документ для проверки обязательных разделов.',
      law: LAW,
      article: 'ст. 13.11 ч.3 КоАП',
      potentialFine: '150 000 — 300 000 руб.',
      recommendation:
        'Убедитесь, что политика конфиденциальности содержит разделы: цели обработки, категории данных, сроки, хранение, уничтожение.',
    });
    warnings.push({
      id: 'pd-04',
      title: 'Не удалось проверить наличие информации о третьих лицах в политике',
      description:
        'Не удалось загрузить политику конфиденциальности для проверки упоминания третьих лиц.',
      law: LAW,
      article: 'ст. 13.11 ч.3 КоАП',
      potentialFine: '150 000 — 300 000 руб.',
      recommendation:
        'Укажите в политике перечень третьих лиц, которым передаются персональные данные.',
    });
  }

  // ─── pd-06: Consent as separate document (since 01.09.2025) ────────
  {
    let hasSeperateConsentDoc = false;
    const consentLinkPatterns = [
      /соглас\S*\s+на\s+обработк/i,
      /соглас\S*\s+на\s+персональн/i,
      /соглас\S*\s+субъект/i,
    ];

    $('a').each((_, el) => {
      const $el = $(el);
      const text = $el.text();
      const href = ($el.attr('href') || '').toLowerCase();

      // Skip if it's the privacy policy link or offer
      const isPrivacy = hrefPatterns.some((p) => p.test(href));
      const isOffer =
        /offer|oferta|оферт/i.test(href) || /оферт/i.test(text);

      if (isPrivacy || isOffer) return;

      if (consentLinkPatterns.some((p) => p.test(text))) {
        hasSeperateConsentDoc = true;
      }
    });

    if (!hasSeperateConsentDoc) {
      warnings.push({
        id: 'pd-06',
        title: 'Не найден отдельный документ согласия на обработку ПД',
        description:
          'С 01.09.2025 согласие на обработку персональных данных рекомендуется оформлять ' +
          'как отдельный документ, не входящий в политику конфиденциальности или оферту.',
        law: LAW,
        article: 'ст. 9 152-ФЗ',
        potentialFine: '300 000 — 700 000 руб.',
        recommendation:
          'Разместите на сайте отдельный документ «Согласие на обработку персональных данных» ' +
          'со ссылкой из форм сбора данных.',
      });
    } else {
      passed.push({
        id: 'pd-06',
        title: 'Отдельный документ согласия на обработку ПД обнаружен',
        module: MODULE,
      });
    }
  }

  // ─── pd-07: Separate checkboxes for PD and newsletter ─────────────
  {
    let hasFormWithSeparateCheckboxes = false;
    let hasSubscriptionForm = false;

    forms.each((_, formEl) => {
      const $form = $(formEl);
      const formText = $form.text().toLowerCase();

      // Check if this is a subscription-like form
      const isSubscription =
        /подписк/i.test(formText) ||
        /рассылк/i.test(formText) ||
        /newsletter/i.test(formText) ||
        /новости/i.test(formText);

      if (!isSubscription) return;
      hasSubscriptionForm = true;

      // Count distinct consent checkboxes
      const checkboxes = $form.find('input[type="checkbox"]');
      let pdCheckboxCount = 0;
      let newsletterCheckboxCount = 0;

      checkboxes.each((_, cbEl) => {
        const $cb = $(cbEl);
        const parent = $cb.parent();
        const label = $form.find(`label[for="${$cb.attr('id')}"]`);
        const nearbyText = (parent.text() + ' ' + label.text()).toLowerCase();

        if (/соглас/i.test(nearbyText) && /персональн|обработк/i.test(nearbyText)) {
          pdCheckboxCount++;
        }
        if (/подписк|рассылк|newsletter|новости/i.test(nearbyText)) {
          newsletterCheckboxCount++;
        }
      });

      if (pdCheckboxCount >= 1 && newsletterCheckboxCount >= 1) {
        hasFormWithSeparateCheckboxes = true;
      }
    });

    if (hasSubscriptionForm && !hasFormWithSeparateCheckboxes) {
      warnings.push({
        id: 'pd-07',
        title: 'Отсутствуют раздельные чекбоксы для ПД и рассылки',
        description:
          'В формах подписки рекомендуется использовать раздельные чекбоксы: ' +
          'один для согласия на обработку персональных данных, другой — для согласия на рассылку.',
        law: LAW,
        article: 'ст. 9 152-ФЗ',
        potentialFine: '300 000 — 700 000 руб.',
        recommendation:
          'Разделите согласие на обработку ПД и согласие на рассылку в отдельные чекбоксы.',
      });
    } else if (hasSubscriptionForm && hasFormWithSeparateCheckboxes) {
      passed.push({
        id: 'pd-07',
        title: 'Формы подписки содержат раздельные чекбоксы для ПД и рассылки',
        module: MODULE,
      });
    } else {
      passed.push({
        id: 'pd-07',
        title: 'Формы подписки не обнаружены',
        module: MODULE,
      });
    }
  }

  // ─── pd-08: Mechanism to revoke consent ───────────────────────────
  {
    const revokePatterns = [
      /отзыв/i,
      /отказ/i,
      /отписаться/i,
      /удалить\s+данные/i,
    ];

    const hasRevoke = revokePatterns.some(
      (p) => p.test(html) || (policyText && p.test(policyText))
    );

    if (!hasRevoke) {
      warnings.push({
        id: 'pd-08',
        title: 'Не обнаружен механизм отзыва согласия',
        description:
          'На сайте не найдена информация о возможности отзыва согласия на обработку персональных данных. ' +
          'Субъект ПД имеет право отозвать своё согласие.',
        law: LAW,
        article: 'ст. 9 ч.2 152-ФЗ',
        potentialFine: '300 000 — 700 000 руб.',
        recommendation:
          'Добавьте на сайт информацию о порядке отзыва согласия на обработку персональных данных ' +
          '(форму, email или инструкцию).',
      });
    } else {
      passed.push({
        id: 'pd-08',
        title: 'Механизм отзыва согласия обнаружен',
        module: MODULE,
      });
    }
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
