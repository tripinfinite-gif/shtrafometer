import type { CheerioAPI } from 'cheerio';
import type { Violation, Warning, PassedCheck, CheckResult } from './types';

const KNOWN_VIOLATIONS = new Set([
  'sale', 'shop', 'buy', 'login', 'sign up', 'subscribe', 'feedback',
  'about', 'contact', 'blog', 'news', 'portfolio', 'services', 'home',
  'delivery', 'cart', 'checkout', 'pricing', 'team', 'features',
  'download', 'more', 'read more', 'learn more', 'view', 'back',
  'next', 'previous', 'search', 'menu', 'close', 'open', 'free',
  'new', 'hot', 'best', 'top', 'premium', 'pro', 'vip', 'faq',
  'wishlist', 'compare', 'share', 'like',
]);

const TECH_ABBREVIATIONS = new Set([
  'html', 'css', 'pdf', 'xml', 'json', 'api', 'url', 'http', 'https',
  'smtp', 'ftp', 'ssh', 'sql', 'php', 'www', 'cdn', 'dns', 'ssl',
  'tls', 'rgb', 'svg', 'png', 'jpg', 'gif', 'webp', 'mp3', 'mp4',
]);

const LOANWORDS: Record<string, string> = {
  'коворкинг': 'пространство для совместной работы',
  'шопинг': 'покупки',
  'кэшбэк': 'возврат средств',
  'лайфхак': 'полезный совет',
  'трэвел': 'путешествие',
  'релакс': 'отдых',
  'дедлайн': 'крайний срок',
  'митап': 'встреча',
  'воркшоп': 'мастерская / мастер-класс',
  'нетворкинг': 'деловые связи',
  'фидбэк': 'обратная связь',
  'апгрейд': 'обновление',
  'бэкап': 'резервная копия',
};

interface FoundWord {
  word: string;
  context: string;
}

function isBrandWord(word: string, surroundingText: string): boolean {
  const idx = surroundingText.indexOf(word);
  if (idx < 0) return false;
  const before = idx > 0 ? surroundingText[idx - 1] : '';
  const after = idx + word.length < surroundingText.length ? surroundingText[idx + word.length] : '';
  const cyrillicRe = /[\u0400-\u04FF]/;
  return (
    word[0] === word[0].toUpperCase() &&
    (cyrillicRe.test(before) || cyrillicRe.test(after))
  );
}

function isUrlOrEmail(word: string, surroundingText: string): boolean {
  const emailRe = /[\w.\-]+@[\w.\-]+\.\w{2,}/;
  const urlRe = /https?:\/\/|www\.|\.com|\.ru|\.org|\.net/;
  const nearby = surroundingText.toLowerCase();
  return emailRe.test(nearby) || urlRe.test(nearby);
}

function extractInterfaceTexts($: CheerioAPI): { text: string; context: string }[] {
  const selectors = [
    { sel: 'nav a', ctx: 'навигации' },
    { sel: 'button', ctx: 'кнопке' },
    { sel: '[role="button"]', ctx: 'кнопке' },
    { sel: 'h1', ctx: 'заголовке h1' },
    { sel: 'h2', ctx: 'заголовке h2' },
    { sel: 'h3', ctx: 'заголовке h3' },
    { sel: '.menu a', ctx: 'меню' },
    { sel: '.nav a', ctx: 'навигации' },
    { sel: 'header a', ctx: 'шапке сайта' },
  ];

  const results: { text: string; context: string }[] = [];

  for (const { sel, ctx } of selectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        results.push({ text, context: ctx });
      }
    });
  }

  return results;
}

export function checkLanguage($: CheerioAPI, html: string): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passed: PassedCheck[] = [];

  // lang-01: Foreign words in interface elements
  const interfaceTexts = extractInterfaceTexts($);
  const latinWordRe = /[a-zA-Z]{3,}/g;
  const foundForeignWords: FoundWord[] = [];

  for (const { text, context } of interfaceTexts) {
    let match: RegExpExecArray | null;
    latinWordRe.lastIndex = 0;
    while ((match = latinWordRe.exec(text)) !== null) {
      const word = match[0];
      const wordLower = word.toLowerCase();

      if (TECH_ABBREVIATIONS.has(wordLower)) continue;
      if (isUrlOrEmail(word, text)) continue;
      if (isBrandWord(word, text)) continue;

      foundForeignWords.push({ word, context });
    }
  }

  // Group by word (case-insensitive)
  const wordGroups = new Map<string, string[]>();
  for (const { word, context } of foundForeignWords) {
    const key = word.toLowerCase();
    if (!wordGroups.has(key)) {
      wordGroups.set(key, []);
    }
    wordGroups.get(key)!.push(context);
  }

  // Check against known violations and any remaining Latin words
  const violationDetails: string[] = [];
  const hasKnownViolations = new Set<string>();

  for (const [wordLower, contexts] of wordGroups) {
    const originalWord = foundForeignWords.find(
      (fw) => fw.word.toLowerCase() === wordLower
    )?.word ?? wordLower;

    const uniqueContexts = [...new Set(contexts)];
    for (const ctx of uniqueContexts) {
      violationDetails.push(`\u00AB${originalWord}\u00BB в ${ctx}`);
    }

    if (KNOWN_VIOLATIONS.has(wordLower)) {
      hasKnownViolations.add(wordLower);
    }
  }

  if (violationDetails.length > 0) {
    violations.push({
      id: 'lang-01',
      module: 'language',
      law: '168-\u0424\u0417',
      article: 'ст. 11 ФЗ-168',
      severity: 'medium',
      title: '\u0418\u043D\u043E\u0441\u0442\u0440\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 \u0432 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u0445 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430',
      description: `\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u043E ${wordGroups.size} \u0438\u043D\u043E\u0441\u0442\u0440\u0430\u043D\u043D\u044B\u0445 \u0441\u043B\u043E\u0432(\u0430) \u0432 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u0445 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430`,
      minFine: 100000,
      maxFine: 500000,
      details: violationDetails,
      recommendation: '\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u0435 \u0438\u043D\u043E\u0441\u0442\u0440\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 \u0440\u0443\u0441\u0441\u043A\u0438\u043C\u0438 \u0430\u043D\u0430\u043B\u043E\u0433\u0430\u043C\u0438 \u0441\u043E\u0433\u043B\u0430\u0441\u043D\u043E \u0424\u0417-168 (\u0432\u0441\u0442\u0443\u043F\u0438\u043B \u0432 \u0441\u0438\u043B\u0443 01.03.2026)',
    });
  }

  // lang-02: Cyrillic loanwords
  const htmlLower = html.toLowerCase();
  const foundLoanwords: string[] = [];

  for (const loanword of Object.keys(LOANWORDS)) {
    if (htmlLower.includes(loanword)) {
      foundLoanwords.push(loanword);
    }
  }

  if (foundLoanwords.length > 0) {
    violations.push({
      id: 'lang-02',
      module: 'language',
      law: '168-\u0424\u0417',
      article: 'ст. 11 ФЗ-168',
      severity: 'low',
      title: '\u0417\u0430\u0438\u043C\u0441\u0442\u0432\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u043E\u0432\u0430, \u0438\u043C\u0435\u044E\u0449\u0438\u0435 \u0440\u0443\u0441\u0441\u043A\u0438\u0435 \u0430\u043D\u0430\u043B\u043E\u0433\u0438',
      description: `\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u043E ${foundLoanwords.length} \u0437\u0430\u0438\u043C\u0441\u0442\u0432\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0441\u043B\u043E\u0432(\u0430), \u0434\u043B\u044F \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0435\u0441\u0442\u044C \u0440\u0443\u0441\u0441\u043A\u0438\u0435 \u044D\u043A\u0432\u0438\u0432\u0430\u043B\u0435\u043D\u0442\u044B`,
      minFine: 100000,
      maxFine: 500000,
      details: foundLoanwords.map(
        (w) => `\u00AB${w}\u00BB \u2014 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F: \u00AB${LOANWORDS[w]}\u00BB`
      ),
      recommendation: '\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u0435 \u0438\u043D\u043E\u0441\u0442\u0440\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 \u0440\u0443\u0441\u0441\u043A\u0438\u043C\u0438 \u0430\u043D\u0430\u043B\u043E\u0433\u0430\u043C\u0438 \u0441\u043E\u0433\u043B\u0430\u0441\u043D\u043E \u0424\u0417-168 (\u0432\u0441\u0442\u0443\u043F\u0438\u043B \u0432 \u0441\u0438\u043B\u0443 01.03.2026)',
    });
  }

  if (violations.length === 0) {
    passed.push({
      id: 'lang-01',
      title: '\u0418\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u043D\u0430 \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u044F\u0437\u044B\u043A\u0435',
      module: 'language',
    });
  }

  return { violations, warnings, passed };
}
