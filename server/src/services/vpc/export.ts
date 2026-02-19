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

function getField(item: Record<string, unknown>, ...keys: string[]): unknown {
  let current: unknown = item;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

interface VpcExportData {
  data: Record<string, unknown[]>;
  accountName?: string;
}

export async function generateVpcExcelExport(exportData: VpcExportData) {
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IBM VPC Infrastructure Explorer';
  workbook.created = new Date();

  const { data } = exportData;

  // Summary Sheet
  const summary = workbook.addWorksheet('VPC Summary');
  summary.columns = [
    { header: 'Property', key: 'property', width: 30 },
    { header: 'Value', key: 'value', width: 50 },
  ];
  addHeaderStyle(summary);

  summary.addRows([
    { property: 'Export Type', value: 'VPC Infrastructure' },
    { property: 'Export Timestamp', value: new Date().toISOString() },
    { property: '', value: '' },
    { property: 'VPC Resource Type', value: 'Count' },
    { property: 'Virtual Server Instances', value: data.vpcInstances?.length ?? 0 },
    { property: 'Bare Metal Servers', value: data.vpcBareMetalServers?.length ?? 0 },
    { property: 'Dedicated Hosts', value: data.vpcDedicatedHosts?.length ?? 0 },
    { property: 'Placement Groups', value: data.vpcPlacementGroups?.length ?? 0 },
    { property: 'VPCs', value: data.vpcs?.length ?? 0 },
    { property: 'Subnets', value: data.vpcSubnets?.length ?? 0 },
    { property: 'Security Groups', value: data.vpcSecurityGroups?.length ?? 0 },
    { property: 'Floating IPs', value: data.vpcFloatingIps?.length ?? 0 },
    { property: 'Public Gateways', value: data.vpcPublicGateways?.length ?? 0 },
    { property: 'Network ACLs', value: data.vpcNetworkAcls?.length ?? 0 },
    { property: 'Load Balancers', value: data.vpcLoadBalancers?.length ?? 0 },
    { property: 'VPN Gateways', value: data.vpcVpnGateways?.length ?? 0 },
    { property: 'Endpoint Gateways', value: data.vpcEndpointGateways?.length ?? 0 },
    { property: 'Block Storage Volumes', value: data.vpcVolumes?.length ?? 0 },
    { property: 'SSH Keys', value: data.vpcSshKeys?.length ?? 0 },
    { property: 'Images (Private)', value: data.vpcImages?.length ?? 0 },
    { property: 'Flow Log Collectors', value: data.vpcFlowLogCollectors?.length ?? 0 },
    { property: 'Transit Gateways', value: data.transitGateways?.length ?? 0 },
    { property: 'Transit Gateway Connections', value: data.transitGatewayConnections?.length ?? 0 },
    { property: 'Routing Tables', value: data.vpcRoutingTables?.length ?? 0 },
    { property: 'Routes', value: data.vpcRoutes?.length ?? 0 },
  ]);

  // Helper to add a generic resource sheet
  function addSheet(
    name: string,
    items: Record<string, unknown>[],
    columns: Array<{ header: string; key: string; width: number; getter?: (item: Record<string, unknown>) => unknown }>,
  ) {
    if (!items || items.length === 0) return;
    const ws = workbook.addWorksheet(name);
    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    addHeaderStyle(ws);
    for (const item of items) {
      const row: Record<string, unknown> = {};
      for (const col of columns) {
        row[col.key] = col.getter ? col.getter(item) : safeStr(item[col.key]);
      }
      ws.addRow(row);
    }
    autoWidth(ws);
  }

  // vVpcInstances
  addSheet('vVpcInstances', (data.vpcInstances ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Profile', key: 'profile', width: 16, getter: (i) => safeStr(getField(i, 'profile', 'name')) },
    { header: 'vCPUs', key: 'vcpu', width: 8, getter: (i) => getField(i, 'vcpu', 'count') ?? '' },
    { header: 'Memory (GB)', key: 'memory', width: 12, getter: (i) => i.memory ?? '' },
    { header: 'Zone', key: 'zone', width: 16, getter: (i) => safeStr(getField(i, 'zone', 'name')) },
    { header: 'VPC', key: 'vpcName', width: 20, getter: (i) => safeStr(getField(i, 'vpc', 'name')) },
    { header: 'Primary IP', key: 'primaryIp', width: 16, getter: (i) => safeStr(getField(i, 'primary_network_interface', 'primary_ip', 'address')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
    { header: 'Resource Group', key: 'resourceGroup', width: 20, getter: (i) => safeStr(getField(i, 'resource_group', 'name')) },
  ]);

  // vVpcBareMetalServers
  addSheet('vVpcBareMetal', (data.vpcBareMetalServers ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Profile', key: 'profile', width: 16, getter: (i) => safeStr(getField(i, 'profile', 'name')) },
    { header: 'Zone', key: 'zone', width: 16, getter: (i) => safeStr(getField(i, 'zone', 'name')) },
    { header: 'VPC', key: 'vpcName', width: 20, getter: (i) => safeStr(getField(i, 'vpc', 'name')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
    { header: 'Resource Group', key: 'resourceGroup', width: 20, getter: (i) => safeStr(getField(i, 'resource_group', 'name')) },
  ]);

  // vVpcDedicatedHosts
  addSheet('vVpcDedicatedHosts', (data.vpcDedicatedHosts ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'State', key: 'state', width: 14 },
    { header: 'Profile', key: 'profile', width: 16, getter: (i) => safeStr(getField(i, 'profile', 'name')) },
    { header: 'Zone', key: 'zone', width: 16, getter: (i) => safeStr(getField(i, 'zone', 'name')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcs
  addSheet('vVpcs', (data.vpcs ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Classic Access', key: 'classicAccess', width: 14, getter: (i) => i.classic_access ?? '' },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
    { header: 'Resource Group', key: 'resourceGroup', width: 20, getter: (i) => safeStr(getField(i, 'resource_group', 'name')) },
  ]);

  // vVpcSubnets
  addSheet('vVpcSubnets', (data.vpcSubnets ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'CIDR', key: 'cidr', width: 20, getter: (i) => safeStr(i.ipv4_cidr_block ?? i.cidr ?? '') },
    { header: 'Available IPs', key: 'availableIps', width: 14, getter: (i) => i.available_ipv4_address_count ?? i.availableIps ?? '' },
    { header: 'Total IPs', key: 'totalIps', width: 12, getter: (i) => i.total_ipv4_address_count ?? i.totalIps ?? '' },
    { header: 'Zone', key: 'zone', width: 16, getter: (i) => safeStr(getField(i, 'zone', 'name')) },
    { header: 'VPC', key: 'vpcName', width: 20, getter: (i) => safeStr(getField(i, 'vpc', 'name')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcSecurityGroups
  addSheet('vVpcSecurityGroups', (data.vpcSecurityGroups ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'VPC', key: 'vpcName', width: 20, getter: (i) => safeStr(getField(i, 'vpc', 'name')) },
    { header: 'Rules', key: 'ruleCount', width: 8, getter: (i) => (i.rules as unknown[] | undefined)?.length ?? 0 },
    { header: 'Targets', key: 'targetCount', width: 10, getter: (i) => (i.targets as unknown[] | undefined)?.length ?? 0 },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcFloatingIps
  addSheet('vVpcFloatingIps', (data.vpcFloatingIps ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Address', key: 'address', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Target', key: 'target', width: 25, getter: (i) => safeStr(getField(i, 'target', 'name')) },
    { header: 'Zone', key: 'zone', width: 16, getter: (i) => safeStr(getField(i, 'zone', 'name')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcPublicGateways
  addSheet('vVpcPublicGateways', (data.vpcPublicGateways ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'VPC', key: 'vpcName', width: 20, getter: (i) => safeStr(getField(i, 'vpc', 'name')) },
    { header: 'Floating IP', key: 'floatingIp', width: 16, getter: (i) => safeStr(getField(i, 'floating_ip', 'address')) },
    { header: 'Zone', key: 'zone', width: 16, getter: (i) => safeStr(getField(i, 'zone', 'name')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcNetworkAcls
  addSheet('vVpcNetworkAcls', (data.vpcNetworkAcls ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'VPC', key: 'vpcName', width: 20, getter: (i) => safeStr(getField(i, 'vpc', 'name')) },
    { header: 'Rules', key: 'ruleCount', width: 8, getter: (i) => (i.rules as unknown[] | undefined)?.length ?? 0 },
    { header: 'Subnets', key: 'subnetCount', width: 10, getter: (i) => (i.subnets as unknown[] | undefined)?.length ?? 0 },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcLoadBalancers
  addSheet('vVpcLoadBalancers', (data.vpcLoadBalancers ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Hostname', key: 'hostname', width: 40 },
    { header: 'Public', key: 'isPublic', width: 10, getter: (i) => i.is_public ?? i.isPublic ?? '' },
    { header: 'Operating Status', key: 'operatingStatus', width: 18, getter: (i) => safeStr(i.operating_status ?? i.operatingStatus ?? '') },
    { header: 'Provisioning Status', key: 'provisioningStatus', width: 18, getter: (i) => safeStr(i.provisioning_status ?? i.provisioningStatus ?? '') },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcVpnGateways
  addSheet('vVpcVpnGateways', (data.vpcVpnGateways ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Mode', key: 'mode', width: 14 },
    { header: 'Subnet', key: 'subnet', width: 20, getter: (i) => safeStr(getField(i, 'subnet', 'name')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcEndpointGateways
  addSheet('vVpcEndpointGateways', (data.vpcEndpointGateways ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Lifecycle State', key: 'lifecycleState', width: 16, getter: (i) => safeStr(i.lifecycle_state ?? i.lifecycleState ?? '') },
    { header: 'Health State', key: 'healthState', width: 14, getter: (i) => safeStr(i.health_state ?? i.healthState ?? '') },
    { header: 'Target', key: 'target', width: 30, getter: (i) => safeStr(getField(i, 'target', 'name')) },
    { header: 'VPC', key: 'vpcName', width: 20, getter: (i) => safeStr(getField(i, 'vpc', 'name')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcVolumes
  addSheet('vVpcVolumes', (data.vpcVolumes ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Capacity (GB)', key: 'capacity', width: 14 },
    { header: 'IOPS', key: 'iops', width: 10 },
    { header: 'Profile', key: 'profile', width: 16, getter: (i) => safeStr(getField(i, 'profile', 'name')) },
    { header: 'Encryption', key: 'encryption', width: 16 },
    { header: 'Zone', key: 'zone', width: 16, getter: (i) => safeStr(getField(i, 'zone', 'name')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcSshKeys
  addSheet('vVpcSshKeys', (data.vpcSshKeys ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Fingerprint', key: 'fingerprint', width: 50 },
    { header: 'Length', key: 'length', width: 8 },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcImages
  addSheet('vVpcImages', (data.vpcImages ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'OS', key: 'os', width: 30, getter: (i) => safeStr(getField(i, 'os', 'name')) },
    { header: 'Architecture', key: 'architecture', width: 14, getter: (i) => safeStr(getField(i, 'os', 'architecture')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcFlowLogCollectors
  addSheet('vVpcFlowLogs', (data.vpcFlowLogCollectors ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Active', key: 'active', width: 10 },
    { header: 'Lifecycle State', key: 'lifecycleState', width: 16, getter: (i) => safeStr(i.lifecycle_state ?? i.lifecycleState ?? '') },
    { header: 'Target', key: 'target', width: 25, getter: (i) => safeStr(getField(i, 'target', 'name')) },
    { header: 'Storage Bucket', key: 'storageBucket', width: 25, getter: (i) => safeStr(getField(i, 'storage_bucket', 'name')) },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vTransitGateways
  addSheet('vTransitGateways', (data.transitGateways ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Location', key: 'location', width: 16 },
    { header: 'Global', key: 'global', width: 10 },
    { header: 'Created', key: 'created_at', width: 22 },
    { header: 'Resource Group', key: 'resourceGroup', width: 20, getter: (i) => safeStr(getField(i, 'resource_group', 'name')) },
  ]);

  // vTGConnections
  addSheet('vTGConnections', (data.transitGatewayConnections ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Network Type', key: 'networkType', width: 16, getter: (i) => safeStr(i.network_type ?? i.networkType ?? '') },
    { header: 'Transit Gateway', key: 'transitGatewayName', width: 25, getter: (i) => safeStr(getField(i, 'transit_gateway', 'name') ?? i.transitGatewayName ?? '') },
    { header: 'Network ID', key: 'networkId', width: 50, getter: (i) => safeStr(i.network_id ?? i.networkId ?? '') },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcPlacementGroups
  addSheet('vVpcPlacementGroups', (data.vpcPlacementGroups ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Strategy', key: 'strategy', width: 16 },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcRoutingTables
  addSheet('vVpcRoutingTables', (data.vpcRoutingTables ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'VPC', key: 'vpcName', width: 20, getter: (i) => safeStr(i._vpcName ?? getField(i, 'vpc', 'name')) },
    { header: 'Default', key: 'isDefault', width: 10, getter: (i) => i.is_default ?? i.isDefault ?? '' },
    { header: 'Status', key: 'lifecycleState', width: 14, getter: (i) => safeStr(i.lifecycle_state ?? i.lifecycleState ?? '') },
    { header: 'Routes', key: 'routeCount', width: 10, getter: (i) => (i.routes as unknown[] | undefined)?.length ?? i.routeCount ?? 0 },
    { header: 'Subnets', key: 'subnets', width: 30, getter: (i) => {
      const subnets = i.subnets as Array<{ name?: string }> | undefined;
      if (Array.isArray(subnets)) {
        return subnets.map(s => s.name ?? '').filter(Boolean).join(', ');
      }
      return safeStr(i.subnets);
    }},
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  // vVpcRoutes
  addSheet('vVpcRoutes', (data.vpcRoutes ?? []) as Record<string, unknown>[], [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Routing Table', key: 'routingTableName', width: 25, getter: (i) => safeStr(i._routingTableName ?? i.routingTableName ?? '') },
    { header: 'VPC', key: 'vpcName', width: 20, getter: (i) => safeStr(i._vpcName ?? i.vpcName ?? '') },
    { header: 'Destination', key: 'destination', width: 20 },
    { header: 'Action', key: 'action', width: 12 },
    { header: 'Next Hop Type', key: 'nextHopType', width: 16, getter: (i) => {
      const nextHop = i.next_hop as { address?: string; resource_type?: string } | undefined;
      if (nextHop?.address) return 'IP Address';
      if (nextHop?.resource_type) return safeStr(nextHop.resource_type);
      if (i.origin === 'service') return 'Service';
      return safeStr(i.nextHopType ?? '');
    }},
    { header: 'Next Hop Target', key: 'nextHopTarget', width: 25, getter: (i) => {
      const nextHop = i.next_hop as { address?: string; name?: string; id?: string } | undefined;
      if (nextHop?.address) return nextHop.address;
      if (nextHop?.name) return nextHop.name;
      if (nextHop?.id) return nextHop.id;
      return safeStr(i.nextHopTarget ?? '');
    }},
    { header: 'Zone', key: 'zone', width: 16, getter: (i) => safeStr(getField(i, 'zone', 'name')) },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Origin', key: 'origin', width: 12 },
    { header: 'Region', key: 'region', width: 12, getter: (i) => safeStr(i._region) },
    { header: 'Created', key: 'created_at', width: 22 },
  ]);

  logger.info('VPC Excel workbook generated', {
    worksheetCount: workbook.worksheets.length,
  });

  return workbook;
}
