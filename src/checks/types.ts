export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type SiteType = 'ecommerce' | 'service' | 'informational' | 'unknown';

export interface Violation {
  id: string;
  module: string;
  law: string;
  article: string;
  severity: Severity;
  title: string;
  description: string;
  minFine: number;
  maxFine: number;
  details: string[];
  recommendation: string;
  reference?: string;
}

export interface Warning {
  id: string;
  title: string;
  description: string;
  law: string;
  article: string;
  potentialFine: string;
  recommendation: string;
}

export interface PassedCheck {
  id: string;
  title: string;
  module: string;
}

export interface CheckResult {
  violations: Violation[];
  warnings: Warning[];
  passed: PassedCheck[];
}

export interface CheckResponse {
  url: string;
  checkedAt: string;
  siteType: SiteType;
  riskLevel: RiskLevel;
  totalMinFine: number;
  totalMaxFine: number;
  violations: Violation[];
  warnings: Warning[];
  passed: PassedCheck[];
  stats: {
    totalChecks: number;
    violations: number;
    warnings: number;
    passed: number;
  };
  finesByLaw: Record<string, { min: number; max: number; count: number }>;
}

export interface FineRecord {
  id: string;
  article: string;
  law: string;
  description: string;
  citizens: { min: number; max: number } | null;
  officials: { min: number; max: number } | null;
  ip: { min: number; max: number } | null;
  legal: { min: number; max: number } | null;
  repeat?: { min: number; max: number } | null;
}
