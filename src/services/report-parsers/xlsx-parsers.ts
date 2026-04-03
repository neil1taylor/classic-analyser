import ExcelJS from 'exceljs';
import type { ReportParserResult } from './types';
import type { AccountInfo } from '@/types/resources';
import { createLogger } from '@/utils/logger';

const log = createLogger('ReportXLSX');

/**
 * Parse a worksheet into an array of objects using the first row as headers.
 */
function parseWorksheet(
  worksheet: ExcelJS.Worksheet,
  fieldMap: Record<string, string>
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  let headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      headers = [];
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value ?? '').trim();
      });
      return;
    }

    const obj: Record<string, unknown> = {};
    let hasValue = false;

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;

      const key = fieldMap[header] ?? header;
      let value = cell.value;

      // Handle ExcelJS rich text
      if (value && typeof value === 'object' && 'richText' in (value as object)) {
        value = (value as { richText: { text: string }[] }).richText
          .map(rt => rt.text)
          .join('');
      }

      // Handle dates
      if (value instanceof Date) {
        value = value.toISOString();
      }

      if (value !== null && value !== undefined && value !== '') {
        obj[key] = value;
        hasValue = true;
      }
    });

    if (!hasValue) return;

    // Skip summary/total rows (e.g. "SUBTOTAL", "COST", "TOTAL" in first column)
    const firstVal = String(row.getCell(1).value ?? '').trim().toUpperCase();
    if (['SUBTOTAL', 'COST', 'TOTAL', 'GRAND TOTAL'].includes(firstVal)) return;

    rows.push(obj);
  });

  return rows;
}

/**
 * Parse an _assessment.xlsx file.
 * Sheets: Account, BMs, VSI, Networking, Storage, VMware, PaaS, Complex Applications
 */
export async function parseAssessmentXlsx(file: File): Promise<ReportParserResult> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const data: Record<string, unknown[]> = {};
  let accountInfo: Partial<AccountInfo> | undefined;

  // Account sheet — key-value pairs
  const accountSheet = workbook.getWorksheet('Account');
  if (accountSheet) {
    const kvPairs: Record<string, string> = {};
    accountSheet.eachRow((row) => {
      const key = String(row.getCell(1).value ?? '').trim();
      const val = String(row.getCell(2).value ?? '').trim();
      if (key && val) kvPairs[key] = val;
    });

    if (kvPairs['Name']) {
      accountInfo = { companyName: kvPairs['Name'] };
    }
  }

  // BMs sheet
  const bmsSheet = workbook.getWorksheet('BMs');
  if (bmsSheet) {
    const fieldMap: Record<string, string> = {
      'Hostname': 'hostname',
      'DC': 'datacenter',
      'Processor Description': 'processorDescription',
      'Core/Proc': 'coresPerProcessor',
      'Processor Count': 'processorCount',
      'Total Cores': 'processorPhysicalCoreAmount',
      'RAM Total Capacity': 'memoryCapacity',
      'NVMe (Yes/No)': 'nvme',
      'Drive Total Capacity (GBs)': 'driveCapacityGb',
      'Drive Units': 'driveUnits',
      'BW Allocated (GBs)': 'bandwidthAllocated',
      'BW Used (GBs)': 'bandwidthUsed',
      'BW Pool Capacity (GBs)': 'bandwidthPoolCapacity',
      'OS': 'operatingSystemReferenceCode',
      'EOS Date': 'eosDate',
      'SW AddOns': 'softwareAddons',
      'Region': 'region',
      'VPC VSI  Profile Mapping': 'vpcVsiProfile',
      'BM Profile Mapping': 'vpcBmProfile',
      'VPC VSI Cost($)': 'vpcVsiCost',
      'VPC BM Cost($)': 'vpcBmCost',
    };
    const items = parseWorksheet(bmsSheet, fieldMap);
    if (items.length > 0) data.bareMetal = items;
    log.info(`Assessment: ${items.length} bare metals`);
  }

  // VSI sheet
  const vsiSheet = workbook.getWorksheet('VSI');
  if (vsiSheet) {
    const fieldMap: Record<string, string> = {
      'Hostname': 'hostname',
      'DC': 'datacenter',
      'Cores': 'maxCpu',
      'Memory': 'maxMemory',
      'OS/Version': 'operatingSystemReferenceCode',
      'EOS Date': 'eosDate',
      'Addons': 'addons',
      '#Volumes': 'volumeCount',
      'BW Allocated (GBs)': 'bandwidthAllocated',
      'BW Used (GBs)': 'bandwidthUsed',
      'BW Pool Capacity (GBs)': 'bandwidthPoolCapacity',
      'Instance Storage (Yes/No)': 'instanceStorage',
      'Block Storage (GBs)': 'blockStorageGb',
      'Multi-attach Storage (Yes/No)': 'multiAttachStorage',
      'NAS (GB)': 'nasGb',
      'Region': 'region',
      'Mapped VPC VSI Profile': 'vpcVsiProfile',
      'VPC VSI Cost($)': 'vpcVsiCost',
    };
    const items = parseWorksheet(vsiSheet, fieldMap);
    if (items.length > 0) data.virtualServers = items;
    log.info(`Assessment: ${items.length} VSIs`);
  }

  // Networking sheet
  const netSheet = workbook.getWorksheet('Networking');
  if (netSheet) {
    const fieldMap: Record<string, string> = {
      'Hostname': 'hostname',
      'DC': 'datacenter',
      'Gateway Device (Vyatta/VRA/vSRX/Fortinet/Other)': 'deviceType',
      'HA Deployment': 'haDeployment',
      '#Pvt VLANs Connected': 'privateVlanCount',
      '#Public VLANs Connected': 'publicVlanCount',
      'BM Cores': 'cores',
      'BM Memory (GB)': 'memoryGb',
      'License': 'license',
      'Map to NFV': 'nfvMapping',
      'Region': 'region',
      'VPC VSI Profile': 'vpcProfile',
      'VPC Cost ($)': 'vpcCost',
    };
    const items = parseWorksheet(netSheet, fieldMap);
    if (items.length > 0) data.gateways = items;
    log.info(`Assessment: ${items.length} network gateways`);
  }

  // Storage sheet
  const storageSheet = workbook.getWorksheet('Storage');
  if (storageSheet) {
    const fieldMap: Record<string, string> = {
      'VolumeId': 'id',
      'DC': 'datacenter',
      'Type (iSCSI/SAN/NAS)': 'nasType',
      'Class (Endurance/Performance)': 'storageType',
      'Provisioned(GB)': 'capacityGb',
      'Used (%)': 'percentUsed',
      'Hostname(s)': 'connectedHosts',
      'Classic IOPS': 'iops',
      'Region': 'region',
      'Mapped VPC Profile': 'vpcProfile',
      'VPC IOPS': 'vpcIops',
      'VPC Throughput': 'vpcThroughput',
      'VPC Cost': 'vpcCost',
      'PaaS Target (Yes/No)': 'paasTarget',
    };
    const items = parseWorksheet(storageSheet, fieldMap);
    // Split by nasType: ISCSI/NAS_CONTAINER → blockStorage, NAS → fileStorage
    const fileItems: Record<string, unknown>[] = [];
    const blockItems: Record<string, unknown>[] = [];
    for (const item of items) {
      const nasType = String(item.nasType ?? '').toUpperCase();
      if (nasType === 'ISCSI' || nasType === 'NAS_CONTAINER') {
        blockItems.push(item);
      } else {
        fileItems.push(item);
      }
    }
    if (fileItems.length > 0) data.fileStorage = fileItems;
    if (blockItems.length > 0) data.blockStorage = blockItems;
    log.info(`Assessment: ${fileItems.length} file storage + ${blockItems.length} block storage volumes`);
  }

  return { data, accountInfo };
}

/**
 * Parse a _deviceinventory.xlsx file.
 * Sheets: Bare Metal Servers, Virtual Guests
 */
export async function parseDeviceInventoryXlsx(file: File): Promise<ReportParserResult> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const data: Record<string, unknown[]> = {};

  // Bare Metal Servers sheet
  const bmSheet = workbook.getWorksheet('Bare Metal Servers');
  if (bmSheet) {
    const fieldMap: Record<string, string> = {
      'ID': 'id',
      'Type Attribute': 'typeAttribute',
      'Hostname': 'hostname',
      'Domain': 'domain',
      'Datacenter': 'datacenter',
      'Server Room': 'serverRoom',
      'Rack': 'rack',
      'Provision Date': 'provisionDate',
      'Hardware Chassis': 'hardwareChassis',
      'Motherboard': 'motherboard',
      'OS': 'operatingSystemReferenceCode',
      'Public IP': 'primaryIpAddress',
      'Private IP': 'primaryBackendIpAddress',
      'Public VLAN': 'publicVlan',
      'Private VLAN': 'privateVlan',
      'Public Router': 'publicRouter',
      'Private Router': 'privateRouter',
      'Core Count': 'processorPhysicalCoreAmount',
      'Public Speed': 'publicNetworkSpeed',
      'Private Speed': 'privateNetworkSpeed',
      'Memory': 'memoryCapacity',
      'Processor Type': 'processorType',
      'Processor Count': 'processorCount',
      'Raid Controller': 'raidController',
    };
    const items = parseWorksheet(bmSheet, fieldMap).map(item => ({
      ...item,
      // Parse memory like "64GB" to number
      memoryCapacity: typeof item.memoryCapacity === 'string'
        ? parseInt(item.memoryCapacity) || item.memoryCapacity
        : item.memoryCapacity,
    }));
    if (items.length > 0) data.bareMetal = items;
    log.info(`Device inventory: ${items.length} bare metals`);
  }

  // Virtual Guests sheet
  const vsiSheet = workbook.getWorksheet('Virtual Guests');
  if (vsiSheet) {
    const fieldMap: Record<string, string> = {
      'ID': 'id',
      'Type Attribute': 'typeAttribute',
      'Hostname': 'hostname',
      'Domain': 'domain',
      'Datacenter': 'datacenter',
      'Server Room': 'serverRoom',
      'Rack': 'rack',
      'Provision Date': 'provisionDate',
      'Hardware Chassis': 'hardwareChassis',
      'Motherboard': 'motherboard',
      'OS': 'operatingSystemReferenceCode',
      'Public IP': 'primaryIpAddress',
      'Private IP': 'primaryBackendIpAddress',
      'Public VLAN': 'publicVlan',
      'Private VLAN': 'privateVlan',
      'Public Router': 'publicRouter',
      'Private Router': 'privateRouter',
      'Core Count': 'maxCpu',
      'Memory': 'maxMemory',
      'Local Disk Flag': 'localDiskFlag',
      'Public Speed': 'publicNetworkSpeed',
      'Private Speed': 'privateNetworkSpeed',
      'Block Devices': 'blockDevices',
    };
    const items = parseWorksheet(vsiSheet, fieldMap).map(item => ({
      ...item,
      localDiskFlag: String(item.localDiskFlag).toLowerCase() === 'true',
    }));
    if (items.length > 0) data.virtualServers = items;
    log.info(`Device inventory: ${items.length} virtual guests`);
  }

  return { data };
}

/**
 * Parse a worksheet starting from a custom header row (not row 1).
 * Scans for a row whose first cell matches `headerMarker`, then parses from there.
 */
function parseWorksheetFromHeader(
  worksheet: ExcelJS.Worksheet,
  headerMarker: string,
  fieldMap: Record<string, string>
): Record<string, unknown>[] {
  let headerRow = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (headerRow === 0 && String(row.getCell(1).value ?? '').trim() === headerMarker) {
      headerRow = rowNumber;
    }
  });

  if (headerRow === 0) return [];

  // Build headers from the found row
  const headers: string[] = [];
  const hRow = worksheet.getRow(headerRow);
  hRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim();
  });

  const rows: Record<string, unknown>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;

    const obj: Record<string, unknown> = {};
    let hasValue = false;

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;

      const key = fieldMap[header] ?? header;
      let value = cell.value;

      if (value && typeof value === 'object' && 'richText' in (value as object)) {
        value = (value as { richText: { text: string }[] }).richText
          .map(rt => rt.text)
          .join('');
      }

      if (value instanceof Date) {
        value = value.toISOString();
      }

      if (value !== null && value !== undefined && value !== '') {
        obj[key] = value;
        hasValue = true;
      }
    });

    if (hasValue) rows.push(obj);
  });

  return rows;
}

/**
 * Parse bandwidth sheet into structured records.
 * All 4 bandwidth sheets share the same column layout.
 */
function parseBandwidthSheet(
  worksheet: ExcelJS.Worksheet,
  direction: 'public' | 'private',
  deviceType: 'bareMetal' | 'virtualServer'
): Record<string, unknown>[] {
  const fieldMap: Record<string, string> = {
    'Hardware ID': 'id',
    'Hostname': 'hostname',
    'Domain': 'domain',
    'Datacenter': 'datacenter',
    'Pool ID': 'poolId',
    'Month 1 Start': 'month1Start',
    'Month 1 End': 'month1End',
    'Month 1 In (GB)': 'month1InGb',
    'Month 1 Out (GB)': 'month1OutGb',
    'Month 2 Start': 'month2Start',
    'Month 2 End': 'month2End',
    'Month 2 In (GB)': 'month2InGb',
    'Month 2 Out (GB)': 'month2OutGb',
    'Month 3 Start': 'month3Start',
    'Month 3 End': 'month3End',
    'Month 3 In (GB)': 'month3InGb',
    'Month 3 Out (GB)': 'month3OutGb',
    '3 Month Avg In (GB)': 'avgInGb',
    '3 Month Avg Out (GB)': 'avgOutGb',
  };

  return parseWorksheet(worksheet, fieldMap).map(item => ({
    ...item,
    direction,
    deviceType,
  }));
}

/**
 * Parse a _consolidated.xlsx file.
 * Sheets: Overview, NAS Storage, Gateways, Security Groups,
 *         Device Inventory (Bare Metal), Device Inventory (Virtual),
 *         Bandwidth (Public BM), Bandwidth (Public VSI),
 *         Bandwidth (Private BM), Bandwidth (Private VSI),
 *         Bandwidth Pooling
 */
export async function parseConsolidatedXlsx(file: File): Promise<ReportParserResult> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const data: Record<string, unknown[]> = {};
  let accountInfo: Partial<AccountInfo> | undefined;

  // Overview sheet — extract account ID from key-value rows
  const overviewSheet = workbook.getWorksheet('Overview');
  if (overviewSheet) {
    overviewSheet.eachRow((row) => {
      const key = String(row.getCell(1).value ?? '').trim();
      const val = String(row.getCell(2).value ?? '').trim();
      if (key.startsWith('Account ID') && val) {
        accountInfo = { id: parseInt(val) || undefined };
      }
    });
  }

  // NAS Storage sheet — multi-section, header starts at "ID" row
  const nasSheet = workbook.getWorksheet('NAS Storage');
  if (nasSheet) {
    const fieldMap: Record<string, string> = {
      'ID': 'id',
      'name': 'hostname',
      'DatacenterName': 'datacenter',
      'nasType': 'nasType',
      'storageType': 'storageType',
      'capacityGb': 'capacityGb',
      'totalBytesUsed': 'totalBytesUsed',
      'percent': 'percentUsed',
      'provisionedIops': 'iops',
      'notes': 'notes',
    };
    const items = parseWorksheetFromHeader(nasSheet, 'ID', fieldMap);
    // Split by nasType: ISCSI/NAS_CONTAINER → blockStorage, NAS → fileStorage
    const fileItems: Record<string, unknown>[] = [];
    const blockItems: Record<string, unknown>[] = [];
    for (const item of items) {
      const nasType = String(item.nasType ?? '').toUpperCase();
      if (nasType === 'ISCSI' || nasType === 'NAS_CONTAINER') {
        blockItems.push(item);
      } else {
        fileItems.push(item);
      }
    }
    if (fileItems.length > 0) data.fileStorage = fileItems;
    if (blockItems.length > 0) data.blockStorage = blockItems;
    log.info(`Consolidated: ${fileItems.length} file storage + ${blockItems.length} block storage items`);
  }

  // Gateways sheet — Direct Link 2 Tenants
  const gwSheet = workbook.getWorksheet('Gateways');
  if (gwSheet) {
    const fieldMap: Record<string, string> = {
      'Id': 'id',
      'Name': 'name',
      'Location': 'location',
      'LocalIp': 'localIp',
      'RemoteIp': 'remoteIp',
      'Link Speed': 'linkSpeed',
      'Link Status': 'linkStatus',
      'BGP Status': 'bgpStatus',
      'Operational Status': 'operationalStatus',
    };
    // Skip title row — header is "Direct Link 2 Tenants" at row 1, actual headers at row 2
    const items = parseWorksheetFromHeader(gwSheet, 'Id', fieldMap);
    if (items.length > 0) data.directLinkGateways = items;
    log.info(`Consolidated: ${items.length} Direct Link gateways`);
  }

  // Security Groups sheet
  const sgSheet = workbook.getWorksheet('Security Groups');
  if (sgSheet) {
    const fieldMap: Record<string, string> = {
      'Security Group Id': 'id',
      'Name': 'name',
      'Description': 'description',
      'Attached Network Components': 'attachedComponents',
      'Attached Virtual Hosts': 'attachedHosts',
    };
    const items = parseWorksheetFromHeader(sgSheet, 'Security Group Id', fieldMap);
    if (items.length > 0) data.securityGroups = items;
    log.info(`Consolidated: ${items.length} security groups`);
  }

  // Device Inventory (Bare Metal) sheet
  const bmSheet = workbook.getWorksheet('Device Inventory (Bare Metal)');
  if (bmSheet) {
    const fieldMap: Record<string, string> = {
      'ID': 'id',
      'Type Attribute': 'typeAttribute',
      'Hostname': 'hostname',
      'Domain': 'domain',
      'Datacenter': 'datacenter',
      'Server Room': 'serverRoom',
      'Rack': 'rack',
      'Provision Date': 'provisionDate',
      'Hardware Chassis': 'hardwareChassis',
      'Motherboard': 'motherboard',
      'OS': 'operatingSystemReferenceCode',
      'Non-OS Software': 'nonOsSoftware',
      'Public IP': 'primaryIpAddress',
      'Private IP': 'primaryBackendIpAddress',
      'Public VLAN': 'publicVlan',
      'Private VLAN': 'privateVlan',
      'Public Router': 'publicRouter',
      'Private Router': 'privateRouter',
      'Core Count': 'processorPhysicalCoreAmount',
      'Public Speed': 'publicNetworkSpeed',
      'Private Speed': 'privateNetworkSpeed',
      'Memory': 'memoryCapacity',
      'Processor Type': 'processorType',
      'Processor Count': 'processorCount',
      'Raid Controller': 'raidController',
      'Storage Groups': 'storageGroups',
    };
    const items = parseWorksheet(bmSheet, fieldMap).map(item => ({
      ...item,
      memoryCapacity: typeof item.memoryCapacity === 'string'
        ? parseInt(item.memoryCapacity) || item.memoryCapacity
        : item.memoryCapacity,
    }));
    if (items.length > 0) data.bareMetal = items;
    log.info(`Consolidated: ${items.length} bare metals`);
  }

  // Device Inventory (Virtual) sheet
  const vsiSheet = workbook.getWorksheet('Device Inventory (Virtual)');
  if (vsiSheet) {
    const fieldMap: Record<string, string> = {
      'ID': 'id',
      'Type Attribute': 'typeAttribute',
      'Hostname': 'hostname',
      'Domain': 'domain',
      'Datacenter': 'datacenter',
      'Server Room': 'serverRoom',
      'Rack': 'rack',
      'Provision Date': 'provisionDate',
      'Hardware Chassis': 'hardwareChassis',
      'Motherboard': 'motherboard',
      'OS': 'operatingSystemReferenceCode',
      'Public IP': 'primaryIpAddress',
      'Private IP': 'primaryBackendIpAddress',
      'Public VLAN': 'publicVlan',
      'Private VLAN': 'privateVlan',
      'Public Router': 'publicRouter',
      'Private Router': 'privateRouter',
      'Core Count': 'maxCpu',
      'Memory': 'maxMemory',
      'Local Disk Flag': 'localDiskFlag',
      'Public Speed': 'publicNetworkSpeed',
      'Private Speed': 'privateNetworkSpeed',
      'Block Devices': 'blockDevices',
    };
    const items = parseWorksheet(vsiSheet, fieldMap).map(item => ({
      ...item,
      localDiskFlag: String(item.localDiskFlag).toLowerCase() === 'true',
    }));
    if (items.length > 0) data.virtualServers = items;
    log.info(`Consolidated: ${items.length} virtual servers`);
  }

  // Bandwidth sheets — parse all 4 into a combined bandwidthUsage array
  // and build a lookup to enrich device records
  const bandwidthUsage: Record<string, unknown>[] = [];
  const bandwidthByDevice = new Map<string | number, {
    publicAvgInGb?: number;
    publicAvgOutGb?: number;
    privateAvgInGb?: number;
    privateAvgOutGb?: number;
    bandwidthPoolId?: unknown;
  }>();

  const bandwidthSheets: { name: string; direction: 'public' | 'private'; deviceType: 'bareMetal' | 'virtualServer' }[] = [
    { name: 'Bandwidth (Public BM)', direction: 'public', deviceType: 'bareMetal' },
    { name: 'Bandwidth (Public VSI)', direction: 'public', deviceType: 'virtualServer' },
    { name: 'Bandwidth (Private BM)', direction: 'private', deviceType: 'bareMetal' },
    { name: 'Bandwidth (Private VSI)', direction: 'private', deviceType: 'virtualServer' },
  ];

  for (const { name, direction, deviceType } of bandwidthSheets) {
    const sheet = workbook.getWorksheet(name);
    if (!sheet) continue;

    const items = parseBandwidthSheet(sheet, direction, deviceType);
    bandwidthUsage.push(...items);

    // Build per-device bandwidth averages for merging
    for (const item of items) {
      const deviceId = item.id;
      if (deviceId === undefined) continue;

      const key = String(deviceId);
      const existing = bandwidthByDevice.get(key) ?? {};

      if (direction === 'public') {
        existing.publicAvgInGb = Number(item.avgInGb) || 0;
        existing.publicAvgOutGb = Number(item.avgOutGb) || 0;
      } else {
        existing.privateAvgInGb = Number(item.avgInGb) || 0;
        existing.privateAvgOutGb = Number(item.avgOutGb) || 0;
      }
      if (item.poolId !== undefined) {
        existing.bandwidthPoolId = item.poolId;
      }

      bandwidthByDevice.set(key, existing);
    }
  }

  if (bandwidthUsage.length > 0) {
    data.bandwidthUsage = bandwidthUsage;
    log.info(`Consolidated: ${bandwidthUsage.length} bandwidth usage records`);
  }

  // Enrich device records with bandwidth averages
  if (bandwidthByDevice.size > 0) {
    for (const resourceKey of ['bareMetal', 'virtualServers'] as const) {
      const devices = data[resourceKey] as Record<string, unknown>[] | undefined;
      if (!devices) continue;

      for (const device of devices) {
        const bw = bandwidthByDevice.get(String(device.id));
        if (bw) {
          Object.assign(device, {
            publicBandwidthAvgInGb: bw.publicAvgInGb,
            publicBandwidthAvgOutGb: bw.publicAvgOutGb,
            privateBandwidthAvgInGb: bw.privateAvgInGb,
            privateBandwidthAvgOutGb: bw.privateAvgOutGb,
            bandwidthPoolId: bw.bandwidthPoolId,
          });
        }
      }
    }
    log.info(`Enriched device records with bandwidth averages for ${bandwidthByDevice.size} devices`);
  }

  // Bandwidth Pooling sheet
  const poolSheet = workbook.getWorksheet('Bandwidth Pooling');
  if (poolSheet) {
    const fieldMap: Record<string, string> = {
      'Pool ID': 'poolId',
      'Pool Name': 'poolName',
      'Pool Type': 'poolType',
      'Location Group ID': 'locationGroupId',
      'Total Allocated (GB)': 'totalAllocatedGb',
      'Billing Cycle Usage (GB)': 'billingCycleUsageGb',
      'Public Usage Total (GB)': 'publicUsageTotalGb',
      'Allowed Usage (GB)': 'allowedUsageGb',
      'Estimated Usage (GB)': 'estimatedUsageGb',
      'Projected Usage (GB)': 'projectedUsageGb',
      'Device Type': 'deviceType',
      'Device ID': 'deviceId',
      'Device Hostname': 'deviceHostname',
      'Device Domain': 'deviceDomain',
      'Device FQDN': 'deviceFqdn',
      'Device Datacenter': 'deviceDatacenter',
    };
    const items = parseWorksheet(poolSheet, fieldMap);
    if (items.length > 0) data.bandwidthPooling = items;
    log.info(`Consolidated: ${items.length} bandwidth pooling records`);
  }

  return { data, accountInfo };
}
