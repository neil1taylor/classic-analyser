import bmMappingData from './generated/bmMappings.json';

interface BmMappingEntry {
  storageCategory: string;
  processorDescription: string;
  coresPerProc: number;
  processorCount: number;
  totalCores: number;
  ramGB: number;
  hasNVMe: boolean;
  serverCount: number;
  vpcVsiProfile: string;
  vpcBmProfile: string;
}

export interface BmMappingResult {
  vpcVsiProfile: string | null;
  vpcBmProfile: string | null;
  storageCategory: string;
  processorMatch: string;
  serverCount: number;
}

const mappings: BmMappingEntry[] = bmMappingData.mappings ?? [];

/** Classify total attached storage into a spreadsheet storage category. */
function classifyStorageCategory(storageTB: number): string {
  if (storageTB < 10) return '0-10TB';
  if (storageTB < 24) return '10+ -24 TB';
  if (storageTB < 30) return '24+ -30 TB';
  if (storageTB < 60) return '30+ -60 TB';
  if (storageTB < 120) return '60+ -120 TB';
  if (storageTB < 240) return '120+ -240 TB';
  return '240+  TB';
}

/**
 * Look up a Classic bare metal server in the spreadsheet mappings.
 *
 * Matching priority:
 * 1. Exact match: totalCores + ramGB + storage category + processor substring
 * 2. Relaxed match: totalCores + ramGB + processor substring (ignore storage category)
 * 3. Spec-only match: totalCores + ramGB (ignore processor and storage)
 *
 * Returns null if no match is found (caller should fall back to algorithmic matching).
 */
export function lookupBareMetalMapping(
  processorDesc: string,
  totalCores: number,
  ramGB: number,
  storageTB?: number,
): BmMappingResult | null {
  if (mappings.length === 0 || totalCores <= 0 || ramGB <= 0) return null;

  const storageCategory = storageTB != null ? classifyStorageCategory(storageTB) : undefined;
  const procNorm = normalizeProcessorDesc(processorDesc);

  // Try exact match (cores + RAM + storage category + processor)
  let match = findMatch(totalCores, ramGB, storageCategory, procNorm);

  // Try relaxed match (cores + RAM + processor, any storage category)
  if (!match && procNorm) {
    match = findMatch(totalCores, ramGB, undefined, procNorm);
  }

  // Try spec-only match (cores + RAM only)
  if (!match) {
    match = findMatch(totalCores, ramGB, undefined, undefined);
  }

  if (!match) return null;

  return {
    vpcVsiProfile: match.vpcVsiProfile || null,
    vpcBmProfile: match.vpcBmProfile || null,
    storageCategory: match.storageCategory,
    processorMatch: match.processorDescription,
    serverCount: match.serverCount,
  };
}

function findMatch(
  totalCores: number,
  ramGB: number,
  storageCategory: string | undefined,
  procNorm: string | undefined,
): BmMappingEntry | undefined {
  return mappings.find((m) => {
    if (m.totalCores !== totalCores || m.ramGB !== ramGB) return false;
    if (storageCategory && m.storageCategory !== storageCategory) return false;
    if (procNorm && !normalizeProcessorDesc(m.processorDescription).includes(procNorm)) return false;
    // Only return entries that have at least one VPC mapping
    return m.vpcVsiProfile || m.vpcBmProfile;
  });
}

/** Normalize processor description for fuzzy matching. */
function normalizeProcessorDesc(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/[-_\s]+/g, '')
    .replace(/GHZ$/i, '');
}
