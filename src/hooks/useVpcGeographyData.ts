import { useMemo } from 'react';
import { useVpcData } from '@/contexts/VpcDataContext';

export interface VpcRegionData {
  region: string;
  instanceCount: number;
  vpcCount: number;
  subnetCount: number;
  volumeCount: number;
  totalResources: number;
  lat: number;
  lng: number;
}

// IBM Cloud VPC region coordinates
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'us-south': { lat: 32.78, lng: -96.80 },   // Dallas
  'us-east': { lat: 38.95, lng: -77.45 },     // Washington DC
  'eu-gb': { lat: 51.51, lng: -0.13 },        // London
  'eu-de': { lat: 50.11, lng: 8.68 },         // Frankfurt
  'eu-es': { lat: 40.42, lng: -3.70 },        // Madrid
  'jp-tok': { lat: 35.68, lng: 139.77 },      // Tokyo
  'jp-osa': { lat: 34.69, lng: 135.50 },      // Osaka
  'au-syd': { lat: -33.87, lng: 151.21 },     // Sydney
  'ca-tor': { lat: 43.65, lng: -79.38 },      // Toronto
  'br-sao': { lat: -23.55, lng: -46.63 },     // São Paulo
};

function getField(item: unknown, field: string): unknown {
  return (item as Record<string, unknown>)[field];
}

export function useVpcGeographyData(): VpcRegionData[] {
  const { vpcCollectedData } = useVpcData();

  return useMemo(() => {
    const regionMap: Record<string, VpcRegionData> = {};

    function ensureRegion(region: string): VpcRegionData {
      if (!regionMap[region]) {
        const coords = REGION_COORDS[region] ?? { lat: 0, lng: 0 };
        regionMap[region] = {
          region,
          instanceCount: 0,
          vpcCount: 0,
          subnetCount: 0,
          volumeCount: 0,
          totalResources: 0,
          ...coords,
        };
      }
      return regionMap[region];
    }

    for (const inst of (vpcCollectedData['vpcInstances'] ?? [])) {
      const r = ensureRegion(String(getField(inst, 'region') ?? 'unknown'));
      r.instanceCount++;
      r.totalResources++;
    }

    for (const vpc of (vpcCollectedData['vpcs'] ?? [])) {
      const r = ensureRegion(String(getField(vpc, 'region') ?? 'unknown'));
      r.vpcCount++;
      r.totalResources++;
    }

    for (const subnet of (vpcCollectedData['vpcSubnets'] ?? [])) {
      const r = ensureRegion(String(getField(subnet, 'region') ?? 'unknown'));
      r.subnetCount++;
      r.totalResources++;
    }

    for (const vol of (vpcCollectedData['vpcVolumes'] ?? [])) {
      const r = ensureRegion(String(getField(vol, 'region') ?? 'unknown'));
      r.volumeCount++;
      r.totalResources++;
    }

    return Object.values(regionMap).sort((a, b) => b.totalResources - a.totalResources);
  }, [vpcCollectedData]);
}
