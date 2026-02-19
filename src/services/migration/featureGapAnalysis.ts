import type { FeatureGap, MigrationPreferences } from '@/types/migration';
import { FEATURE_GAP_DEFINITIONS } from './data/featureGaps';
import { mapDatacenterToVPC } from './data/datacenterMapping';

function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

export function analyzeFeatureGaps(
  collectedData: Record<string, unknown[]>,
  _preferences: MigrationPreferences,
): FeatureGap[] {
  const gaps: FeatureGap[] = [];

  for (const def of FEATURE_GAP_DEFINITIONS) {
    let detected = false;
    let affectedResources = 0;

    if (def.detectionKey) {
      const items = collectedData[def.detectionKey] ?? [];
      if (items.length > 0) {
        detected = true;
        affectedResources = items.length;
      }
    }

    // Special case: legacy DC detection
    if (def.classicFeature.includes('Legacy Datacenters')) {
      const allDCs = new Set<string>();
      for (const key of Object.keys(collectedData)) {
        for (const item of collectedData[key]) {
          const dc = str(item, 'datacenter');
          if (dc) allDCs.add(dc);
        }
      }
      const unsupportedDCs = [...allDCs].filter((dc) => {
        const mapping = mapDatacenterToVPC(dc);
        return mapping && !mapping.available;
      });
      if (unsupportedDCs.length > 0) {
        detected = true;
        affectedResources = unsupportedDCs.length;
      }
    }

    gaps.push({
      feature: def.classicFeature,
      severity: def.severity,
      detected,
      affectedResources,
      workaround: def.workaround,
      notes: detected
        ? `Detected ${affectedResources} resource(s) using this Classic feature`
        : 'Not detected in current environment',
    });
  }

  return gaps;
}
