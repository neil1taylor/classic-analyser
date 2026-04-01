import type { StorageTierMapping } from '@/types/migration';

// ── Gen 1 Tiered Profiles ────────────────────────────────────────────────

export const STORAGE_TIER_MAPPINGS: StorageTierMapping[] = [
  {
    classicTier: '0.25 IOPS/GB',
    classicIOPS: '250 per 1TB',
    vpcProfile: 'general-purpose',
    vpcIOPS: '3000 base (3 IOPS/GB)',
    generation: 1,
    notes: 'VPC general-purpose provides significantly better baseline performance',
  },
  {
    classicTier: '2 IOPS/GB',
    classicIOPS: '2000 per 1TB',
    vpcProfile: '5iops-tier',
    vpcIOPS: '5000 per 1TB',
    generation: 1,
    notes: 'VPC 5 IOPS/GB tier provides more headroom',
  },
  {
    classicTier: '4 IOPS/GB',
    classicIOPS: '4000 per 1TB',
    vpcProfile: '10iops-tier',
    vpcIOPS: '10000 per 1TB',
    generation: 1,
    notes: 'VPC 10 IOPS/GB tier exceeds Classic 4 IOPS/GB',
  },
  {
    classicTier: '10 IOPS/GB',
    classicIOPS: '10000 per 1TB',
    vpcProfile: '10iops-tier',
    vpcIOPS: '10000 per 1TB',
    generation: 1,
    notes: 'Equivalent performance tier',
  },
  {
    classicTier: 'Custom IOPS',
    classicIOPS: 'Variable',
    vpcProfile: 'custom',
    vpcIOPS: 'Up to 48000',
    generation: 1,
    notes: 'Map to VPC custom IOPS profile — may need adjustment',
  },
];

// ── Gen 2 SDP Profile ────────────────────────────────────────────────────

export const SDP_PROFILE: StorageTierMapping = {
  classicTier: 'Any',
  classicIOPS: 'Any',
  vpcProfile: 'sdp',
  vpcIOPS: 'Up to 64000 (20–3000 IOPS/GB)',
  generation: 2,
  notes: 'Gen 2 defined-performance profile — set IOPS to match or exceed Classic source',
  limitations: [
    'Cannot be used for boot volumes (GPT/UEFI detection issue)',
    'No consistency group snapshots (individual snapshots only)',
    'Not available in all regions',
  ],
};

/** Regions where the sdp profile is available (VPC region identifiers). */
export const SDP_SUPPORTED_REGIONS: string[] = [
  'us-south',   // Dallas
  'us-east',    // Washington DC
  'eu-de',      // Frankfurt
  'eu-gb',      // London
  'eu-es',      // Madrid
  'jp-osa',     // Osaka
  'br-sao',     // São Paulo
  'au-syd',     // Sydney
  'jp-tok',     // Tokyo
  'ca-tor',     // Toronto
];

export function isSdpAvailable(targetRegion: string): boolean {
  return SDP_SUPPORTED_REGIONS.includes(targetRegion);
}

// ── Mapping Context ──────────────────────────────────────────────────────

export interface StorageTierContext {
  targetRegion: string;
  needsConsistencyGroup: boolean;
}

export interface StorageTierResult {
  primary: StorageTierMapping;
  fallback?: StorageTierMapping;
}

/** Map a Classic storage tier to VPC profile(s), considering sdp eligibility. */
export function mapStorageTier(
  tierLevel: string,
  iops: number,
  context?: StorageTierContext,
): StorageTierResult {
  const gen1 = mapGen1Tier(tierLevel, iops);

  if (!context) return { primary: gen1 };

  const sdpEligible = isSdpAvailable(context.targetRegion) && !context.needsConsistencyGroup;

  if (sdpEligible) {
    return { primary: SDP_PROFILE, fallback: gen1 };
  }
  return { primary: gen1 };
}

function mapGen1Tier(tierLevel: string, iops: number): StorageTierMapping {
  const tierLower = (tierLevel || '').toLowerCase();

  if (tierLower.includes('0.25') || iops <= 500) return STORAGE_TIER_MAPPINGS[0];
  if (tierLower.includes('2') || (iops > 500 && iops <= 3000)) return STORAGE_TIER_MAPPINGS[1];
  if (tierLower.includes('4') || (iops > 3000 && iops <= 6000)) return STORAGE_TIER_MAPPINGS[2];
  if (tierLower.includes('10') || (iops > 6000 && iops <= 10000)) return STORAGE_TIER_MAPPINGS[3];
  return STORAGE_TIER_MAPPINGS[4]; // Custom
}
