import * as cheerio from 'cheerio';
import type { CheckResponse, CheckResult, RiskLevel, SiteType, Violation } from './types';
import { checkPersonalData } from './mod-personal-data';
import { checkLocalization } from './mod-localization';
import { checkLanguage } from './mod-language';
import { checkConsumer } from './mod-consumer';
import { checkAdvertising } from './mod-advertising';
import { checkContent } from './mod-content';
import { checkSecurity } from './mod-security';
import { checkEcommerce } from './mod-ecommerce';
import { checkSeo } from './mod-seo';

// ─── Загрузка страницы ───────────────────────────────────────────────

async function fetchPage(url: string): Promise<{
  html: string;
  finalUrl: string;
  usesHttps: boolean;
  responseHeaders: Record<string, string>;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  // Несколько наборов заголовков — retry при блокировке облачных IP
  const headerSets: Record<string, string>[] = [
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive',
    },
    {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    },
    {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    },
  ];

  function isValidHtml(text: string): boolean {
    return text.length > 200 && (
      text.includes('<!DOCTYPE') || text.includes('<!doctype') ||
      text.includes('<html') || text.includes('<HTML')
    );
  }

  try {
    let lastError: Error | null = null;

    for (const headers of headerSets) {
      try {
        let currentUrl = url;
        let response: Response | null = null;
        const visited = new Set<string>();

        for (let i = 0; i < 10; i++) {
          if (visited.has(currentUrl)) break;
          visited.add(currentUrl);

          response = await fetch(currentUrl, {
            signal: controller.signal,
            headers,
            redirect: 'manual',
          });

          const location = response.headers.get('location');
          if (location && response.status >= 300 && response.status < 400) {
            currentUrl = new URL(location, currentUrl).toString();
            continue;
          }
          break;
        }

        if (!response) {
          throw new Error('Не удалось загрузить страницу: пустой ответ');
        }

        const html = await response.text();

        // Если статус 4xx/5xx — проверяем, есть ли в теле валидный HTML
        // Многие сайты (гос. порталы, крупные сервисы) возвращают 403 с полноценным HTML
        if (response.status >= 400) {
          if (isValidHtml(html)) {
            // Сайт вернул ошибку, но HTML есть — используем его
          } else {
            throw new Error(
              `Сайт заблокировал запрос (HTTP ${response.status}). Возможно, сайт блокирует облачные IP-адреса.`
            );
          }
        }

        if (!html || html.length < 50) {
          throw new Error('Не удалось загрузить страницу: пустой ответ от сервера');
        }

        const finalUrl = currentUrl;
        const usesHttps = finalUrl.startsWith('https://');

        // Extract response headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key.toLowerCase()] = value;
        });

        return { html, finalUrl, usesHttps, responseHeaders };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Retry с другими заголовками
        continue;
      }
    }

    // Все попытки исчерпаны
    throw lastError ?? new Error('Не удалось загрузить страницу');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        'Не удалось загрузить страницу: превышено время ожидания (30 секунд). Сайт не отвечает или блокирует запросы.'
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        `Не удалось загрузить страницу: ошибка сети или некорректный URL (${error.message})`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Определение типа сайта ──────────────────────────────────────────

function detectSiteType($: cheerio.CheerioAPI, html: string): SiteType {
  const htmlLower = html.toLowerCase();

  // ── Сначала считаем баллы для всех типов ──

  // Признаки интернет-магазина (товары, корзина, доставка товаров)
  const ecommerceStrongPatterns = [
    'корзин',
    'в корзину',
    'добавить в корзину',
    'оформить заказ',
    'каталог товар',
    'интернет-магазин',
    'add to cart',
    'checkout',
    'shopping cart',
  ];

  const ecommerceWeakPatterns = [
    'купить',
    'товар',
    'доставка товар',
    'самовывоз',
    'склад',
  ];

  const hasPrices = /\d+[\s\u00a0]?(?:₽|руб|р\.)/i.test(html);

  const ecommerceStrongScore = ecommerceStrongPatterns.reduce((score, pattern) => {
    return score + (htmlLower.includes(pattern) ? 2 : 0);
  }, 0);

  const ecommerceWeakScore = ecommerceWeakPatterns.reduce((score, pattern) => {
    return score + (htmlLower.includes(pattern) ? 1 : 0);
  }, 0);

  // Цена сама по себе НЕ делает сайт магазином — только в сочетании с товарными паттернами
  const ecommerceScore = ecommerceStrongScore + ecommerceWeakScore + (hasPrices && ecommerceStrongScore > 0 ? 2 : 0);

  // Признаки сервиса (услуги, заявки, калькуляторы)
  const servicePatterns = [
    'услуг',
    'заказать',
    'оказыва',
    'записаться',
    'оставить заявку',
    'рассчитать стоимость',
    'калькулятор',
    'тариф',
    'подписка',
    'личный кабинет',
    'регистрация',
    'оформить',
    'оформлени',
    'стоимость услуг',
    'перезвони',
    'обратный звонок',
    'sign up',
    'dashboard',
  ];

  const hasForm = $('form').length > 0;
  const serviceScore = servicePatterns.reduce((score, pattern) => {
    return score + (htmlLower.includes(pattern) ? 1 : 0);
  }, 0) + (hasForm ? 1 : 0);

  // ── Решение на основе баллов ──

  // Если есть сильные паттерны e-commerce и они побеждают service
  if (ecommerceScore >= 4 && ecommerceScore > serviceScore) {
    return 'ecommerce';
  }

  // Если service паттерны преобладают или нет явных признаков магазина
  if (serviceScore >= 2) {
    return 'service';
  }

  // Fallback: если есть цены и хотя бы что-то товарное
  if (ecommerceScore >= 4) {
    return 'ecommerce';
  }

  return 'informational';
}

// ─── Объединение результатов ─────────────────────────────────────────

function mergeResults(results: CheckResult[]): {
  violations: Violation[];
  warnings: CheckResult['warnings'];
  passed: CheckResult['passed'];
} {
  const violations: Violation[] = [];
  const warnings: CheckResult['warnings'] = [];
  const passed: CheckResult['passed'] = [];

  for (const result of results) {
    violations.push(...result.violations);
    warnings.push(...result.warnings);
    passed.push(...result.passed);
  }

  return { violations, warnings, passed };
}

// ─── Определение уровня риска ────────────────────────────────────────

function determineRiskLevel(
  totalMaxFine: number,
  hasLocalizationViolations: boolean
): RiskLevel {
  if (totalMaxFine > 5_000_000 || hasLocalizationViolations) {
    return 'critical';
  }
  if (totalMaxFine > 1_000_000) {
    return 'high';
  }
  if (totalMaxFine > 100_000) {
    return 'medium';
  }
  return 'low';
}

// ─── Группировка штрафов по закону ───────────────────────────────────

function calculateFinesByLaw(
  violations: Violation[]
): Record<string, { min: number; max: number; count: number }> {
  const finesByLaw: Record<string, { min: number; max: number; count: number }> = {};

  for (const v of violations) {
    if (!finesByLaw[v.law]) {
      finesByLaw[v.law] = { min: 0, max: 0, count: 0 };
    }
    finesByLaw[v.law].min += v.minFine;
    finesByLaw[v.law].max += v.maxFine;
    finesByLaw[v.law].count += 1;
  }

  return finesByLaw;
}

// ─── Главная функция анализа ─────────────────────────────────────────

export async function analyzeUrl(inputUrl: string): Promise<CheckResponse> {
  // 1. Нормализация URL
  let url = inputUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // 2. Загрузка страницы
  const { html, finalUrl, responseHeaders } = await fetchPage(url);

  // 2a. Детекция капчи и блокировок — не анализировать заглушку
  const htmlLowerCheck = html.toLowerCase();
  const isCaptchaPage =
    (finalUrl.includes('showcaptcha') || finalUrl.includes('captcha')) ||
    (htmlLowerCheck.includes('captcha') && html.length < 50000 &&
      !htmlLowerCheck.includes('<article') && !htmlLowerCheck.includes('<main'));
  const isBlockPage =
    html.length < 1000 && (
      htmlLowerCheck.includes('access denied') ||
      htmlLowerCheck.includes('403 forbidden') ||
      htmlLowerCheck.includes('доступ запрещён') ||
      htmlLowerCheck.includes('доступ запрещен') ||
      htmlLowerCheck.includes('blocked')
    );

  if (isCaptchaPage) {
    throw new Error(
      'Сайт показывает капчу вместо содержимого. Это означает, что сайт блокирует автоматические запросы с облачных серверов.'
    );
  }
  if (isBlockPage) {
    throw new Error(
      'Сайт заблокировал доступ с нашего сервера. Сайт использует защиту от автоматических запросов.'
    );
  }

  // 3. Загрузка в cheerio
  const $ = cheerio.load(html);

  // 4. Определение типа сайта
  const siteType = detectSiteType($, html);

  // 5. Запуск всех проверок с защитой от ошибок
  const emptyResult: CheckResult = { violations: [], warnings: [], passed: [] };

  function safeRun(fn: () => CheckResult): CheckResult {
    try {
      return fn();
    } catch {
      return emptyResult;
    }
  }

  async function safeRunAsync(fn: () => Promise<CheckResult>): Promise<CheckResult> {
    try {
      return await fn();
    } catch {
      return emptyResult;
    }
  }

  // Run async checks with Promise.allSettled for safety
  const [personalDataResult, securityResult] = await Promise.allSettled([
    safeRunAsync(() => checkPersonalData($, html, finalUrl)),
    safeRunAsync(() => checkSecurity(finalUrl, $, html, responseHeaders)),
  ]);

  const pdResult = personalDataResult.status === 'fulfilled' ? personalDataResult.value : emptyResult;
  const policyText = ('policyText' in pdResult) ? (pdResult as any).policyText as string : '';

  const results: CheckResult[] = [
    pdResult,
    safeRun(() => checkLocalization($, html)),
    safeRun(() => checkLanguage($, html)),
    safeRun(() => checkConsumer($, html, siteType)),
    safeRun(() => checkAdvertising($, html)),
    safeRun(() => checkContent($, html)),
    securityResult.status === 'fulfilled' ? securityResult.value : emptyResult,
    safeRun(() => checkEcommerce($, html, siteType)),
    safeRun(() => checkSeo($, html, finalUrl)),
  ];

  // 6. Объединение результатов
  const { violations, warnings, passed } = mergeResults(results);

  // 6a. Cross-reference: detected services vs privacy policy (pd-11)
  {
    const serviceMap: Record<string, { name: string; keywords: string[] }> = {
      'loc-02': { name: 'Google Analytics', keywords: ['google analytics', 'google', 'гугл аналитик'] },
      'loc-03': { name: 'Google Tag Manager', keywords: ['google tag manager', 'gtm', 'google', 'гугл'] },
      'loc-04': { name: 'reCAPTCHA', keywords: ['recaptcha', 'google', 'гугл', 'капча'] },
      'loc-05': { name: 'Google Fonts', keywords: ['google fonts', 'google', 'гугл', 'шрифт'] },
      'loc-06': { name: 'Google Maps', keywords: ['google maps', 'google', 'гугл', 'карт'] },
      'loc-07': { name: 'YouTube', keywords: ['youtube', 'ютуб'] },
      'loc-08': { name: 'WhatsApp/Telegram', keywords: ['whatsapp', 'telegram', 'телеграм', 'ватсап', 'мессенджер'] },
      'loc-09': { name: 'Сторонний чат-сервис', keywords: ['tawk', 'zendesk', 'intercom', 'crisp', 'drift', 'livechat', 'чат'] },
      'loc-10': { name: 'Иностранная CRM', keywords: ['hubspot', 'salesforce', 'pipedrive', 'zoho', 'crm'] },
      'loc-11': { name: 'Meta/Facebook SDK', keywords: ['facebook', 'meta', 'фейсбук'] },
    };

    const detectedServices = violations
      .filter((v) => v.id.startsWith('loc-'))
      .map((v) => serviceMap[v.id])
      .filter(Boolean);

    if (detectedServices.length > 0 && policyText) {
      const policyLower = policyText.toLowerCase();
      const unmatchedServices = detectedServices.filter(
        (svc) => !svc.keywords.some((kw) => policyLower.includes(kw))
      );

      if (unmatchedServices.length > 0) {
        violations.push({
          id: 'pd-11',
          module: 'personal-data',
          law: '152-ФЗ',
          article: 'ст. 13.11 ч.3 КоАП',
          severity: 'high',
          title: 'Сторонние сервисы не указаны в политике конфиденциальности',
          description:
            'На сайте обнаружены сторонние сервисы, обрабатывающие данные пользователей, но в политике конфиденциальности они не упомянуты. ' +
            'Оператор обязан информировать о передаче данных третьим лицам.',
          minFine: 150000,
          maxFine: 300000,
          details: unmatchedServices.map(
            (s) => `Сервис «${s.name}» используется на сайте, но не упомянут в политике конфиденциальности`
          ),
          recommendation:
            'Добавьте в политику конфиденциальности информацию обо всех сторонних сервисах, которым передаются данные пользователей: ' +
            unmatchedServices.map((s) => s.name).join(', ') + '.',
        });
      } else {
        passed.push({
          id: 'pd-11',
          title: 'Сторонние сервисы указаны в политике конфиденциальности',
          module: 'personal-data',
        });
      }
    }
  }

  // 7. Сортировка нарушений по максимальному штрафу (убывание)
  violations.sort((a, b) => b.maxFine - a.maxFine);

  // 8. Подсчёт итогов
  const totalMinFine = violations.reduce((sum, v) => sum + v.minFine, 0);
  const totalMaxFine = violations.reduce((sum, v) => sum + v.maxFine, 0);

  // 9. Группировка штрафов по закону
  const finesByLaw = calculateFinesByLaw(violations);

  // 10. Определение уровня риска
  const hasLocalizationViolations = violations.some(
    (v) => v.module === 'localization'
  );
  const riskLevel = determineRiskLevel(totalMaxFine, hasLocalizationViolations);

  // 11. Формирование ответа
  return {
    url: finalUrl,
    checkedAt: new Date().toISOString(),
    siteType,
    riskLevel,
    totalMinFine,
    totalMaxFine,
    violations,
    warnings,
    passed,
    stats: {
      totalChecks: violations.length + warnings.length + passed.length,
      violations: violations.length,
      warnings: warnings.length,
      passed: passed.length,
    },
    finesByLaw,
  };
}
