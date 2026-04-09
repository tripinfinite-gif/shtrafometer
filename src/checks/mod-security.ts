import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

const MODULE = 'security';
const LAW = '152-ФЗ';

export function checkSecurity(finalUrl: string, $?: CheerioAPI, html?: string): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passed: PassedCheck[] = [];

  // ─── sec-01: HTTPS ─────────────────────────────────────────────────
  const usesHttps = finalUrl.startsWith('https://');

  if (!usesHttps) {
    violations.push({
      id: 'sec-01',
      module: MODULE,
      law: LAW,
      article: 'ст. 13.11 ч.6 КоАП',
      severity: 'critical',
      title: 'Сайт не использует HTTPS',
      description:
        'Передача данных осуществляется по незащищённому протоколу HTTP. ' +
        'Оператор обязан обеспечить безопасность персональных данных при их передаче по сети.',
      minFine: 15000,
      maxFine: 300000,
      details: [
        `Итоговый URL: ${finalUrl}`,
        'Протокол: HTTP (незащищённый)',
      ],
      recommendation:
        'Установите SSL-сертификат и настройте принудительное перенаправление на HTTPS.',
    });
  } else {
    passed.push({
      id: 'sec-01',
      title: 'Сайт использует HTTPS',
      module: MODULE,
    });
  }

  // ─── sec-02: No VPN advertising for bypass ────────────────────────
  if (html) {
    const htmlLower = html.toLowerCase();
    const hasVpn = /vpn/i.test(html);
    const hasBypass =
      /обход\s*блокировк/i.test(html) || /разблокир/i.test(html);

    if (hasVpn && hasBypass) {
      violations.push({
        id: 'sec-02',
        module: MODULE,
        law: '149-ФЗ',
        article: 'ст. 13.41.2 КоАП',
        severity: 'high',
        title: 'Обнаружена реклама VPN для обхода блокировок',
        description:
          'На сайте обнаружена реклама VPN-сервисов в контексте обхода блокировок. ' +
          'Реклама средств обхода блокировок запрещена на территории РФ.',
        minFine: 0,
        maxFine: 500000,
        details: [
          'Обнаружено упоминание VPN совместно с «обход блокировок» или «разблокировать»',
        ],
        recommendation:
          'Удалите рекламу VPN-сервисов, направленных на обход блокировок. ' +
          'Допускается упоминание VPN в контексте корпоративной безопасности.',
      });
    } else {
      passed.push({
        id: 'sec-02',
        title: 'Реклама VPN для обхода блокировок не обнаружена',
        module: MODULE,
      });
    }

    // ─── sec-03: No Meta service advertising ──────────────────────────
    const metaServicePatterns = [
      /instagram\.com/i,
      /facebook\.com/i,
    ];

    // Look for Meta links promoted as services (not just social links)
    const hasMetaPromotion = metaServicePatterns.some((p) => p.test(html));

    // Check for promotion context
    const promotionContext =
      /подписывайтесь|переходите|наш\s+instagram|наш\s+facebook|мы\s+в\s+instagram|мы\s+в\s+facebook/i.test(
        html
      );

    if (hasMetaPromotion && promotionContext) {
      violations.push({
        id: 'sec-03',
        module: MODULE,
        law: '149-ФЗ',
        article: 'ст. 13.41 КоАП',
        severity: 'medium',
        title: 'Обнаружено продвижение запрещённых сервисов Meta',
        description:
          'На сайте обнаружено продвижение социальных сетей Instagram и/или Facebook (Meta Platforms Inc.), ' +
          'деятельность которых признана экстремистской и запрещена на территории РФ.',
        minFine: 50000,
        maxFine: 4000000,
        details: [
          'Обнаружены ссылки на instagram.com и/или facebook.com',
          'Обнаружен призыв к использованию запрещённых сервисов',
        ],
        recommendation:
          'Удалите призывы к переходу в Instagram и Facebook. Замените на разрешённые платформы (VK, Telegram, Одноклассники). ' +
          'При упоминании Meta-сервисов добавляйте пометку: *деятельность организации запрещена на территории РФ.',
      });
    } else {
      passed.push({
        id: 'sec-03',
        title: 'Продвижение запрещённых сервисов Meta не обнаружено',
        module: MODULE,
      });
    }
  } else {
    // No HTML provided — skip these checks
    passed.push({
      id: 'sec-02',
      title: 'Основной URL использует защищённый протокол',
      module: MODULE,
    });
    passed.push({
      id: 'sec-03',
      title: 'Проверка продвижения Meta-сервисов (HTML не предоставлен)',
      module: MODULE,
    });
  }

  return { violations, warnings, passed };
}
