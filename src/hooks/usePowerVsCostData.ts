import { useMemo } from 'react';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';

export interface PvsCostSummary {
  totalInstances: number;
  totalVolumes: number;
  totalVolumeCapacityGb: number;
  totalProcessors: number;
  totalMemoryGb: number;
  byZone: Record<string, { instances: number; volumes: number; processors: number; memoryGb: number }>;
}

function getField(item: unknown, field: string): unknown {
  return (item as Record<string, unknown>)[field];
}

export function usePowerVsCostData(): PvsCostSummary {
  const { pvsCollectedData } = usePowerVsData();

  return useMemo(() => {
    const instances = pvsCollectedData['pvsInstances'] ?? [];
    const volumes = pvsCollectedData['pvsVolumes'] ?? [];

    let totalVolumeCapacityGb = 0;
    for (const vol of volumes) {
      totalVolumeCapacityGb += Number(getField(vol, 'size') ?? 0);
    }

    let totalProcessors = 0;
    let totalMemoryGb = 0;
    for (const inst of instances) {
      totalProcessors += Number(getField(inst, 'processors') ?? 0);
      totalMemoryGb += Number(getField(inst, 'memory') ?? 0);
    }

    const byZone: Record<string, { instances: number; volumes: number; processors: number; memoryGb: number }> = {};
    for (const inst of instances) {
      const zone = String(getField(inst, 'zone') ?? 'unknown');
      if (!byZone[zone]) byZone[zone] = { instances: 0, volumes: 0, processors: 0, memoryGb: 0 };
      byZone[zone].instances++;
      byZone[zone].processors += Number(getField(inst, 'processors') ?? 0);
      byZone[zone].memoryGb += Number(getField(inst, 'memory') ?? 0);
    }
    for (const vol of volumes) {
      const zone = String(getField(vol, 'zone') ?? 'unknown');
      if (!byZone[zone]) byZone[zone] = { instances: 0, volumes: 0, processors: 0, memoryGb: 0 };
      byZone[zone].volumes++;
    }

    return {
      totalInstances: instances.length,
      totalVolumes: volumes.length,
      totalVolumeCapacityGb,
      totalProcessors,
      totalMemoryGb,
      byZone,
    };
  }, [pvsCollectedData]);
}
