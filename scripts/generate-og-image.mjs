import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F0B2D"/>
      <stop offset="60%" style="stop-color:#1A1040"/>
      <stop offset="100%" style="stop-color:#0D0820"/>
    </linearGradient>

    <!-- Purple glow for shield -->
    <radialGradient id="shieldGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:0.4"/>
      <stop offset="100%" style="stop-color:#6C5CE7;stop-opacity:0"/>
    </radialGradient>

    <!-- Shield fill gradient -->
    <linearGradient id="shieldFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7C3AED"/>
      <stop offset="100%" style="stop-color:#5B21B6"/>
    </linearGradient>

    <!-- Accent gradient for badge -->
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7C3AED"/>
      <stop offset="100%" style="stop-color:#EC4899"/>
    </linearGradient>

    <!-- Grid pattern -->
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#6C5CE7" stroke-width="0.3" opacity="0.15"/>
    </pattern>

    <!-- Glow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Text glow -->
    <filter id="textGlow" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Clip path for shield -->
    <clipPath id="shieldClip">
      <path d="M 72 20 L 112 28 L 112 64 Q 112 88 72 100 Q 32 88 32 64 L 32 28 Z"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>

  <!-- Grid overlay -->
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- Subtle vignette -->
  <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
    <stop offset="0%" style="stop-color:#000000;stop-opacity:0"/>
    <stop offset="100%" style="stop-color:#000000;stop-opacity:0.5"/>
  </radialGradient>
  <rect width="1200" height="630" fill="url(#vignette)"/>

  <!-- Left decorative circle glow -->
  <circle cx="160" cy="315" r="220" fill="url(#shieldGlow)" opacity="0.6"/>

  <!-- Right decorative circle glow -->
  <circle cx="1050" cy="200" r="180" fill="#7C3AED" opacity="0.06"/>

  <!-- ===== SHIELD ICON ===== -->
  <g transform="translate(70, 195) scale(2.5)" filter="url(#glow)">
    <!-- Shield shadow -->
    <path d="M 72 22 L 110 30 L 110 64 Q 110 86 72 98 Q 34 86 34 64 L 34 30 Z"
          fill="#4C1D95" opacity="0.6" transform="translate(3, 3)"/>
    <!-- Shield body -->
    <path d="M 72 20 L 112 28 L 112 64 Q 112 88 72 100 Q 32 88 32 64 L 32 28 Z"
          fill="url(#shieldFill)" stroke="#A78BFA" stroke-width="1.5"/>
    <!-- Shield inner highlight -->
    <path d="M 72 28 L 104 34 L 104 64 Q 104 82 72 92 Q 40 82 40 64 L 40 34 Z"
          fill="none" stroke="#C4B5FD" stroke-width="0.8" opacity="0.4"/>
    <!-- Checkmark inside shield -->
    <path d="M 52 60 L 64 74 L 92 48"
          fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- ===== MAIN TITLE ===== -->
  <!-- "ШТРАФО" -->
  <text x="320" y="268"
        font-family="Arial Black, Arial, sans-serif"
        font-weight="900"
        font-size="88"
        fill="white"
        letter-spacing="-2"
        filter="url(#textGlow)">ШТРАФО</text>

  <!-- "МЕТР" in purple accent -->
  <text x="884" y="268"
        font-family="Arial Black, Arial, sans-serif"
        font-weight="900"
        font-size="88"
        fill="#A78BFA"
        letter-spacing="-2"
        filter="url(#textGlow)">МЕТР</text>

  <!-- Divider line under title -->
  <rect x="320" y="285" width="800" height="3" rx="2" fill="url(#badgeGrad)" opacity="0.7"/>

  <!-- ===== SUBTITLE ===== -->
  <text x="320" y="345"
        font-family="Arial, sans-serif"
        font-weight="400"
        font-size="28"
        fill="#C4B5FD"
        letter-spacing="0.5">Проверка сайта на соответствие законам РФ</text>

  <!-- ===== STATS ROW ===== -->
  <!-- Stat 1: 35+ проверок -->
  <g transform="translate(320, 400)">
    <rect width="210" height="64" rx="12" fill="#7C3AED" opacity="0.25" stroke="#7C3AED" stroke-width="1" stroke-opacity="0.5"/>
    <text x="20" y="28"
          font-family="Arial Black, Arial, sans-serif"
          font-weight="900"
          font-size="28"
          fill="#A78BFA">35+</text>
    <text x="20" y="50"
          font-family="Arial, sans-serif"
          font-size="16"
          fill="#E2D9FF"
          opacity="0.85">проверок</text>
  </g>

  <!-- Stat 2: 8 законов -->
  <g transform="translate(550, 400)">
    <rect width="210" height="64" rx="12" fill="#7C3AED" opacity="0.25" stroke="#7C3AED" stroke-width="1" stroke-opacity="0.5"/>
    <text x="20" y="28"
          font-family="Arial Black, Arial, sans-serif"
          font-weight="900"
          font-size="28"
          fill="#A78BFA">8</text>
    <text x="20" y="50"
          font-family="Arial, sans-serif"
          font-size="16"
          fill="#E2D9FF"
          opacity="0.85">законов РФ</text>
  </g>

  <!-- Stat 3: до 18 млн ₽ -->
  <g transform="translate(780, 400)">
    <rect width="240" height="64" rx="12" fill="#7C3AED" opacity="0.25" stroke="#7C3AED" stroke-width="1" stroke-opacity="0.5"/>
    <text x="20" y="28"
          font-family="Arial Black, Arial, sans-serif"
          font-weight="900"
          font-size="28"
          fill="#EC4899">18 млн ₽</text>
    <text x="20" y="50"
          font-family="Arial, sans-serif"
          font-size="16"
          fill="#E2D9FF"
          opacity="0.85">макс. штраф</text>
  </g>

  <!-- ===== FREE BADGE ===== -->
  <g transform="translate(320, 490)">
    <rect width="140" height="36" rx="18" fill="url(#badgeGrad)"/>
    <text x="70" y="24"
          font-family="Arial Black, Arial, sans-serif"
          font-weight="900"
          font-size="15"
          fill="white"
          text-anchor="middle"
          letter-spacing="1">БЕСПЛАТНО</text>
  </g>

  <!-- Domain -->
  <text x="480" y="519"
        font-family="Arial, sans-serif"
        font-weight="400"
        font-size="22"
        fill="#6C5CE7"
        opacity="0.9">shtrafometer.ru</text>

  <!-- ===== DECORATIVE RIGHT SIDE ===== -->
  <!-- Floating law tags -->
  <g opacity="0.5">
    <rect x="1000" y="340" width="130" height="34" rx="8" fill="#7C3AED" opacity="0.3" stroke="#A78BFA" stroke-width="0.8"/>
    <text x="1065" y="362" font-family="Arial, sans-serif" font-size="15" fill="#C4B5FD" text-anchor="middle">152-ФЗ</text>

    <rect x="1010" y="388" width="130" height="34" rx="8" fill="#7C3AED" opacity="0.3" stroke="#A78BFA" stroke-width="0.8"/>
    <text x="1075" y="410" font-family="Arial, sans-serif" font-size="15" fill="#C4B5FD" text-anchor="middle">38-ФЗ</text>

    <rect x="990" y="436" width="130" height="34" rx="8" fill="#7C3AED" opacity="0.3" stroke="#A78BFA" stroke-width="0.8"/>
    <text x="1055" y="458" font-family="Arial, sans-serif" font-size="15" fill="#C4B5FD" text-anchor="middle">54-ФЗ</text>

    <rect x="1005" y="484" width="130" height="34" rx="8" fill="#7C3AED" opacity="0.3" stroke="#A78BFA" stroke-width="0.8"/>
    <text x="1070" y="506" font-family="Arial, sans-serif" font-size="15" fill="#C4B5FD" text-anchor="middle">436-ФЗ</text>
  </g>

  <!-- Decorative dots pattern -->
  <g opacity="0.2">
    <circle cx="1140" cy="560" r="3" fill="#A78BFA"/>
    <circle cx="1160" cy="545" r="2" fill="#A78BFA"/>
    <circle cx="1150" cy="580" r="4" fill="#7C3AED"/>
    <circle cx="1170" cy="565" r="2" fill="#EC4899"/>
    <circle cx="1130" cy="575" r="3" fill="#A78BFA"/>
  </g>
</svg>`

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
})

const png = resvg.render().asPng()
const outputPath = join(__dirname, '../public/og-image.png')
writeFileSync(outputPath, png)
console.log(`✅ og-image.png создан: ${outputPath} (${(png.length / 1024).toFixed(1)} KB)`)
