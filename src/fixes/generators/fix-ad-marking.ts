import type { GeneratorInput, GeneratedFix } from '../types';

export function generate(_input: GeneratorInput): GeneratedFix {
  const code = `<!-- Ad Marking Injector — Закон о рекламе -->
<script>
(function() {
  var AD_SELECTORS = [
    '[class*="advert"]',
    '[class*="banner"]',
    '[class*="ad-block"]',
    '[class*="ad_block"]',
    '[class*="ads-"]',
    '[class*="ads_"]',
    '[class*="promo"]',
    '[id*="advert"]',
    '[id*="banner"]',
    '[id*="ad-block"]',
    '[id*="ad_block"]',
    '[data-ad]',
    '[data-advert]',
    'ins.adsbygoogle',
    '.sponsored',
    '.ad-container',
    '.ad-wrapper'
  ];

  function markAds() {
    var selector = AD_SELECTORS.join(', ');
    var adElements = document.querySelectorAll(selector);

    adElements.forEach(function(el) {
      if (el.getAttribute('data-ad-marked')) return;
      el.setAttribute('data-ad-marked', 'true');

      // Ensure the ad container has relative positioning
      var pos = getComputedStyle(el).position;
      if (pos === 'static') {
        el.style.position = 'relative';
      }

      // Create ad label
      var label = document.createElement('div');
      label.style.cssText = [
        'position: absolute',
        'top: 0',
        'left: 0',
        'background: rgba(0, 0, 0, 0.7)',
        'color: #ffffff',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-size: 11px',
        'line-height: 1',
        'padding: 3px 8px',
        'border-radius: 0 0 4px 0',
        'z-index: 10',
        'pointer-events: none',
        'white-space: nowrap'
      ].join('; ') + ';';

      label.innerHTML = 'Реклама &middot; {{ADVERTISER_NAME}} &middot; ERID: {{ERID_TOKEN}}';
      el.appendChild(label);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markAds);
  } else {
    markAds();
  }

  // Observe for dynamically loaded ads
  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length) {
        markAds();
        break;
      }
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
</script>`;

  return {
    type: 'ad-marking',
    title: 'Маркировка рекламы',
    description:
      'Автоматическое добавление пометки «Реклама» с информацией о рекламодателе и токеном ERID к рекламным блокам.',
    code,
    targetPath: '/index.html',
    insertionPoint: 'before-close-body',
  };
}
