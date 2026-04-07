import * as cheerio from 'cheerio';
import type { CheckResponse, CheckResult, RiskLevel, SiteType, Violation } from './types';
import { checkPersonalData } from './mod-personal-data';
import { checkLocalization } from './mod-localization';
import { checkLanguage } from './mod-language';
import { checkConsumer } from './mod-consumer';
import { checkAdvertising } from './mod-advertising';
import { checkContent } from './mod-content';
import { checkSecurity } from './mod-security';

// ─── Загрузка страницы ───────────────────────────────────────────────

async function fetchPage(url: string): Promise<{
  html: string;
  finalUrl: string;
  usesHttps: boolean;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
  };

  try {
    // Ручное следование редиректам (защита от redirect loops)
    let currentUrl = url;
    let response: Response | null = null;
    const visited = new Set<string>();

    for (let i = 0; i < 10; i++) {
      if (visited.has(currentUrl)) {
        // Redirect loop detected — используем последний успешный ответ
        break;
      }
      visited.add(currentUrl);

      response = await fetch(currentUrl, {
        signal: controller.signal,
        headers,
        redirect: 'manual',
      });

      const location = response.headers.get('location');
      if (location && response.status >= 300 && response.status < 400) {
        // Resolve relative redirects
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      break;
    }

    if (!response) {
      throw new Error('Не удалось загрузить страницу: пустой ответ');
    }

    // Принимаем любой 2xx или 3xx (после redirect loop мы берём что есть)
    if (response.status >= 400) {
      throw new Error(
        `Не удалось загрузить страницу: HTTP ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();
    const finalUrl = currentUrl;
    const usesHttps = finalUrl.startsWith('https://');

    return { html, finalUrl, usesHttps };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        `Не удалось загрузить страницу: превышено время ожидания (15 секунд)`
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

  // Признаки интернет-магазина
  const ecommercePatterns = [
    'корзин',
    'купить',
    'в корзину',
    'оформить заказ',
    'каталог товар',
    'интернет-магазин',
    'add to cart',
    'checkout',
  ];

  const pricePattern = /\d+[\s\u00a0]?(?:₽|руб|р\.)/i;

  const ecommerceScore = ecommercePatterns.reduce((score, pattern) => {
    return score + (htmlLower.includes(pattern) ? 1 : 0);
  }, 0) + (pricePattern.test(html) ? 2 : 0);

  if (ecommerceScore >= 2) {
    return 'ecommerce';
  }

  // Признаки сервиса
  const servicePatterns = [
    'заказать',
    'записаться',
    'оставить заявку',
    'рассчитать стоимость',
    'калькулятор',
    'тариф',
    'подписка',
    'личный кабинет',
    'регистрация',
    'sign up',
    'dashboard',
  ];

  const hasForm = $('form').length > 0;
  const serviceScore = servicePatterns.reduce((score, pattern) => {
    return score + (htmlLower.includes(pattern) ? 1 : 0);
  }, 0) + (hasForm ? 1 : 0);

  // Сервис — если есть формы/заказы, но нет каталога товаров
  const hasProductCatalog =
    htmlLower.includes('каталог товар') ||
    htmlLower.includes('интернет-магазин') ||
    htmlLower.includes('корзин');

  if (serviceScore >= 2 && !hasProductCatalog) {
    return 'service';
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
  const { html, finalUrl } = await fetchPage(url);

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

  const results: CheckResult[] = [
    safeRun(() => checkPersonalData($, html)),
    safeRun(() => checkLocalization($, html)),
    safeRun(() => checkLanguage($, html)),
    safeRun(() => checkConsumer($, html, siteType)),
    safeRun(() => checkAdvertising($, html)),
    safeRun(() => checkContent($, html)),
    safeRun(() => checkSecurity(finalUrl)),
  ];

  // 6. Объединение результатов
  const { violations, warnings, passed } = mergeResults(results);

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
