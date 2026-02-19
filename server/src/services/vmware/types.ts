// VMware API response types for VCF for Classic and VCF as a Service

export interface IAMTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiration: number;
  scope: string;
}

// ── VCF for Classic (vCenter Server instances) ──────────────────────

export interface VMwareClusterNode {
  id?: string;
  hostname?: string;
  primaryIp?: string;
  backendIp?: string;
  hardwareId?: number;
  status?: string;
  [key: string]: unknown;
}

/** Flattened host record for display — one row per ESXi host. */
export interface VMwareHost {
  id?: string;
  hostname?: string;
  primaryIp?: string;
  backendIp?: string;
  hardwareId?: number;
  status?: string;
  clusterId?: string;
  clusterName?: string;
  instanceId?: string;
  location?: string;
  [key: string]: unknown;
}

/** Flattened VLAN record from a VMware cluster's network config. */
export interface VMwareVlan {
  id?: string | number;
  vlanNumber?: number;
  name?: string;
  type?: string;
  primaryRouter?: string;
  clusterId?: string;
  clusterName?: string;
  instanceId?: string;
  location?: string;
  [key: string]: unknown;
}

/** Flattened subnet record extracted from VMware VLAN data. */
export interface VMwareSubnet {
  id?: string | number;
  cidr?: string;
  networkIdentifier?: string;
  netmask?: string;
  gateway?: string;
  subnetType?: string;
  vlanNumber?: number;
  vlanId?: string | number;
  vlanName?: string;
  clusterId?: string;
  clusterName?: string;
  instanceId?: string;
  location?: string;
  [key: string]: unknown;
}

/** Combined result from VLAN fetch — includes both VLANs and extracted subnets. */
export interface VMwareNetworkResult {
  vlans: VMwareVlan[];
  subnets: VMwareSubnet[];
}

export interface VMwareCluster {
  id?: string;
  name?: string;
  datacenter?: string;
  status?: string;
  host_count?: number;
  hosts?: VMwareClusterNode[];
  file_shares?: Array<{
    name?: string;
    size_gb?: number;
  }>;
  vsan_enabled?: boolean;
  instance_id?: string;
}

export interface VMwareInstance {
  id?: string;
  name?: string;
  datacenter?: string;
  status?: string;
  type?: string;
  cluster_count?: number;
  clusters?: VMwareCluster[];
  vcenter_url?: string;
  nsx_manager_url?: string;
  created_at?: string;
  resource_group_id?: string;
}

// ── VCF as a Service (Director Sites, PVDCs, VDCs) ──────────────────

export interface VCFCluster {
  id?: string;
  name?: string;
  host_count?: number;
  status?: string;
  data_center_name?: string;
  host_profile?: string;
  storage_type?: string;
  file_shares?: Array<{
    name?: string;
    size_gb?: number;
  }>;
  pvdc_id?: string;
  director_site_id?: string;
}

export interface PVDC {
  id?: string;
  name?: string;
  data_center_name?: string;
  status?: string;
  clusters?: VCFCluster[];
  provider_type?: string;
  director_site_id?: string;
}

export interface DirectorSite {
  id?: string;
  name?: string;
  status?: string;
  pvdcs?: PVDC[];
  resource_group_id?: string;
  created_at?: string;
  region?: string;
}

export interface Edge {
  id?: string;
  type?: string;
  size?: string;
  status?: string;
  transit_gateways?: TransitGateway[];
}

export interface TransitGateway {
  id?: string;
  name?: string;
  status?: string;
  connections?: Array<{
    name?: string;
    transit_gateway_connection_name?: string;
    status?: string;
  }>;
}

export interface VDC {
  id?: string;
  name?: string;
  status?: string;
  director_site_id?: string;
  director_site_name?: string;
  cpu?: number;
  ram?: number;
  disk?: number;
  fast_provisioning_enabled?: boolean;
  rhel_byol?: boolean;
  windows_byol?: boolean;
  edges?: Edge[];
  resource_group_id?: string;
  created_at?: string;
  region?: string;
  type?: string;
}

export interface MultitenantDirectorSite {
  id?: string;
  name?: string;
  region?: string;
  pvdcs?: Array<{
    id?: string;
    name?: string;
    provider_type?: string;
  }>;
}

// ── Cross-reference annotations ─────────────────────────────────────

export interface VMwareCrossReference {
  classicResourceType: string;
  classicResourceId: number;
  classicResourceName: string;
  vmwareRole: string;
  vmwareResourceType: string;
  vmwareResourceId: string;
  vmwareResourceName: string;
}

// ── Collected VMware data container ─────────────────────────────────

export interface VMwareCollectedData {
  vmwareInstances: VMwareInstance[];
  vmwareClusters: VMwareCluster[];
  directorSites: DirectorSite[];
  pvdcs: PVDC[];
  vcfClusters: VCFCluster[];
  vdcs: VDC[];
  multitenantSites: MultitenantDirectorSite[];
  crossReferences: VMwareCrossReference[];
}
