/**
 * Transforms raw VPC API objects into flat structures
 * expected by the frontend column definitions in vpc-resources.ts.
 */

type RawItem = Record<string, unknown>;

function nested(obj: RawItem, ...keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as RawItem)[key];
  }
  return current;
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function transformVpcInstance(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    profile: safeStr(nested(raw, 'profile', 'name')),
    vcpu: nested(raw, 'vcpu', 'count'),
    memory: raw.memory,
    zone: safeStr(nested(raw, 'zone', 'name')),
    vpcName: safeStr(nested(raw, 'vpc', 'name')),
    primaryIp: safeStr(nested(raw, 'primary_network_interface', 'primary_ip', 'address')),
    region: raw._region,
    created_at: raw.created_at,
    resourceGroup: safeStr(nested(raw, 'resource_group', 'name')),
    crn: raw.crn,
  };
}

function transformVpcBareMetalServer(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    profile: safeStr(nested(raw, 'profile', 'name')),
    zone: safeStr(nested(raw, 'zone', 'name')),
    vpcName: safeStr(nested(raw, 'vpc', 'name')),
    region: raw._region,
    created_at: raw.created_at,
    resourceGroup: safeStr(nested(raw, 'resource_group', 'name')),
  };
}

function transformVpcDedicatedHost(raw: RawItem): RawItem {
  const instances = raw.instances as unknown[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    state: raw.state,
    profile: safeStr(nested(raw, 'profile', 'name')),
    zone: safeStr(nested(raw, 'zone', 'name')),
    vcpu: nested(raw, 'vcpu', 'count'),
    memory: raw.memory,
    instanceCount: instances?.length ?? 0,
    region: raw._region,
    created_at: raw.created_at,
    resourceGroup: safeStr(nested(raw, 'resource_group', 'name')),
  };
}

function transformVpcPlacementGroup(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    strategy: raw.strategy,
    region: raw._region,
    created_at: raw.created_at,
    resourceGroup: safeStr(nested(raw, 'resource_group', 'name')),
  };
}

function transformVpc(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    classicAccess: raw.classic_access,
    crn: raw.crn,
    region: raw._region,
    created_at: raw.created_at,
    resourceGroup: safeStr(nested(raw, 'resource_group', 'name')),
  };
}

function transformVpcSubnet(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    cidr: raw.ipv4_cidr_block,
    availableIps: raw.available_ipv4_address_count,
    totalIps: raw.total_ipv4_address_count,
    zone: safeStr(nested(raw, 'zone', 'name')),
    vpcName: safeStr(nested(raw, 'vpc', 'name')),
    region: raw._region,
    created_at: raw.created_at,
    resourceGroup: safeStr(nested(raw, 'resource_group', 'name')),
  };
}

function transformVpcSecurityGroup(raw: RawItem): RawItem {
  const rules = raw.rules as unknown[] | undefined;
  const targets = raw.targets as unknown[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    vpcName: safeStr(nested(raw, 'vpc', 'name')),
    ruleCount: rules?.length ?? 0,
    targetCount: targets?.length ?? 0,
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcFloatingIp(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    address: raw.address,
    status: raw.status,
    target: safeStr(nested(raw, 'target', 'name')),
    zone: safeStr(nested(raw, 'zone', 'name')),
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcPublicGateway(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    vpcName: safeStr(nested(raw, 'vpc', 'name')),
    floatingIp: safeStr(nested(raw, 'floating_ip', 'address')),
    zone: safeStr(nested(raw, 'zone', 'name')),
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcNetworkAcl(raw: RawItem): RawItem {
  const rules = raw.rules as unknown[] | undefined;
  const subnets = raw.subnets as unknown[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    vpcName: safeStr(nested(raw, 'vpc', 'name')),
    ruleCount: rules?.length ?? 0,
    subnetCount: subnets?.length ?? 0,
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcLoadBalancer(raw: RawItem): RawItem {
  // _subnetIds / _subnetNames are injected by the backend as flat string arrays.
  // Also try extracting from the nested subnets objects as fallback.
  let subnetIds = raw._subnetIds as string[] | undefined;
  let subnetNames = raw._subnetNames as string[] | undefined;
  if (!subnetIds || subnetIds.length === 0) {
    const subnets = raw.subnets as Array<{ id?: string; name?: string }> | undefined;
    subnetIds = subnets?.map((s) => s.id).filter((v): v is string => !!v) ?? [];
    subnetNames = subnets?.map((s) => s.name).filter((v): v is string => !!v) ?? [];
  }
  return {
    id: raw.id,
    name: raw.name,
    hostname: raw.hostname,
    isPublic: raw.is_public,
    operatingStatus: raw.operating_status,
    provisioningStatus: raw.provisioning_status,
    subnetIds: subnetIds,
    subnetNames: subnetNames ?? [],
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcVpnGateway(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    mode: raw.mode,
    subnet: safeStr(nested(raw, 'subnet', 'name')),
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcEndpointGateway(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    lifecycleState: raw.lifecycle_state,
    healthState: raw.health_state,
    target: safeStr(nested(raw, 'target', 'name')),
    vpcName: safeStr(nested(raw, 'vpc', 'name')),
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcVolume(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    capacity: raw.capacity,
    iops: raw.iops,
    profile: safeStr(nested(raw, 'profile', 'name')),
    encryption: raw.encryption,
    zone: safeStr(nested(raw, 'zone', 'name')),
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcSshKey(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    fingerprint: raw.fingerprint,
    length: raw.length,
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcImage(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    os: safeStr(nested(raw, 'os', 'name')),
    architecture: safeStr(nested(raw, 'os', 'architecture')),
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformVpcFlowLogCollector(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    active: raw.active,
    lifecycleState: raw.lifecycle_state,
    target: safeStr(nested(raw, 'target', 'name')),
    storageBucket: safeStr(nested(raw, 'storage_bucket', 'name')),
    region: raw._region,
    created_at: raw.created_at,
  };
}

function transformTransitGateway(raw: RawItem): RawItem {
  const isGlobal = raw.global === true;
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    location: raw.location,
    global: raw.global,
    routingScope: isGlobal ? 'Global' : 'Local',
    crn: raw.crn,
    created_at: raw.created_at,
    resourceGroup: safeStr(nested(raw, 'resource_group', 'name')),
  };
}

function transformTransitGatewayConnection(raw: RawItem): RawItem {
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
    transitGatewayName: safeStr(nested(raw, 'transit_gateway', 'name')),
    transitGatewayId: safeStr(nested(raw, 'transit_gateway', 'id')),
    networkId: raw.network_id,
    networkAccountId: raw.network_account_id,
    // Include prefix_filters prefixes for GRE tunnels (stored separately from route report prefixes)
    prefixFilterPrefixes: prefixFilterPrefixes.length > 0 ? prefixFilterPrefixes : undefined,
    created_at: raw.created_at,
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
    crn: raw.crn,
    created_at: raw.created_at,
    resourceGroup: safeStr(nested(raw, 'resource_group', 'name')),
  };
}

function transformDirectLinkVirtualConnection(raw: RawItem): RawItem {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    type: raw.type,
    gatewayName: safeStr(nested(raw, 'gateway', 'name')),
    gatewayId: safeStr(nested(raw, 'gateway', 'id')),
    networkId: raw.network_id,
    networkAccountId: safeStr(nested(raw, 'network_account', 'id')),
    created_at: raw.created_at,
  };
}

function transformVpnGatewayConnection(raw: RawItem): RawItem {
  const localCidrs = raw.local_cidrs as string[] | undefined;
  const peerCidrs = raw.peer_cidrs as string[] | undefined;
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    mode: raw.mode,
    vpnGatewayName: safeStr(nested(raw, 'vpn_gateway', 'name')),
    vpnGatewayId: safeStr(nested(raw, 'vpn_gateway', 'id')),
    peerAddress: raw.peer_address,
    localCidrs: localCidrs?.join(', ') ?? '',
    peerCidrs: peerCidrs?.join(', ') ?? '',
    localCidrsArray: localCidrs ?? [],
    peerCidrsArray: peerCidrs ?? [],
    region: safeStr(nested(raw, 'vpn_gateway', 'region')),
    created_at: raw.created_at,
  };
}

function transformVpcRoutingTable(raw: RawItem): RawItem {
  const routes = raw.routes as Array<{ id: string; name: string }> | undefined;
  const subnets = raw.subnets as Array<{ id: string; name: string }> | undefined;
  return {
    id: raw.id,
    name: raw.name,
    vpcId: raw._vpcId,
    vpcName: raw._vpcName ?? safeStr(nested(raw, 'vpc', 'name')),
    isDefault: raw.is_default,
    lifecycleState: raw.lifecycle_state,
    routeCount: routes?.length ?? 0,
    subnets: subnets?.map((s) => s.name).join(', ') ?? '',
    subnetCount: subnets?.length ?? 0,
    routeDirectLinkIngress: raw.route_direct_link_ingress,
    routeTransitGatewayIngress: raw.route_transit_gateway_ingress,
    routeVpcZoneIngress: raw.route_vpc_zone_ingress,
    region: raw._region,
    created_at: raw.created_at,
    crn: raw.crn,
  };
}

function transformVpcRoute(raw: RawItem): RawItem {
  const nextHop = raw.next_hop as { address?: string; id?: string; name?: string; resource_type?: string } | undefined;

  // Determine next hop type and target
  let nextHopType = '';
  let nextHopTarget = '';

  if (nextHop) {
    if (nextHop.address) {
      nextHopType = 'IP Address';
      nextHopTarget = nextHop.address;
    } else if (nextHop.resource_type) {
      // Map resource_type to human-readable name
      const typeMap: Record<string, string> = {
        'vpn_gateway': 'VPN Gateway',
        'vpn_gateway_connection': 'VPN Connection',
        'endpoint_gateway': 'VPE Gateway',
        'vpc_routing_table_route_next_hop_transit_gateway_connection': 'Transit Gateway',
      };
      nextHopType = typeMap[nextHop.resource_type] ?? nextHop.resource_type;
      nextHopTarget = nextHop.name ?? nextHop.id ?? '';
    }
  }

  // Handle service-origin routes (Direct Link, Classic)
  if (raw.origin === 'service' && !nextHopType) {
    nextHopType = 'Service';
    nextHopTarget = 'Direct Link / Classic';
  }

  return {
    id: raw.id,
    name: raw.name,
    routingTableId: raw._routingTableId,
    routingTableName: raw._routingTableName,
    vpcId: raw._vpcId,
    vpcName: raw._vpcName,
    destination: raw.destination,
    action: raw.action,
    nextHopType,
    nextHopTarget,
    zone: safeStr(nested(raw, 'zone', 'name')),
    priority: raw.priority,
    origin: raw.origin,
    lifecycleState: raw.lifecycle_state,
    region: raw._region,
    created_at: raw.created_at,
  };
}

const VPC_TRANSFORMERS: Record<string, (raw: RawItem) => RawItem> = {
  vpcInstances: transformVpcInstance,
  vpcBareMetalServers: transformVpcBareMetalServer,
  vpcDedicatedHosts: transformVpcDedicatedHost,
  vpcPlacementGroups: transformVpcPlacementGroup,
  vpcs: transformVpc,
  vpcSubnets: transformVpcSubnet,
  vpcSecurityGroups: transformVpcSecurityGroup,
  vpcFloatingIps: transformVpcFloatingIp,
  vpcPublicGateways: transformVpcPublicGateway,
  vpcNetworkAcls: transformVpcNetworkAcl,
  vpcLoadBalancers: transformVpcLoadBalancer,
  vpcVpnGateways: transformVpcVpnGateway,
  vpcEndpointGateways: transformVpcEndpointGateway,
  vpcRoutingTables: transformVpcRoutingTable,
  vpcRoutes: transformVpcRoute,
  vpcVolumes: transformVpcVolume,
  vpcSshKeys: transformVpcSshKey,
  vpcImages: transformVpcImage,
  vpcFlowLogCollectors: transformVpcFlowLogCollector,
  transitGateways: transformTransitGateway,
  transitGatewayConnections: transformTransitGatewayConnection,
  directLinkGateways: transformDirectLinkGateway,
  directLinkVirtualConnections: transformDirectLinkVirtualConnection,
  vpnGatewayConnections: transformVpnGatewayConnection,
};

export function transformVpcItems(resourceKey: string, items: unknown[]): unknown[] {
  const transformer = VPC_TRANSFORMERS[resourceKey];
  if (!transformer) return items;
  return items.map((item) => transformer(item as RawItem));
}
