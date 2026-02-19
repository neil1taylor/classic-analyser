import type { Worksheet, Column, CellValue } from 'exceljs';
import logger from '../../utils/logger.js';

async function getExcelJS() {
  return (await import('exceljs')).default;
}

function addHeaderStyle(worksheet: Worksheet): void {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F62FE' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 24;
}

function autoWidth(worksheet: Worksheet): void {
  worksheet.columns.forEach((column: Partial<Column>) => {
    if (!column || !column.values) return;
    let maxLength = 10;
    (column.values as ReadonlyArray<CellValue>).forEach((val: CellValue) => {
      const length = val ? String(val).length : 0;
      if (length > maxLength) maxLength = Math.min(length, 60);
    });
    column.width = maxLength + 2;
  });
}

function safeStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface PowerVsExportData {
  data: Record<string, unknown[]>;
  accountName?: string;
}

export async function generatePowerVsExcelExport(exportData: PowerVsExportData) {
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IBM PowerVS Infrastructure Explorer';
  workbook.created = new Date();

  const { data } = exportData;

  // Summary Sheet
  const summary = workbook.addWorksheet('PowerVS Summary');
  summary.columns = [
    { header: 'Property', key: 'property', width: 30 },
    { header: 'Value', key: 'value', width: 50 },
  ];
  addHeaderStyle(summary);

  summary.addRows([
    { property: 'Export Type', value: 'PowerVS Infrastructure' },
    { property: 'Export Timestamp', value: new Date().toISOString() },
    { property: '', value: '' },
    { property: 'PowerVS Resource Type', value: 'Count' },
    { property: 'Workspaces', value: data.pvsWorkspaces?.length ?? 0 },
    { property: 'PVM Instances', value: data.pvsInstances?.length ?? 0 },
    { property: 'Shared Processor Pools', value: data.pvsSharedProcessorPools?.length ?? 0 },
    { property: 'Placement Groups', value: data.pvsPlacementGroups?.length ?? 0 },
    { property: 'Host Groups', value: data.pvsHostGroups?.length ?? 0 },
    { property: 'Networks', value: data.pvsNetworks?.length ?? 0 },
    { property: 'Network Ports', value: data.pvsNetworkPorts?.length ?? 0 },
    { property: 'Network Security Groups', value: data.pvsNetworkSecurityGroups?.length ?? 0 },
    { property: 'Cloud Connections', value: data.pvsCloudConnections?.length ?? 0 },
    { property: 'DHCP Servers', value: data.pvsDhcpServers?.length ?? 0 },
    { property: 'VPN Connections', value: data.pvsVpnConnections?.length ?? 0 },
    { property: 'IKE Policies', value: data.pvsIkePolicies?.length ?? 0 },
    { property: 'IPSec Policies', value: data.pvsIpsecPolicies?.length ?? 0 },
    { property: 'Volumes', value: data.pvsVolumes?.length ?? 0 },
    { property: 'Volume Groups', value: data.pvsVolumeGroups?.length ?? 0 },
    { property: 'Snapshots', value: data.pvsSnapshots?.length ?? 0 },
    { property: 'SSH Keys', value: data.pvsSshKeys?.length ?? 0 },
    { property: 'Images', value: data.pvsImages?.length ?? 0 },
    { property: 'Stock Images', value: data.pvsStockImages?.length ?? 0 },
    { property: 'System Pools', value: data.pvsSystemPools?.length ?? 0 },
    { property: 'SAP Profiles', value: data.pvsSapProfiles?.length ?? 0 },
    { property: 'Events', value: data.pvsEvents?.length ?? 0 },
  ]);

  function addSheet(
    name: string,
    items: Record<string, unknown>[],
    columns: Array<{ header: string; key: string; width: number }>,
  ) {
    if (!items || items.length === 0) return;
    const ws = workbook.addWorksheet(name);
    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    addHeaderStyle(ws);
    for (const item of items) {
      const row: Record<string, unknown> = {};
      for (const col of columns) {
        row[col.key] = safeStr(item[col.key]);
      }
      ws.addRow(row);
    }
    autoWidth(ws);
  }

  // Add sheets for each resource type using transformed (flat) data
  const sheetConfigs: Array<{ key: string; name: string; cols: Array<{ header: string; key: string; width: number }> }> = [
    { key: 'pvsWorkspaces', name: 'pPvsWorkspaces', cols: [
      { header: 'GUID', key: 'guid', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'Zone', key: 'zone', width: 16 }, { header: 'Region', key: 'region', width: 12 },
      { header: 'Resource Group', key: 'resourceGroupName', width: 20 }, { header: 'State', key: 'state', width: 12 },
    ]},
    { key: 'pvsInstances', name: 'pPvsInstances', cols: [
      { header: 'ID', key: 'pvmInstanceID', width: 40 }, { header: 'Name', key: 'serverName', width: 25 },
      { header: 'Status', key: 'status', width: 14 }, { header: 'System Type', key: 'sysType', width: 14 },
      { header: 'Processors', key: 'processors', width: 12 }, { header: 'Proc Type', key: 'procType', width: 12 },
      { header: 'Memory (GB)', key: 'memory', width: 12 }, { header: 'OS Type', key: 'osType', width: 14 },
      { header: 'Primary IP', key: 'primaryIp', width: 16 }, { header: 'Storage Type', key: 'storageType', width: 14 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsVolumes', name: 'pPvsVolumes', cols: [
      { header: 'ID', key: 'volumeID', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'State', key: 'state', width: 14 }, { header: 'Size (GB)', key: 'size', width: 12 },
      { header: 'Disk Type', key: 'diskType', width: 14 }, { header: 'Bootable', key: 'bootable', width: 10 },
      { header: 'Shareable', key: 'shareable', width: 10 }, { header: 'Attached To', key: 'pvmInstanceName', width: 25 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsNetworks', name: 'pPvsNetworks', cols: [
      { header: 'ID', key: 'networkID', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'Type', key: 'type', width: 12 }, { header: 'VLAN ID', key: 'vlanID', width: 10 },
      { header: 'CIDR', key: 'cidr', width: 20 }, { header: 'Gateway', key: 'gateway', width: 16 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsNetworkPorts', name: 'pPvsNetPorts', cols: [
      { header: 'Port ID', key: 'portID', width: 40 }, { header: 'IP Address', key: 'ipAddress', width: 16 },
      { header: 'MAC Address', key: 'macAddress', width: 20 }, { header: 'Status', key: 'status', width: 14 },
      { header: 'Network', key: 'networkName', width: 20 }, { header: 'Instance', key: 'pvmInstanceName', width: 25 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsSshKeys', name: 'pPvsSshKeys', cols: [
      { header: 'Name', key: 'name', width: 25 }, { header: 'Key (truncated)', key: 'sshKey', width: 50 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsImages', name: 'pPvsImages', cols: [
      { header: 'ID', key: 'imageID', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'State', key: 'state', width: 14 }, { header: 'OS', key: 'operatingSystem', width: 20 },
      { header: 'Architecture', key: 'architecture', width: 14 }, { header: 'Size (GB)', key: 'size', width: 12 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsStockImages', name: 'pPvsStockImages', cols: [
      { header: 'ID', key: 'imageID', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'State', key: 'state', width: 14 }, { header: 'OS', key: 'operatingSystem', width: 20 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsSnapshots', name: 'pPvsSnapshots', cols: [
      { header: 'ID', key: 'snapshotID', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'Status', key: 'status', width: 14 }, { header: '% Complete', key: 'percentComplete', width: 12 },
      { header: 'Instance', key: 'pvmInstanceName', width: 25 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsCloudConnections', name: 'pPvsCloudConns', cols: [
      { header: 'ID', key: 'cloudConnectionID', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'Speed (Mbps)', key: 'speed', width: 14 }, { header: 'Global Routing', key: 'globalRouting', width: 14 },
      { header: 'Transit Enabled', key: 'transitEnabled', width: 14 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsVpnConnections', name: 'pPvsVpnConns', cols: [
      { header: 'ID', key: 'id', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'Status', key: 'status', width: 14 }, { header: 'Mode', key: 'mode', width: 14 },
      { header: 'Peer Address', key: 'peerAddress', width: 16 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsSharedProcessorPools', name: 'pPvsSPPools', cols: [
      { header: 'ID', key: 'id', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'Reserved Cores', key: 'reservedCores', width: 14 },
      { header: 'Allocated Cores', key: 'allocatedCores', width: 14 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
    { key: 'pvsPlacementGroups', name: 'pPvsPlacementGrps', cols: [
      { header: 'ID', key: 'id', width: 40 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'Policy', key: 'policy', width: 14 }, { header: 'Members', key: 'memberCount', width: 10 },
      { header: 'Workspace', key: 'workspace', width: 20 }, { header: 'Zone', key: 'zone', width: 12 },
    ]},
  ];

  for (const config of sheetConfigs) {
    const items = data[config.key] as Record<string, unknown>[] | undefined;
    if (items) {
      addSheet(config.name, items, config.cols);
    }
  }

  logger.info('PowerVS Excel workbook generated', {
    worksheetCount: workbook.worksheets.length,
  });

  return workbook;
}
