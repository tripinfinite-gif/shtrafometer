import type { Violation } from './types';
import type { CmsType } from './mod-cms-detect';
import { CMS_MULTIPLIERS } from './mod-cms-detect';
import { getVolumeSurcharge } from './mod-page-count';

// ─── Fix Pricing ────────────────────────────────────────────────────

export interface FixLineItem {
  violationId: string;
  title: string;
  basePrice: number;
  finalPrice: number;
  type: 'auto' | 'semi-auto' | 'manual' | 'expert';
  typeLabel: string;
}

export interface FixEstimate {
  items: FixLineItem[];
  subtotal: number;
  cmsMultiplier: number;
  volumeSurcharge: number;
  total: number;
  discountedTotal: number; // 50% for returning clients
}

/**
 * Base prices by violation module/id pattern.
 * Maps violation ID prefixes to pricing.
 */
const FIX_PRICES: { match: (id: string) => boolean; price: number; type: FixLineItem['type']; label: string }[] = [
  // Auto-fixes (our engine handles these)
  { match: (id) => id === 'pd-01' || id === 'pd-02', price: 990, type: 'auto', label: 'Политика конфиденциальности' },
  { match: (id) => id === 'pd-03' || id === 'pd-04', price: 990, type: 'auto', label: 'Cookie-баннер' },
  { match: (id) => id === 'pd-06', price: 990, type: 'auto', label: 'Документ согласия на ПД' },
  { match: (id) => id === 'cnt-01' || id === 'cnt-02', price: 490, type: 'auto', label: 'Возрастная маркировка' },
  { match: (id) => id === 'cnt-03', price: 490, type: 'auto', label: 'Ссылки в футер' },

  // Semi-auto (auto-fix + manual tuning)
  { match: (id) => id === 'pd-05', price: 490, type: 'semi-auto', label: 'Согласие на форме (за форму)' },
  { match: (id) => id === 'ad-01' || id === 'ad-02' || id === 'ad-03', price: 990, type: 'semi-auto', label: 'Маркировка рекламы' },
  { match: (id) => id === 'pd-11', price: 990, type: 'semi-auto', label: 'Обновление политики ПД' },

  // Manual (specialist required)
  { match: (id) => id === 'loc-02', price: 2990, type: 'manual', label: 'Замена Google Analytics → Яндекс.Метрика' },
  { match: (id) => id === 'loc-03', price: 1990, type: 'manual', label: 'Удаление Google Tag Manager' },
  { match: (id) => id === 'loc-04', price: 2990, type: 'manual', label: 'Замена reCAPTCHA → Yandex SmartCaptcha' },
  { match: (id) => id === 'loc-05', price: 1990, type: 'manual', label: 'Замена Google Fonts → локальные' },
  { match: (id) => id === 'loc-06', price: 2990, type: 'manual', label: 'Замена Google Maps → Яндекс.Карты' },
  { match: (id) => id === 'loc-07', price: 1990, type: 'manual', label: 'Замена YouTube → превью-ссылки' },
  { match: (id) => id.startsWith('loc-'), price: 1990, type: 'manual', label: 'Замена зарубежного сервиса' },
  { match: (id) => id === 'con-01' || id === 'con-02', price: 1490, type: 'manual', label: 'Добавление реквизитов юрлица' },
  { match: (id) => id === 'sec-01', price: 1990, type: 'manual', label: 'Настройка HTTPS' },
  { match: (id) => id.startsWith('sec-') && id !== 'sec-01', price: 990, type: 'semi-auto', label: 'Удаление запрещённого контента' },

  // Expert (requires infrastructure changes)
  { match: (id) => id === 'loc-01', price: 29990, type: 'expert', label: 'Миграция хостинга в РФ' },
  { match: (id) => id.startsWith('lang-'), price: 14990, type: 'expert', label: 'Русификация интерфейса' },
  { match: (id) => id.startsWith('ecom-'), price: 4990, type: 'expert', label: 'Настройка ККТ/онлайн-кассы' },
];

const TYPE_LABELS: Record<FixLineItem['type'], string> = {
  'auto': 'Автоматически',
  'semi-auto': 'Автоматически + настройка',
  'manual': 'Специалист',
  'expert': 'Эксперт (согласование сроков)',
};

/**
 * Calculate fix estimate for violations.
 */
export function calculateFixEstimate(
  violations: Violation[],
  cmsType: CmsType,
  estimatedPages: number,
  formsWithPdCount: number,
): FixEstimate {
  const multiplier = CMS_MULTIPLIERS[cmsType] || 1.5;
  const volumeSurcharge = getVolumeSurcharge(estimatedPages);

  const items: FixLineItem[] = [];
  const processedIds = new Set<string>();

  for (const v of violations) {
    if (processedIds.has(v.id)) continue;
    processedIds.add(v.id);

    const pricing = FIX_PRICES.find(p => p.match(v.id));
    if (!pricing) continue;

    // For form consent: multiply by number of forms
    let basePrice = pricing.price;
    if (v.id === 'pd-05' && formsWithPdCount > 1) {
      basePrice = pricing.price * formsWithPdCount;
    }

    const finalPrice = Math.round(basePrice * multiplier);

    items.push({
      violationId: v.id,
      title: pricing.label,
      basePrice,
      finalPrice,
      type: pricing.type,
      typeLabel: TYPE_LABELS[pricing.type],
    });
  }

  // Sort: auto first, then semi-auto, manual, expert
  const typeOrder: Record<string, number> = { auto: 0, 'semi-auto': 1, manual: 2, expert: 3 };
  items.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  const subtotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
  const total = subtotal + volumeSurcharge;
  const discountedTotal = Math.round(total * 0.5);

  return {
    items,
    subtotal,
    cmsMultiplier: multiplier,
    volumeSurcharge,
    total,
    discountedTotal,
  };
}
