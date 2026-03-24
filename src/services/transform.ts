/**
 * Transforms raw SoftLayer API objects into the flat structures
 * expected by the frontend column definitions in resources.ts.
 *
 * The server sends data with SoftLayer field names (e.g. primaryIpAddress,
 * fullyQualifiedDomainName, datacenter.name). The UI column definitions
 * use simplified field names (e.g. primaryIp, fqdn, datacenter).
 */

// Maps SSE resourceKey → frontend RESOURCE_TYPES key
const RESOURCE_KEY_MAP: Record<string, string> = {
  virtualGuests: 'virtualServers',
  hardware: 'bareMetal',
  vlans: 'vlans',
  subnets: 'subnets',
  gateways: 'gateways',
  firewalls: 'firewalls',
  securityGroups: 'securityGroups',
  securityGroupRules: 'securityGroupRules',
  loadBalancers: 'loadBalancers',
  blockStorage: 'blockStorage',
  fileStorage: 'fileStorage',
  objectStorage: 'objectStorage',
  sslCertificates: 'sslCertificates',
  sshKeys: 'sshKeys',
  domains: 'dnsDomains',
  dnsRecords: 'dnsRecords',
  imageTemplates: 'imageTemplates',
  placementGroups: 'placementGroups',
  reservedCapacity: 'reservedCapacity',
  dedicatedHosts: 'dedicatedHosts',
  vpnTunnels: 'vpnTunnels',
  billingItems: 'billingItems',
  users: 'users',
  eventLog: 'eventLog',
  relationships: 'relationships',
  vmwareInstances: 'vmwareInstances',
  vmwareClusters: 'vmwareClusters',
  vmwareHosts: 'vmwareHosts',
  vmwareVlans: 'vmwareVlans',
  vmwareSubnets: 'vmwareSubnets',
  directorSites: 'directorSites',
  pvdcs: 'pvdcs',
  vcfClusters: 'vcfClusters',
  vdcs: 'vdcs',
  multitenantSites: 'multitenantSites',
  vmwareCrossReferences: 'vmwareCrossReferences',
  classicTransitGateways: 'classicTransitGateways',
  classicTransitGatewayConnections: 'classicTransitGatewayConnections',
  directLinkGateways: 'directLinkGateways',
  tgwRoutePrefixes: 'tgwRoutePrefixes',
  tgwVpcVpnGateways: 'tgwVpcVpnGateways',
};

export function mapResourceKey(serverKey: string): string {
  return RESOURCE_KEY_MAP[serverKey] ?? serverKey;
}

type RawItem = Record<string, unknown>;

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function nested(obj: RawItem, ...keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as RawItem)[key];
  }
  return current;
}

function flattenTags(raw: RawItem): string {
  const refs = raw.tagReferences as RawItem[] | undefined;
  if (!refs || !Array.isArray(refs)) return '';
  return refs
    .map((r) => safeStr(nested(r, 'tag', 'name') ?? r.name))
    .filter(Boolean)
    .join(', ');
}

function flattenNetworkVlans(raw: RawItem): string {
  const vlans = raw.networkVlans as RawItem[] | undefined;
  if (!vlans || !Array.isArray(vlans)) return '';
  return vlans
    .map((v) => {
      const num = safeStr(v.vlanNumber);
      const space = safeStr(v.networkSpace);
      return space ? `${num} (${space})` : num;
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Sum hourly fees from billingItem parent + children for hourly VSIs.
 * SoftLayer splits the hourly rate across child billing items
 * (CPU, RAM, OS, network, etc.).
 */
function sumHourlyFees(raw: RawItem): number {
  const billingItem = raw.billingItem as RawItem | undefined;
  if (!billingItem) return 0;
  let total = Number(billingItem.hourlyRecurringFee ?? 0);
  const children = billingItem.children as RawItem[] | undefined;
  if (children && Array.isArray(children)) {
    for (const child of children) {
      total += Number(child.hourlyRecurringFee ?? 0);
    }
  }
  return total;
}

function transformVirtualServer(raw: RawItem): RawItem {
  const blockDevices = raw.blockDevices as RawItem[] | undefined;
  const diskGb = blockDevices
    ? blockDevices.reduce((sum, bd) => {
        const cap = Number(nested(bd, 'diskImage', 'capacity') ?? 0);
        return sum + (isNaN(cap) ? 0 : cap);
      }, 0)
    : '';

  return {
    id: raw.id,
    hostname: raw.hostname,
    domain: raw.domain,
    fqdn: raw.fullyQualifiedDomainName,
    primaryIp: raw.primaryIpAddress,
    backendIp: raw.primaryBackendIpAddress,
    startCpus: raw.startCpus,
    maxCpu: raw.maxCpu,
    maxMemory: raw.maxMemory,
    status: nested(raw, 'status', 'name') ?? nested(raw, 'status', 'keyName') ?? raw.status,
    powerState: nested(raw, 'powerState', 'name') ?? nested(raw, 'powerState', 'keyName') ?? raw.powerState,
    datacenter: nested(raw, 'datacenter', 'name') ?? raw.datacenter,
    os: buildOsString(raw),
    hourlyBilling: raw.hourlyBillingFlag,
    createDate: raw.createDate,
    modifyDate: raw.modifyDate,
    recurringFee: (() => {
      const monthly = nested(raw, 'billingItem', 'recurringFee');
      if (monthly && Number(monthly) > 0) return monthly;
      if (raw.hourlyBillingFlag) {
        const totalHourly = sumHourlyFees(raw);
        if (totalHourly > 0) return Math.round(totalHourly * 730 * 100) / 100;
        return '';
      }
      return monthly;
    })(),
    estimatedCost: (() => {
      const monthly = nested(raw, 'billingItem', 'recurringFee');
      if (monthly && Number(monthly) > 0) return false;
      if (raw.hourlyBillingFlag) {
        return sumHourlyFees(raw) > 0;
      }
      return false;
    })(),
    noBillingItem: raw.hourlyBillingFlag && !nested(raw, 'billingItem', 'recurringFee') && sumHourlyFees(raw) === 0,
    notes: raw.notes,
    privateNetworkOnly: raw.privateNetworkOnlyFlag,
    localDisk: raw.localDiskFlag,
    dedicated: raw.dedicatedAccountHostOnlyFlag,
    placementGroupId: raw.placementGroupId,
    tags: flattenTags(raw),
    diskGb: diskGb || '',
    networkVlans: flattenNetworkVlans(raw),
    blockDeviceDetails: blockDevices
      ? blockDevices
          .map((bd, i) => {
            const cap = nested(bd, 'diskImage', 'capacity');
            const units = nested(bd, 'diskImage', 'units') ?? 'GB';
            return cap ? `Disk ${i}: ${safeStr(cap)}${safeStr(units)}` : '';
          })
          .filter(Boolean)
          .join(', ')
      : '',
    billingCategories: (() => {
      const billingItem = raw.billingItem as RawItem | undefined;
      const children = billingItem?.children as RawItem[] | undefined;
      if (!children || !Array.isArray(children)) return '';
      return children
        .map((c) => {
          const cat = safeStr(c.categoryCode);
          const fee = Number(c.hourlyRecurringFee ?? 0);
          return cat && fee > 0 ? `${cat}: $${fee.toFixed(4)}/hr` : '';
        })
        .filter(Boolean)
        .join(', ');
    })(),
    hourlyRate: raw.hourlyBillingFlag
      ? Number(nested(raw, 'billingItem', 'hourlyRecurringFee') ?? 0) || ''
      : '',
  };
}

function transformBareMetal(raw: RawItem): RawItem {
  const drives = raw.hardDrives as RawItem[] | undefined;
  const hardDrives = drives
    ? drives
        .map((d) => {
          const cap = nested(d, 'hardwareComponentModel', 'capacity') ?? nested(d, 'capacity');
          return cap ? `${safeStr(cap)}GB` : '';
        })
        .filter(Boolean)
        .join(', ')
    : '';

  const nics = raw.networkComponents as RawItem[] | undefined;
  const networkComponents = nics
    ? nics
        .map((n) => {
          const name = safeStr(n.name ?? n.port);
          const ip = safeStr(n.primaryIpAddress);
          const speed = n.speed ? `${safeStr(n.speed)}Mbps` : '';
          const parts = [name, ip, speed].filter(Boolean);
          return parts.join(':');
        })
        .filter(Boolean)
        .join(', ')
    : '';

  return {
    id: raw.id,
    hostname: raw.hostname,
    domain: raw.domain,
    fqdn: raw.fullyQualifiedDomainName,
    serialNumber: raw.manufacturerSerialNumber,
    primaryIp: raw.primaryIpAddress,
    backendIp: raw.primaryBackendIpAddress,
    cores: raw.processorPhysicalCoreAmount,
    memory: raw.memoryCapacity,
    datacenter: nested(raw, 'datacenter', 'name') ?? raw.datacenter,
    os: buildOsString(raw),
    recurringFee: nested(raw, 'billingItem', 'recurringFee'),
    provisionDate: raw.provisionDate,
    powerSupplyCount: raw.powerSupplyCount,
    gatewayMember: raw.networkGatewayMemberFlag,
    notes: raw.notes,
    hardDrives,
    networkComponents,
    networkVlans: flattenNetworkVlans(raw),
    tags: flattenTags(raw),
    nicDetails: nics
      ? nics
          .map((n) => {
            const name = safeStr(n.name ?? n.port);
            const ip = safeStr(n.primaryIpAddress);
            const speed = n.speed ? `${safeStr(n.speed)}Mbps` : '';
            const mac = safeStr(n.macAddress);
            const status = safeStr(n.status);
            const parts = [
              name,
              ip ? ip : null,
              speed,
              mac ? `MAC: ${mac}` : null,
              status ? `Status: ${status}` : null,
            ].filter(Boolean);
            return parts.join(', ');
          })
          .filter(Boolean)
          .join(' | ')
      : '',
    hardDriveDetails: drives
      ? drives
          .map((d) => {
            const cap = nested(d, 'hardwareComponentModel', 'capacity') ?? nested(d, 'capacity');
            const compType = nested(d, 'hardwareComponentModel', 'hardwareGenericComponentModel', 'hardwareComponentType') as RawItem | undefined;
            const typeName = compType ? safeStr((compType as RawItem).keyName ?? (compType as RawItem).type ?? '') : '';
            return cap ? `${safeStr(cap)}GB${typeName ? ` (${typeName})` : ''}` : '';
          })
          .filter(Boolean)
          .join(', ')
      : '',
  };
}

function buildOsString(raw: RawItem): string {
  const name = nested(raw, 'operatingSystem', 'softwareDescription', 'name');
  const version = nested(raw, 'operatingSystem', 'softwareDescription', 'version');
  if (name) {
    return version ? `${safeStr(name)} ${safeStr(version)}` : safeStr(name);
  }
  return '';
}

function transformVlan(raw: RawItem): RawItem {
  return {
    id: raw.id,
    vlanNumber: raw.vlanNumber,
    name: raw.name,
    networkSpace: raw.networkSpace,
    primaryRouter: nested(raw, 'primaryRouter', 'hostname'),
    datacenter: nested(raw, 'primaryRouter', 'datacenter', 'name'),
    virtualGuestCount: raw.virtualGuestCount,
    hardwareCount: raw.hardwareCount,
    gateway: nested(raw, 'networkGateway', 'name'),
  };
}

function transformSubnet(raw: RawItem): RawItem {
  return {
    id: raw.id,
    networkIdentifier: raw.networkIdentifier,
    cidr: raw.cidr,
    subnetType: raw.subnetType,
    gateway: raw.gateway,
    broadcastAddress: raw.broadcastAddress,
    usableIpAddressCount: raw.usableIpAddressCount,
    totalIpAddresses: raw.totalIpAddresses,
    vlanNumber: nested(raw, 'networkVlan', 'vlanNumber'),
    datacenter: nested(raw, 'datacenter', 'name') ?? raw.datacenter,
  };
}

function transformGateway(raw: RawItem): RawItem {
  const members = raw.members as RawItem[] | undefined;
  const insideVlans = raw.insideVlans as RawItem[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    networkSpace: raw.networkSpace,
    status: nested(raw, 'status', 'name') ?? raw.status,
    publicIp: nested(raw, 'publicIpAddress', 'ipAddress') ?? raw.publicIpAddress,
    privateIp: nested(raw, 'privateIpAddress', 'ipAddress') ?? raw.privateIpAddress,
    memberCount: members?.length ?? 0,
    insideVlanCount: insideVlans?.length ?? 0,
  };
}

function transformFirewall(raw: RawItem): RawItem {
  const rules = raw.rules as unknown[] | undefined;
  return {
    id: raw.id,
    primaryIpAddress: raw.primaryIpAddress,
    firewallType: raw.firewallType,
    vlanNumber: nested(raw, 'networkVlan', 'vlanNumber'),
    datacenter: nested(raw, 'datacenter', 'name') ?? raw.datacenter,
    recurringFee: nested(raw, 'billingItem', 'recurringFee'),
    ruleCount: rules?.length ?? 0,
  };
}

function transformSecurityGroup(raw: RawItem): RawItem {
  const rules = raw.rules as unknown[] | undefined;
  const bindings = raw.networkComponentBindings as unknown[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    createDate: raw.createDate,
    modifyDate: raw.modifyDate,
    ruleCount: rules?.length ?? 0,
    bindingCount: bindings?.length ?? 0,
  };
}

function transformLoadBalancer(raw: RawItem): RawItem {
  const vservers = raw.virtualServers as RawItem[] | undefined;
  const virtualServers = vservers
    ? vservers
        .map((vs) => {
          const port = safeStr(vs.port);
          const alloc = vs.allocation ? `${safeStr(vs.allocation)}%` : '';
          return alloc ? `Port ${port} (${alloc})` : `Port ${port}`;
        })
        .filter(Boolean)
        .join(', ')
    : '';

  return {
    id: raw.id,
    name: raw.name,
    ipAddress: nested(raw, 'ipAddress', 'ipAddress') ?? raw.ipAddress,
    loadBalancerType: raw.loadBalancerType,
    connectionLimit: raw.connectionLimit,
    recurringFee: nested(raw, 'billingItem', 'recurringFee'),
    virtualServers,
  };
}

function flattenAllowedHosts(raw: RawItem, field: string): string {
  const items = raw[field] as RawItem[] | undefined;
  if (!items || !Array.isArray(items)) return '';
  return items
    .map((item) => safeStr(item.hostname ?? item.fullyQualifiedDomainName ?? item.username ?? item.id))
    .filter(Boolean)
    .join(', ');
}

function flattenAllowedSubnets(raw: RawItem, field: string): string {
  const items = raw[field] as RawItem[] | undefined;
  if (!items || !Array.isArray(items)) return '';
  return items
    .map((item) => safeStr(item.networkIdentifier ?? item.id))
    .filter(Boolean)
    .join(', ');
}

function flattenReplicationPartners(raw: RawItem): string {
  const partners = raw.replicationPartners as RawItem[] | undefined;
  if (!partners || !Array.isArray(partners)) return '';
  return partners
    .map((p) => safeStr(p.username ?? p.id))
    .filter(Boolean)
    .join(', ');
}

function transformBlockStorage(raw: RawItem): RawItem {
  return {
    id: raw.id,
    username: raw.username,
    capacityGb: raw.capacityGb,
    iops: raw.iops,
    storageType: nested(raw, 'storageType', 'keyName') ?? raw.storageType,
    storageTierLevel: raw.storageTierLevel,
    targetIp: raw.serviceResourceBackendIpAddress,
    lunId: raw.lunId,
    snapshotCapacityGb: raw.snapshotCapacityGb,
    recurringFee: nested(raw, 'billingItem', 'recurringFee'),
    createDate: raw.createDate,
    notes: raw.notes,
    allowedVirtualGuests: flattenAllowedHosts(raw, 'allowedVirtualGuests'),
    allowedHardware: flattenAllowedHosts(raw, 'allowedHardware'),
    allowedSubnets: flattenAllowedSubnets(raw, 'allowedSubnets'),
    replicationPartners: flattenReplicationPartners(raw),
  };
}

function transformFileStorage(raw: RawItem): RawItem {
  return {
    id: raw.id,
    username: raw.username,
    capacityGb: raw.capacityGb,
    iops: raw.iops,
    storageType: nested(raw, 'storageType', 'keyName') ?? raw.storageType,
    storageTierLevel: raw.storageTierLevel,
    targetIp: raw.serviceResourceBackendIpAddress,
    mountAddress: raw.fileNetworkMountAddress,
    snapshotCapacityGb: raw.snapshotCapacityGb,
    recurringFee: nested(raw, 'billingItem', 'recurringFee'),
    createDate: raw.createDate,
    notes: raw.notes,
    allowedVirtualGuests: flattenAllowedHosts(raw, 'allowedVirtualGuests'),
    allowedHardware: flattenAllowedHosts(raw, 'allowedHardware'),
    allowedSubnets: flattenAllowedSubnets(raw, 'allowedSubnets'),
    replicationPartners: flattenReplicationPartners(raw),
  };
}

function transformObjectStorage(raw: RawItem): RawItem {
  return {
    id: raw.id,
    username: raw.username,
    storageType: nested(raw, 'storageType', 'keyName') ?? raw.storageType,
    capacityGb: raw.capacityGb,
    bytesUsed: raw.bytesUsed,
    recurringFee: nested(raw, 'billingItem', 'recurringFee'),
    createDate: raw.createDate,
  };
}

function transformSSLCertificate(raw: RawItem): RawItem {
  return {
    id: raw.id,
    commonName: raw.commonName,
    organizationName: raw.organizationName,
    validityBegin: raw.validityBegin,
    validityDays: raw.validityDays,
    validityEnd: raw.validityEnd,
    createDate: raw.createDate,
    notes: raw.notes,
  };
}

function transformSSHKey(raw: RawItem): RawItem {
  return {
    id: raw.id,
    label: raw.label,
    fingerprint: raw.fingerprint,
    createDate: raw.createDate,
    modifyDate: raw.modifyDate,
    notes: raw.notes,
  };
}

function transformDNSDomain(raw: RawItem): RawItem {
  const records = raw.resourceRecords as unknown[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    serial: raw.serial,
    updateDate: raw.updateDate,
    recordCount: raw.resourceRecordCount ?? records?.length ?? 0,
  };
}

function transformImageTemplate(raw: RawItem): RawItem {
  return {
    id: raw.id,
    globalIdentifier: raw.globalIdentifier,
    name: raw.name,
    note: raw.note,
    createDate: raw.createDate,
    status: nested(raw, 'status', 'name') ?? raw.status,
    datacenter: nested(raw, 'datacenter', 'name') ?? raw.datacenter,
    parentId: raw.parentId,
  };
}

function transformPlacementGroup(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    createDate: raw.createDate,
    rule: nested(raw, 'rule', 'name') ?? raw.rule,
    backendRouter: nested(raw, 'backendRouter', 'hostname') ?? raw.backendRouter,
    guestCount: raw.guestCount,
  };
}

function transformReservedCapacity(raw: RawItem): RawItem {
  const instances = raw.instances as unknown[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    createDate: raw.createDate,
    backendRouter: nested(raw, 'backendRouter', 'hostname') ?? raw.backendRouter,
    instanceCount: instances?.length ?? raw.instancesCount ?? 0,
  };
}

function transformDedicatedHost(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    createDate: raw.createDate,
    datacenter: nested(raw, 'datacenter', 'name') ?? raw.datacenter,
    cpuCount: raw.cpuCount,
    memoryCapacity: raw.memoryCapacity,
    diskCapacity: raw.diskCapacity,
    guestCount: raw.guestCount,
  };
}

function transformVPNTunnel(raw: RawItem): RawItem {
  const addrTrans = raw.addressTranslations;
  const custSub = raw.customerSubnets;
  const intSub = raw.internalSubnets;

  return {
    id: raw.id,
    name: raw.name,
    customerPeerIpAddress: raw.customerPeerIpAddress,
    internalPeerIpAddress: raw.internalPeerIpAddress,
    phaseOneAuthentication: raw.phaseOneAuthentication,
    phaseOneEncryption: raw.phaseOneEncryption,
    phaseTwoAuthentication: raw.phaseTwoAuthentication,
    phaseTwoEncryption: raw.phaseTwoEncryption,
    addressTranslations: addrTrans ? JSON.stringify(addrTrans) : '',
    customerSubnets: custSub ? JSON.stringify(custSub) : '',
    internalSubnets: intSub ? JSON.stringify(intSub) : '',
  };
}

function transformBillingItem(raw: RawItem): RawItem {
  return {
    id: raw.id,
    description: raw.description,
    categoryCode: raw.categoryCode,
    recurringFee: raw.recurringFee,
    createDate: raw.createDate,
    cancellationDate: raw.cancellationDate,
    notes: raw.notes,
  };
}

function transformUser(raw: RawItem): RawItem {
  const rolesList = raw.roles as RawItem[] | undefined;
  const roles = rolesList
    ? rolesList.map((r) => safeStr(r.name)).filter(Boolean).join(', ')
    : '';

  const permsList = raw.permissions as RawItem[] | undefined;
  const permissions = permsList
    ? permsList.map((p) => safeStr(p.keyName)).filter(Boolean).join(', ')
    : '';

  return {
    id: raw.id,
    username: raw.username,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    createDate: raw.createDate,
    statusDate: raw.statusDate,
    userStatus: nested(raw, 'userStatus', 'name') ?? raw.userStatus,
    roles,
    permissions,
  };
}

function transformEventLog(raw: RawItem): RawItem {
  return {
    eventName: raw.eventName,
    eventCreateDate: raw.eventCreateDate,
    userType: raw.userType,
    userId: raw.userId,
    username: raw.username,
    objectName: raw.objectName,
    objectId: raw.objectId,
    traceId: raw.traceId,
  };
}

function transformVMwareInstance(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    location: raw.location,
    status: raw.status,
    deployType: raw.deploy_type ?? raw.instance_type,
    domainType: raw.domain_type,
    nsxType: raw.nsx_type ?? raw.vcs_type,
    currentVersion: raw.current_version ?? raw.instance_version,
    initialVersion: raw.initial_version,
    clusterCount: raw.cluster_count ?? (raw.clusters as unknown[] | undefined)?.length ?? 0,
    crn: raw.crn,
    resourceGroupId: raw.resource_group_id,
    createdTime: raw.created_time,
    creator: raw.creator,
  };
}

function transformVMwareCluster(raw: RawItem): RawItem {
  return {
    id: raw.id ?? raw.cluster_id,
    name: raw.name ?? raw.cluster_name,
    clusterType: raw.cluster_type,
    location: raw.location ?? raw.datacenter,
    status: raw.status ?? raw.state,
    hostCount: raw.host_count ?? raw.num_hosts ?? (raw.hosts as unknown[] | undefined)?.length ?? 0,
    storageType: raw.storage_type,
    vsphereVersion: raw.vsphere_version,
    uplinkSpeed: raw.uplink_speed,
    instanceId: raw.instance_id,
  };
}

function transformVMwareHost(raw: RawItem): RawItem {
  return {
    ...raw,
    id: raw.id,
    hostname: raw.hostname,
    primaryIp: raw.primaryIp,
    backendIp: raw.backendIp,
    status: raw.status ?? raw.state,
    hardwareId: raw.hardwareId ?? raw.id,
    version: raw.version,
    memory: raw.memory,
    cpuCount: raw.cpuCount,
    os: raw.os,
    clusterId: raw.clusterId ?? raw.cluster_id,
    clusterName: raw.clusterName ?? raw.cluster_name,
    instanceId: raw.instanceId ?? raw.instance_id,
    location: raw.location,
  };
}

function transformVMwareVlan(raw: RawItem): RawItem {
  return {
    ...raw,
    id: raw.id,
    vlanNumber: raw.vlanNumber ?? raw.vlan_number ?? raw.number,
    name: raw.name,
    type: raw.type ?? raw.purpose ?? raw.vlan_type,
    purpose: raw.purpose,
    primaryRouter: raw.primaryRouter ?? raw.primary_router ?? raw.router,
    link: raw.link,
    clusterId: raw.clusterId ?? raw.cluster_id,
    clusterName: raw.clusterName ?? raw.cluster_name,
    instanceId: raw.instanceId ?? raw.instance_id,
    location: raw.location,
  };
}

function transformVMwareSubnet(raw: RawItem): RawItem {
  // cidr may come from network_identifier (e.g., "10.242.54.0/25")
  const cidr = raw.cidr ?? raw.network_identifier ?? raw.networkIdentifier ?? raw.cidr_block;
  return {
    ...raw,
    id: raw.id,
    cidr,
    networkIdentifier: raw.networkIdentifier ?? raw.network_identifier,
    netmask: raw.netmask ?? raw.subnet_mask,
    gateway: raw.gateway ?? raw.gateway_ip,
    subnetType: raw.subnetType ?? raw.subnet_type ?? raw.type,
    purpose: raw.purpose,
    vlanNumber: raw.vlanNumber ?? raw.vlan_number ?? raw.number,
    vlanId: raw.vlanId ?? raw.vlan_id,
    vlanName: raw.vlanName ?? raw.vlan_name,
    clusterId: raw.clusterId ?? raw.cluster_id,
    clusterName: raw.clusterName ?? raw.cluster_name,
    instanceId: raw.instanceId ?? raw.instance_id,
    location: raw.location,
  };
}

function transformDirectorSite(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    region: raw.region,
    pvdcCount: (raw.pvdcs as unknown[] | undefined)?.length ?? 0,
    createdAt: raw.created_at,
  };
}

function transformPVDC(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    dataCenterName: raw.data_center_name,
    status: raw.status,
    providerType: raw.provider_type,
    clusterCount: (raw.clusters as unknown[] | undefined)?.length ?? 0,
    directorSiteId: raw.director_site_id,
  };
}

function transformVCFCluster(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    hostCount: raw.host_count,
    status: raw.status,
    dataCenterName: raw.data_center_name,
    hostProfile: raw.host_profile,
    storageType: raw.storage_type,
    pvdcId: raw.pvdc_id,
  };
}

function transformVDC(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    directorSiteName: raw.director_site_name,
    cpu: raw.cpu,
    ram: raw.ram,
    disk: raw.disk,
    region: raw.region,
    type: raw.type,
    createdAt: raw.created_at,
  };
}

function transformMultitenantSite(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    region: raw.region,
    pvdcCount: (raw.pvdcs as unknown[] | undefined)?.length ?? 0,
  };
}

function transformClassicTransitGateway(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    location: raw.location,
    global: raw.global,
    createdAt: raw.created_at,
  };
}

function transformClassicTransitGatewayConnection(raw: RawItem): RawItem {
  // Extract prefix_filters for GRE tunnel connections
  // prefix_filters is an array like: [{ action: 'permit', prefix: '192.168.10.0/24', ... }]
  const prefixFilters = raw.prefix_filters as Array<{ action?: string; prefix?: string }> | undefined;
  const prefixFilterPrefixes = prefixFilters
    ?.filter((pf) => pf.prefix && pf.action !== 'deny')
    .map((pf) => pf.prefix as string) ?? [];

  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    networkType: raw.network_type,
    networkId: raw.network_id,
    networkAccountId: raw.network_account_id,
    transitGatewayName: nested(raw, 'transit_gateway', 'name') ?? '',
    transitGatewayId: nested(raw, 'transit_gateway', 'id') ?? '',
    // Include prefix_filters prefixes for GRE tunnels (stored separately from route report prefixes)
    prefixFilterPrefixes: prefixFilterPrefixes.length > 0 ? prefixFilterPrefixes : undefined,
  };
}

function transformDirectLinkGateway(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    speedMbps: raw.speed_mbps,
    locationName: raw.location_name,
    bgpStatus: raw.bgp_status,
    operationalStatus: raw.operational_status,
    global: raw.global,
    createdAt: raw.created_at,
    crn: raw.crn,
  };
}

const TRANSFORMERS: Record<string, (raw: RawItem) => RawItem> = {
  virtualServers: transformVirtualServer,
  bareMetal: transformBareMetal,
  vlans: transformVlan,
  subnets: transformSubnet,
  gateways: transformGateway,
  firewalls: transformFirewall,
  securityGroups: transformSecurityGroup,
  loadBalancers: transformLoadBalancer,
  blockStorage: transformBlockStorage,
  fileStorage: transformFileStorage,
  objectStorage: transformObjectStorage,
  sslCertificates: transformSSLCertificate,
  sshKeys: transformSSHKey,
  dnsDomains: transformDNSDomain,
  dnsRecords: (raw) => raw, // Already flattened by server
  securityGroupRules: (raw) => raw, // Already flattened by server
  imageTemplates: transformImageTemplate,
  placementGroups: transformPlacementGroup,
  reservedCapacity: transformReservedCapacity,
  dedicatedHosts: transformDedicatedHost,
  vpnTunnels: transformVPNTunnel,
  billingItems: transformBillingItem,
  users: transformUser,
  eventLog: transformEventLog,
  vmwareInstances: transformVMwareInstance,
  vmwareClusters: transformVMwareCluster,
  vmwareHosts: transformVMwareHost,
  vmwareVlans: transformVMwareVlan,
  vmwareSubnets: transformVMwareSubnet,
  directorSites: transformDirectorSite,
  pvdcs: transformPVDC,
  vcfClusters: transformVCFCluster,
  vdcs: transformVDC,
  multitenantSites: transformMultitenantSite,
  vmwareCrossReferences: (raw) => raw,
  classicTransitGateways: transformClassicTransitGateway,
  classicTransitGatewayConnections: transformClassicTransitGatewayConnection,
  directLinkGateways: transformDirectLinkGateway,
  tgwRoutePrefixes: (raw) => {
    const connPrefixes = raw.connectionPrefixes as Array<{
      connectionName: string;
      connectionType: string;
      prefixes: string[];
    }> | undefined;
    const connectionCount = connPrefixes?.length ?? 0;
    const connectionSummary = connPrefixes
      ? connPrefixes
          .map((cp) => `${cp.connectionName} (${cp.connectionType}: ${cp.prefixes.length})`)
          .join(', ')
      : '';
    return { ...raw, connectionCount, connectionSummary };
  },
  tgwVpcVpnGateways: (raw) => raw,
};

/**
 * Transform raw SoftLayer API items for a given (mapped) resource key.
 * Returns the items unchanged if no transformer exists.
 */
export function transformItems(resourceKey: string, items: unknown[]): unknown[] {
  const transformer = TRANSFORMERS[resourceKey];
  if (!transformer) return items;
  return items.map((item) => transformer(item as RawItem));
}
