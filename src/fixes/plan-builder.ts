import type { CheckResponse, Violation } from '@/checks/types';
import type { FixPlan, Fix, FixType } from '@/lib/types';
import type { GeneratorInput, GeneratedFix } from './types';

import { generate as generateCookieBanner } from './generators/fix-cookie-banner';
import { generate as generatePrivacyPolicy } from './generators/fix-privacy-policy';
import { generate as generateConsentCheckbox } from './generators/fix-consent-checkbox';
import { generate as generateConsentDocument } from './generators/fix-consent-document';
import { generate as generateFooterLinks } from './generators/fix-footer-links';
import { generate as generateAgeRating } from './generators/fix-age-rating';
import { generate as generateAdMarking } from './generators/fix-ad-marking';
import { generate as generateRemoveService } from './generators/fix-remove-service';

// ---------------------------------------------------------------------------
// Violation-ID → FixType mapping
// ---------------------------------------------------------------------------

/** Maps violation IDs (or prefixes) to fix generator types. */
const VIOLATION_FIX_MAP: Record<string, FixType> = {
  // Personal data module
  'pd-01': 'privacy-policy',      // No privacy policy
  'pd-02': 'privacy-policy',      // Privacy policy incomplete
  'pd-03': 'consent-checkbox',    // No consent on forms
  'pd-04': 'consent-checkbox',    // Consent checkbox not required
  'pd-05': 'cookie-banner',       // No cookie banner / cookie consent
  'pd-06': 'consent-document',    // No separate consent document
  'pd-07': 'footer-links',        // Missing links in footer
  'pd-08': 'consent-document',    // Consent document incomplete
  'pd-09': 'cookie-banner',       // Cookie usage without notice

  // Localization module — foreign services
  'loc-02': 'remove-service',     // Google Fonts
  'loc-03': 'remove-service',     // Google Analytics
  'loc-04': 'remove-service',     // Google reCAPTCHA
  'loc-05': 'remove-service',     // Google Maps
  'loc-06': 'remove-service',     // YouTube embed
  'loc-07': 'remove-service',     // Other foreign CDN
  'loc-08': 'remove-service',
  'loc-09': 'remove-service',
  'loc-10': 'remove-service',
  'loc-11': 'remove-service',

  // Advertising module
  'adv-01': 'ad-marking',         // Ad without marking
  'adv-02': 'ad-marking',         // Missing ERID
  'ad-03':  'ad-marking',         // Missing advertiser info
  'ad-05':  'ad-marking',
  'ad-06':  'ad-marking',

  // Content module — age rating
  'cnt-01': 'age-rating',
  'cnt-02': 'age-rating',
};

// ---------------------------------------------------------------------------
// Generator registry
// ---------------------------------------------------------------------------

const GENERATORS: Record<FixType, (input: GeneratorInput) => GeneratedFix> = {
  'cookie-banner': generateCookieBanner,
  'privacy-policy': generatePrivacyPolicy,
  'consent-checkbox': generateConsentCheckbox,
  'consent-document': generateConsentDocument,
  'footer-links': generateFooterLinks,
  'age-rating': generateAgeRating,
  'ad-marking': generateAdMarking,
  'remove-service': generateRemoveService,
};

// Priority order — lower index = higher priority
const PRIORITY: FixType[] = [
  'privacy-policy',
  'consent-document',
  'cookie-banner',
  'consent-checkbox',
  'footer-links',
  'ad-marking',
  'age-rating',
  'remove-service',
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildFixPlan(
  checkResult: CheckResponse,
  options: GeneratorInput,
): FixPlan {
  // Deduplicate: only generate one fix per FixType
  const neededTypes = new Map<FixType, Violation>();

  for (const violation of checkResult.violations) {
    const fixType = VIOLATION_FIX_MAP[violation.id];
    if (!fixType) continue; // no automated fix for this violation
    if (neededTypes.has(fixType)) continue; // already queued
    neededTypes.set(fixType, violation);
  }

  // Generate fixes in priority order
  const fixes: Fix[] = [];

  for (const fixType of PRIORITY) {
    const violation = neededTypes.get(fixType);
    if (!violation) continue;

    const generator = GENERATORS[fixType];
    const input: GeneratorInput = {
      ...options,
      violationId: violation.id,
    };

    const generated = generator(input);

    const fix: Fix = {
      id: `fix-${fixType}-${violation.id}`,
      type: generated.type,
      violationId: violation.id,
      title: generated.title,
      description: generated.description,
      code: generated.code,
      targetPath: generated.targetPath,
      insertionPoint: generated.insertionPoint,
      status: 'pending',
    };

    fixes.push(fix);
  }

  return {
    orderId: '', // to be filled by the caller
    createdAt: new Date().toISOString(),
    fixes,
  };
}
