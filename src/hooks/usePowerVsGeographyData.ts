import { useMemo } from 'react';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';

export interface PvsZoneData {
  zone: string;
  instanceCount: number;
  workspaceCount: number;
  networkCount: number;
  volumeCount: number;
  totalResources: number;
  lat: number;
  lng: number;
}

// IBM Cloud PowerVS zone coordinates
const ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  // US
  'dal10': { lat: 32.78, lng: -96.80 },
  'dal12': { lat: 32.78, lng: -96.80 },
  'dal13': { lat: 32.78, lng: -96.80 },
  'us-south': { lat: 32.78, lng: -96.80 },
  'wdc04': { lat: 38.95, lng: -77.45 },
  'wdc06': { lat: 38.95, lng: -77.45 },
  'wdc07': { lat: 38.95, lng: -77.45 },
  'us-east': { lat: 38.95, lng: -77.45 },
  // Europe
  'lon04': { lat: 51.51, lng: -0.13 },
  'lon06': { lat: 51.51, lng: -0.13 },
  'eu-gb': { lat: 51.51, lng: -0.13 },
  'fra04': { lat: 50.11, lng: 8.68 },
  'fra05': { lat: 50.11, lng: 8.68 },
  'eu-de': { lat: 50.11, lng: 8.68 },
  'mad02': { lat: 40.42, lng: -3.70 },
  'mad04': { lat: 40.42, lng: -3.70 },
  // Asia Pacific
  'tok04': { lat: 35.68, lng: 139.77 },
  'osa21': { lat: 34.69, lng: 135.50 },
  'syd04': { lat: -33.87, lng: 151.21 },
  'syd05': { lat: -33.87, lng: 151.21 },
  // Canada
  'tor01': { lat: 43.65, lng: -79.38 },
  'mon01': { lat: 45.50, lng: -73.57 },
  // South America
  'sao01': { lat: -23.55, lng: -46.63 },
  'sao04': { lat: -23.55, lng: -46.63 },
};

function getField(item: unknown, field: string): unknown {
  return (item as Record<string, unknown>)[field];
}

export function usePowerVsGeographyData(): PvsZoneData[] {
  const { pvsCollectedData } = usePowerVsData();

  return useMemo(() => {
    const zoneMap: Record<string, PvsZoneData> = {};

    function ensureZone(zone: string): PvsZoneData {
      if (!zoneMap[zone]) {
        const coords = ZONE_COORDS[zone] ?? { lat: 0, lng: 0 };
        zoneMap[zone] = {
          zone,
          instanceCount: 0,
          workspaceCount: 0,
          networkCount: 0,
          volumeCount: 0,
          totalResources: 0,
          ...coords,
        };
      }
      return zoneMap[zone];
    }

    for (const inst of (pvsCollectedData['pvsInstances'] ?? [])) {
      const z = ensureZone(String(getField(inst, 'zone') ?? 'unknown'));
      z.instanceCount++;
      z.totalResources++;
    }

    for (const ws of (pvsCollectedData['pvsWorkspaces'] ?? [])) {
      const z = ensureZone(String(getField(ws, 'zone') ?? 'unknown'));
      z.workspaceCount++;
      z.totalResources++;
    }

    for (const net of (pvsCollectedData['pvsNetworks'] ?? [])) {
      const z = ensureZone(String(getField(net, 'zone') ?? 'unknown'));
      z.networkCount++;
      z.totalResources++;
    }

    for (const vol of (pvsCollectedData['pvsVolumes'] ?? [])) {
      const z = ensureZone(String(getField(vol, 'zone') ?? 'unknown'));
      z.volumeCount++;
      z.totalResources++;
    }

    return Object.values(zoneMap).sort((a, b) => b.totalResources - a.totalResources);
  }, [pvsCollectedData]);
}
