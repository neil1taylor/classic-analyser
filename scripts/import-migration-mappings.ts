/**
 * Build-time script to import Classic-to-VPC migration mappings from XLSX spreadsheets
 * and generate JSON data files for the migration assessment engine.
 *
 * Usage: npx tsx scripts/import-migration-mappings.ts
 *
 * Input:  mappings/Classic-to-vpc-profile-mapping-separate-sheets.xlsx (storage)
 *         mappings/Overall Profile Mapping - Classic BM to VPC.xlsx    (bare metal)
 *
 * Output: src/services/migration/data/generated/vpcProfileCatalog.json
 *         src/services/migration/data/generated/bmMappings.json
 *         src/services/migration/data/generated/storageMappings.json
 */

import ExcelJS from 'exceljs';
import { writeFile, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const MAPPINGS_DIR = path.join(ROOT, 'mappings');
const OUTPUT_DIR = path.join(ROOT, 'src', 'services', 'migration', 'data', 'generated');

const BM_FILE = path.join(MAPPINGS_DIR, 'Overall Profile Mapping - Classic BM to VPC.xlsx');
const STORAGE_FILE = path.join(MAPPINGS_DIR, 'Classic-to-vpc-profile-mapping-separate-sheets.xlsx');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve an ExcelJS cell value to a plain JS value (handles formula results). */
function resolve(cellValue: ExcelJS.CellValue): string | number | boolean | null {
  if (cellValue == null) return null;
  if (typeof cellValue === 'object' && 'result' in (cellValue as Record<string, unknown>)) {
    return resolve((cellValue as { result: ExcelJS.CellValue }).result);
  }
  if (typeof cellValue === 'object' && 'sharedFormula' in (cellValue as Record<string, unknown>)) {
    return resolve((cellValue as { result: ExcelJS.CellValue }).result);
  }
  if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
    return cellValue;
  }
  return String(cellValue);
}

function str(v: ExcelJS.CellValue): string {
  const r = resolve(v);
  return r != null ? String(r).trim() : '';
}

function num(v: ExcelJS.CellValue): number {
  const r = resolve(v);
  return typeof r === 'number' ? r : Number(r) || 0;
}

function bool(v: ExcelJS.CellValue): boolean {
  const r = resolve(v);
  if (typeof r === 'boolean') return r;
  if (typeof r === 'string') return r.toUpperCase() === 'TRUE';
  return false;
}

/** Parse family from a VPC profile name prefix (e.g. bx3d-metal-192x1024 → balanced). */
function familyFromProfileName(name: string): string {
  const prefix = name.split('-')[0].replace(/\d+/g, '').replace(/d$/, '').replace(/dc$/, '').replace(/f$/, '');
  if (prefix === 'bx') return 'balanced';
  if (prefix === 'cx') return 'compute';
  if (prefix === 'mx') return 'memory';
  if (prefix === 'vx') return 'very-high-memory';
  if (prefix === 'ux') return 'ultra-high-memory';
  if (prefix === 'ox') return 'storage-optimized';
  if (prefix === 'gx') return 'gpu';
  if (prefix === 'dx') return 'storage-optimized';
  return 'balanced';
}

/** Parse vCPU and memory from a profile name like bx3d-metal-192x1024 or bx2-2x8. */
function parseProfileSpecs(name: string): { vcpu: number; memory: number } | null {
  const match = name.match(/(\d+)x(\d+)$/);
  if (!match) return null;
  return { vcpu: Number(match[1]), memory: Number(match[2]) };
}

// ── VPC Profile Catalog ──────────────────────────────────────────────────────

interface ProfileEntry {
  name: string;
  family: string;
  vcpu: number;
  memory: number;
  bandwidth: number;
  hourlyRate: number;
}

async function extractVpcProfiles(wb: ExcelJS.Workbook): Promise<{
  vsiProfiles: ProfileEntry[];
  bareMetalProfiles: ProfileEntry[];
}> {
  // VSI profiles from "VPC VSI Price" sheet
  const vsiSheet = wb.getWorksheet('VPC VSI Price');
  if (!vsiSheet) throw new Error('Sheet "VPC VSI Price" not found');

  const vsiProfiles: ProfileEntry[] = [];
  for (let r = 2; r <= vsiSheet.rowCount; r++) {
    const row = vsiSheet.getRow(r);
    const name = str(row.getCell(2).value);
    if (!name || !name.includes('-')) continue;

    const family = str(row.getCell(1).value) || familyFromProfileName(name);
    const vcpu = num(row.getCell(3).value);
    const mem = num(row.getCell(4).value);
    const hourly = num(row.getCell(5).value);

    if (vcpu > 0 && mem > 0) {
      vsiProfiles.push({
        name,
        family: familyFromProfileName(name), // Normalize via name, not spreadsheet family column
        vcpu,
        memory: mem,
        bandwidth: 0, // Not in this spreadsheet — merged from fallback later
        hourlyRate: hourly,
      });
    }
  }

  // BM profiles from "VPC BM Price" sheet
  const bmSheet = wb.getWorksheet('VPC BM Price');
  if (!bmSheet) throw new Error('Sheet "VPC BM Price" not found');

  const bareMetalProfiles: ProfileEntry[] = [];
  for (let r = 2; r <= bmSheet.rowCount; r++) {
    const row = bmSheet.getRow(r);
    const name = str(row.getCell(1).value);
    if (!name || !name.includes('metal')) continue;

    const hourly = num(row.getCell(2).value);
    const specs = parseProfileSpecs(name);
    if (!specs) continue;

    bareMetalProfiles.push({
      name,
      family: familyFromProfileName(name),
      vcpu: specs.vcpu,
      memory: specs.memory,
      bandwidth: 0,
      hourlyRate: hourly,
    });
  }

  return { vsiProfiles, bareMetalProfiles };
}

// ── Bare Metal Mappings ──────────────────────────────────────────────────────

interface BmMapping {
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

async function extractBmMappings(wb: ExcelJS.Workbook): Promise<BmMapping[]> {
  const ws = wb.getWorksheet('Aggregare Mapping V3');
  if (!ws) throw new Error('Sheet "Aggregare Mapping V3" not found');

  const mappings: BmMapping[] = [];
  let currentCategory = '';

  // Row 3 is the header row; data starts at row 4
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const col1 = str(row.getCell(1).value);
    const col2 = str(row.getCell(2).value);

    // Category transition: col1 has the storage category, col2 has "Processor Description" (header)
    if (col2 === 'Processor Description') {
      currentCategory = col1;
      continue;
    }

    // Skip "Storage" separator rows and empty rows
    if (col1 === 'Storage' || !col2) continue;

    // Use col1 as category if it differs from current (first data rows repeat the category)
    if (col1 && col1 !== currentCategory && !col1.startsWith('Storage')) {
      currentCategory = col1;
    }

    const coresPerProc = num(row.getCell(3).value);
    const processorCount = num(row.getCell(4).value);
    const totalCores = num(row.getCell(5).value) || coresPerProc * processorCount;
    const ramGB = num(row.getCell(6).value);
    const hasNVMe = bool(row.getCell(7).value);
    const serverCount = num(row.getCell(8).value);
    const vpcVsiProfile = str(row.getCell(9).value);
    const vpcBmProfile = str(row.getCell(10).value);

    if (totalCores > 0 && ramGB > 0) {
      mappings.push({
        storageCategory: currentCategory,
        processorDescription: col2,
        coresPerProc,
        processorCount,
        totalCores,
        ramGB,
        hasNVMe,
        serverCount,
        vpcVsiProfile,
        vpcBmProfile,
      });
    }
  }

  return mappings;
}

// ── Storage Mappings ─────────────────────────────────────────────────────────

interface StorageProfile {
  name: string;
  throughputMultiplier: number;
  iopsMultiplier: number;
  minSize: number;
  maxSize: number;
  minThroughput: number;
  maxThroughput: number;
  minIOPS: number;
  maxIOPS: number;
}

interface StorageTierMapping {
  classicTier: string;
  vpcProfile: string;
}

interface StoragePricing {
  tier: string;
  hourlyRatePerGB: number;
  zone: string;
}

interface ZoneMapping {
  classicDC: string;
  vpcZone: string;
  vpcRegion: string;
}

interface StorageMappingsOutput {
  generatedAt: string;
  sources: string[];
  block: {
    profiles: StorageProfile[];
    tierMappings: StorageTierMapping[];
    vpcPricing: { profile: string; hourlyRatePerGB: number }[];
    sdpPricing: { component: string; hourlyRate: number }[];
    classicPricingByZone: StoragePricing[];
  };
  file: {
    profiles: StorageProfile[];
    tierMappings: StorageTierMapping[];
    vpcPricing: { profile: string; hourlyRatePerGB: number }[];
    classicPricingByZone: StoragePricing[];
  };
  zoneMappings: ZoneMapping[];
}

async function extractStorageMappings(wb: ExcelJS.Workbook): Promise<StorageMappingsOutput> {
  const blockSheet = wb.getWorksheet('Block - Data');
  const fileSheet = wb.getWorksheet('File - Data');
  if (!blockSheet) throw new Error('Sheet "Block - Data" not found');
  if (!fileSheet) throw new Error('Sheet "File - Data" not found');

  // ── Block profiles (rows 2-15) ──
  const blockProfiles: StorageProfile[] = [];
  for (let r = 3; r <= 15; r++) {
    const row = blockSheet.getRow(r);
    const name = str(row.getCell(2).value);
    if (!name) continue;
    blockProfiles.push({
      name,
      throughputMultiplier: num(row.getCell(3).value),
      iopsMultiplier: num(row.getCell(4).value),
      minSize: num(row.getCell(5).value),
      maxSize: num(row.getCell(6).value),
      minThroughput: num(row.getCell(7).value),
      maxThroughput: num(row.getCell(8).value),
      minIOPS: num(row.getCell(9).value),
      maxIOPS: num(row.getCell(10).value),
    });
  }

  // ── Block tier mappings (rows 20-26) ──
  const blockTierMappings: StorageTierMapping[] = [];
  for (let r = 20; r <= 26; r++) {
    const row = blockSheet.getRow(r);
    const classicTier = str(row.getCell(2).value);
    const vpcProfile = str(row.getCell(3).value);
    if (classicTier && vpcProfile) {
      blockTierMappings.push({ classicTier, vpcProfile });
    }
  }

  // ── Block VPC pricing (rows 33-35) ──
  const blockVpcPricing: { profile: string; hourlyRatePerGB: number }[] = [];
  for (let r = 33; r <= 35; r++) {
    const row = blockSheet.getRow(r);
    const profile = str(row.getCell(2).value);
    const rate = num(row.getCell(3).value);
    if (profile && rate > 0) {
      blockVpcPricing.push({ profile, hourlyRatePerGB: rate });
    }
  }

  // ── SDP pricing (rows 37-39) ──
  const sdpPricing: { component: string; hourlyRate: number }[] = [];
  for (let r = 37; r <= 39; r++) {
    const row = blockSheet.getRow(r);
    const component = str(row.getCell(2).value);
    const rate = num(row.getCell(3).value);
    if (component && rate > 0) {
      sdpPricing.push({ component, hourlyRate: rate });
    }
  }

  // ── Block Classic pricing by zone (rows 28-32) ──
  // Row 28 has zone headers in columns 3+
  const blockZoneHeaders: string[] = [];
  const headerRow = blockSheet.getRow(28);
  for (let c = 3; c <= 30; c++) {
    const zone = str(headerRow.getCell(c).value);
    if (zone) blockZoneHeaders.push(zone);
    else break;
  }

  const blockClassicPricing: StoragePricing[] = [];
  for (let r = 29; r <= 32; r++) {
    const row = blockSheet.getRow(r);
    const tier = str(row.getCell(2).value);
    if (!tier) continue;
    for (let i = 0; i < blockZoneHeaders.length; i++) {
      const rate = num(row.getCell(3 + i).value);
      if (rate > 0) {
        blockClassicPricing.push({ tier, hourlyRatePerGB: rate, zone: blockZoneHeaders[i] });
      }
    }
  }

  // ── Zone mappings (rows 86+) ──
  const zoneMappings: ZoneMapping[] = [];
  for (let r = 87; r <= blockSheet.rowCount; r++) {
    const row = blockSheet.getRow(r);
    const classicDC = str(row.getCell(2).value);
    const vpcZone = str(row.getCell(3).value);
    const vpcRegion = str(row.getCell(4).value);
    if (classicDC && vpcZone) {
      zoneMappings.push({ classicDC, vpcZone, vpcRegion });
    }
  }

  // ── File profiles (rows 2-13) ──
  const fileProfiles: StorageProfile[] = [];
  for (let r = 3; r <= 13; r++) {
    const row = fileSheet.getRow(r);
    const name = str(row.getCell(2).value);
    if (!name) continue;
    fileProfiles.push({
      name,
      throughputMultiplier: num(row.getCell(3).value),
      iopsMultiplier: num(row.getCell(4).value),
      minSize: num(row.getCell(5).value),
      maxSize: num(row.getCell(6).value),
      minThroughput: num(row.getCell(7).value),
      maxThroughput: num(row.getCell(8).value),
      minIOPS: num(row.getCell(9).value),
      maxIOPS: num(row.getCell(10).value),
    });
  }

  // ── File tier mappings (rows 18-23) ──
  const fileTierMappings: StorageTierMapping[] = [];
  for (let r = 18; r <= 23; r++) {
    const row = fileSheet.getRow(r);
    const classicTier = str(row.getCell(2).value);
    const vpcProfile = str(row.getCell(3).value);
    if (classicTier && vpcProfile) {
      fileTierMappings.push({ classicTier, vpcProfile });
    }
  }

  // ── File VPC pricing (rows 32-35) ──
  const fileVpcPricing: { profile: string; hourlyRatePerGB: number }[] = [];
  for (let r = 32; r <= 35; r++) {
    const row = fileSheet.getRow(r);
    const profile = str(row.getCell(2).value);
    const rate = num(row.getCell(3).value);
    if (profile && rate > 0) {
      fileVpcPricing.push({ profile, hourlyRatePerGB: rate });
    }
  }

  // ── File Classic pricing by zone (rows 26-30) ──
  const fileZoneHeaders: string[] = [];
  const fileHeaderRow = fileSheet.getRow(26);
  for (let c = 3; c <= 30; c++) {
    const zone = str(fileHeaderRow.getCell(c).value);
    if (zone) fileZoneHeaders.push(zone);
    else break;
  }

  const fileClassicPricing: StoragePricing[] = [];
  for (let r = 27; r <= 30; r++) {
    const row = fileSheet.getRow(r);
    const tier = str(row.getCell(2).value);
    if (!tier) continue;
    for (let i = 0; i < fileZoneHeaders.length; i++) {
      const rate = num(row.getCell(3 + i).value);
      if (rate > 0) {
        fileClassicPricing.push({ tier, hourlyRatePerGB: rate, zone: fileZoneHeaders[i] });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sources: [path.basename(STORAGE_FILE)],
    block: {
      profiles: blockProfiles,
      tierMappings: blockTierMappings,
      vpcPricing: blockVpcPricing,
      sdpPricing,
      classicPricingByZone: blockClassicPricing,
    },
    file: {
      profiles: fileProfiles,
      tierMappings: fileTierMappings,
      vpcPricing: fileVpcPricing,
      classicPricingByZone: fileClassicPricing,
    },
    zoneMappings,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Importing Classic-to-VPC migration mappings...\n');

  // Check input files exist
  for (const f of [BM_FILE, STORAGE_FILE]) {
    try {
      await access(f);
    } catch {
      console.error(`Missing: ${f}`);
      console.error('Place the mapping spreadsheets in the mappings/ directory.');
      process.exit(1);
    }
  }

  // ── 1. VPC Profile Catalog + BM Mappings ──────────────────────────────────
  console.log('1. Reading bare metal mapping spreadsheet...');
  const bmWorkbook = new ExcelJS.Workbook();
  await bmWorkbook.xlsx.readFile(BM_FILE);

  const { vsiProfiles, bareMetalProfiles } = await extractVpcProfiles(bmWorkbook);
  console.log(`   VPC VSI profiles:  ${vsiProfiles.length}`);
  console.log(`   VPC BM profiles:   ${bareMetalProfiles.length}`);

  const profileCatalog = {
    generatedAt: new Date().toISOString(),
    sources: [path.basename(BM_FILE)],
    vsiProfiles,
    bareMetalProfiles,
  };

  const bmMappings = await extractBmMappings(bmWorkbook);
  console.log(`   BM mappings:       ${bmMappings.length}`);

  const withVsi = bmMappings.filter(m => m.vpcVsiProfile).length;
  const withBm = bmMappings.filter(m => m.vpcBmProfile).length;
  const noMapping = bmMappings.filter(m => !m.vpcVsiProfile && !m.vpcBmProfile).length;
  console.log(`   → with VSI target: ${withVsi}, with BM target: ${withBm}, no mapping: ${noMapping}`);

  // ── 2. Storage Mappings ───────────────────────────────────────────────────
  console.log('\n2. Reading storage mapping spreadsheet...');
  const storageWorkbook = new ExcelJS.Workbook();
  await storageWorkbook.xlsx.readFile(STORAGE_FILE);

  const storageMappings = await extractStorageMappings(storageWorkbook);
  console.log(`   Block profiles:    ${storageMappings.block.profiles.length}`);
  console.log(`   Block tier maps:   ${storageMappings.block.tierMappings.length}`);
  console.log(`   File profiles:     ${storageMappings.file.profiles.length}`);
  console.log(`   File tier maps:    ${storageMappings.file.tierMappings.length}`);
  console.log(`   Zone mappings:     ${storageMappings.zoneMappings.length}`);

  // ── 3. Write output files ─────────────────────────────────────────────────
  console.log('\n3. Writing output files...');

  const catalogPath = path.join(OUTPUT_DIR, 'vpcProfileCatalog.json');
  await writeFile(catalogPath, JSON.stringify(profileCatalog, null, 2) + '\n', 'utf-8');
  console.log(`   ${catalogPath}`);

  const bmPath = path.join(OUTPUT_DIR, 'bmMappings.json');
  const bmOutput = {
    generatedAt: new Date().toISOString(),
    sources: [path.basename(BM_FILE)],
    mappings: bmMappings,
  };
  await writeFile(bmPath, JSON.stringify(bmOutput, null, 2) + '\n', 'utf-8');
  console.log(`   ${bmPath}`);

  const storagePath = path.join(OUTPUT_DIR, 'storageMappings.json');
  await writeFile(storagePath, JSON.stringify(storageMappings, null, 2) + '\n', 'utf-8');
  console.log(`   ${storagePath}`);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
