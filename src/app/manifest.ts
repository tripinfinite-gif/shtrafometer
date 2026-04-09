import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Штрафометр — Проверка сайта на штрафы по законам РФ',
    short_name: 'Штрафометр',
    description: 'Бесплатная проверка сайта на соответствие 8 законам РФ. 35+ автоматических проверок, расчёт штрафов.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6C5CE7',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
