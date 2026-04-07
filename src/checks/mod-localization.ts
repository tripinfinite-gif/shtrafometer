import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

interface ServiceCheck {
  id: string;
  name: string;
  patterns: RegExp[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  passedTitle: string;
  /** If true, produces a Warning instead of a Violation */
  warningOnly?: boolean;
}

const FOREIGN_DATA_LAW = '152-ФЗ';
const FOREIGN_DATA_ARTICLE = 'ст. 13.11 ч.8-9 КоАП';
const FOREIGN_MIN_FINE = 1000000;
const FOREIGN_MAX_FINE = 6000000;

const SERVICE_CHECKS: ServiceCheck[] = [
  {
    id: 'loc-02',
    name: 'Google Analytics',
    patterns: [
      /google-analytics\.com/i,
      /googletagmanager\.com\/gtag/i,
      /gtag\s*\(/i,
      /\bga\.js\b/i,
      /\banalytics\.js\b/i,
      /UA-\d+/,
      /G-[A-Z0-9]+/,
      /www\.google-analytics\.com/i,
    ],
    severity: 'critical',
    title: 'Обнаружен Google Analytics',
    description:
      'На сайте обнаружен Google Analytics. Данные пользователей передаются на серверы Google за пределами РФ, ' +
      'что нарушает требования 152-ФЗ о локализации персональных данных на территории Российской Федерации.',
    recommendation:
      'Удалите Google Analytics. Альтернатива: Яндекс.Метрика, Matomo (self-hosted в РФ)',
    passedTitle: 'Google Analytics не обнаружен',
  },
  {
    id: 'loc-03',
    name: 'Google Tag Manager',
    patterns: [
      /googletagmanager\.com/i,
      /\bgtm\.js\b/i,
      /GTM-[A-Z0-9]+/,
    ],
    severity: 'critical',
    title: 'Обнаружен Google Tag Manager',
    description:
      'На сайте обнаружен Google Tag Manager. Сервис передаёт данные на серверы Google за пределами РФ, ' +
      'что нарушает требования о локализации персональных данных.',
    recommendation:
      'Удалите Google Tag Manager. Используйте Яндекс.Метрику или серверный контейнер тегов на территории РФ.',
    passedTitle: 'Google Tag Manager не обнаружен',
  },
  {
    id: 'loc-04',
    name: 'Google reCAPTCHA',
    patterns: [
      /google\.com\/recaptcha/i,
      /recaptcha\/api/i,
      /\bgrecaptcha\b/i,
      /g-recaptcha/i,
    ],
    severity: 'critical',
    title: 'Обнаружен Google reCAPTCHA',
    description:
      'На сайте обнаружен Google reCAPTCHA. Сервис передаёт данные пользователей (IP-адрес, поведенческие данные) ' +
      'на серверы Google за пределами РФ.',
    recommendation:
      'Замените Google reCAPTCHA на Yandex SmartCaptcha или другое решение с серверами в РФ.',
    passedTitle: 'Google reCAPTCHA не обнаружен',
  },
  {
    id: 'loc-05',
    name: 'Google Fonts (CDN)',
    patterns: [
      /fonts\.googleapis\.com/i,
      /fonts\.gstatic\.com/i,
    ],
    severity: 'critical',
    title: 'Обнаружены Google Fonts с CDN',
    description:
      'Шрифты загружаются с серверов Google (fonts.googleapis.com / fonts.gstatic.com). ' +
      'При каждом посещении IP-адрес пользователя передаётся Google за пределы РФ.',
    recommendation:
      'Скачайте шрифты и разместите их локально на вашем сервере. Используйте @font-face с локальными файлами.',
    passedTitle: 'Google Fonts (CDN) не обнаружены',
  },
  {
    id: 'loc-06',
    name: 'Google Maps',
    patterns: [
      /maps\.google\.com/i,
      /google\.com\/maps/i,
      /maps\.googleapis\.com/i,
    ],
    severity: 'critical',
    title: 'Обнаружен Google Maps',
    description:
      'На сайте обнаружен Google Maps. Сервис передаёт данные пользователей на серверы Google за пределами РФ.',
    recommendation:
      'Замените Google Maps на Яндекс.Карты или 2GIS.',
    passedTitle: 'Google Maps не обнаружен',
  },
  {
    id: 'loc-07',
    name: 'YouTube',
    patterns: [
      /youtube\.com\/embed/i,
      /youtube-nocookie\.com/i,
      /youtube\.com\/watch/i,
      /youtu\.be/i,
    ],
    severity: 'critical',
    title: 'Обнаружены встроенные видео YouTube',
    description:
      'На сайте обнаружены встроенные видео YouTube. При загрузке iframe данные пользователей ' +
      '(IP-адрес, cookie) передаются на серверы Google за пределами РФ.',
    recommendation:
      'Замените YouTube на RuTube, VK Video или загружайте видео на собственный сервер.',
    passedTitle: 'YouTube не обнаружен',
  },
  {
    id: 'loc-08',
    name: 'WhatsApp/Telegram виджеты',
    patterns: [
      /api\.whatsapp\.com/i,
      /wa\.me/i,
      /web\.whatsapp\.com/i,
      /telegram\.org\/js/i,
    ],
    severity: 'high',
    title: 'Обнаружены виджеты WhatsApp/Telegram',
    description:
      'На сайте обнаружены виджеты мессенджеров WhatsApp или Telegram, загружающие скрипты с зарубежных серверов. ' +
      'Это может привести к передаче данных пользователей за пределы РФ.',
    recommendation:
      'Используйте простые ссылки вместо виджетов, или разместите виджет на собственном сервере в РФ.',
    passedTitle: 'Виджеты WhatsApp/Telegram не обнаружены',
  },
  {
    id: 'loc-09',
    name: 'Зарубежные чат-сервисы',
    patterns: [
      /tawk\.to/i,
      /zendesk\.com/i,
      /intercom\.io/i,
      /crisp\.chat/i,
      /drift\.com/i,
      /livechatinc\.com/i,
      /chatra\.com/i,
    ],
    severity: 'critical',
    title: 'Обнаружен зарубежный чат-сервис',
    description:
      'На сайте обнаружен зарубежный сервис онлайн-чата. Данные переписки и персональные данные пользователей ' +
      'передаются на серверы за пределами РФ.',
    recommendation:
      'Замените на российские аналоги: JivoSite, Carrot Quest, или разместите open-source решение на сервере в РФ.',
    passedTitle: 'Зарубежные чат-сервисы не обнаружены',
  },
  {
    id: 'loc-10',
    name: 'Зарубежные CRM',
    patterns: [
      /hubspot\.com/i,
      /hs-scripts\.com/i,
      /salesforce\.com/i,
      /pipedrive\.com/i,
      /zoho\.com/i,
    ],
    severity: 'high',
    title: 'Обнаружены признаки зарубежной CRM',
    description:
      'На сайте обнаружены скрипты или ссылки, указывающие на использование зарубежной CRM-системы. ' +
      'Данные клиентов могут храниться за пределами РФ.',
    recommendation:
      'Используйте CRM с серверами в РФ: Битрикс24, amoCRM, или разместите self-hosted решение в российском ЦОД.',
    passedTitle: 'Зарубежные CRM не обнаружены',
    warningOnly: true,
  },
  {
    id: 'loc-11',
    name: 'Meta/Facebook SDK',
    patterns: [
      /connect\.facebook\.net/i,
      /fbevents\.js/i,
      /facebook\.com\/tr/i,
      /fbq\s*\(/i,
      /facebook-jssdk/i,
    ],
    severity: 'critical',
    title: 'Обнаружен Meta/Facebook SDK',
    description:
      'На сайте обнаружен Facebook/Meta SDK (пиксель, SDK, трекер). Данные пользователей передаются ' +
      'на серверы Meta за пределами РФ.',
    recommendation:
      'Удалите Meta/Facebook SDK. Для рекламной аналитики используйте Яндекс.Метрику или VK Рекламу.',
    passedTitle: 'Meta/Facebook SDK не обнаружен',
  },
];

export function checkLocalization($: CheerioAPI, html: string): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passed: PassedCheck[] = [];

  const MODULE = 'localization';

  for (const check of SERVICE_CHECKS) {
    const foundPatterns: string[] = [];

    for (const pattern of check.patterns) {
      const match = html.match(pattern);
      if (match) {
        // Extract a snippet around the match for context
        const idx = html.indexOf(match[0]);
        const start = Math.max(0, idx - 40);
        const end = Math.min(html.length, idx + match[0].length + 40);
        const snippet = html.substring(start, end).replace(/\n/g, ' ').trim();
        foundPatterns.push(`Паттерн "${pattern.source}" найден: ...${snippet}...`);
      }
    }

    if (foundPatterns.length > 0) {
      if (check.warningOnly) {
        warnings.push({
          id: check.id,
          title: check.title,
          description: check.description,
          law: FOREIGN_DATA_LAW,
          article: FOREIGN_DATA_ARTICLE,
          potentialFine: `${FOREIGN_MIN_FINE.toLocaleString('ru-RU')} - ${FOREIGN_MAX_FINE.toLocaleString('ru-RU')} руб.`,
          recommendation: check.recommendation,
        });
      } else {
        violations.push({
          id: check.id,
          module: MODULE,
          law: FOREIGN_DATA_LAW,
          article: FOREIGN_DATA_ARTICLE,
          severity: check.severity,
          title: check.title,
          description: check.description,
          minFine: FOREIGN_MIN_FINE,
          maxFine: FOREIGN_MAX_FINE,
          details: foundPatterns,
          recommendation: check.recommendation,
        });
      }
    } else {
      passed.push({
        id: check.id,
        title: check.passedTitle,
        module: MODULE,
      });
    }
  }

  return { violations, warnings, passed };
}
