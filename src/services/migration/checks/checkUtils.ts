import type { CheckSeverity, PreRequisiteCheck, CheckResult, AffectedResource } from '@/types/migration';

/**
 * Safely extract a numeric field from an unknown record.
 */
export function num(obj: Record<string, unknown>, key: string, fallback = 0): number {
  const v = obj[key];
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/**
 * Safely extract a string field.
 */
export function str(obj: Record<string, unknown>, key: string, fallback = ''): string {
  const v = obj[key];
  return typeof v === 'string' ? v : fallback;
}

/**
 * Safely extract a nested field using dot-path notation (e.g. "a.b.c").
 */
export function field(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Build a CheckResult from a pre-requisite check definition and affected resources.
 */
export function evaluateCheck(
  check: PreRequisiteCheck,
  severity: CheckSeverity,
  totalChecked: number,
  affectedResources: AffectedResource[],
): CheckResult {
  return {
    check,
    severity: affectedResources.length > 0 ? severity : 'passed',
    affectedCount: affectedResources.length,
    totalChecked,
    affectedResources,
  };
}

/**
 * Build a CheckResult for an "unknown" status check (cannot be determined from API data).
 */
export function unknownCheck(
  check: PreRequisiteCheck,
  totalChecked: number,
): CheckResult {
  return {
    check,
    severity: 'unknown',
    affectedCount: 0,
    totalChecked,
    affectedResources: [],
  };
}
