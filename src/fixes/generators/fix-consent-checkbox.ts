import type { GeneratorInput, GeneratedFix } from '../types';

export function generate(input: GeneratorInput): GeneratedFix {
  const code = `<!-- Consent Checkbox Injector — 152-ФЗ -->
<script>
(function() {
  function injectConsentCheckboxes() {
    var forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
      // Skip if already processed
      if (form.getAttribute('data-consent-injected')) return;

      var hasPersonalFields = form.querySelector(
        'input[type="email"], input[type="tel"], input[name*="name"], input[name*="phone"], input[name*="email"]'
      );
      if (!hasPersonalFields) return;

      form.setAttribute('data-consent-injected', 'true');

      // Detect if it looks like a subscribe/newsletter form
      var isSubscribeForm = !!(
        form.querySelector('input[name*="subscri"], input[name*="newsletter"]') ||
        (form.textContent && /подписк|рассылк|newsletter|subscribe/i.test(form.textContent))
      );

      // Create consent wrapper
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin: 12px 0; font-size: 13px; line-height: 1.5; font-family: inherit;';

      // PD consent checkbox (always required)
      var pdId = 'consent-pd-' + Math.random().toString(36).substr(2, 6);
      var pdLabel = document.createElement('label');
      pdLabel.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin-bottom: 8px;';
      pdLabel.innerHTML =
        '<input type="checkbox" id="' + pdId + '" name="consent_pd" style="margin-top: 3px; flex-shrink: 0;" />' +
        '<span>Я даю согласие на <a href="/consent.html" target="_blank" style="text-decoration: underline;">обработку персональных данных</a> ' +
        'в соответствии с <a href="/privacy.html" target="_blank" style="text-decoration: underline;">Политикой конфиденциальности</a></span>';
      wrapper.appendChild(pdLabel);

      // Newsletter consent (only for subscribe forms)
      var nlId = '';
      if (isSubscribeForm) {
        nlId = 'consent-nl-' + Math.random().toString(36).substr(2, 6);
        var nlLabel = document.createElement('label');
        nlLabel.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin-bottom: 8px;';
        nlLabel.innerHTML =
          '<input type="checkbox" id="' + nlId + '" name="consent_newsletter" style="margin-top: 3px; flex-shrink: 0;" />' +
          '<span>Я согласен(а) на получение информационных и рекламных рассылок</span>';
        wrapper.appendChild(nlLabel);
      }

      // Error message container
      var errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'color: #dc2626; font-size: 12px; margin-top: 4px; display: none;';
      errorMsg.textContent = 'Необходимо дать согласие на обработку персональных данных';
      wrapper.appendChild(errorMsg);

      // Insert before the submit button, or at the end of the form
      var submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      if (submitBtn && submitBtn.parentNode === form) {
        form.insertBefore(wrapper, submitBtn);
      } else if (submitBtn) {
        submitBtn.parentNode.insertBefore(wrapper, submitBtn);
      } else {
        form.appendChild(wrapper);
      }

      // Block submission until PD consent is checked
      form.addEventListener('submit', function(e) {
        var pdCheckbox = document.getElementById(pdId);
        if (pdCheckbox && !pdCheckbox.checked) {
          e.preventDefault();
          e.stopPropagation();
          errorMsg.style.display = 'block';
          pdCheckbox.parentNode.style.outline = '2px solid #dc2626';
          pdCheckbox.parentNode.style.outlineOffset = '2px';
          pdCheckbox.parentNode.style.borderRadius = '4px';
          return false;
        }
        errorMsg.style.display = 'none';
        if (pdCheckbox) {
          pdCheckbox.parentNode.style.outline = 'none';
        }
      }, true);

      // Clear error on check
      var pdCb = document.getElementById(pdId);
      if (pdCb) {
        pdCb.addEventListener('change', function() {
          if (this.checked) {
            errorMsg.style.display = 'none';
            this.parentNode.style.outline = 'none';
          }
        });
      }
    });
  }

  // Run on DOMContentLoaded + observe for dynamically added forms
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectConsentCheckboxes);
  } else {
    injectConsentCheckboxes();
  }

  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length) {
        injectConsentCheckboxes();
        break;
      }
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
</script>`;

  return {
    type: 'consent-checkbox',
    title: 'Чекбоксы согласия на обработку ПД',
    description:
      'Автоматическая вставка чекбоксов согласия на обработку персональных данных во все формы с полями email, телефон или имя.',
    code,
    targetPath: '/index.html',
    insertionPoint: 'before-close-body',
  };
}
