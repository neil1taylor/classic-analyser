import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';

function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

function num(item: unknown, key: string): number {
  return Number((item as Record<string, unknown>)[key] ?? 0);
}

// IBM Cloud datacenter coordinates (approximate)
const DC_COORDINATES: Record<string, { lat: number; lng: number; city: string; country: string }> = {
  dal01: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  dal02: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  dal05: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  dal06: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  dal07: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  dal09: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  dal10: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  dal12: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  dal13: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  dal14: { lat: 32.78, lng: -96.80, city: 'Dallas', country: 'US' },
  hou02: { lat: 29.76, lng: -95.37, city: 'Houston', country: 'US' },
  wdc01: { lat: 38.91, lng: -77.04, city: 'Washington DC', country: 'US' },
  wdc04: { lat: 38.91, lng: -77.04, city: 'Washington DC', country: 'US' },
  wdc06: { lat: 38.91, lng: -77.04, city: 'Washington DC', country: 'US' },
  wdc07: { lat: 38.91, lng: -77.04, city: 'Washington DC', country: 'US' },
  sjc01: { lat: 37.34, lng: -121.89, city: 'San Jose', country: 'US' },
  sjc03: { lat: 37.34, lng: -121.89, city: 'San Jose', country: 'US' },
  sjc04: { lat: 37.34, lng: -121.89, city: 'San Jose', country: 'US' },
  sea01: { lat: 47.61, lng: -122.33, city: 'Seattle', country: 'US' },
  mon01: { lat: 45.50, lng: -73.57, city: 'Montreal', country: 'CA' },
  tor01: { lat: 43.65, lng: -79.38, city: 'Toronto', country: 'CA' },
  tor04: { lat: 43.65, lng: -79.38, city: 'Toronto', country: 'CA' },
  tor05: { lat: 43.65, lng: -79.38, city: 'Toronto', country: 'CA' },
  lon02: { lat: 51.51, lng: -0.13, city: 'London', country: 'GB' },
  lon04: { lat: 51.51, lng: -0.13, city: 'London', country: 'GB' },
  lon05: { lat: 51.51, lng: -0.13, city: 'London', country: 'GB' },
  lon06: { lat: 51.51, lng: -0.13, city: 'London', country: 'GB' },
  ams01: { lat: 52.37, lng: 4.90, city: 'Amsterdam', country: 'NL' },
  ams03: { lat: 52.37, lng: 4.90, city: 'Amsterdam', country: 'NL' },
  par01: { lat: 48.86, lng: 2.35, city: 'Paris', country: 'FR' },
  fra02: { lat: 50.11, lng: 8.68, city: 'Frankfurt', country: 'DE' },
  fra04: { lat: 50.11, lng: 8.68, city: 'Frankfurt', country: 'DE' },
  fra05: { lat: 50.11, lng: 8.68, city: 'Frankfurt', country: 'DE' },
  mil01: { lat: 45.46, lng: 9.19, city: 'Milan', country: 'IT' },
  mad02: { lat: 40.42, lng: -3.70, city: 'Madrid', country: 'ES' },
  mad04: { lat: 40.42, lng: -3.70, city: 'Madrid', country: 'ES' },
  mad05: { lat: 40.42, lng: -3.70, city: 'Madrid', country: 'ES' },
  osl01: { lat: 59.91, lng: 10.75, city: 'Oslo', country: 'NO' },
  sao01: { lat: -23.55, lng: -46.63, city: 'São Paulo', country: 'BR' },
  sao04: { lat: -23.55, lng: -46.63, city: 'São Paulo', country: 'BR' },
  sao05: { lat: -23.55, lng: -46.63, city: 'São Paulo', country: 'BR' },
  tok02: { lat: 35.69, lng: 139.69, city: 'Tokyo', country: 'JP' },
  tok04: { lat: 35.69, lng: 139.69, city: 'Tokyo', country: 'JP' },
  tok05: { lat: 35.69, lng: 139.69, city: 'Tokyo', country: 'JP' },
  osa21: { lat: 34.69, lng: 135.50, city: 'Osaka', country: 'JP' },
  osa22: { lat: 34.69, lng: 135.50, city: 'Osaka', country: 'JP' },
  osa23: { lat: 34.69, lng: 135.50, city: 'Osaka', country: 'JP' },
  syd01: { lat: -33.87, lng: 151.21, city: 'Sydney', country: 'AU' },
  syd04: { lat: -33.87, lng: 151.21, city: 'Sydney', country: 'AU' },
  syd05: { lat: -33.87, lng: 151.21, city: 'Sydney', country: 'AU' },
  mel01: { lat: -37.81, lng: 144.96, city: 'Melbourne', country: 'AU' },
  sng01: { lat: 1.35, lng: 103.82, city: 'Singapore', country: 'SG' },
  che01: { lat: 13.08, lng: 80.27, city: 'Chennai', country: 'IN' },
  hkg02: { lat: 22.30, lng: 114.17, city: 'Hong Kong', country: 'HK' },
  seo01: { lat: 37.57, lng: 126.98, city: 'Seoul', country: 'KR' },
};

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
