import { useMemo } from 'react';
import type { Edge } from '@xyflow/react';
import { useData } from '@/contexts/DataContext';
import type { TopologyNode, TopologyNodeData, TgwConnectionNodeData } from '@/hooks/useTopologyData';

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

function field(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key];
}

function str(item: unknown, key: string): string {
  return String(field(item, key) ?? '');
}

function num(item: unknown, key: string): number {
  return Number(field(item, key) ?? 0);
}

export function useSubnetTopologyData(datacenterFilter: string | null) {
  const { collectedData } = useData();

  return useMemo(() => {
    const nodes: TopologyNode[] = [];
    const edges: Edge[] = [];

    const subnets = (collectedData['subnets'] ?? []) as Record<string, unknown>[];
    const vlans = (collectedData['vlans'] ?? []) as Record<string, unknown>[];
    const gateways = (collectedData['gateways'] ?? []) as Record<string, unknown>[];
    const vsis = (collectedData['virtualServers'] ?? []) as Record<string, unknown>[];
    const bms = (collectedData['bareMetal'] ?? []) as Record<string, unknown>[];

    // Build VLAN lookup by vlanNumber
    const vlanByNumber = new Map<number, Record<string, unknown>>();
    vlans.forEach((v) => {
      const vn = num(v, 'vlanNumber');
      if (vn) vlanByNumber.set(vn, v);
    });

    // Determine network space for each subnet via its parent VLAN
    const subnetWithSpace = subnets.map((s) => {
      const vlanNum = num(s, 'vlanNumber');
      const vlan = vlanByNumber.get(vlanNum);
      const networkSpace = vlan ? str(vlan, 'networkSpace').toUpperCase() : '';
      const dc = str(s, 'datacenter') || (vlan ? str(vlan, 'datacenter') : '');
      return { subnet: s, networkSpace, datacenter: dc, vlanNumber: vlanNum };
    });

    // Apply datacenter filter
    const filterDC = <T extends { datacenter: string }>(items: T[]) =>
      datacenterFilter ? items.filter((i) => i.datacenter === datacenterFilter) : items;

    const filteredSubnets = filterDC(subnetWithSpace);
    const publicSubnets = filteredSubnets.filter((s) => s.networkSpace === 'PUBLIC');
    const privateSubnets = filteredSubnets.filter((s) => s.networkSpace === 'PRIVATE');

    // Collect unique datacenters
    const dcSet = new Set<string>();
    filteredSubnets.forEach((s) => { if (s.datacenter) dcSet.add(s.datacenter); });

    // Also gather DCs from gateways and compute
    const filteredGateways = datacenterFilter
      ? gateways.filter((g) => str(g, 'datacenter') === datacenterFilter)
      : gateways;
    const filteredVsis = datacenterFilter
      ? vsis.filter((v) => str(v, 'datacenter') === datacenterFilter)
      : vsis;
    const filteredBms = datacenterFilter
      ? bms.filter((b) => str(b, 'datacenter') === datacenterFilter)
      : bms;

    [...filteredGateways, ...filteredVsis, ...filteredBms].forEach((item) => {
      const dc = str(item, 'datacenter');
      if (dc) dcSet.add(dc);
    });

    const dcs = Array.from(dcSet).sort();

    // Internet node
    nodes.push({
      id: 'internet',
      type: 'internetNode',
      position: { x: 400, y: 0 },
      data: { label: 'Internet', nodeType: 'internet' } as TopologyNodeData,
    });

    // IBM Cloud Private Network bus bar — connects BCRs to TGW / Direct Link layer
    nodes.push({
      id: 'private-network-bus',
      type: 'privateNetworkBusNode',
      position: { x: 0, y: 0 },
      data: { label: 'IBM Cloud Private Network', nodeType: 'privateNetworkBus' } as TopologyNodeData,
    });

    // Per-DC: FCR and BCR
    dcs.forEach((dc) => {
      const fcrId = `fcr-${dc}`;
      const bcrId = `bcr-${dc}`;

      nodes.push({
        id: fcrId,
        type: 'routerNode',
        position: { x: 0, y: 0 },
        data: {
          label: `FCR ${dc}`,
          nodeType: 'router',
          routerType: 'fcr' as const,
          datacenter: dc,
        } as TopologyNodeData,
      });

      nodes.push({
        id: bcrId,
        type: 'routerNode',
        position: { x: 0, y: 0 },
        data: {
          label: `BCR ${dc}`,
          nodeType: 'router',
          routerType: 'bcr' as const,
          datacenter: dc,
        } as TopologyNodeData,
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

      // BCR → Classic Private Network
      edges.push({
        id: `${bcrId}-private-network-bus`,
        source: bcrId,
        target: 'private-network-bus',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#0f62fe', strokeWidth: 2 },
      });
    });

    // Public subnet nodes
    const publicSubnetIds = new Map<number, string>(); // subnetId → nodeId
    publicSubnets.forEach((s) => {
      const subId = num(s.subnet, 'id');
      const nodeId = `pub-subnet-${subId}`;
      publicSubnetIds.set(subId, nodeId);
      const dc = s.datacenter;

      nodes.push({
        id: nodeId,
        type: 'subnetDetailNode',
        position: { x: 0, y: 0 },
        data: {
          label: `${str(s.subnet, 'networkIdentifier')}/${num(s.subnet, 'cidr')}`,
          nodeType: 'subnet',
          networkIdentifier: str(s.subnet, 'networkIdentifier'),
          cidr: num(s.subnet, 'cidr'),
          subnetType: str(s.subnet, 'subnetType'),
          gateway: str(s.subnet, 'gateway'),
          usableIpCount: num(s.subnet, 'usableIpAddressCount'),
          vlanNumber: s.vlanNumber,
          datacenter: dc,
          networkSpace: 'PUBLIC',
        } as TopologyNodeData,
      });

      // FCR → public subnet
      const fcrId = `fcr-${dc}`;
      if (dcs.includes(dc)) {
        edges.push({
          id: `${fcrId}-${nodeId}`,
          source: fcrId,
          target: nodeId,
          type: 'smoothstep',
          style: { stroke: '#da1e28', strokeWidth: 1.5 },
        });
      }
    });

    // Private subnet nodes
    const privateSubnetIds = new Map<number, string>();
    privateSubnets.forEach((s) => {
      const subId = num(s.subnet, 'id');
      const nodeId = `priv-subnet-${subId}`;
      privateSubnetIds.set(subId, nodeId);
      const dc = s.datacenter;

      nodes.push({
        id: nodeId,
        type: 'subnetDetailNode',
        position: { x: 0, y: 0 },
        data: {
          label: `${str(s.subnet, 'networkIdentifier')}/${num(s.subnet, 'cidr')}`,
          nodeType: 'subnet',
          networkIdentifier: str(s.subnet, 'networkIdentifier'),
          cidr: num(s.subnet, 'cidr'),
          subnetType: str(s.subnet, 'subnetType'),
          gateway: str(s.subnet, 'gateway'),
          usableIpCount: num(s.subnet, 'usableIpAddressCount'),
          vlanNumber: s.vlanNumber,
          datacenter: dc,
          networkSpace: 'PRIVATE',
        } as TopologyNodeData,
      });

      // Private subnet → BCR
      const bcrId = `bcr-${dc}`;
      if (dcs.includes(dc)) {
        edges.push({
          id: `${nodeId}-${bcrId}`,
          source: nodeId,
          target: bcrId,
          type: 'smoothstep',
          style: { stroke: '#0f62fe', strokeWidth: 1.5 },
        });
      }
    });

    // Gateway appliances — devices with both public and private associations
    const addedDeviceIds = new Set<string>();

    filteredGateways.forEach((gw) => {
      const gwId = num(gw, 'id');
      const nodeId = `dual-gw-${gwId}`;
      if (addedDeviceIds.has(nodeId)) return;

      const pubIp = str(gw, 'publicIp');
      const privIp = str(gw, 'privateIp');
      const dc = str(gw, 'datacenter');

      // Gateway appliances route between public and private
      addedDeviceIds.add(nodeId);
      nodes.push({
        id: nodeId,
        type: 'dualNicDeviceNode',
        position: { x: 0, y: 0 },
        data: {
          label: str(gw, 'name') || `Gateway ${gwId}`,
          nodeType: 'gateway',
          id: gwId,
          publicIp: pubIp || undefined,
          privateIp: privIp || undefined,
          deviceType: 'Gateway Appliance',
          datacenter: dc,
          status: str(gw, 'status'),
        } as TopologyNodeData,
      });

      // Connect gateway to public subnets in same DC (via insideVlans or same DC)
      const dcPubSubnets = publicSubnets.filter((s) => s.datacenter === dc);
      const dcPrivSubnets = privateSubnets.filter((s) => s.datacenter === dc);

      // Attempt to match via insideVlans if available
      const insideVlans = field(gw, 'insideVlans') as Record<string, unknown>[] | undefined;
      const insideVlanNumbers = new Set<number>();
      if (Array.isArray(insideVlans)) {
        insideVlans.forEach((v) => {
          const vn = num(v, 'vlanNumber') || num(v, 'id');
          if (vn) insideVlanNumbers.add(vn);
        });
      }

      // Connect to public subnets matching inside VLANs, or all in DC if no VLAN info
      const matchedPub = insideVlanNumbers.size > 0
        ? dcPubSubnets.filter((s) => insideVlanNumbers.has(s.vlanNumber))
        : dcPubSubnets;
      const matchedPriv = insideVlanNumbers.size > 0
        ? dcPrivSubnets.filter((s) => insideVlanNumbers.has(s.vlanNumber))
        : dcPrivSubnets;

      // Public subnet → gateway (red edges)
      matchedPub.forEach((s) => {
        const subNodeId = publicSubnetIds.get(num(s.subnet, 'id'));
        if (subNodeId) {
          edges.push({
            id: `${subNodeId}-${nodeId}`,
            source: subNodeId,
            target: nodeId,
            type: 'smoothstep',
            style: { stroke: '#da1e28', strokeWidth: 1 },
          });
        }
      });

      // Gateway → private subnet (blue edges)
      matchedPriv.forEach((s) => {
        const subNodeId = privateSubnetIds.get(num(s.subnet, 'id'));
        if (subNodeId) {
          edges.push({
            id: `${nodeId}-${subNodeId}`,
            source: nodeId,
            target: subNodeId,
            type: 'smoothstep',
            style: { stroke: '#0f62fe', strokeWidth: 1 },
          });
        }
      });
    });

    // Dual-NIC compute nodes — VSIs and bare metal with both public and private IPs
    const addDualNicCompute = (
      items: Record<string, unknown>[],
      prefix: string,
      deviceType: string,
    ) => {
      items.forEach((item) => {
        const pubIp = str(item, 'primaryIp');
        const privIp = str(item, 'backendIp');
        if (!pubIp || !privIp) return; // skip single-NIC devices

        const itemId = num(item, 'id');
        const nodeId = `dual-${prefix}-${itemId}`;
        if (addedDeviceIds.has(nodeId)) return;
        addedDeviceIds.add(nodeId);

        const dc = str(item, 'datacenter');

        nodes.push({
          id: nodeId,
          type: 'dualNicDeviceNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(item, 'hostname') || `${deviceType} ${itemId}`,
            nodeType: deviceType === 'VSI' ? 'vsi' : 'bareMetal',
            id: itemId,
            publicIp: pubIp,
            privateIp: privIp,
            deviceType,
            datacenter: dc,
            status: str(item, 'powerState') || str(item, 'status') || 'Active',
          } as TopologyNodeData,
        });

        // Connect to public subnets in same DC
        const dcPubSubnets = publicSubnets.filter((s) => s.datacenter === dc);
        dcPubSubnets.forEach((s) => {
          const subNodeId = publicSubnetIds.get(num(s.subnet, 'id'));
          if (subNodeId) {
            edges.push({
              id: `${subNodeId}-${nodeId}`,
              source: subNodeId,
              target: nodeId,
              type: 'smoothstep',
              style: { stroke: '#da1e28', strokeWidth: 1 },
            });
          }
        });

        // Connect to private subnets in same DC
        const dcPrivSubnets = privateSubnets.filter((s) => s.datacenter === dc);
        dcPrivSubnets.forEach((s) => {
          const subNodeId = privateSubnetIds.get(num(s.subnet, 'id'));
          if (subNodeId) {
            edges.push({
              id: `${nodeId}-${subNodeId}`,
              source: nodeId,
              target: subNodeId,
              type: 'smoothstep',
              style: { stroke: '#0f62fe', strokeWidth: 1 },
            });
          }
        });
      });
    };

    addDualNicCompute(filteredVsis, 'vsi', 'VSI');
    addDualNicCompute(filteredBms, 'bm', 'Bare Metal');

    // ── Transit Gateways, VPN Gateways, Direct Links (below Private Network) ──
    const classicTGs = (collectedData['classicTransitGateways'] ?? []) as Record<string, unknown>[];
    const classicTGConns = (collectedData['classicTransitGatewayConnections'] ?? []) as Record<string, unknown>[];
    const directLinks = (collectedData['directLinkGateways'] ?? []) as Record<string, unknown>[];
    const tgwRoutePrefixData = (collectedData['tgwRoutePrefixes'] ?? []) as Record<string, unknown>[];
    const tgwVpcVpnGateways = (collectedData['tgwVpcVpnGateways'] ?? []) as Record<string, unknown>[];

    // Build prefix lookup by TGW ID
    type ConnPrefixEntry = { connectionId: string; connectionName: string; connectionType: string; prefixes: string[] };
    const prefixesByTgw = new Map<string, string[]>();
    const connPrefixesByTgw = new Map<string, ConnPrefixEntry[]>();
    tgwRoutePrefixData.forEach((rp) => {
      const tgwId = str(rp, 'transitGatewayId');
      const prefixes = field(rp, 'prefixes') as string[] | undefined;
      if (tgwId && prefixes) prefixesByTgw.set(tgwId, prefixes);
      const cp = field(rp, 'connectionPrefixes') as ConnPrefixEntry[] | undefined;
      if (tgwId && cp && cp.length > 0) {
        connPrefixesByTgw.set(tgwId, cp);
      }
    });

    // Identify TGWs with classic connections and DLs connected via TGW
    const tgIdsWithClassic = new Set<string>();
    const dlToTgwMap = new Map<string, string>();
    classicTGConns.forEach((conn) => {
      const nt = str(conn, 'networkType');
      const tgId = str(conn, 'transitGatewayId');
      if (nt === 'classic') tgIdsWithClassic.add(tgId);
      if (nt === 'directlink') {
        const networkId = str(conn, 'networkId');
        if (networkId) dlToTgwMap.set(networkId, tgId);
      }
    });

    const classicTGsFiltered = classicTGs.filter((tg) => tgIdsWithClassic.has(str(tg, 'id')));
    let tgwConnectionCount = 0;

    // Transit Gateway nodes with separate connection nodes
    classicTGsFiltered.forEach((tg) => {
      const tgRawId = str(tg, 'id');
      const tgId = `tgw-${tgRawId}`;
      const tgName = str(tg, 'name') || `TGW ${tgRawId}`;

      // Get connections for this TGW
      const tgConnections = classicTGConns.filter((conn) => str(conn, 'transitGatewayId') === tgRawId);
      const connectionPrefixes = connPrefixesByTgw.get(tgRawId) ?? [];

      nodes.push({
        id: tgId,
        type: 'transitGatewayNode',
        position: { x: 0, y: 0 },
        data: {
          label: tgName,
          nodeType: 'transitGateway',
          status: str(tg, 'status'),
          location: str(tg, 'location'),
          routePrefixes: prefixesByTgw.get(tgRawId) ?? [],
          connectionCount: tgConnections.length,
        } as TopologyNodeData,
      });
      // Private Network → TGW
      edges.push({
        id: `private-net-${tgId}`,
        source: 'private-network-bus',
        target: tgId,
        type: 'smoothstep',
        style: { stroke: '#8a3ffc', strokeWidth: 1.5 },
      });

      // Create separate connection nodes for each TGW connection
      tgConnections.forEach((conn) => {
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

        nodes.push({
          id: connNodeId,
          type: 'tgwConnectionNode',
          position: { x: 0, y: 0 },
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

    // VPN Gateway nodes (children of TGWs)
    tgwVpcVpnGateways.forEach((vpn) => {
      const vpnId = `vpngw-${str(vpn, 'id')}`;
      const parentTgwId = str(vpn, 'transitGatewayId');
      const parentNodeId = `tgw-${parentTgwId}`;
      if (classicTGsFiltered.some((tg) => str(tg, 'id') === parentTgwId)) {
        nodes.push({
          id: vpnId,
          type: 'vpnGatewayNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(vpn, 'name') || `VPN GW ${str(vpn, 'id')}`,
            nodeType: 'vpnGateway',
            status: str(vpn, 'status'),
            vpnMode: str(vpn, 'mode'),
            vpcName: str(vpn, 'vpcName'),
            vpcRegion: str(vpn, 'vpcRegion'),
          } as TopologyNodeData,
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

    // Direct Link nodes
    directLinks.forEach((dl) => {
      const dlIdStr = str(dl, 'id');
      const dlNodeId = `dl-${dlIdStr}`;
      nodes.push({
        id: dlNodeId,
        type: 'directLinkNode',
        position: { x: 0, y: 0 },
        data: {
          label: str(dl, 'name') || `DL ${dlIdStr}`,
          nodeType: 'directLink',
          dlType: str(dl, 'type'),
          speed: num(dl, 'speedMbps'),
          operational_status: str(dl, 'operationalStatus'),
          location: str(dl, 'locationName'),
        } as TopologyNodeData,
      });
      // Connect to parent TGW if connected via TGW, else to Private Network
      const parentTgwId = dlToTgwMap.get(dlIdStr);
      if (parentTgwId && classicTGsFiltered.some((tg) => str(tg, 'id') === parentTgwId)) {
        edges.push({
          id: `tgw-${parentTgwId}-${dlNodeId}`,
          source: `tgw-${parentTgwId}`,
          target: dlNodeId,
          type: 'smoothstep',
          style: { stroke: '#ff832b', strokeWidth: 1.5 },
        });
      } else {
        edges.push({
          id: `private-net-${dlNodeId}`,
          source: 'private-network-bus',
          target: dlNodeId,
          type: 'smoothstep',
          style: { stroke: '#ff832b', strokeWidth: 1.5 },
        });
      }
    });

    // Gather all unique datacenters for the filter dropdown
    const allDatacenters = new Set<string>();
    [...subnets, ...vlans, ...vsis, ...bms].forEach((item) => {
      const dc = str(item, 'datacenter');
      if (dc) allDatacenters.add(dc);
    });

    return {
      nodes,
      edges,
      datacenters: Array.from(allDatacenters).sort(),
      stats: {
        publicSubnets: publicSubnets.length,
        privateSubnets: privateSubnets.length,
        gateways: filteredGateways.length,
        dualNicDevices: nodes.filter((n) => n.type === 'dualNicDeviceNode').length - filteredGateways.length,
        transitGateways: classicTGsFiltered.length,
        tgwConnections: tgwConnectionCount,
        vpnGateways: tgwVpcVpnGateways.length,
        directLinks: directLinks.length,
        datacenters: dcs.length,
      },
    };
  }, [collectedData, datacenterFilter]);
}
