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

    if (hasValue) rows.push(obj);
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
    if (items.length > 0) data.fileStorage = items;
    log.info(`Assessment: ${items.length} storage volumes`);
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
