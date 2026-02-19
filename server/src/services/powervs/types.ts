// PowerVS API response types

export interface IAMTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiration: number;
  scope: string;
}

export interface PowerVsWorkspace {
  id: string;
  guid: string;
  crn: string;
  name: string;
  state: string;
  region_id: string;
  resource_group_id: string;
  resource_group_name?: string;
  created_at?: string;
  updated_at?: string;
  // Derived from CRN
  _zone: string;
  _apiRegion: string;
  _cloudInstanceId: string;
}

export interface PowerVsCollectionError {
  resourceType: string;
  message: string;
  statusCode?: number;
}

// ── PowerVS API Resources ───────────────────────────────────────

export interface PvsInstance {
  pvmInstanceID: string;
  serverName: string;
  status: string;
  sysType: string;
  processors: number;
  procType: string;
  memory: number;
  osType: string;
  networks?: Array<{
    networkID: string;
    networkName?: string;
    ipAddress: string;
    macAddress?: string;
  }>;
  storageType?: string;
  diskSize?: number;
  volumeIDs?: string[];
  creationDate?: string;
  updatedDate?: string;
  [key: string]: unknown;
}

export interface PvsSharedProcessorPool {
  id: string;
  name: string;
  hostGroup?: string;
  reservedCores: number;
  allocatedCores?: number;
  availableCores?: number;
  sharedProcessorPoolPlacementGroups?: Array<{ id: string; name: string }>;
  pvmInstances?: Array<{ id: string; name: string }>;
  [key: string]: unknown;
}

export interface PvsPlacementGroup {
  id: string;
  name: string;
  policy: string;
  members?: string[];
  [key: string]: unknown;
}

export interface PvsHostGroup {
  id: string;
  name: string;
  hosts?: Array<{ id: string }>;
  secondaries?: Array<{ id: string; name: string }>;
  [key: string]: unknown;
}

export interface PvsNetwork {
  networkID: string;
  name: string;
  type: string;
  vlanID?: number;
  cidr?: string;
  gateway?: string;
  mtu?: number;
  ipAddressMetrics?: { available: number; used: number; total: number };
  [key: string]: unknown;
}

export interface PvsNetworkPort {
  portID: string;
  ipAddress: string;
  macAddress: string;
  status: string;
  pvmInstance?: { pvmInstanceID: string; href?: string };
  [key: string]: unknown;
}

export interface PvsNetworkSecurityGroup {
  id: string;
  name: string;
  rules?: Array<{ id: string }>;
  members?: Array<{ id: string; macAddress?: string; target?: string }>;
  [key: string]: unknown;
}

export interface PvsCloudConnection {
  cloudConnectionID: string;
  name: string;
  speed: number;
  globalRouting: boolean;
  greEnabled?: boolean;
  transitEnabled?: boolean;
  networks?: Array<{ networkID: string }>;
  [key: string]: unknown;
}

export interface PvsDhcpServer {
  id: string;
  status: string;
  network?: { id: string; name: string };
  [key: string]: unknown;
}

export interface PvsVpnConnection {
  id: string;
  name: string;
  status: string;
  mode: string;
  peerAddress: string;
  localSubnets?: string[];
  peerSubnets?: string[];
  [key: string]: unknown;
}

export interface PvsIkePolicy {
  id: string;
  name: string;
  version: number;
  encryption: string;
  dhGroup: number;
  authentication: string;
  [key: string]: unknown;
}

export interface PvsIpsecPolicy {
  id: string;
  name: string;
  encryption: string;
  dhGroup: number;
  authentication: string;
  pfs: boolean;
  [key: string]: unknown;
}

export interface PvsVolume {
  volumeID: string;
  name: string;
  state: string;
  size: number;
  diskType: string;
  bootable: boolean;
  shareable: boolean;
  pvmInstanceIDs?: string[];
  creationDate?: string;
  [key: string]: unknown;
}

export interface PvsVolumeGroup {
  id: string;
  name: string;
  status: string;
  consistencyGroupName?: string;
  volumeIDs?: string[];
  replicationEnabled?: boolean;
  [key: string]: unknown;
}

export interface PvsSnapshot {
  snapshotID: string;
  name: string;
  status: string;
  percentComplete?: number;
  pvmInstanceID?: string;
  volumeSnapshots?: Record<string, unknown>;
  creationDate?: string;
  [key: string]: unknown;
}

export interface PvsSshKey {
  name: string;
  sshKey: string;
  creationDate?: string;
  [key: string]: unknown;
}

export interface PvsImage {
  imageID: string;
  name: string;
  state: string;
  operatingSystem?: { architecture: string; displayName: string };
  size?: number;
  storageType?: string;
  creationDate?: string;
  [key: string]: unknown;
}

export interface PvsSystemPool {
  type: string;
  sharedCoreRatio?: { min: number; max: number; default: number };
  systems?: Array<{
    cores: number;
    memory: number;
    id: string;
  }>;
  [key: string]: unknown;
}

export interface PvsSapProfile {
  profileID: string;
  type: string;
  cores: number;
  memory: number;
  saps?: number;
  certified: boolean;
  [key: string]: unknown;
}

export interface PvsEvent {
  eventID: string;
  action: string;
  level: string;
  message: string;
  resource?: string;
  user?: { name: string; email: string };
  timestamp?: string;
  [key: string]: unknown;
}

// Resource Controller API types for workspace discovery
export interface ResourceInstance {
  id: string;
  guid: string;
  crn: string;
  name: string;
  state: string;
  region_id: string;
  resource_group_id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ResourceInstanceListResponse {
  rows_count: number;
  next_url?: string;
  resources: ResourceInstance[];
}
