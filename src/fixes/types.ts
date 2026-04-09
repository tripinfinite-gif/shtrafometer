export type { Fix, FixType, FixPlan, FixStatus } from '@/lib/types';

export interface GeneratorInput {
  violationId: string;
  siteUrl: string;
  companyName?: string;
  companyInn?: string;
  companyEmail?: string;
  /** Existing HTML of the page for context */
  pageHtml?: string;
}

export interface GeneratedFix {
  type: import('@/lib/types').FixType;
  title: string;
  description: string;
  code: string;
  targetPath: string;
  insertionPoint: string;
}
