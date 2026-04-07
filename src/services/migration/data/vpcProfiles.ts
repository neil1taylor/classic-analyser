import type { VPCProfile, VPCPricingData, VPCRegionalPricingData, ProfileFamily } from '@/types/migration';
import fallbackPricing from './vpcPricing.json';
import profileCatalog from './generated/vpcProfileCatalog.json';

// ── Bandwidth defaults (not in the mapping spreadsheet) ─────────────────────
// Used when the generated catalog lacks bandwidth data.
const BANDWIDTH_DEFAULTS: Record<string, number> = {
  'bxf-2x8': 4, 'bxf-4x16': 8, 'bxf-8x32': 16, 'bxf-16x64': 32,
  'bxf-24x96': 48, 'bxf-32x128': 64, 'bxf-48x192': 80, 'bxf-64x256': 80,
  'bx2-2x8': 4, 'bx2-4x16': 8, 'bx2-8x32': 16, 'bx2-16x64': 32,
  'bx2-32x128': 64, 'bx2-48x192': 80, 'bx2-64x256': 80, 'bx2-96x384': 80, 'bx2-128x512': 80,
  'cx2-2x4': 4, 'cx2-4x8': 8, 'cx2-8x16': 16, 'cx2-16x32': 32,
  'cx2-32x64': 64, 'cx2-48x96': 80, 'cx2-64x128': 80, 'cx2-96x192': 80, 'cx2-128x256': 80,
  'mx2-2x16': 4, 'mx2-4x32': 8, 'mx2-8x64': 16, 'mx2-16x128': 32,
  'mx2-32x256': 64, 'mx2-48x384': 80, 'mx2-64x512': 80, 'mx2-96x768': 80, 'mx2-128x1024': 80,
};

/** Estimate bandwidth (Gbps) from vCPU count when no explicit value is known. */
function estimateBandwidth(vcpu: number): number {
  if (vcpu <= 2) return 4;
  if (vcpu <= 4) return 8;
  if (vcpu <= 8) return 16;
  if (vcpu <= 16) return 32;
  if (vcpu <= 24) return 48;
  if (vcpu <= 32) return 64;
  if (vcpu <= 48) return 96;
  if (vcpu <= 64) return 128;
  if (vcpu <= 96) return 192;
  return 200;
}

const HOURS_PER_MONTH = 730;

// ── Build profile arrays from generated catalog ─────────────────────────────

function buildProfiles(
  catalogEntries: typeof profileCatalog.vsiProfiles,
): VPCProfile[] {
  return catalogEntries.map((entry) => ({
    name: entry.name,
    family: entry.family as ProfileFamily,
    vcpu: entry.vcpu,
    memory: entry.memory,
    bandwidth: BANDWIDTH_DEFAULTS[entry.name] ?? estimateBandwidth(entry.vcpu),
    estimatedCost: entry.hourlyRate > 0
      ? Math.round(entry.hourlyRate * HOURS_PER_MONTH * 100) / 100
      : 0,
    hourlyRate: entry.hourlyRate || undefined,
  }));
}

function buildBareMetalProfiles(
  catalogEntries: typeof profileCatalog.bareMetalProfiles,
): VPCProfile[] {
  return catalogEntries.map((entry) => ({
    name: entry.name,
    family: entry.family as ProfileFamily,
    vcpu: entry.vcpu,
    memory: entry.memory,
    bandwidth: 100, // BM profiles typically have 100 Gbps
    estimatedCost: entry.hourlyRate > 0
      ? Math.round(entry.hourlyRate * HOURS_PER_MONTH * 100) / 100
      : 0,
    hourlyRate: entry.hourlyRate || undefined,
  }));
}

// ── Fallback profiles (used when generated catalog is empty) ────────────────

const FALLBACK_VPC_PROFILES: VPCProfile[] = [
  // Balanced Flex (bxf)
  { name: 'bxf-2x8', family: 'balanced', vcpu: 2, memory: 8, bandwidth: 4, estimatedCost: 0 },
  { name: 'bxf-4x16', family: 'balanced', vcpu: 4, memory: 16, bandwidth: 8, estimatedCost: 0 },
  { name: 'bxf-8x32', family: 'balanced', vcpu: 8, memory: 32, bandwidth: 16, estimatedCost: 0 },
  { name: 'bxf-16x64', family: 'balanced', vcpu: 16, memory: 64, bandwidth: 32, estimatedCost: 0 },
  { name: 'bxf-24x96', family: 'balanced', vcpu: 24, memory: 96, bandwidth: 48, estimatedCost: 0 },
  { name: 'bxf-32x128', family: 'balanced', vcpu: 32, memory: 128, bandwidth: 64, estimatedCost: 0 },
  { name: 'bxf-48x192', family: 'balanced', vcpu: 48, memory: 192, bandwidth: 80, estimatedCost: 0 },
  { name: 'bxf-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 80, estimatedCost: 0 },
  // Balanced Gen2 (bx2)
  { name: 'bx2-2x8', family: 'balanced', vcpu: 2, memory: 8, bandwidth: 4, estimatedCost: 0 },
  { name: 'bx2-4x16', family: 'balanced', vcpu: 4, memory: 16, bandwidth: 8, estimatedCost: 0 },
  { name: 'bx2-8x32', family: 'balanced', vcpu: 8, memory: 32, bandwidth: 16, estimatedCost: 0 },
  { name: 'bx2-16x64', family: 'balanced', vcpu: 16, memory: 64, bandwidth: 32, estimatedCost: 0 },
  { name: 'bx2-32x128', family: 'balanced', vcpu: 32, memory: 128, bandwidth: 64, estimatedCost: 0 },
  { name: 'bx2-48x192', family: 'balanced', vcpu: 48, memory: 192, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2-96x384', family: 'balanced', vcpu: 96, memory: 384, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2-128x512', family: 'balanced', vcpu: 128, memory: 512, bandwidth: 80, estimatedCost: 0 },
  // Compute Flex (cxf)
  { name: 'cxf-2x4', family: 'compute', vcpu: 2, memory: 4, bandwidth: 4, estimatedCost: 0 },
  { name: 'cxf-4x8', family: 'compute', vcpu: 4, memory: 8, bandwidth: 8, estimatedCost: 0 },
  { name: 'cxf-8x16', family: 'compute', vcpu: 8, memory: 16, bandwidth: 16, estimatedCost: 0 },
  { name: 'cxf-16x32', family: 'compute', vcpu: 16, memory: 32, bandwidth: 32, estimatedCost: 0 },
  { name: 'cxf-24x48', family: 'compute', vcpu: 24, memory: 48, bandwidth: 48, estimatedCost: 0 },
  { name: 'cxf-32x64', family: 'compute', vcpu: 32, memory: 64, bandwidth: 64, estimatedCost: 0 },
  { name: 'cxf-48x96', family: 'compute', vcpu: 48, memory: 96, bandwidth: 80, estimatedCost: 0 },
  { name: 'cxf-64x128', family: 'compute', vcpu: 64, memory: 128, bandwidth: 80, estimatedCost: 0 },
  // Compute Gen2 (cx2)
  { name: 'cx2-2x4', family: 'compute', vcpu: 2, memory: 4, bandwidth: 4, estimatedCost: 0 },
  { name: 'cx2-4x8', family: 'compute', vcpu: 4, memory: 8, bandwidth: 8, estimatedCost: 0 },
  { name: 'cx2-8x16', family: 'compute', vcpu: 8, memory: 16, bandwidth: 16, estimatedCost: 0 },
  { name: 'cx2-16x32', family: 'compute', vcpu: 16, memory: 32, bandwidth: 32, estimatedCost: 0 },
  { name: 'cx2-32x64', family: 'compute', vcpu: 32, memory: 64, bandwidth: 64, estimatedCost: 0 },
  { name: 'cx2-48x96', family: 'compute', vcpu: 48, memory: 96, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx2-64x128', family: 'compute', vcpu: 64, memory: 128, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx2-96x192', family: 'compute', vcpu: 96, memory: 192, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx2-128x256', family: 'compute', vcpu: 128, memory: 256, bandwidth: 80, estimatedCost: 0 },
  // Memory Flex (mxf)
  { name: 'mxf-2x16', family: 'memory', vcpu: 2, memory: 16, bandwidth: 4, estimatedCost: 0 },
  { name: 'mxf-4x32', family: 'memory', vcpu: 4, memory: 32, bandwidth: 8, estimatedCost: 0 },
  { name: 'mxf-8x64', family: 'memory', vcpu: 8, memory: 64, bandwidth: 16, estimatedCost: 0 },
  { name: 'mxf-16x128', family: 'memory', vcpu: 16, memory: 128, bandwidth: 32, estimatedCost: 0 },
  { name: 'mxf-24x192', family: 'memory', vcpu: 24, memory: 192, bandwidth: 48, estimatedCost: 0 },
  { name: 'mxf-32x256', family: 'memory', vcpu: 32, memory: 256, bandwidth: 64, estimatedCost: 0 },
  { name: 'mxf-48x384', family: 'memory', vcpu: 48, memory: 384, bandwidth: 80, estimatedCost: 0 },
  { name: 'mxf-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 80, estimatedCost: 0 },
  // Memory Gen2 (mx2)
  { name: 'mx2-2x16', family: 'memory', vcpu: 2, memory: 16, bandwidth: 4, estimatedCost: 0 },
  { name: 'mx2-4x32', family: 'memory', vcpu: 4, memory: 32, bandwidth: 8, estimatedCost: 0 },
  { name: 'mx2-8x64', family: 'memory', vcpu: 8, memory: 64, bandwidth: 16, estimatedCost: 0 },
  { name: 'mx2-16x128', family: 'memory', vcpu: 16, memory: 128, bandwidth: 32, estimatedCost: 0 },
  { name: 'mx2-32x256', family: 'memory', vcpu: 32, memory: 256, bandwidth: 64, estimatedCost: 0 },
  { name: 'mx2-48x384', family: 'memory', vcpu: 48, memory: 384, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2-96x768', family: 'memory', vcpu: 96, memory: 768, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2-128x1024', family: 'memory', vcpu: 128, memory: 1024, bandwidth: 80, estimatedCost: 0 },
  // Very High Memory (vx2d)
  { name: 'vx2d-2x28', family: 'very-high-memory', vcpu: 2, memory: 28, bandwidth: 4, estimatedCost: 0 },
  { name: 'vx2d-4x56', family: 'very-high-memory', vcpu: 4, memory: 56, bandwidth: 8, estimatedCost: 0 },
  { name: 'vx2d-8x112', family: 'very-high-memory', vcpu: 8, memory: 112, bandwidth: 16, estimatedCost: 0 },
  { name: 'vx2d-16x224', family: 'very-high-memory', vcpu: 16, memory: 224, bandwidth: 32, estimatedCost: 0 },
  { name: 'vx2d-44x616', family: 'very-high-memory', vcpu: 44, memory: 616, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-88x1232', family: 'very-high-memory', vcpu: 88, memory: 1232, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-144x2016', family: 'very-high-memory', vcpu: 144, memory: 2016, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-176x2464', family: 'very-high-memory', vcpu: 176, memory: 2464, bandwidth: 80, estimatedCost: 0 },
  // Ultra High Memory (ux2d)
  { name: 'ux2d-2x56', family: 'ultra-high-memory', vcpu: 2, memory: 56, bandwidth: 4, estimatedCost: 0 },
  { name: 'ux2d-4x112', family: 'ultra-high-memory', vcpu: 4, memory: 112, bandwidth: 8, estimatedCost: 0 },
  { name: 'ux2d-8x224', family: 'ultra-high-memory', vcpu: 8, memory: 224, bandwidth: 16, estimatedCost: 0 },
  { name: 'ux2d-16x448', family: 'ultra-high-memory', vcpu: 16, memory: 448, bandwidth: 32, estimatedCost: 0 },
  { name: 'ux2d-36x1008', family: 'ultra-high-memory', vcpu: 36, memory: 1008, bandwidth: 72, estimatedCost: 0 },
  { name: 'ux2d-48x1344', family: 'ultra-high-memory', vcpu: 48, memory: 1344, bandwidth: 80, estimatedCost: 0 },
  { name: 'ux2d-72x2016', family: 'ultra-high-memory', vcpu: 72, memory: 2016, bandwidth: 80, estimatedCost: 0 },
  { name: 'ux2d-100x2800', family: 'ultra-high-memory', vcpu: 100, memory: 2800, bandwidth: 80, estimatedCost: 0 },
  { name: 'ux2d-200x5600', family: 'ultra-high-memory', vcpu: 200, memory: 5600, bandwidth: 80, estimatedCost: 0 },
];

const FALLBACK_VPC_BARE_METAL_PROFILES: VPCProfile[] = [
  { name: 'bx2-metal-96x384', family: 'balanced', vcpu: 96, memory: 384, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx2d-metal-96x384', family: 'balanced', vcpu: 96, memory: 384, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3-metal-48x256', family: 'balanced', vcpu: 48, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3-metal-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3d-metal-48x256', family: 'balanced', vcpu: 48, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3d-metal-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3d-metal-192x1024', family: 'balanced', vcpu: 192, memory: 1024, bandwidth: 100, estimatedCost: 0 },
  { name: 'cx2-metal-96x192', family: 'compute', vcpu: 96, memory: 192, bandwidth: 100, estimatedCost: 0 },
  { name: 'cx2d-metal-96x192', family: 'compute', vcpu: 96, memory: 192, bandwidth: 100, estimatedCost: 0 },
  { name: 'cx3d-metal-48x128', family: 'compute', vcpu: 48, memory: 128, bandwidth: 100, estimatedCost: 0 },
  { name: 'cx3d-metal-64x128', family: 'compute', vcpu: 64, memory: 128, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx2-metal-96x768', family: 'memory', vcpu: 96, memory: 768, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx2d-metal-96x768', family: 'memory', vcpu: 96, memory: 768, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3-metal-48x512', family: 'memory', vcpu: 48, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3-metal-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-16x128', family: 'memory', vcpu: 16, memory: 128, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-48x512', family: 'memory', vcpu: 48, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-96x1024', family: 'memory', vcpu: 96, memory: 1024, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-128x1024', family: 'memory', vcpu: 128, memory: 1024, bandwidth: 100, estimatedCost: 0 },
  { name: 'vx3-metal-16x256', family: 'very-high-memory', vcpu: 16, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'vx3d-metal-16x256', family: 'very-high-memory', vcpu: 16, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'ux2d-metal-112x3072', family: 'ultra-high-memory', vcpu: 112, memory: 3072, bandwidth: 100, estimatedCost: 0 },
  { name: 'ux2d-metal-224x6144', family: 'ultra-high-memory', vcpu: 224, memory: 6144, bandwidth: 100, estimatedCost: 0 },
  { name: 'ux3-metal-16x512', family: 'ultra-high-memory', vcpu: 16, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'ux3d-metal-16x512', family: 'ultra-high-memory', vcpu: 16, memory: 512, bandwidth: 100, estimatedCost: 0 },
];

// ── Build from generated catalog (primary) or fallback ──────────────────────

export const VPC_PROFILES: VPCProfile[] = profileCatalog.vsiProfiles.length > 0
  ? buildProfiles(profileCatalog.vsiProfiles)
  : FALLBACK_VPC_PROFILES;

export const VPC_BARE_METAL_PROFILES: VPCProfile[] = profileCatalog.bareMetalProfiles.length > 0
  ? buildBareMetalProfiles(profileCatalog.bareMetalProfiles)
  : FALLBACK_VPC_BARE_METAL_PROFILES;

// ── Profile classification helpers ──────────────────────────────────────────

/** Check if a profile uses burstable/flex (shared) CPUs */
export function isBurstableProfile(name: string): boolean {
  const prefix = name.split('-')[0];
  return prefix.endsWith('f') && (prefix.startsWith('bx') || prefix.startsWith('cx') || prefix.startsWith('mx') || prefix.startsWith('nx'));
}

/** Check if a profile is gen3+ (Sapphire Rapids, DDR5, PCIe Gen5) */
export function isGen3Profile(name: string): boolean {
  const prefix = name.split('-')[0];
  return /[3-9]/.test(prefix);
}

/** Check if a profile has NVMe instance storage (d-suffix, excluding flex) */
export function hasInstanceStorage(name: string): boolean {
  if (isBurstableProfile(name)) return false;
  const prefix = name.split('-')[0];
  return prefix.includes('d');
}

/** Check if a profile is confidential compute (dc-suffix) */
export function isConfidentialProfile(name: string): boolean {
  const prefix = name.split('-')[0];
  return prefix.endsWith('dc');
}

// ── Pricing application ─────────────────────────────────────────────────────

/**
 * Returns a copy of the profiles array with estimatedCost populated from the pricing data.
 * When regional pricing is available and a targetRegion is specified, uses region-specific rates.
 * Falls back to the bundled vpcPricing.json for any profile not found in server pricing.
 */
export function applyPricing(
  profiles: VPCProfile[],
  pricing: VPCPricingData | null,
  targetRegion?: string,
): VPCProfile[] {
  // Resolve the correct pricing source for the target region
  const regionPricing = resolveRegionalPricing(pricing, targetRegion);

  return profiles.map((p) => {
    const entry = regionPricing?.profiles[p.name]
      ?? pricing?.profiles[p.name]
      ?? fallbackPricing.profiles[p.name as keyof typeof fallbackPricing.profiles];
    if (!entry) return p;
    return {
      ...p,
      estimatedCost: entry.monthlyCost,
      hourlyRate: entry.hourlyRate,
    };
  });
}

/**
 * Returns a copy of the bare metal profiles with estimatedCost populated from pricing data.
 * Falls back to the bundled vpcPricing.json for any profile not found in server pricing.
 */
export function applyBareMetalPricing(
  profiles: VPCProfile[],
  pricing: VPCPricingData | null,
  targetRegion?: string,
): VPCProfile[] {
  const regionPricing = resolveRegionalPricing(pricing, targetRegion);

  return profiles.map((p) => {
    const entry = regionPricing?.bareMetalProfiles?.[p.name]
      ?? pricing?.bareMetalProfiles?.[p.name]
      ?? fallbackPricing.bareMetalProfiles[p.name as keyof typeof fallbackPricing.bareMetalProfiles];
    if (!entry) return p;
    return {
      ...p,
      estimatedCost: entry.monthlyCost,
      hourlyRate: entry.hourlyRate,
    };
  });
}

/** Resolve region-specific pricing from the regional pricing map */
function resolveRegionalPricing(
  pricing: VPCPricingData | null,
  targetRegion?: string,
): VPCRegionalPricingData | undefined {
  if (!targetRegion || !pricing?.regionalPricing) return undefined;
  // If the pricing data is already for the target region, no need to look up regional
  if (pricing.region === targetRegion) return undefined;
  return pricing.regionalPricing[targetRegion];
}
