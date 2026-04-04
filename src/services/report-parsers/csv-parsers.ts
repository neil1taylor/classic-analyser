import type { ReportParserResult } from './types';
import { parseCsvText, csvRowsToObjects } from './csv-utils';
import { createLogger } from '@/utils/logger';

const log = createLogger('ReportCSV');

/**
 * Parse the warnings CSV ({id}.csv).
 * Columns: ID, Name, Location, Priority, Warning, Issue, Type, Recommendation
 */
export function parseWarningsCsv(text: string): ReportParserResult {
  const rows = parseCsvText(text);
  const fieldMap: Record<string, string> = {
    'ID': 'id',
    'Name': 'name',
    'Location': 'location',
    'Priority': 'priority',
    'Warning': 'warning',
    'Issue': 'issue',
    'Type': 'type',
    'Recommendation': 'recommendation',
  };

  const items = csvRowsToObjects(rows, fieldMap);
  log.info(`Parsed ${items.length} warnings from CSV`);

  return { data: { reportWarnings: items } };
}

/**
 * Parse the gateway CSV ({id}_gw.csv).
 * Contains 3 sections separated by header rows:
 *   - Direct Link 2 Tenants
 *   - Transit Gateways
 *   - Transit Gateway Connections
 */
export function parseGatewayCsv(text: string): ReportParserResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const data: Record<string, unknown[]> = {};

  // Split into sections by finding section title lines
  const sections: { title: string; lines: string[] }[] = [];
  let currentSection: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    // Section titles are lines that don't contain commas (or very few)
    // and match known section names. Strip trailing commas for matching.
    const stripped = line.replace(/,+$/, '').trim();
    if (
      stripped === 'Direct Link 2 Tenants' ||
      stripped === 'Transit Gateways' ||
      stripped === 'Transit Gateway Connections'
    ) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: stripped, lines: [] };
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }
  if (currentSection) sections.push(currentSection);

  for (const section of sections) {
    const rows = section.lines.map(l => {
      const parsed = parseCsvText(l);
      return parsed[0] || [];
    });

    if (rows.length < 2) continue;

    if (section.title === 'Direct Link 2 Tenants') {
      const fieldMap: Record<string, string> = {
        'Id': 'id', 'Name': 'name', 'Location': 'location',
        'LocalIp': 'localIp', 'RemoteIp': 'remoteIp',
        'Link Speed': 'linkSpeed', 'Link Status': 'linkStatus',
        'BGP Status': 'bgpStatus', 'Operational Status': 'operationalStatus',
      };
      data.directLinkGateways = csvRowsToObjects(rows, fieldMap);
      log.info(`Parsed ${data.directLinkGateways.length} Direct Link tenants`);
    } else if (section.title === 'Transit Gateways') {
      const fieldMap: Record<string, string> = {
        'Id': 'id', 'Name': 'name', 'Datacenters': 'datacenters',
        'Zones': 'zones', 'Status': 'status', 'Global': 'global',
      };
      const items = csvRowsToObjects(rows, fieldMap).map(item => ({
        ...item,
        global: String(item.global).toLowerCase() === 'true',
      }));
      data.classicTransitGateways = items;
      log.info(`Parsed ${items.length} Transit Gateways`);
    } else if (section.title === 'Transit Gateway Connections') {
      const fieldMap: Record<string, string> = {
        'Id': 'id', 'Name': 'name', 'Gateway': 'gatewayId',
        'Datacenters': 'datacenters', 'Zone': 'zone',
        'Network Type': 'networkType', 'Base Network Type': 'baseNetworkType',
        'Local Gatway': 'localGatewayIp', 'Local Tunnel': 'localTunnelIp',
        'Remote Gateway': 'remoteGatewayIp', 'Remote Tunnel': 'remoteTunnelIp',
        'Status': 'status',
      };
      data.classicTransitGatewayConnections = csvRowsToObjects(rows, fieldMap);
      log.info(`Parsed ${data.classicTransitGatewayConnections.length} Transit Gateway Connections`);
    }
  }

  return { data };
}

/**
 * Parse the NAS/File Storage CSV ({id}_nas.csv).
 * Columns: ID, name, DatacenterName, nasType, storageType, capacityGb, totalBytesUsed, percent, provisionedIops, notes
 * First 2 rows are a datacenter summary + blank line, skip them.
 */
export function parseNasCsv(text: string): ReportParserResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  // Find the actual header row (starts with "ID,name")
  let headerIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('ID,')) {
      headerIdx = i;
      break;
    }
  }

  const dataLines = lines.slice(headerIdx);
  const rows = parseCsvText(dataLines.join('\n'));

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

  const items: Record<string, unknown>[] = csvRowsToObjects(rows, fieldMap).map(item => ({
    ...item,
    // Decode URL-encoded notes
    notes: typeof item.notes === 'string' ? decodeURIComponent(item.notes) : item.notes,
  }));

  // Split by nasType: ISCSI/NAS_CONTAINER → blockStorage, NAS → fileStorage
  const fileStorage: Record<string, unknown>[] = [];
  const blockStorage: Record<string, unknown>[] = [];
  for (const item of items) {
    const nasType = String(item.nasType ?? '').toUpperCase();
    if (nasType === 'ISCSI' || nasType === 'NAS_CONTAINER') {
      blockStorage.push(item);
    } else {
      fileStorage.push(item);
    }
  }

  const data: Record<string, unknown[]> = {};
  if (fileStorage.length > 0) data.fileStorage = fileStorage;
  if (blockStorage.length > 0) data.blockStorage = blockStorage;

  log.info(`Parsed ${fileStorage.length} file storage + ${blockStorage.length} block storage items from NAS CSV`);
  return { data };
}

/**
 * Parse the security groups CSV ({id}_securitygroups.csv).
 * First line is "Security Groups" title, skip it.
 * Columns: Security Group Id, Name, Description, Attached Network Components, Attached Virtual Hosts
 */
export function parseSecurityGroupsCsv(text: string): ReportParserResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  // Find header row (starts with "Security Group Id")
  let headerIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Security Group Id')) {
      headerIdx = i;
      break;
    }
  }

  const dataLines = lines.slice(headerIdx);
  const rows = parseCsvText(dataLines.join('\n'));

  const fieldMap: Record<string, string> = {
    'Security Group Id': 'id',
    'Name': 'name',
    'Description': 'description',
    'Attached Network Components': 'attachedComponents',
    'Attached Virtual Hosts': 'attachedHosts',
  };

  const items = csvRowsToObjects(rows, fieldMap);
  log.info(`Parsed ${items.length} Security Groups`);

  return { data: { securityGroups: items } };
}
