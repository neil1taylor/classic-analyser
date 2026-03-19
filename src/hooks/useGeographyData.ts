import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { ibmCloudDataCenters } from '@/data';
import type { DataCenterMap } from '@/data';

function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

function num(item: unknown, key: string): number {
  return Number((item as Record<string, unknown>)[key] ?? 0);
}

const DC_COORDINATES: DataCenterMap = ibmCloudDataCenters;

export interface DCMarker {
  dc: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  serverCount: number;
  totalCost: number;
  resources: Record<string, number>;
}

export function useGeographyData() {
  const { collectedData } = useData();

  return useMemo(() => {
    const markers: DCMarker[] = [];
    const dcAggregates = new Map<string, { servers: number; cost: number; resources: Record<string, number> }>();

    const resourceTypes = ['virtualServers', 'bareMetal', 'blockStorage', 'fileStorage', 'vlans', 'subnets'];

    for (const resourceKey of resourceTypes) {
      const items = collectedData[resourceKey] ?? [];
      for (const item of items) {
        const dc = str(item, 'datacenter');
        if (!dc) continue;

        if (!dcAggregates.has(dc)) {
          dcAggregates.set(dc, { servers: 0, cost: 0, resources: {} });
        }
        const agg = dcAggregates.get(dc)!;

        const isCompute = resourceKey === 'virtualServers' || resourceKey === 'bareMetal';
        if (isCompute) agg.servers += 1;
        agg.cost += num(item, 'recurringFee');
        agg.resources[resourceKey] = (agg.resources[resourceKey] ?? 0) + 1;
      }
    }

    for (const [dc, agg] of dcAggregates.entries()) {
      const coords = DC_COORDINATES[dc];
      if (coords) {
        markers.push({
          dc,
          lat: coords.lat,
          lng: coords.lng,
          city: coords.city,
          country: coords.country,
          serverCount: agg.servers,
          totalCost: Math.round(agg.cost * 100) / 100,
          resources: agg.resources,
        });
      } else {
        // Unknown DC — place at 0,0 with label
        markers.push({
          dc,
          lat: 0,
          lng: 0,
          city: dc,
          country: '??',
          serverCount: agg.servers,
          totalCost: Math.round(agg.cost * 100) / 100,
          resources: agg.resources,
        });
      }
    }

    return { markers };
  }, [collectedData]);
}
