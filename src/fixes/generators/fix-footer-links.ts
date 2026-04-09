import type { GeneratorInput, GeneratedFix } from '../types';

export function generate(_input: GeneratorInput): GeneratedFix {
  const code = `<!-- Footer Links Injector — 152-ФЗ -->
<script>
(function() {
  var links = [
    { href: '/privacy.html', text: 'Политика конфиденциальности' },
    { href: '/consent.html', text: 'Согласие на обработку ПД' }
  ];

  function createLinkElements(container) {
    links.forEach(function(link) {
      // Don't add if link already exists
      var existing = container.querySelector('a[href="' + link.href + '"]');
      if (existing) return;

      var a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.text;
      a.style.cssText = 'color: inherit; text-decoration: underline; opacity: 0.7; font-size: 13px; margin: 0 8px;';
      a.addEventListener('mouseenter', function() { this.style.opacity = '1'; });
      a.addEventListener('mouseleave', function() { this.style.opacity = '0.7'; });
      container.appendChild(a);
    });
  }

  function init() {
    var footer = document.querySelector('footer') ||
                 document.querySelector('[role="contentinfo"]') ||
                 document.querySelector('.footer') ||
                 document.getElementById('footer');

    if (footer) {
      // Add links into existing footer
      var linksContainer = document.createElement('div');
      linksContainer.style.cssText = 'text-align: center; padding: 12px 0; font-family: inherit;';
      createLinkElements(linksContainer);
      footer.appendChild(linksContainer);
    } else {
      // Create minimal footer
      footer = document.createElement('footer');
      footer.style.cssText = 'text-align: center; padding: 20px 16px; font-size: 13px; color: #666; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; border-top: 1px solid #e5e7eb;';
      createLinkElements(footer);
      document.body.appendChild(footer);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>`;

  return {
    type: 'footer-links',
    title: 'Ссылки в подвале сайта',
    description:
      'Добавление ссылок на политику конфиденциальности и согласие на обработку ПД в подвал сайта.',
    code,
    targetPath: '/index.html',
    insertionPoint: 'before-close-body',
  };
}
