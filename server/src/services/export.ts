// Lazy-load ExcelJS to avoid blocking server startup (it's a large package)
import type { Worksheet, Column, CellValue } from 'exceljs';
import type { CollectedData } from './softlayer/types.js';
import logger from '../utils/logger.js';

async function getExcelJS() {
  return (await import('exceljs')).default;
}

function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return JSON.stringify(item);
        }
        return String(item);
      })
      .join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}


interface BillingItemLike {
  hourlyRecurringFee?: string;
  children?: Array<{ hourlyRecurringFee?: string }>;
}

function sumBillingItemHourlyFees(billingItem?: BillingItemLike): number {
  if (!billingItem) return 0;
  let total = Number(billingItem.hourlyRecurringFee ?? 0);
  if (billingItem.children && Array.isArray(billingItem.children)) {
    for (const child of billingItem.children) {
      total += Number(child.hourlyRecurringFee ?? 0);
    }
  }
  return total;
}

function addHeaderStyle(worksheet: Worksheet): void {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F62FE' },
  };
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
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

export async function generateExcelExport(
  data: CollectedData,
  accountName: string
) {
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IBM Cloud Infrastructure Explorer';
  workbook.created = new Date();

  // Summary Sheet
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Property', key: 'property', width: 30 },
    { header: 'Value', key: 'value', width: 50 },
  ];
  addHeaderStyle(summary);

  summary.addRows([
    { property: 'Account Name', value: accountName },
    { property: 'Account ID', value: data.account?.id ?? '' },
    { property: 'Account Email', value: data.account?.email ?? '' },
    { property: 'Account Owner', value: `${data.account?.firstName ?? ''} ${data.account?.lastName ?? ''}`.trim() },
    { property: 'Collection Timestamp', value: data.collectionTimestamp },
    { property: 'Collection Duration (ms)', value: data.collectionDurationMs },
    { property: 'Errors During Collection', value: data.errors.length },
    { property: '', value: '' },
    { property: 'Resource Type', value: 'Count' },
    { property: 'Virtual Servers', value: data.virtualGuests.length },
    { property: 'Bare Metal Servers', value: data.hardware.length },
    { property: 'Dedicated Hosts', value: data.dedicatedHosts.length },
    { property: 'Placement Groups', value: data.placementGroups.length },
    { property: 'Reserved Capacity', value: data.reservedCapacity.length },
    { property: 'Image Templates', value: data.imageTemplates.length },
    { property: 'VLANs', value: data.vlans.length },
    { property: 'Subnets', value: data.subnets.length },
    { property: 'Network Gateways', value: data.gateways.length },
    { property: 'Firewalls', value: data.firewalls.length },
    { property: 'Security Groups', value: data.securityGroups.length },
    { property: 'Load Balancers', value: data.loadBalancers.length },
    { property: 'VPN Tunnels', value: data.vpnTunnels.length },
    { property: 'Block Storage', value: data.blockStorage.length },
    { property: 'File Storage', value: data.fileStorage.length },
    { property: 'Object Storage', value: data.objectStorage.length },
    { property: 'SSL Certificates', value: data.sslCertificates.length },
    { property: 'SSH Keys', value: data.sshKeys.length },
    { property: 'DNS Domains', value: data.domains.length },
    { property: 'DNS Records', value: data.dnsRecords.length },
    { property: 'Security Group Rules', value: data.securityGroupRules.length },
    { property: 'Billing Items', value: data.billingItems.length },
    { property: 'Users', value: data.users.length },
    { property: 'Event Log Entries', value: data.eventLog.length },
    { property: 'Relationships', value: data.relationships.length },
    { property: '', value: '' },
    { property: 'VMware Resource Type', value: 'Count' },
    { property: 'VCF for Classic Instances', value: data.vmwareInstances?.length ?? 0 },
    { property: 'VCF for Classic Clusters', value: data.vmwareClusters?.length ?? 0 },
    { property: 'VCF for Classic Hosts', value: data.vmwareHosts?.length ?? 0 },
    { property: 'VCF for Classic VLANs', value: data.vmwareVlans?.length ?? 0 },
    { property: 'VCF for Classic Subnets', value: data.vmwareSubnets?.length ?? 0 },
    { property: 'VCFaaS Director Sites', value: data.directorSites?.length ?? 0 },
    { property: 'VCFaaS PVDCs', value: data.pvdcs?.length ?? 0 },
    { property: 'VCFaaS Clusters', value: data.vcfClusters?.length ?? 0 },
    { property: 'VCFaaS vDCs', value: data.vdcs?.length ?? 0 },
    { property: 'VCFaaS Multitenant Sites', value: data.multitenantSites?.length ?? 0 },
    { property: 'VMware Cross-References', value: data.vmwareCrossReferences?.length ?? 0 },
  ]);

  // vVirtualServers
  const wsVSI = workbook.addWorksheet('vVirtualServers');
  wsVSI.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Hostname', key: 'hostname', width: 20 },
    { header: 'Domain', key: 'domain', width: 25 },
    { header: 'FQDN', key: 'fqdn', width: 40 },
    { header: 'Primary IP', key: 'primaryIp', width: 16 },
    { header: 'Backend IP', key: 'backendIp', width: 16 },
    { header: 'CPU', key: 'maxCpu', width: 8 },
    { header: 'Memory (MB)', key: 'maxMemory', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Power State', key: 'powerState', width: 12 },
    { header: 'Datacenter', key: 'datacenter', width: 12 },
    { header: 'OS', key: 'os', width: 30 },
    { header: 'Hourly Billing', key: 'hourlyBilling', width: 14 },
    { header: 'Create Date', key: 'createDate', width: 22 },
    { header: 'Classic Monthly Fee', key: 'recurringFee', width: 18 },
    { header: 'Cost Basis', key: 'costBasis', width: 12 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Private Only', key: 'privateNetworkOnly', width: 12 },
    { header: 'Local Disk', key: 'localDisk', width: 10 },
    { header: 'Start CPUs', key: 'startCpus', width: 12 },
    { header: 'Modified', key: 'modifyDate', width: 22 },
    { header: 'Dedicated', key: 'dedicated', width: 10 },
    { header: 'Placement Group', key: 'placementGroupId', width: 16 },
    { header: 'Tags', key: 'tags', width: 30 },
    { header: 'Disk (GB)', key: 'diskGb', width: 12 },
    { header: 'VLANs', key: 'networkVlans', width: 30 },
  ];
  addHeaderStyle(wsVSI);

  for (const vsi of data.virtualGuests) {
    const r = vsi as unknown as Record<string, unknown>;

    wsVSI.addRow({
      id: vsi.id,
      hostname: vsi.hostname,
      domain: vsi.domain,
      fqdn: vsi.fullyQualifiedDomainName ?? r.fqdn ?? '',
      primaryIp: vsi.primaryIpAddress ?? r.primaryIp ?? '',
      backendIp: vsi.primaryBackendIpAddress ?? r.backendIp ?? '',
      maxCpu: vsi.maxCpu,
      maxMemory: vsi.maxMemory,
      status: typeof r.status === 'string' ? r.status : (vsi.status?.name ?? vsi.status?.keyName ?? ''),
      powerState: typeof r.powerState === 'string' ? r.powerState : (vsi.powerState?.name ?? vsi.powerState?.keyName ?? ''),
      datacenter: typeof r.datacenter === 'string' ? r.datacenter : (vsi.datacenter?.name ?? ''),
      os: r.os ?? (vsi.operatingSystem?.softwareDescription?.name
        ? `${vsi.operatingSystem.softwareDescription.name} ${vsi.operatingSystem.softwareDescription.version ?? ''}`
        : ''),
      hourlyBilling: (vsi.hourlyBillingFlag ?? r.hourlyBilling) ? 'Yes' : 'No',
      createDate: vsi.createDate,
      recurringFee: (() => {
        const monthly = vsi.billingItem?.recurringFee ?? r.recurringFee;
        if (monthly && Number(monthly) > 0) return monthly;
        const isHourly = vsi.hourlyBillingFlag ?? r.hourlyBilling;
        if (isHourly) {
          const totalHourly = sumBillingItemHourlyFees(vsi.billingItem);
          if (totalHourly > 0) return Math.round(totalHourly * 730 * 100) / 100;
        }
        return monthly ?? '';
      })(),
      costBasis: (() => {
        const monthly = vsi.billingItem?.recurringFee ?? r.recurringFee;
        if (monthly && Number(monthly) > 0) return 'Monthly';
        const isHourly = vsi.hourlyBillingFlag ?? r.hourlyBilling;
        if (isHourly) {
          const totalHourly = sumBillingItemHourlyFees(vsi.billingItem);
          if (totalHourly > 0) return 'Estimated';
        }
        return '';
      })(),
      notes: vsi.notes ?? '',
      privateNetworkOnly: (vsi.privateNetworkOnlyFlag ?? r.privateNetworkOnly) ? 'Yes' : 'No',
      localDisk: (vsi.localDiskFlag ?? r.localDisk) ? 'Yes' : 'No',
      startCpus: r.startCpus ?? '',
      modifyDate: r.modifyDate ?? '',
      dedicated: r.dedicated ? 'Yes' : (r.dedicated === false ? 'No' : ''),
      placementGroupId: r.placementGroupId ?? '',
      tags: r.tags ?? '',
      diskGb: r.diskGb ?? '',
      networkVlans: r.networkVlans ?? '',
    });
  }
  autoWidth(wsVSI);

  // vBareMetal
  const wsBM = workbook.addWorksheet('vBareMetal');
  wsBM.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Hostname', key: 'hostname', width: 20 },
    { header: 'Domain', key: 'domain', width: 25 },
    { header: 'FQDN', key: 'fqdn', width: 40 },
    { header: 'Serial Number', key: 'serialNumber', width: 20 },
    { header: 'Primary IP', key: 'primaryIp', width: 16 },
    { header: 'Backend IP', key: 'backendIp', width: 16 },
    { header: 'Cores', key: 'cores', width: 10 },
    { header: 'Memory (GB)', key: 'memory', width: 14 },
    { header: 'Datacenter', key: 'datacenter', width: 12 },
    { header: 'OS', key: 'os', width: 30 },
    { header: 'Classic Monthly Fee', key: 'recurringFee', width: 14 },
    { header: 'Provision Date', key: 'provisionDate', width: 22 },
    { header: 'Power Supplies', key: 'powerSupplyCount', width: 14 },
    { header: 'Gateway Member', key: 'gatewayMember', width: 14 },
    { header: 'VMware Role', key: 'vmwareRole', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Hard Drives', key: 'hardDrives', width: 30 },
    { header: 'Network Components', key: 'networkComponents', width: 40 },
    { header: 'VLANs', key: 'networkVlans', width: 30 },
    { header: 'Tags', key: 'tags', width: 30 },
  ];
  addHeaderStyle(wsBM);

  for (const hw of data.hardware) {
    const r = hw as unknown as Record<string, unknown>;

    wsBM.addRow({
      id: hw.id,
      hostname: hw.hostname,
      domain: hw.domain,
      fqdn: hw.fullyQualifiedDomainName ?? r.fqdn ?? '',
      serialNumber: hw.manufacturerSerialNumber ?? r.serialNumber ?? '',
      primaryIp: hw.primaryIpAddress ?? r.primaryIp ?? '',
      backendIp: hw.primaryBackendIpAddress ?? r.backendIp ?? '',
      cores: hw.processorPhysicalCoreAmount ?? r.cores ?? '',
      memory: hw.memoryCapacity ?? r.memory ?? '',
      datacenter: typeof r.datacenter === 'string' ? r.datacenter : (hw.datacenter?.name ?? ''),
      os: r.os ?? (hw.operatingSystem?.softwareDescription?.name
        ? `${hw.operatingSystem.softwareDescription.name} ${hw.operatingSystem.softwareDescription.version ?? ''}`
        : ''),
      recurringFee: hw.billingItem?.recurringFee ?? r.recurringFee ?? '',
      provisionDate: hw.provisionDate,
      powerSupplyCount: hw.powerSupplyCount,
      gatewayMember: (hw.networkGatewayMemberFlag ?? r.gatewayMember) ? 'Yes' : 'No',
      vmwareRole: r.vmwareRole ?? '',
      notes: hw.notes ?? '',
      hardDrives: r.hardDrives ?? '',
      networkComponents: r.networkComponents ?? '',
      networkVlans: r.networkVlans ?? '',
      tags: r.tags ?? '',
    });
  }
  autoWidth(wsBM);

  // vVLANs
  const wsVLAN = workbook.addWorksheet('vVLANs');
  wsVLAN.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'VLAN Number', key: 'vlanNumber', width: 14 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Network Space', key: 'networkSpace', width: 14 },
    { header: 'Primary Router', key: 'primaryRouter', width: 20 },
    { header: 'Datacenter', key: 'datacenter', width: 12 },
    { header: 'Subnet Count', key: 'subnetCount', width: 14 },
    { header: 'Firewall Components', key: 'firewallComponents', width: 18 },
    { header: 'Gateway', key: 'gateway', width: 20 },
  ];
  addHeaderStyle(wsVLAN);

  for (const vlan of data.vlans) {
    const r = vlan as unknown as Record<string, unknown>;
    wsVLAN.addRow({
      id: vlan.id,
      vlanNumber: vlan.vlanNumber,
      name: vlan.name ?? '',
      networkSpace: vlan.networkSpace,
      primaryRouter: typeof r.primaryRouter === 'string' ? r.primaryRouter : (vlan.primaryRouter?.hostname ?? ''),
      datacenter: typeof r.datacenter === 'string' ? r.datacenter : (vlan.primaryRouter?.datacenter?.name ?? ''),
      subnetCount: vlan.subnets?.length ?? r.virtualGuestCount ?? 0,
      firewallComponents: vlan.firewallGuestNetworkComponents?.length ?? 0,
      gateway: typeof r.gateway === 'string' ? r.gateway : (vlan.attachedNetworkGateway
        ? `${vlan.attachedNetworkGateway.name ?? ''} (${vlan.attachedNetworkGateway.id ?? ''})`
        : ''),
    });
  }
  autoWidth(wsVLAN);

  // vSubnets
  const wsSub = workbook.addWorksheet('vSubnets');
  wsSub.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Network', key: 'networkIdentifier', width: 20 },
    { header: 'CIDR', key: 'cidr', width: 8 },
    { header: 'Type', key: 'subnetType', width: 14 },
    { header: 'Gateway', key: 'gateway', width: 16 },
    { header: 'Broadcast', key: 'broadcastAddress', width: 16 },
    { header: 'Usable IPs', key: 'usableIpAddressCount', width: 12 },
    { header: 'Total IPs', key: 'totalIpAddresses', width: 12 },
    { header: 'VLAN', key: 'vlanNumber', width: 12 },
    { header: 'Datacenter', key: 'datacenter', width: 12 },
  ];
  addHeaderStyle(wsSub);

  for (const subnet of data.subnets) {
    const r = subnet as unknown as Record<string, unknown>;
    wsSub.addRow({
      id: subnet.id,
      networkIdentifier: subnet.networkIdentifier,
      cidr: subnet.cidr,
      subnetType: subnet.subnetType,
      gateway: subnet.gateway,
      broadcastAddress: subnet.broadcastAddress,
      usableIpAddressCount: subnet.usableIpAddressCount,
      totalIpAddresses: subnet.totalIpAddresses,
      vlanNumber: subnet.networkVlan?.vlanNumber ?? r.vlanNumber ?? '',
      datacenter: typeof r.datacenter === 'string' ? r.datacenter : (subnet.datacenter?.name ?? ''),
    });
  }
  autoWidth(wsSub);

  // vGateways
  const wsGW = workbook.addWorksheet('vGateways');
  wsGW.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Network Space', key: 'networkSpace', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Public IP', key: 'publicIp', width: 16 },
    { header: 'Private IP', key: 'privateIp', width: 16 },
    { header: 'Members', key: 'memberCount', width: 12 },
    { header: 'Inside VLANs', key: 'insideVlanCount', width: 12 },
  ];
  addHeaderStyle(wsGW);

  for (const gw of data.gateways) {
    const r = gw as unknown as Record<string, unknown>;
    const membersArr = gw.members ?? [];
    const insideArr = gw.insideVlans ?? [];

    wsGW.addRow({
      id: gw.id,
      name: gw.name,
      networkSpace: gw.networkSpace,
      status: typeof r.status === 'string' ? r.status : (gw.status?.keyName ?? ''),
      publicIp: typeof r.publicIp === 'string' ? r.publicIp : (gw.publicIpAddress?.ipAddress ?? ''),
      privateIp: typeof r.privateIp === 'string' ? r.privateIp : (gw.privateIpAddress?.ipAddress ?? ''),
      memberCount: r.memberCount ?? membersArr.length,
      insideVlanCount: r.insideVlanCount ?? insideArr.length,
    });
  }
  autoWidth(wsGW);

  // vFirewalls
  const wsFW = workbook.addWorksheet('vFirewalls');
  wsFW.columns = [
    { header: 'Primary IP', key: 'primaryIpAddress', width: 16 },
    { header: 'Type', key: 'firewallType', width: 20 },
    { header: 'VLAN', key: 'vlanNumber', width: 12 },
    { header: 'Datacenter', key: 'datacenter', width: 12 },
    { header: 'Classic Monthly Fee', key: 'recurringFee', width: 14 },
    { header: 'Rules', key: 'ruleCount', width: 12 },
    { header: 'ID', key: 'id', width: 12 },
  ];
  addHeaderStyle(wsFW);

  for (const fw of data.firewalls) {
    const r = fw as unknown as Record<string, unknown>;
    wsFW.addRow({
      id: fw.id,
      primaryIpAddress: fw.primaryIpAddress,
      firewallType: fw.firewallType,
      vlanNumber: fw.networkVlan?.vlanNumber ?? r.vlanNumber ?? '',
      recurringFee: fw.billingItem?.recurringFee ?? r.recurringFee ?? '',
      datacenter: typeof r.datacenter === 'string' ? r.datacenter : (fw.datacenter?.name ?? ''),
      ruleCount: fw.rules?.length ?? r.ruleCount ?? 0,
    });
  }
  autoWidth(wsFW);

  // vSecurityGroups
  const wsSG = workbook.addWorksheet('vSecurityGroups');
  wsSG.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Created', key: 'createDate', width: 22 },
    { header: 'Modified', key: 'modifyDate', width: 22 },
    { header: 'Rules', key: 'ruleCount', width: 12 },
    { header: 'Bindings', key: 'bindingCount', width: 14 },
  ];
  addHeaderStyle(wsSG);

  for (const sg of data.securityGroups) {
    const r = sg as unknown as Record<string, unknown>;

    wsSG.addRow({
      id: sg.id,
      name: sg.name,
      description: sg.description,
      createDate: sg.createDate,
      modifyDate: sg.modifyDate,
      ruleCount: sg.rules?.length ?? r.ruleCount ?? 0,
      bindingCount: r.bindingCount ?? (sg.networkComponentBindings ?? []).length,
    });
  }
  autoWidth(wsSG);

  // vSecurityGroupRules
  const wsSGR = workbook.addWorksheet('vSecurityGroupRules');
  wsSGR.columns = [
    { header: 'Security Group ID', key: 'securityGroupId', width: 18 },
    { header: 'Security Group Name', key: 'securityGroupName', width: 22 },
    { header: 'Rule ID', key: 'id', width: 12 },
    { header: 'Direction', key: 'direction', width: 12 },
    { header: 'Protocol', key: 'protocol', width: 12 },
    { header: 'Port Min', key: 'portRangeMin', width: 10 },
    { header: 'Port Max', key: 'portRangeMax', width: 10 },
    { header: 'Remote IP', key: 'remoteIp', width: 18 },
    { header: 'Remote Group ID', key: 'remoteGroupId', width: 16 },
  ];
  addHeaderStyle(wsSGR);

  for (const rule of data.securityGroupRules) {
    wsSGR.addRow({
      securityGroupId: rule.securityGroupId,
      securityGroupName: rule.securityGroupName,
      id: rule.id,
      direction: rule.direction ?? '',
      protocol: rule.protocol ?? '',
      portRangeMin: rule.portRangeMin ?? '',
      portRangeMax: rule.portRangeMax ?? '',
      remoteIp: rule.remoteIp ?? '',
      remoteGroupId: rule.remoteGroupId ?? '',
    });
  }
  autoWidth(wsSGR);

  // vLoadBalancers
  const wsLB = workbook.addWorksheet('vLoadBalancers');
  wsLB.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'IP Address', key: 'ipAddress', width: 16 },
    { header: 'Type', key: 'loadBalancerType', width: 12 },
    { header: 'Connection Limit', key: 'connectionLimit', width: 16 },
    { header: 'Classic Monthly Fee', key: 'recurringFee', width: 14 },
    { header: 'Virtual Servers', key: 'virtualServers', width: 40 },
  ];
  addHeaderStyle(wsLB);

  for (const lb of data.loadBalancers) {
    const r = lb as unknown as Record<string, unknown>;
    const ipAddr = typeof lb.ipAddress === 'object' && lb.ipAddress !== null
      ? (lb.ipAddress as { ipAddress?: string }).ipAddress ?? ''
      : safeString(lb.ipAddress);

    wsLB.addRow({
      id: lb.id,
      name: lb.name,
      ipAddress: ipAddr,
      loadBalancerType: lb.loadBalancerType,
      connectionLimit: lb.connectionLimit,
      recurringFee: lb.billingItem?.recurringFee ?? r.recurringFee ?? '',
      virtualServers: r.virtualServers ?? '',
    });
  }
  autoWidth(wsLB);

  // vBlockStorage
  const wsBS = workbook.addWorksheet('vBlockStorage');
  wsBS.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Username', key: 'username', width: 25 },
    { header: 'Capacity (GB)', key: 'capacityGb', width: 14 },
    { header: 'IOPS', key: 'iops', width: 10 },
    { header: 'Storage Type', key: 'storageType', width: 16 },
    { header: 'Tier', key: 'storageTierLevel', width: 14 },
    { header: 'Target IP', key: 'targetIp', width: 16 },
    { header: 'LUN ID', key: 'lunId', width: 10 },
    { header: 'Snapshot (GB)', key: 'snapshotCapacityGb', width: 14 },
    { header: 'Classic Monthly Fee', key: 'recurringFee', width: 14 },
    { header: 'Create Date', key: 'createDate', width: 22 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Allowed VSIs', key: 'allowedVirtualGuests', width: 30 },
    { header: 'Allowed Hardware', key: 'allowedHardware', width: 30 },
    { header: 'Replication Partners', key: 'replicationPartners', width: 30 },
  ];
  addHeaderStyle(wsBS);

  for (const vol of data.blockStorage) {
    const r = vol as unknown as Record<string, unknown>;
    wsBS.addRow({
      id: vol.id,
      username: vol.username,
      capacityGb: vol.capacityGb,
      iops: vol.iops,
      storageType: typeof r.storageType === 'string' ? r.storageType : (vol.storageType?.keyName ?? ''),
      storageTierLevel: vol.storageTierLevel,
      targetIp: vol.serviceResourceBackendIpAddress ?? r.targetIp ?? '',
      lunId: vol.lunId,
      snapshotCapacityGb: vol.snapshotCapacityGb,
      recurringFee: vol.billingItem?.recurringFee ?? r.recurringFee ?? '',
      createDate: vol.createDate,
      notes: vol.notes ?? '',
      allowedVirtualGuests: r.allowedVirtualGuests ?? '',
      allowedHardware: r.allowedHardware ?? '',
      replicationPartners: r.replicationPartners ?? '',
    });
  }
  autoWidth(wsBS);

  // vFileStorage
  const wsFS = workbook.addWorksheet('vFileStorage');
  wsFS.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Username', key: 'username', width: 25 },
    { header: 'Capacity (GB)', key: 'capacityGb', width: 14 },
    { header: 'IOPS', key: 'iops', width: 10 },
    { header: 'Storage Type', key: 'storageType', width: 16 },
    { header: 'Tier', key: 'storageTierLevel', width: 14 },
    { header: 'Target IP', key: 'targetIp', width: 16 },
    { header: 'Mount Address', key: 'mountAddress', width: 40 },
    { header: 'Snapshot (GB)', key: 'snapshotCapacityGb', width: 14 },
    { header: 'Classic Monthly Fee', key: 'recurringFee', width: 14 },
    { header: 'Create Date', key: 'createDate', width: 22 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Allowed VSIs', key: 'allowedVirtualGuests', width: 30 },
    { header: 'Allowed Hardware', key: 'allowedHardware', width: 30 },
    { header: 'Replication Partners', key: 'replicationPartners', width: 30 },
  ];
  addHeaderStyle(wsFS);

  for (const vol of data.fileStorage) {
    const r = vol as unknown as Record<string, unknown>;
    wsFS.addRow({
      id: vol.id,
      username: vol.username,
      capacityGb: vol.capacityGb,
      iops: vol.iops,
      storageType: typeof r.storageType === 'string' ? r.storageType : (vol.storageType?.keyName ?? ''),
      storageTierLevel: vol.storageTierLevel,
      targetIp: vol.serviceResourceBackendIpAddress ?? r.targetIp ?? '',
      mountAddress: vol.fileNetworkMountAddress ?? r.mountAddress ?? '',
      snapshotCapacityGb: vol.snapshotCapacityGb,
      recurringFee: vol.billingItem?.recurringFee ?? r.recurringFee ?? '',
      createDate: vol.createDate,
      notes: vol.notes ?? '',
      allowedVirtualGuests: r.allowedVirtualGuests ?? '',
      allowedHardware: r.allowedHardware ?? '',
      replicationPartners: r.replicationPartners ?? '',
    });
  }
  autoWidth(wsFS);

  // vObjectStorage
  const wsOS = workbook.addWorksheet('vObjectStorage');
  wsOS.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Username', key: 'username', width: 25 },
    { header: 'Storage Type', key: 'storageType', width: 16 },
    { header: 'Capacity (GB)', key: 'capacityGb', width: 14 },
    { header: 'Bytes Used', key: 'bytesUsed', width: 16 },
    { header: 'Classic Monthly Fee', key: 'recurringFee', width: 14 },
    { header: 'Create Date', key: 'createDate', width: 22 },
  ];
  addHeaderStyle(wsOS);

  for (const obj of data.objectStorage) {
    const r = obj as unknown as Record<string, unknown>;
    wsOS.addRow({
      id: obj.id,
      username: obj.username,
      storageType: typeof r.storageType === 'string' ? r.storageType : (obj.storageType?.keyName ?? ''),
      capacityGb: obj.capacityGb,
      bytesUsed: obj.bytesUsed,
      recurringFee: obj.billingItem?.recurringFee ?? r.recurringFee ?? '',
      createDate: obj.createDate,
    });
  }
  autoWidth(wsOS);

  // vSSLCertificates
  const wsSSL = workbook.addWorksheet('vSSLCertificates');
  wsSSL.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Common Name', key: 'commonName', width: 30 },
    { header: 'Organization', key: 'organizationName', width: 25 },
    { header: 'Valid From', key: 'validityBegin', width: 22 },
    { header: 'Validity (Days)', key: 'validityDays', width: 14 },
    { header: 'Valid Until', key: 'validityEnd', width: 22 },
    { header: 'Create Date', key: 'createDate', width: 22 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  addHeaderStyle(wsSSL);

  for (const cert of data.sslCertificates) {
    wsSSL.addRow({
      id: cert.id,
      commonName: cert.commonName,
      organizationName: cert.organizationName,
      validityBegin: cert.validityBegin,
      validityDays: cert.validityDays,
      validityEnd: cert.validityEnd,
      createDate: cert.createDate,
      notes: cert.notes ?? '',
    });
  }
  autoWidth(wsSSL);

  // vSSHKeys
  const wsSSH = workbook.addWorksheet('vSSHKeys');
  wsSSH.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Label', key: 'label', width: 25 },
    { header: 'Fingerprint', key: 'fingerprint', width: 50 },
    { header: 'Create Date', key: 'createDate', width: 22 },
    { header: 'Modify Date', key: 'modifyDate', width: 22 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  addHeaderStyle(wsSSH);

  for (const key of data.sshKeys) {
    wsSSH.addRow({
      id: key.id,
      label: key.label,
      fingerprint: key.fingerprint,
      createDate: key.createDate,
      modifyDate: key.modifyDate,
      notes: key.notes ?? '',
    });
  }
  autoWidth(wsSSH);

  // vDNSDomains
  const wsDNS = workbook.addWorksheet('vDNSDomains');
  wsDNS.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Serial', key: 'serial', width: 14 },
    { header: 'Update Date', key: 'updateDate', width: 22 },
    { header: 'Record Count', key: 'recordCount', width: 14 },
  ];
  addHeaderStyle(wsDNS);

  for (const domain of data.domains) {
    const r = domain as unknown as Record<string, unknown>;
    wsDNS.addRow({
      id: domain.id,
      name: domain.name,
      serial: domain.serial,
      updateDate: domain.updateDate,
      recordCount: domain.resourceRecords?.length ?? r.recordCount ?? 0,
    });
  }
  autoWidth(wsDNS);

  // vDNSRecords
  const wsDNSRec = workbook.addWorksheet('vDNSRecords');
  wsDNSRec.columns = [
    { header: 'Domain ID', key: 'domainId', width: 12 },
    { header: 'Domain', key: 'domainName', width: 25 },
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Host', key: 'host', width: 25 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Data', key: 'data', width: 40 },
    { header: 'TTL', key: 'ttl', width: 10 },
    { header: 'Priority', key: 'priority', width: 10 },
  ];
  addHeaderStyle(wsDNSRec);

  for (const rec of data.dnsRecords) {
    wsDNSRec.addRow({
      domainId: rec.domainId,
      domainName: rec.domainName,
      id: rec.id,
      host: rec.host,
      type: rec.type,
      data: rec.data,
      ttl: rec.ttl,
      priority: rec.priority,
    });
  }
  autoWidth(wsDNSRec);

  // vImages
  const wsImg = workbook.addWorksheet('vImages');
  wsImg.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Global ID', key: 'globalIdentifier', width: 40 },
    { header: 'Note', key: 'note', width: 30 },
    { header: 'Created', key: 'createDate', width: 22 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Datacenter', key: 'datacenter', width: 12 },
    { header: 'Parent ID', key: 'parentId', width: 12 },
  ];
  addHeaderStyle(wsImg);

  for (const img of data.imageTemplates) {
    const r = img as unknown as Record<string, unknown>;
    wsImg.addRow({
      id: img.id,
      name: img.name,
      globalIdentifier: img.globalIdentifier,
      note: img.note ?? '',
      createDate: img.createDate,
      status: typeof r.status === 'string' ? r.status : (img.status?.name ?? ''),
      datacenter: typeof r.datacenter === 'string' ? r.datacenter : (img.datacenter?.name ?? ''),
      parentId: img.parentId ?? '',
    });
  }
  autoWidth(wsImg);

  // vPlacementGroups
  const wsPG = workbook.addWorksheet('vPlacementGroups');
  wsPG.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Created', key: 'createDate', width: 22 },
    { header: 'Rule', key: 'rule', width: 20 },
    { header: 'Backend Router', key: 'backendRouter', width: 25 },
    { header: 'Guest Count', key: 'guestCount', width: 12 },
  ];
  addHeaderStyle(wsPG);

  for (const pg of data.placementGroups) {
    const r = pg as unknown as Record<string, unknown>;
    wsPG.addRow({
      id: pg.id,
      name: pg.name,
      createDate: pg.createDate,
      rule: typeof r.rule === 'string' ? r.rule : (pg.rule?.name ?? ''),
      backendRouter: typeof r.backendRouter === 'string' ? r.backendRouter : (pg.backendRouter?.hostname ?? ''),
      guestCount: pg.guestCount,
    });
  }
  autoWidth(wsPG);

  // vReservedCapacity
  const wsRC = workbook.addWorksheet('vReservedCapacity');
  wsRC.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Created', key: 'createDate', width: 22 },
    { header: 'Backend Router', key: 'backendRouter', width: 25 },
    { header: 'Instances', key: 'instanceCount', width: 12 },
  ];
  addHeaderStyle(wsRC);

  for (const rc of data.reservedCapacity) {
    const r = rc as unknown as Record<string, unknown>;
    wsRC.addRow({
      id: rc.id,
      name: rc.name,
      createDate: rc.createDate,
      backendRouter: typeof r.backendRouter === 'string' ? r.backendRouter : (rc.backendRouter?.hostname ?? ''),
      instanceCount: rc.instances?.length ?? r.instanceCount ?? 0,
    });
  }
  autoWidth(wsRC);

  // vDedicatedHosts
  const wsDH = workbook.addWorksheet('vDedicatedHosts');
  wsDH.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Created', key: 'createDate', width: 22 },
    { header: 'Datacenter', key: 'datacenter', width: 12 },
    { header: 'CPU Count', key: 'cpuCount', width: 12 },
    { header: 'Memory (GB)', key: 'memoryCapacity', width: 14 },
    { header: 'Disk (GB)', key: 'diskCapacity', width: 14 },
    { header: 'Guest Count', key: 'guestCount', width: 12 },
  ];
  addHeaderStyle(wsDH);

  for (const dh of data.dedicatedHosts) {
    const r = dh as unknown as Record<string, unknown>;
    wsDH.addRow({
      id: dh.id,
      name: dh.name,
      createDate: dh.createDate,
      datacenter: typeof r.datacenter === 'string' ? r.datacenter : (dh.datacenter?.name ?? ''),
      cpuCount: dh.cpuCount,
      memoryCapacity: dh.memoryCapacity,
      diskCapacity: dh.diskCapacity,
      guestCount: dh.guestCount,
    });
  }
  autoWidth(wsDH);

  // vVPNTunnels
  const wsVPN = workbook.addWorksheet('vVPNTunnels');
  wsVPN.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Customer Peer IP', key: 'customerPeerIpAddress', width: 18 },
    { header: 'Internal Peer IP', key: 'internalPeerIpAddress', width: 18 },
    { header: 'P1 Auth', key: 'phaseOneAuthentication', width: 14 },
    { header: 'P1 Encryption', key: 'phaseOneEncryption', width: 14 },
    { header: 'P2 Auth', key: 'phaseTwoAuthentication', width: 14 },
    { header: 'P2 Encryption', key: 'phaseTwoEncryption', width: 14 },
    { header: 'Address Translations', key: 'addressTranslations', width: 40 },
    { header: 'Customer Subnets', key: 'customerSubnets', width: 40 },
    { header: 'Internal Subnets', key: 'internalSubnets', width: 40 },
  ];
  addHeaderStyle(wsVPN);

  for (const vpn of data.vpnTunnels) {
    const r = vpn as unknown as Record<string, unknown>;
    wsVPN.addRow({
      id: vpn.id,
      name: vpn.name,
      customerPeerIpAddress: vpn.customerPeerIpAddress,
      internalPeerIpAddress: vpn.internalPeerIpAddress,
      phaseOneAuthentication: vpn.phaseOneAuthentication,
      phaseOneEncryption: vpn.phaseOneEncryption,
      phaseTwoAuthentication: vpn.phaseTwoAuthentication,
      phaseTwoEncryption: vpn.phaseTwoEncryption,
      addressTranslations: r.addressTranslations ?? '',
      customerSubnets: r.customerSubnets ?? '',
      internalSubnets: r.internalSubnets ?? '',
    });
  }
  autoWidth(wsVPN);

  // vBilling
  const wsBill = workbook.addWorksheet('vBilling');
  wsBill.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Category', key: 'categoryCode', width: 20 },
    { header: 'Classic Monthly Fee', key: 'recurringFee', width: 14 },
    { header: 'Create Date', key: 'createDate', width: 22 },
    { header: 'Cancel Date', key: 'cancellationDate', width: 22 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  addHeaderStyle(wsBill);

  for (const item of data.billingItems) {
    wsBill.addRow({
      id: item.id,
      description: item.description,
      categoryCode: item.categoryCode,
      recurringFee: item.recurringFee,
      createDate: item.createDate,
      cancellationDate: item.cancellationDate ?? '',
      notes: item.notes ?? '',
    });
  }
  autoWidth(wsBill);

  // vUsers
  const wsUsers = workbook.addWorksheet('vUsers');
  wsUsers.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Username', key: 'username', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'First Name', key: 'firstName', width: 16 },
    { header: 'Last Name', key: 'lastName', width: 16 },
    { header: 'Create Date', key: 'createDate', width: 22 },
    { header: 'Status Date', key: 'statusDate', width: 22 },
    { header: 'Status', key: 'userStatus', width: 14 },
    { header: 'Roles', key: 'roles', width: 40 },
    { header: 'Permissions', key: 'permissions', width: 60 },
  ];
  addHeaderStyle(wsUsers);

  for (const user of data.users) {
    const r = user as unknown as Record<string, unknown>;
    wsUsers.addRow({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createDate: user.createDate,
      statusDate: user.statusDate ?? r.statusDate ?? '',
      userStatus: typeof r.userStatus === 'string' ? r.userStatus : (user.userStatus?.name ?? ''),
      roles: r.roles ?? '',
      permissions: r.permissions ?? '',
    });
  }
  autoWidth(wsUsers);

  // vEventLog
  const wsEL = workbook.addWorksheet('vEventLog');
  wsEL.columns = [
    { header: 'Event', key: 'eventName', width: 25 },
    { header: 'Date', key: 'eventCreateDate', width: 22 },
    { header: 'User Type', key: 'userType', width: 14 },
    { header: 'User ID', key: 'userId', width: 12 },
    { header: 'Username', key: 'username', width: 25 },
    { header: 'Object', key: 'objectName', width: 25 },
    { header: 'Object ID', key: 'objectId', width: 12 },
    { header: 'Trace ID', key: 'traceId', width: 40 },
  ];
  addHeaderStyle(wsEL);

  for (const entry of data.eventLog) {
    wsEL.addRow({
      eventName: entry.eventName,
      eventCreateDate: entry.eventCreateDate,
      userType: entry.userType,
      userId: entry.userId,
      username: entry.username,
      objectName: entry.objectName,
      objectId: entry.objectId,
      traceId: entry.traceId,
    });
  }
  autoWidth(wsEL);

  // vRelationships
  const wsRel = workbook.addWorksheet('vRelationships');
  wsRel.columns = [
    { header: 'Parent Type', key: 'parentType', width: 18 },
    { header: 'Parent ID', key: 'parentId', width: 12 },
    { header: 'Parent Name', key: 'parentName', width: 25 },
    { header: 'Child Type', key: 'childType', width: 18 },
    { header: 'Child ID', key: 'childId', width: 12 },
    { header: 'Child Name', key: 'childName', width: 25 },
    { header: 'Relationship Field', key: 'relationshipField', width: 22 },
  ];
  addHeaderStyle(wsRel);

  for (const rel of data.relationships) {
    wsRel.addRow({
      parentType: rel.parentType,
      parentId: rel.parentId,
      parentName: rel.parentName,
      childType: rel.childType,
      childId: rel.childId,
      childName: rel.childName,
      relationshipField: rel.relationshipField,
    });
  }
  autoWidth(wsRel);

  // ── VMware Worksheets ────────────────────────────────────────────

  // vVMwareInstances
  if (data.vmwareInstances && data.vmwareInstances.length > 0) {
    const wsVMI = workbook.addWorksheet('vVMwareInstances');
    wsVMI.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Location', key: 'location', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Deploy Type', key: 'deployType', width: 14 },
      { header: 'Domain Type', key: 'domainType', width: 14 },
      { header: 'NSX Type', key: 'nsxType', width: 12 },
      { header: 'Version', key: 'currentVersion', width: 10 },
      { header: 'Clusters', key: 'clusterCount', width: 10 },
      { header: 'Creator', key: 'creator', width: 30 },
      { header: 'CRN', key: 'crn', width: 60 },
    ];
    addHeaderStyle(wsVMI);
    for (const inst of data.vmwareInstances) {
      const raw = inst as Record<string, unknown>;
      wsVMI.addRow({
        id: raw.id ?? '',
        name: raw.name ?? '',
        location: raw.location ?? '',
        status: raw.status ?? '',
        deployType: raw.deployType ?? raw.deploy_type ?? '',
        domainType: raw.domainType ?? raw.domain_type ?? '',
        nsxType: raw.nsxType ?? raw.nsx_type ?? '',
        currentVersion: raw.currentVersion ?? raw.current_version ?? '',
        clusterCount: raw.clusterCount ?? raw.cluster_count ?? (Array.isArray(raw.clusters) ? (raw.clusters as unknown[]).length : 0),
        creator: raw.creator ?? '',
        crn: raw.crn ?? '',
      });
    }
    autoWidth(wsVMI);
  }

  // vVMwareClusters
  if (data.vmwareClusters && data.vmwareClusters.length > 0) {
    const wsVMC = workbook.addWorksheet('vVMwareClusters');
    wsVMC.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Location', key: 'location', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Host Count', key: 'hostCount', width: 12 },
      { header: 'Storage Type', key: 'storageType', width: 16 },
      { header: 'Instance ID', key: 'instanceId', width: 40 },
    ];
    addHeaderStyle(wsVMC);
    for (const cluster of data.vmwareClusters) {
      const raw = cluster as Record<string, unknown>;
      wsVMC.addRow({
        id: raw.id ?? '',
        name: raw.name ?? '',
        location: raw.location ?? raw.datacenter ?? '',
        status: raw.status ?? raw.state ?? '',
        hostCount: raw.hostCount ?? raw.host_count ?? raw.num_hosts ?? 0,
        storageType: raw.storageType ?? raw.storage_type ?? '',
        instanceId: raw.instanceId ?? raw.instance_id ?? '',
      });
    }
    autoWidth(wsVMC);
  }

  // vVMwareHosts
  if (data.vmwareHosts && data.vmwareHosts.length > 0) {
    const wsVMH = workbook.addWorksheet('vVMwareHosts');
    wsVMH.columns = [
      { header: 'Hostname', key: 'hostname', width: 35 },
      { header: 'Public IP', key: 'primaryIp', width: 16 },
      { header: 'Private IP', key: 'backendIp', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Server ID', key: 'hardwareId', width: 14 },
      { header: 'Version', key: 'version', width: 12 },
      { header: 'Memory (GB)', key: 'memory', width: 12 },
      { header: 'CPUs', key: 'cpuCount', width: 8 },
      { header: 'Cluster', key: 'clusterName', width: 25 },
      { header: 'Location', key: 'location', width: 14 },
      { header: 'Instance ID', key: 'instanceId', width: 40 },
      { header: 'Cluster ID', key: 'clusterId', width: 40 },
    ];
    addHeaderStyle(wsVMH);
    for (const host of data.vmwareHosts) {
      const raw = host as Record<string, unknown>;
      wsVMH.addRow({
        hostname: raw.hostname ?? '',
        primaryIp: raw.primaryIp ?? '',
        backendIp: raw.backendIp ?? '',
        status: raw.status ?? '',
        hardwareId: raw.hardwareId ?? raw.id ?? '',
        version: raw.version ?? '',
        memory: raw.memory ?? '',
        cpuCount: raw.cpuCount ?? '',
        clusterName: raw.clusterName ?? '',
        location: raw.location ?? '',
        instanceId: raw.instanceId ?? '',
        clusterId: raw.clusterId ?? '',
      });
    }
    autoWidth(wsVMH);
  }

  // vVMwareVlans
  if (data.vmwareVlans && data.vmwareVlans.length > 0) {
    const wsVMV = workbook.addWorksheet('vVMwareVlans');
    wsVMV.columns = [
      { header: 'VLAN Number', key: 'vlanNumber', width: 14 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Purpose', key: 'type', width: 35 },
      { header: 'Primary Router', key: 'primaryRouter', width: 20 },
      { header: 'Cluster', key: 'clusterName', width: 25 },
      { header: 'Location', key: 'location', width: 14 },
      { header: 'Instance ID', key: 'instanceId', width: 40 },
      { header: 'Cluster ID', key: 'clusterId', width: 40 },
    ];
    addHeaderStyle(wsVMV);
    for (const vlan of data.vmwareVlans) {
      const raw = vlan as Record<string, unknown>;
      wsVMV.addRow({
        vlanNumber: raw.vlanNumber ?? '',
        name: raw.name ?? '',
        type: raw.type ?? raw.purpose ?? '',
        primaryRouter: raw.primaryRouter ?? '',
        clusterName: raw.clusterName ?? '',
        location: raw.location ?? '',
        instanceId: raw.instanceId ?? '',
        clusterId: raw.clusterId ?? '',
      });
    }
    autoWidth(wsVMV);
  }

  // vVMwareSubnets
  if (data.vmwareSubnets && data.vmwareSubnets.length > 0) {
    const wsVMS = workbook.addWorksheet('vVMwareSubnets');
    wsVMS.columns = [
      { header: 'CIDR', key: 'cidr', width: 20 },
      { header: 'Netmask', key: 'netmask', width: 18 },
      { header: 'Gateway', key: 'gateway', width: 18 },
      { header: 'Type', key: 'subnetType', width: 14 },
      { header: 'Purpose', key: 'purpose', width: 40 },
      { header: 'VLAN', key: 'vlanNumber', width: 10 },
      { header: 'VLAN Name', key: 'vlanName', width: 20 },
      { header: 'Cluster', key: 'clusterName', width: 25 },
      { header: 'Location', key: 'location', width: 14 },
      { header: 'Instance ID', key: 'instanceId', width: 40 },
    ];
    addHeaderStyle(wsVMS);
    for (const subnet of data.vmwareSubnets) {
      const raw = subnet as Record<string, unknown>;
      wsVMS.addRow({
        cidr: raw.cidr ?? '',
        netmask: raw.netmask ?? '',
        gateway: raw.gateway ?? '',
        subnetType: raw.subnetType ?? raw.subnet_type ?? '',
        purpose: raw.purpose ?? '',
        vlanNumber: raw.vlanNumber ?? '',
        vlanName: raw.vlanName ?? '',
        clusterName: raw.clusterName ?? '',
        location: raw.location ?? '',
        instanceId: raw.instanceId ?? '',
      });
    }
    autoWidth(wsVMS);
  }

  // vDirectorSites
  if (data.directorSites && data.directorSites.length > 0) {
    const wsDS = workbook.addWorksheet('vDirectorSites');
    wsDS.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Region', key: 'region', width: 14 },
      { header: 'PVDCs', key: 'pvdcCount', width: 10 },
      { header: 'Created', key: 'createdAt', width: 22 },
    ];
    addHeaderStyle(wsDS);
    for (const site of data.directorSites) {
      const raw = site as Record<string, unknown>;
      wsDS.addRow({
        id: site.id ?? '',
        name: site.name ?? '',
        status: site.status ?? '',
        region: site.region ?? '',
        pvdcCount: raw.pvdcCount ?? site.pvdcs?.length ?? 0,
        createdAt: raw.createdAt ?? site.created_at ?? '',
      });
    }
    autoWidth(wsDS);
  }

  // vPVDCs
  if (data.pvdcs && data.pvdcs.length > 0) {
    const wsPVDC = workbook.addWorksheet('vPVDCs');
    wsPVDC.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Datacenter', key: 'dataCenterName', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Provider Type', key: 'providerType', width: 16 },
      { header: 'Clusters', key: 'clusterCount', width: 10 },
      { header: 'Director Site ID', key: 'directorSiteId', width: 40 },
    ];
    addHeaderStyle(wsPVDC);
    for (const pvdc of data.pvdcs) {
      const raw = pvdc as Record<string, unknown>;
      wsPVDC.addRow({
        id: pvdc.id ?? '',
        name: pvdc.name ?? '',
        dataCenterName: raw.dataCenterName ?? pvdc.data_center_name ?? '',
        status: pvdc.status ?? '',
        providerType: raw.providerType ?? pvdc.provider_type ?? '',
        clusterCount: raw.clusterCount ?? pvdc.clusters?.length ?? 0,
        directorSiteId: raw.directorSiteId ?? pvdc.director_site_id ?? '',
      });
    }
    autoWidth(wsPVDC);
  }

  // vVCFClusters
  if (data.vcfClusters && data.vcfClusters.length > 0) {
    const wsVCFC = workbook.addWorksheet('vVCFClusters');
    wsVCFC.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Host Count', key: 'hostCount', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Datacenter', key: 'dataCenterName', width: 14 },
      { header: 'Host Profile', key: 'hostProfile', width: 16 },
      { header: 'Storage Type', key: 'storageType', width: 14 },
      { header: 'PVDC ID', key: 'pvdcId', width: 40 },
    ];
    addHeaderStyle(wsVCFC);
    for (const cluster of data.vcfClusters) {
      const raw = cluster as Record<string, unknown>;
      wsVCFC.addRow({
        id: cluster.id ?? '',
        name: cluster.name ?? '',
        hostCount: raw.hostCount ?? cluster.host_count ?? 0,
        status: cluster.status ?? '',
        dataCenterName: raw.dataCenterName ?? cluster.data_center_name ?? '',
        hostProfile: raw.hostProfile ?? cluster.host_profile ?? '',
        storageType: raw.storageType ?? cluster.storage_type ?? '',
        pvdcId: raw.pvdcId ?? cluster.pvdc_id ?? '',
      });
    }
    autoWidth(wsVCFC);
  }

  // vVDCs
  if (data.vdcs && data.vdcs.length > 0) {
    const wsVDC = workbook.addWorksheet('vVDCs');
    wsVDC.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Director Site', key: 'directorSiteName', width: 25 },
      { header: 'CPU', key: 'cpu', width: 10 },
      { header: 'RAM', key: 'ram', width: 10 },
      { header: 'Disk', key: 'disk', width: 10 },
      { header: 'Region', key: 'region', width: 14 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Created', key: 'createdAt', width: 22 },
    ];
    addHeaderStyle(wsVDC);
    for (const vdc of data.vdcs) {
      const raw = vdc as Record<string, unknown>;
      wsVDC.addRow({
        id: vdc.id ?? '',
        name: vdc.name ?? '',
        status: vdc.status ?? '',
        directorSiteName: raw.directorSiteName ?? vdc.director_site_name ?? '',
        cpu: vdc.cpu ?? 0,
        ram: vdc.ram ?? 0,
        disk: vdc.disk ?? 0,
        region: vdc.region ?? '',
        type: vdc.type ?? '',
        createdAt: raw.createdAt ?? vdc.created_at ?? '',
      });
    }
    autoWidth(wsVDC);
  }

  // vMultitenantSites
  if (data.multitenantSites && data.multitenantSites.length > 0) {
    const wsMTS = workbook.addWorksheet('vMultitenantSites');
    wsMTS.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Region', key: 'region', width: 14 },
      { header: 'PVDCs', key: 'pvdcCount', width: 10 },
    ];
    addHeaderStyle(wsMTS);
    for (const site of data.multitenantSites) {
      const raw = site as Record<string, unknown>;
      wsMTS.addRow({
        id: site.id ?? '',
        name: site.name ?? '',
        region: site.region ?? '',
        pvdcCount: raw.pvdcCount ?? site.pvdcs?.length ?? 0,
      });
    }
    autoWidth(wsMTS);
  }

  // vVMwareCrossReferences
  if (data.vmwareCrossReferences && data.vmwareCrossReferences.length > 0) {
    const wsXRef = workbook.addWorksheet('vVMwareCrossReferences');
    wsXRef.columns = [
      { header: 'Classic Resource Type', key: 'classicResourceType', width: 18 },
      { header: 'Classic Resource ID', key: 'classicResourceId', width: 14 },
      { header: 'Classic Resource Name', key: 'classicResourceName', width: 25 },
      { header: 'VMware Role', key: 'vmwareRole', width: 18 },
      { header: 'VMware Resource Type', key: 'vmwareResourceType', width: 20 },
      { header: 'VMware Resource ID', key: 'vmwareResourceId', width: 40 },
      { header: 'VMware Resource Name', key: 'vmwareResourceName', width: 25 },
    ];
    addHeaderStyle(wsXRef);
    for (const ref of data.vmwareCrossReferences) {
      wsXRef.addRow({
        classicResourceType: ref.classicResourceType,
        classicResourceId: ref.classicResourceId,
        classicResourceName: ref.classicResourceName,
        vmwareRole: ref.vmwareRole,
        vmwareResourceType: ref.vmwareResourceType,
        vmwareResourceId: ref.vmwareResourceId,
        vmwareResourceName: ref.vmwareResourceName,
      });
    }
    autoWidth(wsXRef);
  }

  logger.info('Excel workbook generated', {
    worksheetCount: workbook.worksheets.length,
  });

  return workbook;
}
