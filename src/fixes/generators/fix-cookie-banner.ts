import type { GeneratorInput, GeneratedFix } from '../types';

export function generate(input: GeneratorInput): GeneratedFix {
  const code = `<!-- Cookie Banner — 152-ФЗ compliant -->
<div id="cookie-consent-banner" style="
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
">
  <div id="cookie-consent-inner" style="
    max-width: 720px;
    margin: 0 auto 16px;
    padding: 20px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  ">
    <p style="margin: 0 0 12px;">
      Мы используем файлы cookie для улучшения работы сайта. Вы можете выбрать, какие категории cookie разрешить.
      <a href="/privacy.html" style="text-decoration: underline;">Политика конфиденциальности</a>
    </p>
    <div id="cookie-categories" style="margin: 0 0 16px; display: flex; flex-wrap: wrap; gap: 12px;">
      <label style="display: inline-flex; align-items: center; gap: 4px; cursor: default; opacity: 0.6;">
        <input type="checkbox" checked disabled /> Необходимые
      </label>
      <label style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
        <input type="checkbox" id="cookie-cat-analytics" /> Аналитические
      </label>
      <label style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
        <input type="checkbox" id="cookie-cat-marketing" /> Маркетинговые
      </label>
    </div>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <button id="cookie-accept-all" style="
        padding: 8px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      ">Принять все</button>
      <button id="cookie-accept-selected" style="
        padding: 8px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      ">Принять выбранные</button>
      <button id="cookie-reject" style="
        padding: 8px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      ">Отклонить</button>
    </div>
  </div>
</div>
<script>
(function() {
  var STORAGE_KEY = 'cookie_consent';
  var banner = document.getElementById('cookie-consent-banner');
  var inner = document.getElementById('cookie-consent-inner');

  // Detect dark/light theme
  function isDarkTheme() {
    var bg = getComputedStyle(document.body).backgroundColor;
    if (!bg || bg === 'rgba(0, 0, 0, 0)') return false;
    var m = bg.match(/\\d+/g);
    if (!m) return false;
    var luminance = (parseInt(m[0]) * 299 + parseInt(m[1]) * 587 + parseInt(m[2]) * 114) / 1000;
    return luminance < 128;
  }

  function applyTheme() {
    var dark = isDarkTheme();
    inner.style.backgroundColor = dark ? '#1e1e1e' : '#ffffff';
    inner.style.color = dark ? '#e0e0e0' : '#333333';
    var buttons = inner.querySelectorAll('button');
    var acceptAll = document.getElementById('cookie-accept-all');
    var acceptSel = document.getElementById('cookie-accept-selected');
    var reject = document.getElementById('cookie-reject');
    if (acceptAll) {
      acceptAll.style.backgroundColor = dark ? '#4a9eff' : '#2563eb';
      acceptAll.style.color = '#ffffff';
    }
    if (acceptSel) {
      acceptSel.style.backgroundColor = dark ? '#3a3a3a' : '#e5e7eb';
      acceptSel.style.color = dark ? '#e0e0e0' : '#333333';
    }
    if (reject) {
      reject.style.backgroundColor = 'transparent';
      reject.style.color = dark ? '#aaaaaa' : '#666666';
      reject.style.border = '1px solid ' + (dark ? '#555' : '#ccc');
    }
    var link = inner.querySelector('a');
    if (link) link.style.color = dark ? '#6db3f2' : '#2563eb';
  }

  function saveConsent(categories) {
    var data = { essential: true, analytics: categories.analytics, marketing: categories.marketing, savedAt: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
    banner.style.display = 'none';
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: data }));
  }

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  // If already consented, don't show
  if (getConsent()) return;

  banner.style.display = 'block';
  applyTheme();

  document.getElementById('cookie-accept-all').addEventListener('click', function() {
    saveConsent({ analytics: true, marketing: true });
  });

  document.getElementById('cookie-accept-selected').addEventListener('click', function() {
    saveConsent({
      analytics: !!document.getElementById('cookie-cat-analytics').checked,
      marketing: !!document.getElementById('cookie-cat-marketing').checked
    });
  });

  document.getElementById('cookie-reject').addEventListener('click', function() {
    saveConsent({ analytics: false, marketing: false });
  });
})();
</script>`;

  return {
    type: 'cookie-banner',
    title: 'Cookie-баннер (152-ФЗ)',
    description:
      'Баннер согласия на использование cookie с выбором категорий, совместимый с 152-ФЗ.',
    code,
    targetPath: '/index.html',
    insertionPoint: 'before-close-body',
  };
}
