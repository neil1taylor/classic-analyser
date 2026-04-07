import type { StorageTierMapping } from '@/types/migration';
import storageMappingData from './generated/storageMappings.json';

// ── Display name → internal VPC profile name translation ────────────────────

const BLOCK_PROFILE_NAMES: Record<string, string> = {
  'VPC - 3 IOPS/GB': 'general-purpose',
  'VPC - 5 IOPS/GB': '5iops-tier',
  'VPC - 10 IOPS/GB': '10iops-tier',
};

const BLOCK_PROFILE_IOPS: Record<string, string> = {
  'general-purpose': '3000 base (3 IOPS/GB)',
  '5iops-tier': '5000 per 1TB',
  '10iops-tier': '10000 per 1TB',
  'custom': 'Up to 48000',
  'sdp': 'Up to 64000 (20–3000 IOPS/GB)',
};

// ── Build Gen 1 tier mappings from the spreadsheet ──────────────────────────

function buildBlockTierMappings(): StorageTierMapping[] {
  const tierMaps = storageMappingData?.block?.tierMappings ?? [];
  if (tierMaps.length === 0) return FALLBACK_STORAGE_TIER_MAPPINGS;

  // Extract Classic → VPC mappings (skip VPC→VPC identity mappings)
  const classicMappings = tierMaps.filter(
    (m) => m.classicTier.startsWith('Classic ')
  );

  const result: StorageTierMapping[] = classicMappings.map((m) => {
    const vpcProfile = BLOCK_PROFILE_NAMES[m.vpcProfile] ?? m.vpcProfile;
    // Find the matching profile spec from the spreadsheet for notes
    const classicSpec = storageMappingData.block.profiles.find(
      (p) => p.name === m.classicTier
    );
    const vpcSpec = storageMappingData.block.profiles.find(
      (p) => p.name === m.vpcProfile
    );

    return {
      classicTier: m.classicTier.replace('Classic Endurance - ', ''),
      classicIOPS: classicSpec
        ? `${classicSpec.minIOPS}–${classicSpec.maxIOPS}`
        : 'Variable',
      vpcProfile,
      vpcIOPS: BLOCK_PROFILE_IOPS[vpcProfile] ?? (vpcSpec
        ? `${vpcSpec.minIOPS}–${vpcSpec.maxIOPS}`
        : 'Variable'),
      generation: 1 as const,
      notes: `Classic ${m.classicTier} → VPC ${m.vpcProfile}`,
    };
  });

  // Add custom IOPS mapping (not in the spreadsheet tier mappings)
  result.push({
    classicTier: 'Custom IOPS',
    classicIOPS: 'Variable',
    vpcProfile: 'custom',
    vpcIOPS: 'Up to 48000',
    generation: 1,
    notes: 'Map to VPC custom IOPS profile — may need adjustment',
  });

  return result;
}

export const STORAGE_TIER_MAPPINGS: StorageTierMapping[] = buildBlockTierMappings();

// ── Fallback (used when generated data is empty) ────────────────────────────

const FALLBACK_STORAGE_TIER_MAPPINGS: StorageTierMapping[] = [
  { classicTier: '0.25 IOPS/GB', classicIOPS: '250 per 1TB', vpcProfile: 'general-purpose', vpcIOPS: '3000 base (3 IOPS/GB)', generation: 1, notes: 'VPC general-purpose provides significantly better baseline performance' },
  { classicTier: '2 IOPS/GB', classicIOPS: '2000 per 1TB', vpcProfile: '5iops-tier', vpcIOPS: '5000 per 1TB', generation: 1, notes: 'VPC 5 IOPS/GB tier provides more headroom' },
  { classicTier: '4 IOPS/GB', classicIOPS: '4000 per 1TB', vpcProfile: '10iops-tier', vpcIOPS: '10000 per 1TB', generation: 1, notes: 'VPC 10 IOPS/GB tier exceeds Classic 4 IOPS/GB' },
  { classicTier: '10 IOPS/GB', classicIOPS: '10000 per 1TB', vpcProfile: '10iops-tier', vpcIOPS: '10000 per 1TB', generation: 1, notes: 'Equivalent performance tier' },
  { classicTier: 'Custom IOPS', classicIOPS: 'Variable', vpcProfile: 'custom', vpcIOPS: 'Up to 48000', generation: 1, notes: 'Map to VPC custom IOPS profile — may need adjustment' },
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
    'Not recommended for boot volumes — cannot reliably detect GPT-formatted volumes, may boot to BIOS instead of UEFI. Must not be used with secure boot. See https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles',
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

// ── File storage profile specs from spreadsheet ─────────────────────────────

interface FileProfileSpec {
  name: string;
  maxIOPS: number;
}

function getFileProfileSpecs(): FileProfileSpec[] {
  const profiles = storageMappingData?.file?.profiles ?? [];
  const rfs = profiles.find((p) => p.name === 'rfs');
  const dp2 = profiles.find((p) => p.name === 'dp2');
  return [
    { name: 'rfs', maxIOPS: rfs?.maxIOPS ?? 35000 },
    { name: 'dp2', maxIOPS: dp2?.maxIOPS ?? 96000 },
  ];
}

export interface FileProfileResult {
  vpcProfile: string;
  vpcIOPS: string;
  alternative?: string;
  notes: string;
}

/** Map a Classic file volume to a VPC file share profile based on its IOPS. */
export function mapFileStorageProfile(tierLevel: string, iops: number): FileProfileResult {
  const specs = getFileProfileSpecs();
  const rfs = specs.find((s) => s.name === 'rfs')!;
  const dp2 = specs.find((s) => s.name === 'dp2')!;

  const tierDisplay = tierLevel || 'unknown';

  if (iops > rfs.maxIOPS) {
    return {
      vpcProfile: 'dp2',
      vpcIOPS: `Up to ${dp2.maxIOPS.toLocaleString()}`,
      notes: `Classic tier: ${tierDisplay} → VPC profile: dp2`,
    };
  }

  return {
    vpcProfile: 'rfs',
    vpcIOPS: `Up to ${rfs.maxIOPS.toLocaleString()}`,
    alternative: 'dp2',
    notes: `Classic tier: ${tierDisplay} → VPC profile: rfs`,
  };
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
