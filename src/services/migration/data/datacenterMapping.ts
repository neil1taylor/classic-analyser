import type { DatacenterMapping } from '@/types/migration';

export const DATACENTER_MAPPINGS: DatacenterMapping[] = [
  { classicDCs: ['dal09', 'dal10', 'dal12', 'dal13'], vpcRegion: 'us-south', vpcZones: ['us-south-1', 'us-south-2', 'us-south-3'], available: true },
  { classicDCs: ['wdc04', 'wdc06', 'wdc07'], vpcRegion: 'us-east', vpcZones: ['us-east-1', 'us-east-2', 'us-east-3'], available: true },
  { classicDCs: ['lon02', 'lon04', 'lon05', 'lon06'], vpcRegion: 'eu-gb', vpcZones: ['eu-gb-1', 'eu-gb-2', 'eu-gb-3'], available: true },
  { classicDCs: ['fra02', 'fra04', 'fra05'], vpcRegion: 'eu-de', vpcZones: ['eu-de-1', 'eu-de-2', 'eu-de-3'], available: true },
  { classicDCs: ['tok02', 'tok04', 'tok05'], vpcRegion: 'jp-tok', vpcZones: ['jp-tok-1', 'jp-tok-2', 'jp-tok-3'], available: true },
  { classicDCs: ['syd01', 'syd04', 'syd05'], vpcRegion: 'au-syd', vpcZones: ['au-syd-1', 'au-syd-2', 'au-syd-3'], available: true },
  { classicDCs: ['che01'], vpcRegion: 'in-che', vpcZones: [], available: false, notes: 'No VPC availability — migration to another region required' },
  { classicDCs: ['sao01'], vpcRegion: 'br-sao', vpcZones: ['br-sao-1', 'br-sao-2', 'br-sao-3'], available: true },
];

export function mapDatacenterToVPC(classicDC: string): DatacenterMapping | null {
  const dcLower = classicDC.toLowerCase();
  return DATACENTER_MAPPINGS.find((m) => m.classicDCs.some((dc) => dcLower.startsWith(dc))) ?? null;
}

export function getVPCZone(classicDC: string, zoneIndex: number = 0): string | null {
  const mapping = mapDatacenterToVPC(classicDC);
  if (!mapping || !mapping.available) return null;
  return mapping.vpcZones[zoneIndex % mapping.vpcZones.length] ?? null;
}

export const VPC_REGIONS = DATACENTER_MAPPINGS.filter((m) => m.available).map((m) => ({
  value: m.vpcRegion,
  label: m.vpcRegion,
}));
