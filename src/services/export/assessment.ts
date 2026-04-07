import ExcelJS from 'exceljs';
import type { Fill } from 'exceljs';
import type { MigrationAnalysisOutput } from '@/types/migration';
import { mapDatacenterToVPC } from '@/services/migration/data/datacenterMapping';
import { matchOS } from '@/services/migration/data/osCompatibility';
import {
  addHeaderStyle, autoWidth, freezeHeaderRow, addAutoFilter,
  CURRENCY_FORMAT,
} from '@/services/migration/export/styles';

// ── Styling helpers ─────────────────────────────────────────────────────

const EOS_RED_FILL: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
const EOS_YELLOW_FILL: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };

function eosColorFill(eolDate: string | undefined): Fill | undefined {
  if (!eolDate) return undefined;
  const eol = new Date(eolDate);
  const now = new Date();
  if (eol < now) return EOS_RED_FILL;
  if (eol.getFullYear() === now.getFullYear()) return EOS_YELLOW_FILL;
  return undefined;
}

function applyCurrencyColumns(ws: ExcelJS.Worksheet, colKeys: string[]): void {
  const colIndices = colKeys.map((key) => {
    const col = ws.getColumn(key);
    return col ? col.number : -1;
  }).filter((n) => n > 0);

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    for (const colIdx of colIndices) {
      const cell = row.getCell(colIdx);
      if (typeof cell.value === 'number') {
        cell.numFmt = CURRENCY_FORMAT;
      }
    }
  });
}

function applyEosFills(ws: ExcelJS.Worksheet, colKey: string): void {
  const col = ws.getColumn(colKey);
  if (!col) return;
  const colIdx = col.number;

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const cell = row.getCell(colIdx);
    const val = String(cell.value ?? '');
    if (val) {
      const fill = eosColorFill(val);
      if (fill) cell.fill = fill;
    }
  });
}

function styleSheet(ws: ExcelJS.Worksheet): void {
  addHeaderStyle(ws);
  freezeHeaderRow(ws);
  addAutoFilter(ws);
  autoWidth(ws);
}

function findSource<T extends Record<string, unknown>>(
  sources: unknown[],
  id: number,
  hostname: string,
): T | undefined {
  return sources.find((s) => {
    const r = s as Record<string, unknown>;
    if (r.id && Number(r.id) === id) return true;
    if (r.hostname && String(r.hostname) === hostname) return true;
    return false;
  }) as T | undefined;
}

// ── Main entry point ────────────────────────────────────────────────────

export async function generateAssessmentTemplate(
  migrationResult: MigrationAnalysisOutput,
  collectedData: Record<string, unknown[]>,
  accountInfo?: Record<string, unknown>,
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();

  addAccountSheet(wb, migrationResult, collectedData, accountInfo);
  addBMsSheet(wb, migrationResult, collectedData);
  addVSISheet(wb, migrationResult, collectedData);
  addPaaSSheet(wb, migrationResult);
  addStorageSheet(wb, migrationResult, collectedData);
  addNetworkingSheet(wb, collectedData);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ── Sheet 1: Account ────────────────────────────────────────────────────

function addAccountSheet(
  wb: ExcelJS.Workbook,
  _analysis: MigrationAnalysisOutput,
  collectedData: Record<string, unknown[]>,
  accountInfo?: Record<string, unknown>,
): void {
  const ws = wb.addWorksheet('Account');
  ws.columns = [
    { header: 'Property', key: 'property', width: 25 },
    { header: 'Value', key: 'value', width: 60 },
  ];

  const allResources = [
    ...(collectedData['virtualServers'] ?? []),
    ...(collectedData['bareMetal'] ?? []),
  ] as Array<Record<string, unknown>>;

  const datacenters = [...new Set(
    allResources.map((r) => String(r.datacenter ?? r._datacenter ?? '')).filter(Boolean),
  )].sort();

  const gateways = collectedData['gateways'] ?? [];
  const kubeRe = /^kube-/i;

  const vsis = (collectedData['virtualServers'] ?? []) as Array<Record<string, unknown>>;
  const nonIksVsis = vsis.filter((v) => !kubeRe.test(String(v.hostname ?? '')));

  const bms = (collectedData['bareMetal'] ?? []) as Array<Record<string, unknown>>;
  const gatewayHostnames = new Set(
    gateways.map((g) => String((g as Record<string, unknown>).hostname ?? '')),
  );
  const nonGatewayBms = bms.filter((b) => !gatewayHostnames.has(String(b.hostname ?? '')));

  const rows: Array<{ property: string; value: string | number }> = [
    { property: 'Name', value: String(accountInfo?.companyName ?? '') },
    { property: '', value: '' },
    { property: 'CSM', value: '' },
    { property: 'TAM', value: '' },
    { property: 'Type of Support', value: String(accountInfo?.supportType ?? '') },
    { property: 'IMS Account IDs', value: String(accountInfo?.id ?? '') },
    { property: 'VRF Enabled (Yes/No)', value: accountInfo?.vrfEnabled === true ? 'Yes' : accountInfo?.vrfEnabled === false ? 'No' : '' },
    { property: '', value: '' },
    { property: '', value: '' },
    { property: 'Datacenters', value: datacenters.join(', ') },
    { property: '# VSIs', value: nonIksVsis.length },
    { property: '# BMs', value: nonGatewayBms.length },
    { property: '# Gateways', value: gateways.length },
  ];

  for (const r of rows) ws.addRow(r);

  addHeaderStyle(ws);
  autoWidth(ws);
}

// ── Sheet 2: BMs ────────────────────────────────────────────────────────

function addBMsSheet(
  wb: ExcelJS.Workbook,
  analysis: MigrationAnalysisOutput,
  collectedData: Record<string, unknown[]>,
): void {
  const ws = wb.addWorksheet('BMs');
  ws.columns = [
    { header: 'Hostname', key: 'hostname' },
    { header: 'DC', key: 'dc' },
    { header: 'Processor Description', key: 'processorDesc' },
    { header: 'Core/Proc', key: 'coreProc' },
    { header: 'Processor Count', key: 'procCount' },
    { header: 'Total Cores', key: 'totalCores' },
    { header: 'RAM (GB)', key: 'ramGB' },
    { header: 'NVMe (Yes/No)', key: 'nvme' },
    { header: 'Drive Capacity (GBs)', key: 'driveCap' },
    { header: 'Drive Units', key: 'driveUnits' },
    { header: 'BW Allocated (GBs)', key: 'bwAllocated' },
    { header: 'BW Used (GBs)', key: 'bwUsed' },
    { header: 'BW Pool (GBs)', key: 'bwPool' },
    { header: 'OS', key: 'os' },
    { header: 'EOS Date', key: 'eosDate' },
    { header: 'SW AddOns', key: 'swAddons' },
    { header: 'Region', key: 'region' },
    { header: '1st VPC VSI Profile', key: 'vsiProfile1' },
    { header: '1st BM Profile', key: 'bmProfile1' },
    { header: '1st VSI Cost ($)', key: 'vsiCost1' },
    { header: '1st BM Cost ($)', key: 'bmCost1' },
    { header: '2nd VPC VSI Profile', key: 'vsiProfile2' },
    { header: '2nd BM Profile', key: 'bmProfile2' },
    { header: '2nd VSI Cost ($)', key: 'vsiCost2' },
    { header: '2nd BM Cost ($)', key: 'bmCost2' },
  ];

  const sourceData = (collectedData['bareMetal'] ?? []) as Array<Record<string, unknown>>;

  for (const bm of analysis.computeAssessment.bareMetalMigrations) {
    const src = findSource<Record<string, unknown>>(sourceData, bm.id, bm.hostname);
    const osMatch = matchOS(bm.os);
    const dcMapping = mapDatacenterToVPC(bm.datacenter);

    const processorDesc = String(src?.processorDescription ?? src?.processors ?? '');
    const coresPerProc = src?.processorCoreAmount ? Number(src.processorCoreAmount) : undefined;
    const procCount = src?.processorCount ? Number(src.processorCount) : undefined;

    const drives = src?.hardDrives as Array<Record<string, unknown>> | undefined;
    let totalDriveCap = 0;
    let driveUnits = 0;
    if (Array.isArray(drives)) {
      driveUnits = drives.length;
      for (const d of drives) {
        totalDriveCap += Number(d.capacity ?? d.diskSpace ?? 0);
      }
    }

    const hasNvme = Array.isArray(drives)
      && drives.some((d) => /nvme/i.test(String(d.description ?? '')));

    const bwAlloc = src?.bandwidthAllocation ?? src?.bandwidthAllotment ?? '';
    const bwUsed = src?.outboundBandwidthUsage ?? src?.outboundPublicBandwidthUsage ?? '';
    const bwPool = src?.bandwidthPoolAllotment ?? '';

    const addons = src?.softwareComponents
      ? (src.softwareComponents as Array<Record<string, unknown>>)
        .map((c) => String(c.name ?? c.softwareDescription ?? ''))
        .filter(Boolean)
        .join(', ')
      : '';

    const profile = bm.recommendedProfile;
    const isVsiPath = bm.migrationPath === 'vpc-vsi';
    const isBmPath = bm.migrationPath === 'vpc-bare-metal';

    ws.addRow({
      hostname: bm.hostname,
      dc: bm.datacenter,
      processorDesc,
      coreProc: coresPerProc ?? '',
      procCount: procCount ?? '',
      totalCores: bm.cores,
      ramGB: bm.memoryGB,
      nvme: hasNvme ? 'Yes' : 'No',
      driveCap: totalDriveCap || '',
      driveUnits: driveUnits || '',
      bwAllocated: bwAlloc,
      bwUsed: bwUsed,
      bwPool: bwPool,
      os: bm.os,
      eosDate: osMatch?.eolDate ?? '',
      swAddons: addons,
      region: dcMapping?.vpcRegion ?? '',
      vsiProfile1: isVsiPath && profile ? profile.name : '',
      bmProfile1: isBmPath && profile ? profile.name : '',
      vsiCost1: isVsiPath && profile ? profile.estimatedCost : '',
      bmCost1: isBmPath && profile ? profile.estimatedCost : '',
      vsiProfile2: '',
      bmProfile2: '',
      vsiCost2: '',
      bmCost2: '',
    });
  }

  applyCurrencyColumns(ws, ['vsiCost1', 'bmCost1', 'vsiCost2', 'bmCost2']);
  applyEosFills(ws, 'eosDate');
  styleSheet(ws);
}

// ── Sheet 3: VSI ────────────────────────────────────────────────────────

function addVSISheet(
  wb: ExcelJS.Workbook,
  analysis: MigrationAnalysisOutput,
  collectedData: Record<string, unknown[]>,
): void {
  const ws = wb.addWorksheet('VSI');
  ws.columns = [
    { header: 'Hostname', key: 'hostname' },
    { header: 'DC', key: 'dc' },
    { header: 'Cores', key: 'cores' },
    { header: 'Memory (GB)', key: 'memoryGB' },
    { header: 'OS/Version', key: 'os' },
    { header: 'EOS Date', key: 'eosDate' },
    { header: 'Addons', key: 'addons' },
    { header: '#Volumes', key: 'volumeCount' },
    { header: 'BW Allocated (GBs)', key: 'bwAllocated' },
    { header: 'BW Used (GBs)', key: 'bwUsed' },
    { header: 'BW Pool (GBs)', key: 'bwPool' },
    { header: 'Instance Storage (Yes/No)', key: 'instanceStorage' },
    { header: 'Block Storage (GBs)', key: 'blockStorageGB' },
    { header: 'Multi-attach (Yes/No)', key: 'multiAttach' },
    { header: 'NAS (GB)', key: 'nasGB' },
    { header: 'Region', key: 'region' },
    { header: 'Mapped VPC VSI Profile', key: 'vpcProfile1' },
    { header: 'VPC VSI Cost ($)', key: 'vpcCost1' },
    { header: '2nd VPC VSI Profile', key: 'vpcProfile2' },
    { header: '2nd VPC VSI Cost ($)', key: 'vpcCost2' },
  ];

  const sourceData = (collectedData['virtualServers'] ?? []) as Array<Record<string, unknown>>;

  const nonIksVsis = analysis.computeAssessment.vsiMigrations.filter((v) => !v.iksClusterId);

  for (const vsi of nonIksVsis) {
    const src = findSource<Record<string, unknown>>(sourceData, vsi.id, vsi.hostname);
    const osMatch = matchOS(vsi.os);
    const dcMapping = mapDatacenterToVPC(vsi.datacenter);

    const addons = src?.softwareComponents
      ? (src.softwareComponents as Array<Record<string, unknown>>)
        .map((c) => String(c.name ?? c.softwareDescription ?? ''))
        .filter(Boolean)
        .join(', ')
      : '';

    const blockDevices = src?.blockDevices as Array<Record<string, unknown>> | undefined;
    const volumeCount = Array.isArray(blockDevices) ? blockDevices.length : 0;

    const hasLocalDisk = Array.isArray(blockDevices)
      && blockDevices.some((d) => String(d.diskImage ?? '').toLowerCase().includes('local'));

    const blockStorage = src?.blockStorageGB ?? src?._blockStorageGB ?? '';
    const nasStorage = src?.nasStorageGB ?? src?._nasStorageGB ?? '';
    const multiAttach = src?.multiAttach ?? false;

    const bwAlloc = src?.bandwidthAllocation ?? src?.bandwidthAllotment ?? '';
    const bwUsed = src?.outboundBandwidthUsage ?? src?.outboundPublicBandwidthUsage ?? '';
    const bwPool = src?.bandwidthPoolAllotment ?? '';

    const profile = vsi.recommendedProfile;
    const alt1 = vsi.alternativeProfiles[0];

    ws.addRow({
      hostname: vsi.hostname,
      dc: vsi.datacenter,
      cores: vsi.cpu,
      memoryGB: Math.round(vsi.memoryMB / 1024 * 10) / 10,
      os: vsi.os,
      eosDate: osMatch?.eolDate ?? '',
      addons,
      volumeCount: volumeCount || '',
      bwAllocated: bwAlloc,
      bwUsed: bwUsed,
      bwPool: bwPool,
      instanceStorage: hasLocalDisk ? 'Yes' : 'No',
      blockStorageGB: blockStorage,
      multiAttach: multiAttach ? 'Yes' : 'No',
      nasGB: nasStorage,
      region: dcMapping?.vpcRegion ?? '',
      vpcProfile1: profile?.name ?? '',
      vpcCost1: profile?.estimatedCost ?? '',
      vpcProfile2: alt1?.name ?? '',
      vpcCost2: alt1?.estimatedCost ?? '',
    });
  }

  applyCurrencyColumns(ws, ['vpcCost1', 'vpcCost2']);
  applyEosFills(ws, 'eosDate');
  styleSheet(ws);
}

// ── Sheet 4: PaaS ───────────────────────────────────────────────────────

function addPaaSSheet(
  wb: ExcelJS.Workbook,
  analysis: MigrationAnalysisOutput,
): void {
  const ws = wb.addWorksheet('PaaS');
  ws.columns = [
    { header: 'WorkerNode', key: 'workerNode' },
    { header: 'IKS/ROKS', key: 'clusterType' },
    { header: 'ClusterID', key: 'clusterId' },
    { header: 'DC/Zone', key: 'dcZone' },
    { header: 'Cores', key: 'cores' },
    { header: 'Memory (GB)', key: 'memoryGB' },
    { header: 'Mapped Region', key: 'mappedRegion' },
    { header: 'Mapped IKS Zone', key: 'mappedZone' },
    { header: 'VPC Profile', key: 'vpcProfile' },
    { header: 'VPC BM Profile', key: 'vpcBmProfile' },
    { header: 'VPC Cost ($)', key: 'vpcCost' },
  ];

  const clusters = analysis.iksAnalysis?.clusters ?? [];

  for (const cluster of clusters) {
    for (const worker of cluster.workers) {
      const workerDcMapping = mapDatacenterToVPC(worker.datacenter);

      ws.addRow({
        workerNode: worker.hostname,
        clusterType: 'IKS',
        clusterId: cluster.clusterId,
        dcZone: worker.datacenter,
        cores: worker.cores,
        memoryGB: worker.memoryGB,
        mappedRegion: cluster.targetRegion,
        mappedZone: workerDcMapping?.vpcZones?.[0] ?? '',
        vpcProfile: worker.mappedFlavour?.name ?? '',
        vpcBmProfile: '',
        vpcCost: worker.monthlyCost || '',
      });
    }
  }

  applyCurrencyColumns(ws, ['vpcCost']);
  styleSheet(ws);
}

// ── Sheet 5: Storage ────────────────────────────────────────────────────

function addStorageSheet(
  wb: ExcelJS.Workbook,
  analysis: MigrationAnalysisOutput,
  collectedData: Record<string, unknown[]>,
): void {
  const ws = wb.addWorksheet('Storage');
  ws.columns = [
    { header: 'VolumeId', key: 'volumeId' },
    { header: 'DC', key: 'dc' },
    { header: 'Type (iSCSI/NAS)', key: 'type' },
    { header: 'Class', key: 'storageClass' },
    { header: 'Provisioned (GB)', key: 'provisionedGB' },
    { header: 'Used (%)', key: 'usedPct' },
    { header: 'Hostname(s)', key: 'hostnames' },
    { header: 'Classic IOPS', key: 'classicIOPS' },
    { header: 'Region', key: 'region' },
    { header: 'Mapped VPC Profile', key: 'vpcProfile' },
    { header: 'VPC IOPS', key: 'vpcIOPS' },
    { header: 'VPC Throughput', key: 'vpcThroughput' },
    { header: 'VPC Cost ($)', key: 'vpcCost' },
    { header: 'PaaS Target (Yes/No)', key: 'paasTarget' },
  ];

  const blockSource = (collectedData['blockStorage'] ?? []) as Array<Record<string, unknown>>;
  const fileSource = (collectedData['fileStorage'] ?? []) as Array<Record<string, unknown>>;

  for (const vol of analysis.storageAssessment.blockStorage.volumeAssessments) {
    const src = findSource<Record<string, unknown>>(blockSource, vol.id, vol.username);
    const dc = String(src?.datacenter ?? src?._datacenter ?? '');
    const dcMapping = dc ? mapDatacenterToVPC(dc) : null;
    const hostnames = src?.allowedHardware
      ? (src.allowedHardware as Array<Record<string, unknown>>)
        .map((h) => String(h.hostname ?? h.fullyQualifiedDomainName ?? ''))
        .filter(Boolean)
        .join(', ')
      : src?.allowedVirtualGuests
        ? (src.allowedVirtualGuests as Array<Record<string, unknown>>)
          .map((h) => String(h.hostname ?? h.fullyQualifiedDomainName ?? ''))
          .filter(Boolean)
          .join(', ')
        : '';
    const usedPct = src?.bytesUsed && vol.capacityGB
      ? Math.round(Number(src.bytesUsed) / (vol.capacityGB * 1073741824) * 100)
      : '';
    const isKube = (src as Record<string, unknown>)?._isKubeStorage === true;

    ws.addRow({
      volumeId: vol.id,
      dc,
      type: 'iSCSI',
      storageClass: vol.tier,
      provisionedGB: vol.capacityGB,
      usedPct,
      hostnames,
      classicIOPS: vol.iops,
      region: dcMapping?.vpcRegion ?? '',
      vpcProfile: vol.vpcProfile,
      vpcIOPS: vol.vpcIOPS,
      vpcThroughput: '',
      vpcCost: vol.currentFee || '',
      paasTarget: isKube ? 'Yes' : 'No',
    });
  }

  for (const vol of analysis.storageAssessment.fileStorage.volumeAssessments) {
    const src = findSource<Record<string, unknown>>(fileSource, vol.id, vol.username);
    const dc = String(src?.datacenter ?? src?._datacenter ?? '');
    const dcMapping = dc ? mapDatacenterToVPC(dc) : null;
    const hostnames = src?.allowedSubnets
      ? (src.allowedSubnets as Array<Record<string, unknown>>)
        .map((s) => String(s.networkIdentifier ?? ''))
        .filter(Boolean)
        .join(', ')
      : '';
    const usedPct = src?.bytesUsed && vol.capacityGB
      ? Math.round(Number(src.bytesUsed) / (vol.capacityGB * 1073741824) * 100)
      : '';
    const isKube = (src as Record<string, unknown>)?._isKubeStorage === true;

    ws.addRow({
      volumeId: vol.id,
      dc,
      type: 'NAS',
      storageClass: vol.tier,
      provisionedGB: vol.capacityGB,
      usedPct,
      hostnames,
      classicIOPS: vol.iops,
      region: dcMapping?.vpcRegion ?? '',
      vpcProfile: vol.vpcProfile,
      vpcIOPS: vol.vpcIOPS,
      vpcThroughput: '',
      vpcCost: vol.currentFee || '',
      paasTarget: isKube ? 'Yes' : 'No',
    });
  }

  applyCurrencyColumns(ws, ['vpcCost']);
  styleSheet(ws);
}

// ── Sheet 6: Networking ─────────────────────────────────────────────────

function addNetworkingSheet(
  wb: ExcelJS.Workbook,
  collectedData: Record<string, unknown[]>,
): void {
  const ws = wb.addWorksheet('Networking');
  ws.columns = [
    { header: 'Hostname', key: 'hostname' },
    { header: 'DC', key: 'dc' },
    { header: 'Gateway Device', key: 'device' },
    { header: 'HA (Yes/No)', key: 'ha' },
    { header: '#Pvt VLANs', key: 'pvtVlans' },
    { header: '#Public VLANs', key: 'pubVlans' },
    { header: 'BM Cores', key: 'bmCores' },
    { header: 'BM Memory (GB)', key: 'bmMemoryGB' },
    { header: 'License', key: 'license' },
    { header: 'BW Used (GBs)', key: 'bwUsed' },
    { header: 'Region', key: 'region' },
    { header: 'VPC VSI Profile', key: 'vpcProfile' },
    { header: 'VPC Cost ($)', key: 'vpcCost' },
  ];

  const gateways = (collectedData['gateways'] ?? []) as Array<Record<string, unknown>>;

  for (const gw of gateways) {
    const hostname = String(gw.hostname ?? gw.name ?? '');
    const dc = String(gw.datacenter ?? gw._datacenter ?? '');
    const dcMapping = dc ? mapDatacenterToVPC(dc) : null;

    const members = gw.members as Array<Record<string, unknown>> | undefined;
    const isHA = Array.isArray(members) && members.length > 1;

    const privateVlans = gw.privateVlans ?? gw.insideVlans;
    const publicVlans = gw.publicVlans ?? gw.outsideVlans;
    const pvtCount = Array.isArray(privateVlans) ? privateVlans.length : '';
    const pubCount = Array.isArray(publicVlans) ? publicVlans.length : '';

    const hardware = (Array.isArray(members) && members[0]?.hardware)
      ? members[0].hardware as Record<string, unknown>
      : gw;
    const cores = hardware?.processorPhysicalCoreAmount ?? hardware?.cores ?? '';
    const memGB = hardware?.memoryCapacity ?? hardware?.memoryGB ?? '';

    const license = String(gw.networkFirewall ?? gw.gatewayType ?? gw._gatewayType ?? '');
    const bwUsed = gw.outboundBandwidthUsage ?? gw.outboundPublicBandwidthUsage ?? '';

    ws.addRow({
      hostname,
      dc,
      device: String(gw.gatewayType ?? gw._gatewayType ?? gw.deviceType ?? ''),
      ha: isHA ? 'Yes' : 'No',
      pvtVlans: pvtCount,
      pubVlans: pubCount,
      bmCores: cores,
      bmMemoryGB: memGB,
      license,
      bwUsed,
      region: dcMapping?.vpcRegion ?? '',
      vpcProfile: '',
      vpcCost: '',
    });
  }

  applyCurrencyColumns(ws, ['vpcCost']);
  styleSheet(ws);
}
