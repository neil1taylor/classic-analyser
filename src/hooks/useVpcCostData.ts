import { useMemo } from 'react';
import { useVpcData } from '@/contexts/VpcDataContext';

export interface VpcCostSummary {
  totalInstances: number;
  totalVolumes: number;
  totalVolumeCapacityGb: number;
  byRegion: Record<string, { instances: number; volumes: number }>;
}

function getField(item: unknown, field: string): unknown {
  return (item as Record<string, unknown>)[field];
}

export function useVpcCostData(): VpcCostSummary {
  const { vpcCollectedData } = useVpcData();

  return useMemo(() => {
    const instances = vpcCollectedData['vpcInstances'] ?? [];
    const volumes = vpcCollectedData['vpcVolumes'] ?? [];

    let totalVolumeCapacityGb = 0;
    for (const vol of volumes) {
      const cap = Number(getField(vol, 'capacity') ?? 0);
      totalVolumeCapacityGb += cap;
    }

    const byRegion: Record<string, { instances: number; volumes: number }> = {};
    for (const inst of instances) {
      const region = String(getField(inst, 'region') ?? 'unknown');
      if (!byRegion[region]) byRegion[region] = { instances: 0, volumes: 0 };
      byRegion[region].instances++;
    }
    for (const vol of volumes) {
      const region = String(getField(vol, 'region') ?? 'unknown');
      if (!byRegion[region]) byRegion[region] = { instances: 0, volumes: 0 };
      byRegion[region].volumes++;
    }

    return {
      totalInstances: instances.length,
      totalVolumes: volumes.length,
      totalVolumeCapacityGb,
      byRegion,
    };
  }, [vpcCollectedData]);
}
