import type { Violation, Warning, PassedCheck, CheckResult } from './types';

const MODULE = 'security';
const LAW = '152-ФЗ';

export function checkSecurity(finalUrl: string): CheckResult {
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

  // ─── sec-02: Проверка протокола ────────────────────────────────────
  if (usesHttps) {
    passed.push({
      id: 'sec-02',
      title: 'Основной URL использует защищённый протокол',
      module: MODULE,
    });
  }

  return { violations, warnings, passed };
}
