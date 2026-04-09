import type { GeneratorInput, GeneratedFix } from '../types';

export function generate(_input: GeneratorInput): GeneratedFix {
  const blocks: string[] = [];

  // --- Google Fonts replacement ---
  blocks.push(`/* ===== Замена Google Fonts на локальные шрифты ===== */
/*
  1. Скачайте используемые шрифты с https://gwfh.mranftl.com/fonts
  2. Разместите файлы в каталоге /fonts/ на вашем сервере
  3. Удалите теги <link> на fonts.googleapis.com из HTML
  4. Подключите данный CSS-файл вместо Google Fonts
*/

/* Пример для шрифта Roboto (замените на ваш шрифт): */
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: local('Roboto'),
       url('/fonts/roboto-v30-latin_cyrillic-regular.woff2') format('woff2'),
       url('/fonts/roboto-v30-latin_cyrillic-regular.woff') format('woff');
}

@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: local('Roboto Bold'),
       url('/fonts/roboto-v30-latin_cyrillic-700.woff2') format('woff2'),
       url('/fonts/roboto-v30-latin_cyrillic-700.woff') format('woff');
}

/* Файл: /fonts/local-fonts.css */`);

  // --- Google Analytics → Yandex.Metrika ---
  blocks.push(`<!-- ===== Замена Google Analytics на Яндекс.Метрику ===== -->
<!-- Удалите скрипты Google Analytics (gtag.js / analytics.js) и вставьте: -->
<script>
  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
  (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

  ym({{YANDEX_METRIKA_ID}}, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true
  });
</script>
<noscript>
  <div><img src="https://mc.yandex.ru/watch/{{YANDEX_METRIKA_ID}}" style="position:absolute; left:-9999px;" alt="" /></div>
</noscript>
<!-- Замените {{YANDEX_METRIKA_ID}} на ваш номер счётчика Яндекс.Метрики -->`);

  // --- Google reCAPTCHA → SmartCaptcha ---
  blocks.push(`<!-- ===== Замена Google reCAPTCHA ===== -->
<!--
  Google reCAPTCHA передаёт данные на серверы за пределами РФ.
  Рекомендуемая замена: Yandex SmartCaptcha
  Документация: https://cloud.yandex.ru/docs/smartcaptcha/

  1. Зарегистрируйтесь в Yandex Cloud
  2. Создайте ключ SmartCaptcha
  3. Удалите скрипт reCAPTCHA и замените на:
-->
<script src="https://smartcaptcha.yandexcloud.net/captcha.js" defer></script>
<div
  id="captcha-container"
  class="smart-captcha"
  data-sitekey="{{SMARTCAPTCHA_SITE_KEY}}"
></div>
<!-- Замените {{SMARTCAPTCHA_SITE_KEY}} на ваш ключ SmartCaptcha -->`);

  // --- Google Maps → Yandex Maps ---
  blocks.push(`<!-- ===== Замена Google Maps на Яндекс.Карты ===== -->
<!-- Удалите iframe/скрипт Google Maps и вставьте: -->
<script src="https://api-maps.yandex.ru/2.1/?apikey={{YANDEX_MAPS_API_KEY}}&lang=ru_RU"></script>
<div id="yandex-map" style="width: 100%; height: 400px;"></div>
<script>
  ymaps.ready(function() {
    var map = new ymaps.Map('yandex-map', {
      center: [55.751574, 37.573856], // Замените на ваши координаты
      zoom: 15,
      controls: ['zoomControl', 'geolocationControl']
    });
    map.geoObjects.add(new ymaps.Placemark([55.751574, 37.573856], {
      balloonContent: '{{COMPANY_NAME}}'
    }));
  });
</script>
<!-- Замените {{YANDEX_MAPS_API_KEY}} на ваш API-ключ Яндекс.Карт -->`);

  // --- YouTube → preview + link ---
  blocks.push(`<!-- ===== Замена встроенного YouTube-видео ===== -->
<!--
  Встраивание YouTube iframe передаёт данные пользователей на серверы Google.
  Замена: превью-изображение со ссылкой на видео.
-->
<script>
(function() {
  function replaceYoutubeIframes() {
    var iframes = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]');
    iframes.forEach(function(iframe) {
      if (iframe.getAttribute('data-yt-replaced')) return;
      iframe.setAttribute('data-yt-replaced', 'true');

      var src = iframe.getAttribute('src') || '';
      var match = src.match(/(?:embed\\/|v[=/])([a-zA-Z0-9_-]{11})/);
      if (!match) return;
      var videoId = match[1];

      var wrapper = document.createElement('a');
      wrapper.href = 'https://www.youtube.com/watch?v=' + videoId;
      wrapper.target = '_blank';
      wrapper.rel = 'noopener noreferrer';
      wrapper.style.cssText = 'display: block; position: relative; max-width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; text-decoration: none;';

      var img = document.createElement('img');
      img.src = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
      img.alt = 'Видео на YouTube';
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; opacity: 0.85;';
      img.loading = 'lazy';

      var playBtn = document.createElement('div');
      playBtn.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 68px; height: 48px; background: rgba(255, 0, 0, 0.85); border-radius: 12px; display: flex; align-items: center; justify-content: center;';
      playBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><polygon points="8,5 19,12 8,19"/></svg>';

      var caption = document.createElement('div');
      caption.style.cssText = 'position: absolute; bottom: 0; left: 0; right: 0; padding: 8px 12px; background: rgba(0,0,0,0.6); color: #fff; font-size: 13px; font-family: sans-serif;';
      caption.textContent = 'Смотреть видео на YouTube →';

      wrapper.appendChild(img);
      wrapper.appendChild(playBtn);
      wrapper.appendChild(caption);

      iframe.parentNode.replaceChild(wrapper, iframe);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceYoutubeIframes);
  } else {
    replaceYoutubeIframes();
  }
})();
</script>`);

  const code = blocks.join('\n\n\n');

  return {
    type: 'remove-service',
    title: 'Замена запрещённых иностранных сервисов',
    description:
      'Набор замен для Google Fonts, Google Analytics, reCAPTCHA, Google Maps и YouTube iframe на российские аналоги или локальные решения.',
    code,
    targetPath: '/index.html',
    insertionPoint: 'before-close-body',
  };
}
