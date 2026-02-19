import type { StorageTierMapping } from '@/types/migration';

export const STORAGE_TIER_MAPPINGS: StorageTierMapping[] = [
  {
    classicTier: '0.25 IOPS/GB',
    classicIOPS: '250 per 1TB',
    vpcProfile: 'general-purpose',
    vpcIOPS: '3000 base (3 IOPS/GB)',
    notes: 'VPC general-purpose provides significantly better baseline performance',
  },
  {
    classicTier: '2 IOPS/GB',
    classicIOPS: '2000 per 1TB',
    vpcProfile: '5iops-tier',
    vpcIOPS: '5000 per 1TB',
    notes: 'VPC 5 IOPS/GB tier provides more headroom',
  },
  {
    classicTier: '4 IOPS/GB',
    classicIOPS: '4000 per 1TB',
    vpcProfile: '10iops-tier',
    vpcIOPS: '10000 per 1TB',
    notes: 'VPC 10 IOPS/GB tier exceeds Classic 4 IOPS/GB',
  },
  {
    classicTier: '10 IOPS/GB',
    classicIOPS: '10000 per 1TB',
    vpcProfile: '10iops-tier',
    vpcIOPS: '10000 per 1TB',
    notes: 'Equivalent performance tier',
  },
  {
    classicTier: 'Custom IOPS',
    classicIOPS: 'Variable',
    vpcProfile: 'custom',
    vpcIOPS: 'Up to 48000',
    notes: 'Map to VPC custom IOPS profile — may need adjustment',
  },
];

export function mapStorageTier(tierLevel: string, iops: number): StorageTierMapping {
  const tierLower = (tierLevel || '').toLowerCase();

  if (tierLower.includes('0.25') || iops <= 500) return STORAGE_TIER_MAPPINGS[0];
  if (tierLower.includes('2') || (iops > 500 && iops <= 3000)) return STORAGE_TIER_MAPPINGS[1];
  if (tierLower.includes('4') || (iops > 3000 && iops <= 6000)) return STORAGE_TIER_MAPPINGS[2];
  if (tierLower.includes('10') || (iops > 6000 && iops <= 10000)) return STORAGE_TIER_MAPPINGS[3];
  return STORAGE_TIER_MAPPINGS[4]; // Custom
}
