// VPC Infrastructure API response types

export interface IAMTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiration: number;
  scope: string;
}

export interface VpcRegion {
  name: string;
  href: string;
  endpoint: string;
  status: string;
}

// Paginated response wrapper
export interface VpcListResponse {
  first?: { href: string };
  next?: { href: string };
  limit: number;
  total_count: number;
  [key: string]: unknown;
}

// ── VPC Resources ────────────────────────────────────────────────

export interface VpcInstance {
  id: string;
  crn: string;
  href: string;
  name: string;
  status: string;
  profile?: { name: string; href: string };
  zone?: { name: string; href: string };
  vpc?: { id: string; name: string; crn: string; href: string };
  image?: { id: string; name: string; crn: string };
  primary_network_interface?: {
    id: string;
    name: string;
    primary_ip?: { address: string };
    subnet?: { id: string; name: string };
  };
  network_interfaces?: Array<{
    id: string;
    name: string;
    primary_ip?: { address: string };
    subnet?: { id: string; name: string };
  }>;
  vcpu?: { count: number; architecture: string };
  memory?: number;
  bandwidth?: number;
  boot_volume_attachment?: { volume?: { id: string; name: string } };
  volume_attachments?: Array<{ volume?: { id: string; name: string } }>;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcBareMetalServer {
  id: string;
  crn: string;
  href: string;
  name: string;
  status: string;
  profile?: { name: string; href: string };
  zone?: { name: string; href: string };
  vpc?: { id: string; name: string; crn: string };
  primary_network_interface?: {
    id: string;
    name: string;
    primary_ip?: { address: string };
    subnet?: { id: string; name: string };
  };
  cpu?: { core_count: number; socket_count: number; architecture: string };
  memory?: number;
  bandwidth?: number;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcDedicatedHost {
  id: string;
  crn: string;
  href: string;
  name: string;
  state: string;
  profile?: { name: string; href: string };
  zone?: { name: string; href: string };
  vcpu?: { count: number };
  memory?: number;
  socket_count?: number;
  instance_placement_enabled?: boolean;
  instances?: Array<{ id: string; name: string }>;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcPlacementGroup {
  id: string;
  crn: string;
  href: string;
  name: string;
  strategy: string;
  resource_type: string;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface Vpc {
  id: string;
  crn: string;
  href: string;
  name: string;
  status: string;
  classic_access?: boolean;
  default_network_acl?: { id: string; name: string };
  default_routing_table?: { id: string; name: string };
  default_security_group?: { id: string; name: string };
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcSubnet {
  id: string;
  crn: string;
  href: string;
  name: string;
  status: string;
  ipv4_cidr_block: string;
  available_ipv4_address_count: number;
  total_ipv4_address_count: number;
  zone?: { name: string; href: string };
  vpc?: { id: string; name: string; crn: string };
  network_acl?: { id: string; name: string };
  public_gateway?: { id: string; name: string };
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcSecurityGroup {
  id: string;
  crn: string;
  href: string;
  name: string;
  vpc?: { id: string; name: string; crn: string };
  rules?: Array<{
    id: string;
    direction: string;
    protocol: string;
    port_min?: number;
    port_max?: number;
    remote?: { cidr_block?: string; address?: string };
  }>;
  targets?: Array<{ id: string; name: string }>;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcFloatingIp {
  id: string;
  crn: string;
  href: string;
  name: string;
  address: string;
  status: string;
  zone?: { name: string; href: string };
  target?: { id: string; name: string; resource_type: string };
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcPublicGateway {
  id: string;
  crn: string;
  href: string;
  name: string;
  status: string;
  zone?: { name: string; href: string };
  vpc?: { id: string; name: string; crn: string };
  floating_ip?: { id: string; address: string };
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcNetworkAcl {
  id: string;
  crn: string;
  href: string;
  name: string;
  vpc?: { id: string; name: string; crn: string };
  rules?: Array<{
    id: string;
    name: string;
    action: string;
    direction: string;
    protocol: string;
    source: string;
    destination: string;
  }>;
  subnets?: Array<{ id: string; name: string }>;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcLoadBalancer {
  id: string;
  crn: string;
  href: string;
  name: string;
  hostname?: string;
  is_public: boolean;
  operating_status: string;
  provisioning_status: string;
  subnets?: Array<{ id: string; name: string }>;
  pools?: Array<{ id: string; name: string }>;
  listeners?: Array<{ id: string }>;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcVpnGateway {
  id: string;
  crn: string;
  href: string;
  name: string;
  status: string;
  mode?: string;
  subnet?: { id: string; name: string };
  members?: Array<{ public_ip?: { address: string }; role: string; status: string }>;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcEndpointGateway {
  id: string;
  crn: string;
  href: string;
  name: string;
  lifecycle_state: string;
  health_state: string;
  target?: { name: string; resource_type: string; crn?: string };
  vpc?: { id: string; name: string; crn: string };
  ips?: Array<{ id: string; address: string; name: string }>;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcVolume {
  id: string;
  crn: string;
  href: string;
  name: string;
  status: string;
  capacity: number;
  iops: number;
  profile?: { name: string; href: string };
  zone?: { name: string; href: string };
  encryption?: string;
  active?: boolean;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcSshKey {
  id: string;
  crn: string;
  href: string;
  name: string;
  type: string;
  fingerprint: string;
  length: number;
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcImage {
  id: string;
  crn: string;
  href: string;
  name: string;
  status: string;
  visibility: string;
  os?: { name: string; family: string; architecture: string; vendor: string; version: string };
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface VpcFlowLogCollector {
  id: string;
  crn: string;
  href: string;
  name: string;
  active: boolean;
  lifecycle_state: string;
  target?: { id: string; name: string; resource_type: string };
  storage_bucket?: { name: string };
  vpc?: { id: string; name: string; crn: string };
  created_at?: string;
  resource_group?: { id: string; name: string };
  _region?: string;
  [key: string]: unknown;
}

export interface TransitGateway {
  id: string;
  crn: string;
  name: string;
  status: string;
  location: string;
  global: boolean;
  created_at?: string;
  updated_at?: string;
  resource_group?: { id: string; name: string };
  [key: string]: unknown;
}

export interface TransitGatewayPrefixFilter {
  id: string;
  action: 'permit' | 'deny';
  prefix: string;
  le?: number;
  ge?: number;
  before?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransitGatewayConnection {
  id: string;
  name: string;
  status: string;
  network_type: string;
  network_id?: string;
  network_account_id?: string;
  transit_gateway: { id: string; name: string };
  created_at?: string;
  updated_at?: string;
  zone?: { name: string };
  // Prefix filters (fetched separately for GRE connections)
  prefix_filters?: TransitGatewayPrefixFilter[];
  [key: string]: unknown;
}

export interface DirectLinkGateway {
  id: string;
  crn: string;
  name: string;
  type: string;
  speed_mbps: number;
  location_name: string;
  bgp_status: string;
  operational_status: string;
  global: boolean;
  created_at?: string;
  resource_group?: { id: string; name: string };
  [key: string]: unknown;
}

export interface DirectLinkVirtualConnection {
  id: string;
  name: string;
  status: string;
  type: string;
  network_id?: string;
  network_account?: { id: string };
  created_at?: string;
  gateway: { id: string; name: string };
  [key: string]: unknown;
}

export interface TransitGatewayRouteReportRoute {
  prefix: string;
}

export interface TransitGatewayRouteReportConnection {
  id: string;
  name: string;
  type: string;
  routes: TransitGatewayRouteReportRoute[];
  // GRE tunnels may have additional fields
  bgp_asn?: number;
  status?: string;
  [key: string]: unknown;
}

export interface TransitGatewayRouteReport {
  id: string;
  status: string;
  connections?: TransitGatewayRouteReportConnection[];
}

export interface VpnGatewayConnection {
  id: string;
  name: string;
  status: string;
  mode?: string;
  local_cidrs?: string[];
  peer_cidrs?: string[];
  peer_address?: string;
  psk?: string;
  admin_state_up?: boolean;
  created_at?: string;
  vpn_gateway: { id: string; name: string; region: string };
  [key: string]: unknown;
}

export interface VpcRoutingTable {
  id: string;
  crn: string;
  href: string;
  name: string;
  lifecycle_state: string;
  is_default: boolean;
  resource_type: string;
  route_direct_link_ingress: boolean;
  route_transit_gateway_ingress: boolean;
  route_vpc_zone_ingress: boolean;
  routes?: Array<{ id: string; name: string }>;
  subnets?: Array<{ id: string; name: string }>;
  created_at?: string;
  vpc?: { id: string; name: string; crn: string };
  _region?: string;
  _vpcId?: string;
  _vpcName?: string;
  [key: string]: unknown;
}

export interface VpcRoute {
  id: string;
  href: string;
  name: string;
  lifecycle_state: string;
  destination: string;
  action: string;
  priority?: number;
  origin?: string;
  zone?: { name: string; href: string };
  next_hop?: {
    address?: string;
    id?: string;
    name?: string;
    resource_type?: string;
  };
  created_at?: string;
  _region?: string;
  _vpcId?: string;
  _vpcName?: string;
  _routingTableId?: string;
  _routingTableName?: string;
  [key: string]: unknown;
}

// ── Cloud Object Storage (Resource Controller) ─────────────────────
export interface CosInstance {
  id: string;
  guid: string;
  crn: string;
  name: string;
  resource_group_id: string;
  resource_group_name?: string;
  resource_plan_id: string;
  type: string;
  state: string;
  location: string;
  created_at: string;
  updated_at: string;
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VpcCollectionError {
  resourceType: string;
  message: string;
  statusCode?: number;
}
