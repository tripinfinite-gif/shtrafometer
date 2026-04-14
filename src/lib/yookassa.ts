import { createHash } from 'crypto';
import type { ProductType } from './types';

// ─── Config ────────────────────────────────────────────────────────

const YOOKASSA_API = 'https://api.yookassa.ru/v3';

function getCredentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    throw new Error('YooKassa credentials not configured (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)');
  }
  return { shopId, secretKey };
}

// ─── Prices ────────────────────────────────────────────────────────

const PRODUCT_PRICES: Record<string, number> = {
  'report': 1990,
  'autofix-basic': 4990,
  'autofix-std': 9990,
  'autofix-prem': 14990,
  'monitoring': 490,
  'consulting': 15000,
};

const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  'report': 'PDF-отчёт: проверка сайта на соответствие законам РФ',
  'autofix-basic': 'Автоисправление нарушений — базовый пакет',
  'autofix-std': 'Автоисправление всех нарушений',
  'autofix-prem': 'Автоисправление + ручная проверка',
  'monitoring': 'Мониторинг сайта — подписка 1 мес',
  'consulting': 'Консалтинг по соответствию законодательству',
};

// ─── Create Payment ────────────────────────────────────────────────

export async function createPayment(opts: {
  orderId: string;
  productType: ProductType;
  email: string;
  phone?: string;
  returnUrl?: string;
}): Promise<{ paymentId: string; confirmationUrl: string }> {
  const { shopId, secretKey } = getCredentials();
  const price = PRODUCT_PRICES[opts.productType];

  if (!price) {
    throw new Error(`No price for product type: ${opts.productType}`);
  }

  const description = PRODUCT_DESCRIPTIONS[opts.productType] || 'Услуга Штрафометр';

  // Deterministic idempotency key based on orderId to prevent duplicate payments
  const idempotenceKey = createHash('sha256')
    .update(`payment:${opts.orderId}:${opts.productType}`)
    .digest('hex');

  const response = await fetch(`${YOOKASSA_API}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${shopId}:${secretKey}`),
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify({
      amount: {
        value: price.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: opts.returnUrl || `https://shtrafometer.ru/payment/success?order=${opts.orderId}`,
      },
      capture: true,
      description,
      metadata: {
        orderId: opts.orderId,
        productType: opts.productType,
      },
      receipt: {
        customer: opts.email
          ? { email: opts.email }
          : { phone: opts.phone },
        items: [
          {
            description,
            quantity: '1',
            amount: {
              value: price.toFixed(2),
              currency: 'RUB',
            },
            vat_code: 1,           // без НДС (УСН)
            payment_subject: 'service',
            payment_mode: 'full_payment',
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    console.error('[YOOKASSA] Payment creation failed:', status);
    throw new Error(`YooKassa API error: ${status}`);
  }

  const payment = await response.json();
  const confirmationUrl = payment.confirmation?.confirmation_url;

  if (!confirmationUrl) {
    throw new Error('No confirmation URL in YooKassa response');
  }

  return {
    paymentId: payment.id,
    confirmationUrl,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

export function getPaymentPrice(productType: string): number {
  return PRODUCT_PRICES[productType] || 0;
}
