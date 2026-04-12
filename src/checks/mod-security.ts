import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

const MODULE = 'security';
const LAW = '152-ФЗ';

export async function checkSecurity(finalUrl: string, $?: CheerioAPI, html?: string, responseHeaders?: Record<string, string>): Promise<CheckResult> {
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
      article: 'ст. 13.11 ч.1 КоАП',
      severity: 'critical',
      title: 'Сайт не использует HTTPS',
      description:
        'Передача данных осуществляется по незащищённому протоколу HTTP. ' +
        'Оператор обязан обеспечить безопасность персональных данных при их передаче по сети (ст. 19 152-ФЗ).',
      minFine: 150000,
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
        article: 'ст. 14.3 ч.18 КоАП',
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

    // ─── sec-04: Strict-Transport-Security (HSTS) ──────────────────────
    if (responseHeaders) {
      const hsts = responseHeaders['strict-transport-security'];
      if (!hsts) {
        violations.push({
          id: 'sec-04',
          module: MODULE,
          law: LAW,
          article: 'ст. 13.11 ч.1 КоАП',
          severity: 'medium',
          title: 'Отсутствует заголовок Strict-Transport-Security (HSTS)',
          description:
            'Сервер не отправляет заголовок HSTS, что позволяет атаки типа SSL stripping. ' +
            'Без HSTS браузер может установить незащищённое HTTP-соединение.',
          minFine: 150000,
          maxFine: 300000,
          details: ['Заголовок Strict-Transport-Security не обнаружен в ответе сервера'],
          recommendation:
            'Настройте заголовок Strict-Transport-Security: max-age=31536000; includeSubDomains на веб-сервере.',
        });
      } else {
        passed.push({
          id: 'sec-04',
          title: 'Заголовок HSTS (Strict-Transport-Security) настроен',
          module: MODULE,
        });
      }

      // ─── sec-05: X-Content-Type-Options ─────────────────────────────────
      const xcto = responseHeaders['x-content-type-options'];
      if (!xcto) {
        warnings.push({
          id: 'sec-05',
          title: 'Отсутствует заголовок X-Content-Type-Options',
          description:
            'Сервер не отправляет заголовок X-Content-Type-Options: nosniff. ' +
            'Это может позволить браузеру интерпретировать файлы с неверным MIME-типом.',
          law: LAW,
          article: 'ст. 13.11 ч.1 КоАП',
          potentialFine: '150 000 — 300 000 руб.',
          recommendation: 'Добавьте заголовок X-Content-Type-Options: nosniff в настройках веб-сервера.',
        });
      } else {
        passed.push({ id: 'sec-05', title: 'Заголовок X-Content-Type-Options настроен', module: MODULE });
      }

      // ─── sec-06: X-Frame-Options ────────────────────────────────────────
      const xfo = responseHeaders['x-frame-options'];
      if (!xfo) {
        warnings.push({
          id: 'sec-06',
          title: 'Отсутствует заголовок X-Frame-Options',
          description:
            'Сервер не отправляет заголовок X-Frame-Options. Сайт может быть встроен в iframe на стороннем ресурсе (clickjacking).',
          law: LAW,
          article: 'ст. 13.11 ч.1 КоАП',
          potentialFine: '150 000 — 300 000 руб.',
          recommendation: 'Добавьте заголовок X-Frame-Options: SAMEORIGIN в настройках веб-сервера.',
        });
      } else {
        passed.push({ id: 'sec-06', title: 'Заголовок X-Frame-Options настроен', module: MODULE });
      }

      // ─── sec-07: Content-Security-Policy ────────────────────────────────
      const csp = responseHeaders['content-security-policy'];
      if (!csp) {
        warnings.push({
          id: 'sec-07',
          title: 'Отсутствует заголовок Content-Security-Policy',
          description:
            'Сервер не отправляет заголовок Content-Security-Policy (CSP). ' +
            'CSP помогает предотвратить XSS-атаки и другие инъекции контента.',
          law: LAW,
          article: 'ст. 13.11 ч.1 КоАП',
          potentialFine: '150 000 — 300 000 руб.',
          recommendation: 'Настройте Content-Security-Policy для ограничения источников загрузки скриптов, стилей и других ресурсов.',
        });
      } else {
        passed.push({ id: 'sec-07', title: 'Заголовок Content-Security-Policy настроен', module: MODULE });
      }

      // ─── sec-08: Referrer-Policy ────────────────────────────────────────
      const rp = responseHeaders['referrer-policy'];
      if (!rp) {
        warnings.push({
          id: 'sec-08',
          title: 'Отсутствует заголовок Referrer-Policy',
          description:
            'Сервер не отправляет заголовок Referrer-Policy. Без него браузер может передавать полный URL страницы при переходах на сторонние сайты.',
          law: LAW,
          article: 'ст. 13.11 ч.1 КоАП',
          potentialFine: '150 000 — 300 000 руб.',
          recommendation: 'Добавьте заголовок Referrer-Policy: strict-origin-when-cross-origin в настройках веб-сервера.',
        });
      } else {
        passed.push({ id: 'sec-08', title: 'Заголовок Referrer-Policy настроен', module: MODULE });
      }

      // ─── sec-09: Permissions-Policy ─────────────────────────────────────
      const pp = responseHeaders['permissions-policy'];
      if (!pp) {
        warnings.push({
          id: 'sec-09',
          title: 'Отсутствует заголовок Permissions-Policy',
          description:
            'Сервер не отправляет заголовок Permissions-Policy. Без него сторонние скрипты могут получить доступ к камере, микрофону и геолокации.',
          law: LAW,
          article: 'ст. 13.11 ч.1 КоАП',
          potentialFine: '150 000 — 300 000 руб.',
          recommendation: 'Настройте заголовок Permissions-Policy для ограничения доступа к API браузера (камера, микрофон, геолокация).',
        });
      } else {
        passed.push({ id: 'sec-09', title: 'Заголовок Permissions-Policy настроен', module: MODULE });
      }
    }

    // ─── sec-10: Open service pages ─────────────────────────────────────
    {
      const baseOrigin = new URL(finalUrl).origin;
      const sensitivePaths = [
        '/admin', '/wp-admin', '/phpmyadmin', '/.env', '/.git/config',
        '/debug', '/server-status', '/elmah.axd', '/wp-login.php',
      ];

      const openPages: string[] = [];

      const results = await Promise.allSettled(
        sensitivePaths.map(async (path) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${baseOrigin}${path}`, {
              method: 'HEAD',
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteChecker/1.0)' },
              redirect: 'manual',
            });
            clearTimeout(timeout);
            if (res.status === 200) {
              openPages.push(path);
            }
          } catch {
            // Timeout or network error — ignore
          }
        })
      );

      if (openPages.length > 0) {
        warnings.push({
          id: 'sec-10',
          title: 'Обнаружены открытые служебные страницы',
          description:
            'На сайте обнаружены служебные страницы, доступные без авторизации. ' +
            'Это может привести к утечке конфиденциальных данных или несанкционированному доступу.',
          law: LAW,
          article: 'ст. 13.11 ч.1 КоАП',
          potentialFine: '150 000 — 300 000 руб.',
          recommendation:
            'Закройте доступ к служебным страницам: настройте авторизацию или ограничьте доступ по IP-адресу.',
        });
      } else {
        passed.push({
          id: 'sec-10',
          title: 'Открытые служебные страницы не обнаружены',
          module: MODULE,
        });
      }
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
