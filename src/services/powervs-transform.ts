/**
 * Transforms raw PowerVS API objects into flat structures
 * expected by the frontend column definitions in powervs-resources.ts.
 *
 * The PowerVS backend already injects _workspace, _workspaceId, _zone
 * into each item. Transforms map those to the frontend column keys
 * and flatten any nested fields.
 */

type RawItem = Record<string, unknown>;

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function wsFields(raw: RawItem): { workspace: string; zone: string } {
  return {
    workspace: safeStr(raw._workspace),
    zone: safeStr(raw._zone),
  };
}

function transformPvsInstance(raw: RawItem): RawItem {
  const networks = raw.networks as Array<{ ipAddress?: string }> | undefined;
  const primaryIp = networks?.[0]?.ipAddress ?? '';
  return {
    pvmInstanceID: raw.pvmInstanceID,
    serverName: raw.serverName,
    status: raw.status,
    sysType: raw.sysType,
    processors: raw.processors,
    procType: raw.procType,
    memory: raw.memory,
    osType: raw.osType,
    primaryIp,
    storageType: raw.storageType,
    creationDate: raw.creationDate,
    ...wsFields(raw),
  };
}

function transformPvsVolume(raw: RawItem): RawItem {
  // pvmInstanceIDs is an array; join attached instance names if available
  const pvmInstanceIDs = raw.pvmInstanceIDs as string[] | undefined;
  return {
    volumeID: raw.volumeID,
    name: raw.name,
    state: raw.state,
    size: raw.size,
    diskType: raw.diskType,
    bootable: raw.bootable,
    shareable: raw.shareable,
    pvmInstanceName: pvmInstanceIDs?.join(', ') ?? '',
    creationDate: raw.creationDate,
    ...wsFields(raw),
  };
}

function transformPvsNetwork(raw: RawItem): RawItem {
  const ipAddressMetrics = raw.ipAddressMetrics as RawItem | undefined;
  return {
    networkID: raw.networkID,
    name: raw.name,
    type: raw.type,
    vlanID: raw.vlanID,
    cidr: safeStr(raw.cidr),
    gateway: raw.gateway,
    mtu: raw.mtu,
    ipAvailable: ipAddressMetrics?.available,
    ipUsed: ipAddressMetrics?.used,
    ...wsFields(raw),
  };
}

function transformPvsNetworkPort(raw: RawItem): RawItem {
  const pvmInstance = raw.pvmInstance as RawItem | undefined;
  return {
    portID: raw.portID,
    ipAddress: raw.ipAddress,
    macAddress: raw.macAddress,
    status: raw.status,
    networkName: raw._networkName ?? '',
    pvmInstanceName: pvmInstance?.pvmInstanceID ? safeStr(pvmInstance.pvmInstanceID) : '',
    ...wsFields(raw),
  };
}

function transformPvsSshKey(raw: RawItem): RawItem {
  const key = safeStr(raw.sshKey);
  return {
    name: raw.name,
    sshKey: key.length > 60 ? key.slice(0, 60) + '...' : key,
    creationDate: raw.creationDate,
    ...wsFields(raw),
  };
}

function transformPvsImage(raw: RawItem): RawItem {
  const specs = raw.specifications as RawItem | undefined;
  return {
    imageID: raw.imageID,
    name: raw.name,
    state: raw.state,
    operatingSystem: safeStr(raw.operatingSystem),
    architecture: specs?.architecture ?? '',
    size: raw.size,
    storageType: raw.storageType,
    creationDate: raw.creationDate,
    ...wsFields(raw),
  };
}

function transformPvsStockImage(raw: RawItem): RawItem {
  const specs = raw.specifications as RawItem | undefined;
  return {
    imageID: raw.imageID,
    name: raw.name,
    state: raw.state,
    operatingSystem: safeStr(raw.operatingSystem),
    architecture: specs?.architecture ?? '',
    storageType: raw.storageType,
    ...wsFields(raw),
  };
}

function transformPvsSnapshot(raw: RawItem): RawItem {
  const volumeSnapshots = raw.volumeSnapshots as Record<string, unknown> | undefined;
  return {
    snapshotID: raw.snapshotID,
    name: raw.name,
    status: raw.status,
    percentComplete: raw.percentComplete,
    pvmInstanceName: safeStr(raw.pvmInstanceID),
    volumeCount: volumeSnapshots ? Object.keys(volumeSnapshots).length : 0,
    creationDate: raw.creationDate,
    ...wsFields(raw),
  };
}

function transformPvsPlacementGroup(raw: RawItem): RawItem {
  const members = raw.members as string[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    policy: raw.policy,
    memberCount: members?.length ?? 0,
    ...wsFields(raw),
  };
}

function transformPvsCloudConnection(raw: RawItem): RawItem {
  const networks = raw.networks as Array<unknown> | undefined;
  return {
    cloudConnectionID: raw.cloudConnectionID,
    name: raw.name,
    speed: raw.speed,
    globalRouting: raw.globalRouting,
    greEnabled: raw.gre?.enabled ?? false,
    transitEnabled: raw.transitEnabled,
    networkCount: networks?.length ?? 0,
    ...wsFields(raw),
  };
}

function transformPvsDhcpServer(raw: RawItem): RawItem {
  const network = raw.network as RawItem | undefined;
  return {
    id: raw.id,
    status: raw.status,
    networkId: network?.id ?? '',
    networkName: network?.name ?? '',
    ...wsFields(raw),
  };
}

function transformPvsVpnConnection(raw: RawItem): RawItem {
  const localSubnets = raw.localSubnets as string[] | undefined;
  const peerSubnets = raw.peerSubnets as string[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    mode: raw.mode,
    peerAddress: safeStr(raw.peerAddress),
    localSubnets: localSubnets?.join(', ') ?? '',
    peerSubnets: peerSubnets?.join(', ') ?? '',
    ...wsFields(raw),
  };
}

function transformPvsIkePolicy(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    version: raw.version,
    encryption: safeStr(raw.encryption),
    dhGroup: raw.dhGroup,
    authentication: safeStr(raw.authentication),
    ...wsFields(raw),
  };
}

function transformPvsIpsecPolicy(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    encryption: safeStr(raw.encryption),
    dhGroup: raw.dhGroup,
    authentication: safeStr(raw.authentication),
    pfs: raw.pfs,
    ...wsFields(raw),
  };
}

function transformPvsSharedProcessorPool(raw: RawItem): RawItem {
  const placedInstances = raw.sharedProcessorPoolPlacementGroups as unknown[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    hostGroup: safeStr(raw.hostGroup),
    reservedCores: raw.reservedCores,
    allocatedCores: raw.allocatedCores,
    availableCores: raw.availableCores,
    instanceCount: placedInstances?.length ?? 0,
    ...wsFields(raw),
  };
}

function transformPvsVolumeGroup(raw: RawItem): RawItem {
  const volumeIDs = raw.volumeIDs as string[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    consistencyGroupName: safeStr(raw.consistencyGroupName),
    volumeCount: volumeIDs?.length ?? 0,
    replicationEnabled: raw.replicationEnabled,
    ...wsFields(raw),
  };
}

function transformPvsNetworkSecurityGroup(raw: RawItem): RawItem {
  const rules = raw.rules as unknown[] | undefined;
  const members = raw.members as unknown[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    ruleCount: rules?.length ?? 0,
    memberCount: members?.length ?? 0,
    ...wsFields(raw),
  };
}

function transformPvsHostGroup(raw: RawItem): RawItem {
  const hosts = raw.hosts as unknown[] | undefined;
  const secondaries = raw.secondaries as unknown[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    hostCount: hosts?.length ?? 0,
    secondaryCount: secondaries?.length ?? 0,
    ...wsFields(raw),
  };
}

function transformPvsWorkspace(raw: RawItem): RawItem {
  return {
    guid: raw.guid,
    name: raw.name,
    zone: safeStr(raw._zone),
    region: safeStr(raw._apiRegion),
    resourceGroupName: safeStr(raw.resource_group_id),
    state: raw.state,
    createdAt: raw.created_at,
  };
}

function transformPvsSystemPool(raw: RawItem): RawItem {
  return {
    type: raw.type,
    sharedCoreRatio: raw.sharedCoreRatio,
    maxAvailable: raw.maxAvailable,
    maxMemory: raw.maxMemory,
    coreMemoryRatio: raw.coreMemoryRatio,
    ...wsFields(raw),
  };
}

function transformPvsSapProfile(raw: RawItem): RawItem {
  return {
    profileID: raw.profileID,
    type: raw.type,
    cores: raw.cores,
    memory: raw.memory,
    saps: raw.saps,
    certified: raw.certified,
    ...wsFields(raw),
  };
}

function transformPvsEvent(raw: RawItem): RawItem {
  return {
    eventID: raw.eventID,
    action: raw.action,
    level: raw.level,
    message: safeStr(raw.message),
    resource: safeStr(raw.resource),
    user: safeStr(raw.user),
    timestamp: raw.timestamp,
    ...wsFields(raw),
  };
}

// Transformer dispatcher map
const PVS_TRANSFORMERS: Record<string, (raw: RawItem) => RawItem> = {
  pvsInstances: transformPvsInstance,
  pvsVolumes: transformPvsVolume,
  pvsNetworks: transformPvsNetwork,
  pvsNetworkPorts: transformPvsNetworkPort,
  pvsSshKeys: transformPvsSshKey,
  pvsImages: transformPvsImage,
  pvsStockImages: transformPvsStockImage,
  pvsSnapshots: transformPvsSnapshot,
  pvsPlacementGroups: transformPvsPlacementGroup,
  pvsCloudConnections: transformPvsCloudConnection,
  pvsDhcpServers: transformPvsDhcpServer,
  pvsVpnConnections: transformPvsVpnConnection,
  pvsIkePolicies: transformPvsIkePolicy,
  pvsIpsecPolicies: transformPvsIpsecPolicy,
  pvsSharedProcessorPools: transformPvsSharedProcessorPool,
  pvsVolumeGroups: transformPvsVolumeGroup,
  pvsNetworkSecurityGroups: transformPvsNetworkSecurityGroup,
  pvsHostGroups: transformPvsHostGroup,
  pvsWorkspaces: transformPvsWorkspace,
  pvsSystemPools: transformPvsSystemPool,
  pvsSapProfiles: transformPvsSapProfile,
  pvsEvents: transformPvsEvent,
};

// Keys that should use VPC transforms (TGW data collected during PowerVS scan)
import { transformVpcItems } from './vpc-transform';

const VPC_DELEGATED_KEYS = new Set(['transitGateways', 'transitGatewayConnections', 'tgwRoutePrefixes']);

export function transformPowerVsItems(resourceKey: string, items: unknown[]): unknown[] {
  // Delegate TGW resource keys to the VPC transformer for proper snake_case → camelCase conversion
  if (VPC_DELEGATED_KEYS.has(resourceKey)) {
    return transformVpcItems(resourceKey, items);
  }
  const transformer = PVS_TRANSFORMERS[resourceKey];
  if (!transformer) return items;
  return items.map((item) => transformer(item as RawItem));
}
