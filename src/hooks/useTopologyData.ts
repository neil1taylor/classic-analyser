import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { useData } from '@/contexts/DataContext';

function field(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key];
}

function str(item: unknown, key: string): string {
  return String(field(item, key) ?? '');
}

function num(item: unknown, key: string): number {
  return Number(field(item, key) ?? 0);
}

export interface TopologyNodeData {
  label: string;
  nodeType: 'vsi' | 'bareMetal' | 'storage' | 'storageGroup' | 'gateway' | 'vlan' | 'firewall' | 'internet' | 'router' | 'subnet' | 'privateNetworkBus' | 'cloudServices' | 'transitGateway' | 'tgwConnection' | 'directLink' | 'vpnGateway';
  // Common
  id?: number;
  ip?: string;
  datacenter?: string;
  status?: string;
  // Compute
  cpu?: number;
  memory?: number;
  os?: string;
  // Storage
  capacityGb?: number;
  storageType?: string;
  // Network
  vlanNumber?: number;
  networkSpace?: string;
  // Gateway
  memberCount?: number;
  // Router
  routerType?: 'fcr' | 'bcr';
  // Subnet
  networkIdentifier?: string;
  cidr?: number;
  subnetType?: string;
  usableIpCount?: number;
  // VLAN subnets
  subnetCount?: number;
  subnetCidrs?: string[];
  // Dual-NIC device
  publicIp?: string;
  privateIp?: string;
  deviceType?: string;
  // Transit Gateway / Direct Link
  location?: string;
  dlType?: string;
  speed?: number;
  operational_status?: string;
  routePrefixes?: string[];
  connectionPrefixes?: Array<{
    connectionId: string;
    connectionName: string;
    connectionType: string;
    prefixes: string[];
  }>;
  connectionCount?: number;
  // VPN Gateway
  vpnMode?: string;
  vpcName?: string;
  vpcRegion?: string;
  // Storage Group
  storageCount?: number;
  totalCapacityGb?: number;
  storageBreakdown?: { block: number; file: number };
  storageDetails?: Array<{ label: string; capacityGb: number; storageType: string }>;
  [key: string]: unknown;
}

// TGW Connection Node data for separate connection nodes
export interface TgwConnectionNodeData {
  connectionId: string;
  connectionName: string;
  connectionType: string;
  prefixes: string[];
  transitGatewayId: string;
  transitGatewayName: string;
  status?: string;
  networkAccountId?: string;
  onOpenDetail?: (data: TgwConnectionNodeData) => void;
}

export type TopologyNode = Node<TopologyNodeData>;

const Y_INTERNET = 0;
const Y_FCR = 130;
const Y_PUB_GATEWAY = 250;
const Y_PUB_VLAN = 370;
const Y_COMPUTE = 520;
const Y_PRIV_VLAN = 680;
const Y_PRIV_GATEWAY = 800;
const Y_BCR = 920;
const Y_STORAGE = 1060;
const Y_PRIVATE_NETWORK = 1200;
const Y_SERVICES_AND_TGW = 1360;
const Y_TGW_CONNECTIONS = 1500;
const Y_VPN_GATEWAYS = 1640;
const Y_DIRECT_LINK = 1780;
const X_SPACING = 200;

// Connection type edge colors
const connectionTypeEdgeColors: Record<string, string> = {
  vpc: '#0f62fe',
  classic: '#525252',
  gre_tunnel: '#009d9a',
  unbound_gre_tunnel: '#009d9a',
  redundant_gre: '#009d9a',
  redundant_gre_tunnel: '#009d9a',
  directlink: '#ff832b',
  power_virtual_server: '#9f1853',
};

const ALL_LAYERS = new Set(['virtualServers', 'bareMetal', 'gateways', 'firewalls', 'storage', 'subnets', 'transitGateways', 'directLinks']);

export function useTopologyData(
  datacenterFilter: string | null,
  visibleLayers: Set<string> = ALL_LAYERS,
) {
  const { collectedData } = useData();

  return useMemo(() => {
    const nodes: TopologyNode[] = [];
    const edges: Edge[] = [];

    const vsis = (collectedData['virtualServers'] ?? []) as Record<string, unknown>[];
    const bms = (collectedData['bareMetal'] ?? []) as Record<string, unknown>[];
    const vlans = (collectedData['vlans'] ?? []) as Record<string, unknown>[];
    const gateways = (collectedData['gateways'] ?? []) as Record<string, unknown>[];
    const blockStorage = (collectedData['blockStorage'] ?? []) as Record<string, unknown>[];
    const fileStorage = (collectedData['fileStorage'] ?? []) as Record<string, unknown>[];
    const firewalls = (collectedData['firewalls'] ?? []) as Record<string, unknown>[];
    const subnets = (collectedData['subnets'] ?? []) as Record<string, unknown>[];

    // Apply datacenter filter
    const filterDC = (items: Record<string, unknown>[]) =>
      datacenterFilter
        ? items.filter((i) => str(i, 'datacenter') === datacenterFilter)
        : items;

    const filtVsis = filterDC(vsis);
    const filtBms = filterDC(bms);
    const filtVlans = filterDC(vlans);
    const filtGateways = filterDC(gateways);
    const filtBlock = filterDC(blockStorage);
    const filtFile = filterDC(fileStorage);
    const filtFirewalls = filterDC(firewalls);

    // Collect unique datacenters from VLANs to create per-DC routers
    const dcSet = new Set<string>();
    filtVlans.forEach((v) => {
      const dc = str(v, 'datacenter');
      if (dc) dcSet.add(dc);
    });
    // Also include DCs from compute nodes that may not have VLANs in data
    [...filtVsis, ...filtBms, ...filtGateways].forEach((item) => {
      const dc = str(item, 'datacenter');
      if (dc) dcSet.add(dc);
    });
    const dcs = Array.from(dcSet).sort();

    // Separate public and private VLANs per DC
    // Build subnet lookup by VLAN number
    const subnetsByVlan = new Map<number, Record<string, unknown>[]>();
    subnets.forEach((s) => {
      const vn = num(s, 'vlanNumber');
      if (vn) {
        const arr = subnetsByVlan.get(vn) ?? [];
        arr.push(s);
        subnetsByVlan.set(vn, arr);
      }
    });

    const publicVlansByDC = new Map<string, typeof filtVlans>();
    const privateVlansByDC = new Map<string, typeof filtVlans>();
    filtVlans.forEach((vlan) => {
      const dc = str(vlan, 'datacenter');
      const space = str(vlan, 'networkSpace').toUpperCase();
      if (space === 'PUBLIC') {
        const arr = publicVlansByDC.get(dc) ?? [];
        arr.push(vlan);
        publicVlansByDC.set(dc, arr);
      } else {
        const arr = privateVlansByDC.get(dc) ?? [];
        arr.push(vlan);
        privateVlansByDC.set(dc, arr);
      }
    });

    // Internet node — single, at the top
    nodes.push({
      id: 'internet',
      type: 'internetNode',
      position: { x: 400, y: Y_INTERNET },
      data: { label: 'Internet', nodeType: 'internet' },
    });

    // Per-datacenter: create FCR (frontend) and BCR (backend) router nodes
    // Layout: each DC gets a horizontal band; FCR on left, BCR on right
    const DC_BAND_WIDTH = 500;
    let vlanXOffset = 0;

    dcs.forEach((dc, dcIndex) => {
      const bandX = dcIndex * DC_BAND_WIDTH;
      const fcrId = `fcr-${dc}`;
      const bcrId = `bcr-${dc}`;

      // FCR — Frontend Customer Router (public network) — above compute
      nodes.push({
        id: fcrId,
        type: 'routerNode',
        position: { x: bandX + 80, y: Y_FCR },
        data: {
          label: `FCR ${dc}`,
          nodeType: 'router',
          routerType: 'fcr' as const,
          datacenter: dc,
        },
      });

      // Internet → FCR
      edges.push({
        id: `internet-${fcrId}`,
        source: 'internet',
        target: fcrId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#da1e28', strokeWidth: 2 },
      });

      // BCR — Backend Customer Router (private network) — below compute
      nodes.push({
        id: bcrId,
        type: 'routerNode',
        position: { x: bandX + 80, y: Y_BCR },
        data: {
          label: `BCR ${dc}`,
          nodeType: 'router',
          routerType: 'bcr' as const,
          datacenter: dc,
        },
      });

      // FCR ↔ BCR link (no label — they are separate routers, not internally connected)


      // Public VLANs → connect to FCR (above compute)
      const pubVlans = publicVlansByDC.get(dc) ?? [];
      pubVlans.forEach((vlan, vi) => {
        const id = `vlan-${num(vlan, 'id')}`;
        const vlanNum = num(vlan, 'vlanNumber');
        const vlanSubnets = subnetsByVlan.get(vlanNum) ?? [];

        nodes.push({
          id,
          type: 'vlanNode',
          position: { x: bandX + vi * 170, y: Y_PUB_VLAN },
          data: {
            label: str(vlan, 'name') || `VLAN ${vlanNum}`,
            nodeType: 'vlan',
            id: num(vlan, 'id'),
            vlanNumber: vlanNum,
            networkSpace: 'PUBLIC',
            datacenter: dc,
            subnetCount: vlanSubnets.length,
            subnetCidrs: vlanSubnets.map((s) => {
              const cidr = `${str(s, 'networkIdentifier')}/${num(s, 'cidr')}`;
              return str(s, 'networkIdentifier').startsWith('169.254.') ? `${cidr} (link-local)` : cidr;
            }),
          },
        });

        // Check if a gateway sits in front of this VLAN
        const gwName = str(vlan, 'gateway');
        const gwNode = gwName ? filtGateways.find(
          (g) => str(g, 'name') === gwName || str(g, 'publicIp') === gwName,
        ) : null;

        if (gwNode) {
          // FCR → Gateway → VLAN
          const gwId = `gw-${num(gwNode, 'id')}`;
          // Gateway node may already exist; add only if not
          if (!nodes.find((n) => n.id === gwId)) {
            nodes.push({
              id: gwId,
              type: 'gatewayNode',
              position: { x: bandX + vi * 170, y: Y_PUB_GATEWAY },
              data: {
                label: str(gwNode, 'name') || `Gateway ${num(gwNode, 'id')}`,
                nodeType: 'gateway',
                id: num(gwNode, 'id'),
                ip: str(gwNode, 'publicIp'),
                datacenter: str(gwNode, 'datacenter'),
                status: str(gwNode, 'status'),
                memberCount: num(gwNode, 'memberCount'),
                networkSpace: str(gwNode, 'networkSpace'),
              },
            });
            edges.push({
              id: `${fcrId}-${gwId}`,
              source: fcrId,
              target: gwId,
              type: 'smoothstep',
              style: { stroke: '#da1e28', strokeWidth: 1.5 },
            });
          }
          edges.push({
            id: `${gwId}-${id}`,
            source: gwId,
            target: id,
            type: 'smoothstep',
            style: { stroke: '#da1e28', strokeWidth: 1.5 },
          });
        } else {
          // FCR → VLAN directly
          edges.push({
            id: `${fcrId}-${id}`,
            source: fcrId,
            target: id,
            type: 'smoothstep',
            style: { stroke: '#da1e28', strokeWidth: 1.5 },
          });
        }

        vlanXOffset = Math.max(vlanXOffset, bandX + (vi + 1) * 170);
      });

      // Private VLANs → below compute, connect up to BCR
      const privVlans = privateVlansByDC.get(dc) ?? [];
      privVlans.forEach((vlan, vi) => {
        const id = `vlan-${num(vlan, 'id')}`;
        const xPos = bandX + vi * 170;
        const vlanNum = num(vlan, 'vlanNumber');
        const vlanSubnets = subnetsByVlan.get(vlanNum) ?? [];

        nodes.push({
          id,
          type: 'vlanNode',
          position: { x: xPos, y: Y_PRIV_VLAN },
          data: {
            label: str(vlan, 'name') || `VLAN ${vlanNum}`,
            nodeType: 'vlan',
            id: num(vlan, 'id'),
            vlanNumber: vlanNum,
            networkSpace: 'PRIVATE',
            datacenter: dc,
            subnetCount: vlanSubnets.length,
            subnetCidrs: vlanSubnets.map((s) => {
              const cidr = `${str(s, 'networkIdentifier')}/${num(s, 'cidr')}`;
              return str(s, 'networkIdentifier').startsWith('169.254.') ? `${cidr} (link-local)` : cidr;
            }),
          },
        });

        // Check if a gateway sits in front of this VLAN
        const gwName = str(vlan, 'gateway');
        const gwNode = gwName ? filtGateways.find(
          (g) => str(g, 'name') === gwName || str(g, 'publicIp') === gwName,
        ) : null;

        if (gwNode) {
          const gwId = `gw-priv-${num(gwNode, 'id')}`;
          if (!nodes.find((n) => n.id === gwId)) {
            nodes.push({
              id: gwId,
              type: 'gatewayNode',
              position: { x: xPos, y: Y_PRIV_GATEWAY },
              data: {
                label: str(gwNode, 'name') || `Gateway ${num(gwNode, 'id')}`,
                nodeType: 'gateway',
                id: num(gwNode, 'id'),
                ip: str(gwNode, 'publicIp'),
                datacenter: str(gwNode, 'datacenter'),
                status: str(gwNode, 'status'),
                memberCount: num(gwNode, 'memberCount'),
                networkSpace: str(gwNode, 'networkSpace'),
              },
            });
            // Private VLAN → Gateway → BCR (bottom-up direction)
            edges.push({
              id: `${id}-${gwId}`,
              source: id,
              target: gwId,
              type: 'smoothstep',
              style: { stroke: '#0f62fe', strokeWidth: 1.5 },
            });
            edges.push({
              id: `${gwId}-${bcrId}`,
              source: gwId,
              target: bcrId,
              type: 'smoothstep',
              style: { stroke: '#0f62fe', strokeWidth: 1.5 },
            });
          }
        } else {
          // Private VLAN → BCR directly
          edges.push({
            id: `${id}-${bcrId}`,
            source: id,
            target: bcrId,
            type: 'smoothstep',
            style: { stroke: '#0f62fe', strokeWidth: 1.5 },
          });
        }
      });
    });

    // Firewalls — attach to VLANs
    filtFirewalls.forEach((fw, i) => {
      const id = `fw-${num(fw, 'id')}`;
      nodes.push({
        id,
        type: 'firewallNode',
        position: { x: 50 + i * X_SPACING, y: (Y_PUB_VLAN + Y_COMPUTE) / 2 },
        data: {
          label: str(fw, 'firewallType') || 'Firewall',
          nodeType: 'firewall',
          id: num(fw, 'id'),
          ip: str(fw, 'primaryIpAddress'),
          datacenter: str(fw, 'datacenter'),
          vlanNumber: num(fw, 'vlanNumber'),
        },
      });
      // Link to VLAN by vlanNumber
      const vlan = filtVlans.find((v) => num(v, 'vlanNumber') === num(fw, 'vlanNumber'));
      if (vlan) {
        edges.push({
          id: `vlan-${num(vlan, 'id')}-${id}`,
          source: `vlan-${num(vlan, 'id')}`,
          target: id,
          type: 'smoothstep',
          style: { stroke: '#da1e28', strokeWidth: 1.5 },
        });
      }
    });

    // Build VLAN id lookup by vlanNumber
    const vlanByNumber = new Map<number, string>();
    filtVlans.forEach((v) => vlanByNumber.set(num(v, 'vlanNumber'), `vlan-${num(v, 'id')}`));

    // Helper: link compute node to VLANs
    // Public VLAN (above) → top of compute node
    // Compute node bottom → Private VLAN (below)
    function linkComputeToVlans(computeId: string, item: Record<string, unknown>) {
      const dc = str(item, 'datacenter');
      const hasPublicIp = !!str(item, 'primaryIp');

      // Public VLAN (above) → compute top
      if (hasPublicIp) {
        const pubVlans = publicVlansByDC.get(dc) ?? [];
        if (pubVlans.length > 0) {
          const pubVlan = pubVlans[0];
          edges.push({
            id: `vlan-${num(pubVlan, 'id')}-${computeId}`,
            source: `vlan-${num(pubVlan, 'id')}`,
            target: computeId,
            type: 'smoothstep',
            style: { stroke: '#da1e28', strokeWidth: 1 },
          });
        }
      }

      // Compute bottom → Private VLAN (below)
      const privVlans = privateVlansByDC.get(dc) ?? [];
      if (privVlans.length > 0) {
        const privVlan = privVlans[0];
        edges.push({
          id: `${computeId}-vlan-${num(privVlan, 'id')}`,
          source: computeId,
          target: `vlan-${num(privVlan, 'id')}`,
          type: 'smoothstep',
          style: { stroke: '#0f62fe', strokeWidth: 1 },
        });
      }
    }

    // VSIs
    filtVsis.forEach((vsi, i) => {
      const id = `vsi-${num(vsi, 'id')}`;
      nodes.push({
        id,
        type: 'vsiNode',
        position: { x: 60 + i * 160, y: Y_COMPUTE },
        data: {
          label: str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`,
          nodeType: 'vsi',
          id: num(vsi, 'id'),
          publicIp: str(vsi, 'primaryIp'),
          privateIp: str(vsi, 'backendIp'),
          ip: str(vsi, 'primaryIp') || str(vsi, 'backendIp'),
          cpu: num(vsi, 'maxCpu'),
          memory: Math.round(num(vsi, 'maxMemory') / 1024), // MB to GB
          os: str(vsi, 'os'),
          status: str(vsi, 'powerState') || str(vsi, 'status'),
          datacenter: str(vsi, 'datacenter'),
        },
      });
      linkComputeToVlans(id, vsi);
    });

    // Bare Metal
    filtBms.forEach((bm, i) => {
      const id = `bm-${num(bm, 'id')}`;
      nodes.push({
        id,
        type: 'bareMetalNode',
        position: { x: 60 + (filtVsis.length + i) * 160, y: Y_COMPUTE },
        data: {
          label: str(bm, 'hostname') || `BM ${num(bm, 'id')}`,
          nodeType: 'bareMetal',
          id: num(bm, 'id'),
          publicIp: str(bm, 'primaryIp'),
          privateIp: str(bm, 'backendIp'),
          ip: str(bm, 'primaryIp') || str(bm, 'backendIp'),
          cpu: num(bm, 'cores'),
          memory: num(bm, 'memory'),
          os: str(bm, 'os'),
          status: 'Active',
          datacenter: str(bm, 'datacenter'),
        },
      });
      linkComputeToVlans(id, bm);
    });

    // Storage — group by datacenter into summary nodes
    const allStorage = [
      ...filtBlock.map((s) => ({ ...s, _kind: 'block' })),
      ...filtFile.map((s) => ({ ...s, _kind: 'file' })),
    ];
    const storageByDc = new Map<string, typeof allStorage>();
    allStorage.forEach((stor) => {
      const dc = str(stor, 'datacenter') || 'Unknown';
      if (!storageByDc.has(dc)) storageByDc.set(dc, []);
      storageByDc.get(dc)!.push(stor);
    });
    let dcIdx = 0;
    storageByDc.forEach((volumes, dc) => {
      const id = `stor-group-${dc}`;
      const blockCount = volumes.filter((v) => str(v, '_kind') === 'block').length;
      const fileCount = volumes.filter((v) => str(v, '_kind') === 'file').length;
      const totalCap = volumes.reduce((sum, v) => sum + num(v, 'capacityGb'), 0);
      nodes.push({
        id,
        type: 'storageGroupNode',
        position: { x: 100 + dcIdx * 250, y: Y_STORAGE },
        data: {
          label: `Storage (${dc})`,
          nodeType: 'storageGroup',
          datacenter: dc,
          storageCount: volumes.length,
          totalCapacityGb: totalCap,
          storageBreakdown: { block: blockCount, file: fileCount },
          storageDetails: volumes.map((v) => ({
            label: str(v, 'username') || `Storage ${num(v, 'id')}`,
            capacityGb: num(v, 'capacityGb'),
            storageType: str(v, 'storageType') || str(v, '_kind'),
          })),
        },
      });
      // Connect storage to first private VLAN in same DC (storage is accessed over private network)
      const dcPrivVlans = privateVlansByDC.get(dc) ?? [];
      if (dcPrivVlans.length > 0) {
        const targetId = `vlan-${num(dcPrivVlans[0], 'id')}`;
        edges.push({
          id: `${id}-${targetId}`,
          source: targetId,
          target: id,
          type: 'smoothstep',
          style: { stroke: '#0f62fe', strokeWidth: 1, strokeDasharray: '4,4' },
        });
      } else {
        // Fallback: connect to BCR if no private VLAN found
        const bcrId = `bcr-${dc}`;
        if (nodes.find((n) => n.id === bcrId)) {
          edges.push({
            id: `${id}-${bcrId}`,
            source: bcrId,
            target: id,
            type: 'smoothstep',
            style: { stroke: '#0f62fe', strokeWidth: 1, strokeDasharray: '4,4' },
          });
        }
      }
      dcIdx++;
    });

    // ── Private Network Backbone, Transit Gateways, Direct Links ──────
    const classicTGs = (collectedData['classicTransitGateways'] ?? []) as Record<string, unknown>[];
    const classicTGConns = (collectedData['classicTransitGatewayConnections'] ?? []) as Record<string, unknown>[];
    const directLinks = (collectedData['directLinkGateways'] ?? []) as Record<string, unknown>[];
    const tgwRoutePrefixes = (collectedData['tgwRoutePrefixes'] ?? []) as Record<string, unknown>[];
    const tgwVpcVpnGateways = (collectedData['tgwVpcVpnGateways'] ?? []) as Record<string, unknown>[];

    // Build prefix lookup by TGW ID
    type ConnPrefixEntry = { connectionId: string; connectionName: string; connectionType: string; prefixes: string[] };
    const prefixesByTgw = new Map<string, string[]>();
    const connPrefixesByTgw = new Map<string, ConnPrefixEntry[]>();
    tgwRoutePrefixes.forEach((rp) => {
      const tgwId = str(rp, 'transitGatewayId');
      const prefixes = field(rp, 'prefixes') as string[] | undefined;
      if (tgwId && prefixes) prefixesByTgw.set(tgwId, prefixes);
      const cp = field(rp, 'connectionPrefixes') as ConnPrefixEntry[] | undefined;
      if (tgwId && cp && cp.length > 0) {
        connPrefixesByTgw.set(tgwId, cp);
      }
    });

    // Build sets: TGs with classic connections, DLs connected via TGW
    const tgIdsWithClassic = new Set<string>();
    const dlIdsViaTGW = new Set<string>();
    // Also map DL network_id → parent TGW id for edge connections
    const dlToTgwMap = new Map<string, string>();
    classicTGConns.forEach((conn) => {
      const nt = str(conn, 'networkType');
      const tgId = str(conn, 'transitGatewayId');
      if (nt === 'classic') {
        tgIdsWithClassic.add(tgId);
      }
      if (nt === 'directlink') {
        const networkId = str(conn, 'networkId');
        if (networkId) {
          dlIdsViaTGW.add(networkId);
          dlToTgwMap.set(networkId, tgId);
        }
      }
    });

    // Private Network bus bar — always visible if we have BCRs
    if (dcs.length > 0) {
      const busX = Math.max(200, (dcs.length * DC_BAND_WIDTH) / 2 - 300);
      nodes.push({
        id: 'private-network-bus',
        type: 'privateNetworkBusNode',
        position: { x: busX, y: Y_PRIVATE_NETWORK },
        data: { label: 'IBM Cloud Private Network', nodeType: 'privateNetworkBus' },
      });

      // BCR → Private Network edges
      dcs.forEach((dc) => {
        const bcrId = `bcr-${dc}`;
        edges.push({
          id: `${bcrId}-private-net`,
          source: bcrId,
          target: 'private-network-bus',
          type: 'smoothstep',
          style: { stroke: '#0f62fe', strokeWidth: 2 },
        });
      });

      // Cloud Services node
      const servicesX = busX + 650;
      nodes.push({
        id: 'cloud-services',
        type: 'cloudServicesNode',
        position: { x: servicesX, y: Y_SERVICES_AND_TGW },
        data: { label: 'IBM Cloud Services', nodeType: 'cloudServices' },
      });
      edges.push({
        id: 'private-net-cloud-services',
        source: 'private-network-bus',
        target: 'cloud-services',
        type: 'smoothstep',
        style: { stroke: '#198038', strokeWidth: 1.5 },
      });
    }

    // Transit Gateway nodes — only TGs with Classic connections
    const classicTGsFiltered = classicTGs.filter((tg) => tgIdsWithClassic.has(str(tg, 'id')));
    let tgwConnectionCount = 0;

    classicTGsFiltered.forEach((tg, i) => {
      const tgRawId = str(tg, 'id');
      const tgId = `tgw-${tgRawId}`;
      const tgName = str(tg, 'name') || `TGW ${tgRawId}`;
      const busX = dcs.length > 0 ? Math.max(200, (dcs.length * DC_BAND_WIDTH) / 2 - 300) : 200;

      // Get connections for this TGW
      const tgConnections = classicTGConns.filter((conn) => str(conn, 'transitGatewayId') === tgRawId);
      const connectionPrefixes = connPrefixesByTgw.get(tgRawId) ?? [];

      nodes.push({
        id: tgId,
        type: 'transitGatewayNode',
        position: { x: busX + 200 + i * 200, y: Y_SERVICES_AND_TGW },
        data: {
          label: tgName,
          nodeType: 'transitGateway',
          status: str(tg, 'status'),
          location: str(tg, 'location'),
          routePrefixes: prefixesByTgw.get(tgRawId) ?? [],
          connectionCount: tgConnections.length,
        },
      });

      // Edge from Private Network
      if (dcs.length > 0) {
        edges.push({
          id: `private-net-${tgId}`,
          source: 'private-network-bus',
          target: tgId,
          type: 'smoothstep',
          style: { stroke: '#8a3ffc', strokeWidth: 1.5 },
        });
      }

      // Create separate connection nodes for each TGW connection
      tgConnections.forEach((conn, connIndex) => {
        const connId = str(conn, 'id');
        const connType = str(conn, 'networkType');
        const connName = str(conn, 'name') || `Connection ${connId.slice(-8)}`;
        const connNodeId = `tgw-conn-${tgRawId}-${connId}`;

        // Find prefixes for this connection (from route reports or prefix_filters on the connection)
        const connPrefixData = connectionPrefixes.find((cp) => cp.connectionId === connId);
        const routeReportPrefixes = connPrefixData?.prefixes ?? [];
        // Fall back to connection's prefixFilterPrefixes (for GRE tunnels) if no route report prefixes
        const connPrefixFilterPrefixes = field(conn, 'prefixFilterPrefixes') as string[] | undefined;
        const prefixes = routeReportPrefixes.length > 0 ? routeReportPrefixes : (connPrefixFilterPrefixes ?? []);

        // Calculate position in a semicircular layout below TGW
        const totalConns = tgConnections.length;
        const radius = 150;
        const startAngle = Math.PI * 0.25; // 45 degrees
        const endAngle = Math.PI * 0.75;   // 135 degrees
        const angleSpan = endAngle - startAngle;
        const angle = totalConns > 1
          ? startAngle + (connIndex / (totalConns - 1)) * angleSpan
          : Math.PI * 0.5; // Center if only one connection

        const connX = busX + 200 + i * 200 + radius * Math.cos(angle) - 75;
        const connY = Y_TGW_CONNECTIONS + radius * Math.sin(angle) - 100;

        nodes.push({
          id: connNodeId,
          type: 'tgwConnectionNode',
          position: { x: connX, y: connY },
          data: {
            label: connName,
            nodeType: 'tgwConnection',
            connectionId: connId,
            connectionName: connName,
            connectionType: connType,
            prefixes,
            transitGatewayId: tgRawId,
            transitGatewayName: tgName,
            status: str(conn, 'status'),
            networkAccountId: str(conn, 'networkAccountId') || undefined,
          } as TopologyNodeData & TgwConnectionNodeData,
        });

        // Edge from TGW to connection node
        const edgeColor = connectionTypeEdgeColors[connType] ?? '#525252';
        edges.push({
          id: `edge-tgw-${tgRawId}-conn-${connId}`,
          source: tgId,
          target: connNodeId,
          type: 'smoothstep',
          style: { stroke: edgeColor, strokeWidth: 1.5 },
        });

        tgwConnectionCount++;
      });
    });

    // Direct Link nodes
    directLinks.forEach((dl, i) => {
      const dlIdStr = str(dl, 'id');
      const dlNodeId = `dl-${dlIdStr}`;
      const busX = dcs.length > 0 ? Math.max(200, (dcs.length * DC_BAND_WIDTH) / 2 - 300) : 200;
      nodes.push({
        id: dlNodeId,
        type: 'directLinkNode',
        position: { x: busX + 100 + i * 200, y: Y_DIRECT_LINK },
        data: {
          label: str(dl, 'name') || `DL ${dlIdStr}`,
          nodeType: 'directLink',
          dlType: str(dl, 'type'),
          speed: num(dl, 'speedMbps'),
          operational_status: str(dl, 'operationalStatus'),
          location: str(dl, 'locationName'),
        },
      });

      // Connect to parent TGW if DL is connected via TGW, else to Private Network
      const parentTgwId = dlToTgwMap.get(dlIdStr);
      if (parentTgwId && classicTGsFiltered.some((tg) => str(tg, 'id') === parentTgwId)) {
        edges.push({
          id: `tgw-${parentTgwId}-${dlNodeId}`,
          source: `tgw-${parentTgwId}`,
          target: dlNodeId,
          type: 'smoothstep',
          style: { stroke: '#ff832b', strokeWidth: 1.5 },
        });
      } else if (dcs.length > 0) {
        edges.push({
          id: `private-net-${dlNodeId}`,
          source: 'private-network-bus',
          target: dlNodeId,
          type: 'smoothstep',
          style: { stroke: '#ff832b', strokeWidth: 1.5 },
        });
      }
    });

    // VPN Gateway nodes — children of TGW nodes
    tgwVpcVpnGateways.forEach((vpn, i) => {
      const vpnId = `vpngw-${str(vpn, 'id')}`;
      const parentTgwId = str(vpn, 'transitGatewayId');
      const parentNodeId = `tgw-${parentTgwId}`;
      const busX = dcs.length > 0 ? Math.max(200, (dcs.length * DC_BAND_WIDTH) / 2 - 300) : 200;

      // Only add if parent TGW node exists
      if (classicTGsFiltered.some((tg) => str(tg, 'id') === parentTgwId)) {
        nodes.push({
          id: vpnId,
          type: 'vpnGatewayNode',
          position: { x: busX + 200 + i * 180, y: Y_VPN_GATEWAYS },
          data: {
            label: str(vpn, 'name') || `VPN GW ${str(vpn, 'id')}`,
            nodeType: 'vpnGateway',
            status: str(vpn, 'status'),
            vpnMode: str(vpn, 'mode'),
            vpcName: str(vpn, 'vpcName'),
            vpcRegion: str(vpn, 'vpcRegion'),
          },
        });
        edges.push({
          id: `${parentNodeId}-${vpnId}`,
          source: parentNodeId,
          target: vpnId,
          type: 'smoothstep',
          style: { stroke: '#005d5d', strokeWidth: 1.5 },
        });
      }
    });

    // Gather all unique datacenters for filtering
    const datacenters = new Set<string>();
    [...vsis, ...bms, ...vlans].forEach((item) => {
      const dc = str(item, 'datacenter');
      if (dc) datacenters.add(dc);
    });

    // Layer filtering — always keep internet, router, vlan types
    const ALWAYS_VISIBLE = new Set(['internet', 'router', 'vlan', 'privateNetworkBus', 'cloudServices']);
    const nodeTypeToLayer: Record<string, string> = {
      vsi: 'virtualServers',
      bareMetal: 'bareMetal',
      gateway: 'gateways',
      firewall: 'firewalls',
      storage: 'storage',
      storageGroup: 'storage',
      subnet: 'subnets',
      transitGateway: 'transitGateways',
      tgwConnection: 'transitGateways',
      vpnGateway: 'transitGateways',
      directLink: 'directLinks',
    };

    const filteredNodes = nodes.filter((n) => {
      const nt = (n.data as TopologyNodeData).nodeType;
      if (ALWAYS_VISIBLE.has(nt)) return true;
      const layer = nodeTypeToLayer[nt];
      return layer ? visibleLayers.has(layer) : true;
    });

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
    );

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      datacenters: Array.from(datacenters).sort(),
      stats: {
        vsis: filtVsis.length,
        bareMetal: filtBms.length,
        vlans: filtVlans.length,
        gateways: filtGateways.length,
        storage: allStorage.length,
        firewalls: filtFirewalls.length,
        transitGateways: classicTGsFiltered.length,
        tgwConnections: tgwConnectionCount,
        vpnGateways: tgwVpcVpnGateways.length,
        directLinks: directLinks.length,
      },
    };
  }, [collectedData, datacenterFilter, visibleLayers]);
}
