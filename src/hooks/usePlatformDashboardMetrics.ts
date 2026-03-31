import { useMemo } from 'react';
import { usePlatformData } from '@/contexts/PlatformDataContext';

export interface DistributionEntry {
  name: string;
  count: number;
}

export interface PlatformDashboardMetrics {
  totalInstances: number;
  serviceTypeDist: DistributionEntry[];
  categoryDist: DistributionEntry[];
  locationDist: DistributionEntry[];
  stateDist: DistributionEntry[];
  resourceGroupDist: DistributionEntry[];
}

function buildDistribution(items: Record<string, unknown>[], field: string): DistributionEntry[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const val = String(item[field] ?? 'Unknown');
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function usePlatformDashboardMetrics(): PlatformDashboardMetrics {
  const { platformCollectedData } = usePlatformData();

  return useMemo(() => {
    const instances = (platformCollectedData.serviceInstances ?? []) as Record<string, unknown>[];

    return {
      totalInstances: instances.length,
      serviceTypeDist: buildDistribution(instances, '_serviceType'),
      categoryDist: buildDistribution(instances, '_serviceCategory'),
      locationDist: buildDistribution(instances, 'location'),
      stateDist: buildDistribution(instances, 'state'),
      resourceGroupDist: buildDistribution(instances, '_resourceGroupName'),
    };
  }, [platformCollectedData]);
}
