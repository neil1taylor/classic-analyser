import { useMemo } from 'react';
import { useVpcData } from '@/contexts/VpcDataContext';
import type { Node, Edge } from '@xyflow/react';
import type { VpcTopologyNodeData } from '@/components/topology/VpcTopologyNodes';

type RawItem = Record<string, unknown>;

function field(item: unknown, key: string): unknown {
  return (item as RawItem)[key];
}

function str(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

interface VpcTopologyResult {
  nodes: Node[];
  edges: Edge[];
  regions: string[];
  stats: {
    transitGateways: number;
    tgwConnections: number;
    vpcs: number;
    subnets: number;
    instances: number;
    loadBalancers: number;
    publicGateways: number;
    vpnGateways: number;
  };
}

export function useVpcTopologyData(
  regionFilter: string | null,
  visibleLayers: Set<string>,
): VpcTopologyResult {
  const { vpcCollectedData, userAccountId } = useVpcData();

  return useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeIdSet = new Set<string>();

    const rawTransitGateways = (vpcCollectedData['transitGateways'] ?? []) as RawItem[];
    const rawTgConnections = (vpcCollectedData['transitGatewayConnections'] ?? []) as RawItem[];
    const rawVpcs = (vpcCollectedData['vpcs'] ?? []) as RawItem[];
    const rawSubnets = (vpcCollectedData['vpcSubnets'] ?? []) as RawItem[];
    const rawInstances = (vpcCollectedData['vpcInstances'] ?? []) as RawItem[];
    const rawLbs = (vpcCollectedData['vpcLoadBalancers'] ?? []) as RawItem[];
    const rawPgws = (vpcCollectedData['vpcPublicGateways'] ?? []) as RawItem[];
    const rawVpnGws = (vpcCollectedData['vpcVpnGateways'] ?? []) as RawItem[];
    const rawTgwRoutePrefixes = (vpcCollectedData['tgwRoutePrefixes'] ?? []) as RawItem[];

    // Build connection → prefixes map from route report data
    const prefixesByConnection = new Map<string, string[]>();
    for (const rp of rawTgwRoutePrefixes) {
      const connPrefixes = (rp.connectionPrefixes ?? []) as Array<{
        connectionId: string;
        prefixes: string[];
      }>;
      for (const cp of connPrefixes) {
        if (cp.connectionId && cp.prefixes) {
          prefixesByConnection.set(cp.connectionId, cp.prefixes);
        }
      }
    }

    // Filter VPCs by region
    const vpcs = regionFilter
      ? rawVpcs.filter((v) => str(field(v, 'region')) === regionFilter)
      : rawVpcs;
    const vpcCrnMap = new Map<string, string>();
    for (const v of vpcs) {
      const crn = str(field(v, 'crn'));
      if (crn) vpcCrnMap.set(crn, str(field(v, 'id')));
    }

    // Build VPC name → id map for resource matching
    const vpcNameToId = new Map<string, string>();
    for (const v of vpcs) {
      vpcNameToId.set(str(field(v, 'name')), str(field(v, 'id')));
    }

    // Count TG connections per gateway
    const tgConnectionCounts = new Map<string, number>();
    for (const conn of rawTgConnections) {
      const tgId = str(field(conn, 'transitGatewayId'));
      tgConnectionCounts.set(tgId, (tgConnectionCounts.get(tgId) ?? 0) + 1);
    }

    // 1. VPC nodes (always visible when in region — built first so TGW/connections can reference them)
    for (const vpc of vpcs) {
      const id = `vpc-${str(field(vpc, 'id'))}`;
      nodes.push({
        id,
        type: 'vpcNode',
        position: { x: 0, y: 0 },
        data: {
          label: str(field(vpc, 'name')),
          nodeType: 'vpc',
          region: str(field(vpc, 'region')),
          classicAccess: field(vpc, 'classicAccess') === true,
        } satisfies VpcTopologyNodeData,
      });
      nodeIdSet.add(id);
    }

    // Pre-filter subnets (needed for TGW connection subnet counts)
    const filteredSubnets = rawSubnets.filter((s) => {
      const vpcName = str(field(s, 'vpcName'));
      return vpcNameToId.has(vpcName);
    });

    // Build set of VPC CRNs in the current view (for filtering connections by region)
    const visibleVpcCrns = new Set<string>();
    for (const v of vpcs) {
      const crn = str(field(v, 'crn'));
      if (crn) visibleVpcCrns.add(crn);
    }

    // 2. Determine which TGWs are relevant when region filtering
    // A TGW is relevant if it has at least one vpc-type connection to a VPC in the view
    const relevantTgIds = new Set<string>();
    if (regionFilter) {
      for (const conn of rawTgConnections) {
        if (str(field(conn, 'networkType')) === 'vpc' && visibleVpcCrns.has(str(field(conn, 'networkId')))) {
          relevantTgIds.add(str(field(conn, 'transitGatewayId')));
        }
      }
    }

    // 3. Transit Gateway nodes
    for (const tg of rawTransitGateways) {
      const tgRawId = str(field(tg, 'id'));
      if (regionFilter && !relevantTgIds.has(tgRawId)) continue;
      const id = `tg-${tgRawId}`;
      nodes.push({
        id,
        type: 'transitGatewayNode',
        position: { x: 0, y: 0 },
        data: {
          label: str(field(tg, 'name')),
          nodeType: 'transitGateway',
          location: str(field(tg, 'location')),
          isGlobal: field(tg, 'global') === true,
          connectionCount: tgConnectionCounts.get(tgRawId) ?? 0,
        } satisfies VpcTopologyNodeData,
      });
      nodeIdSet.add(id);
    }

    // 4. TG connection nodes + edges
    // Show ALL connections of relevant TGWs (so user sees the full picture for each TGW)
    const vpcConnNodeIds = new Map<string, string[]>();
    let tgwConnectionCount = 0;

    for (const conn of rawTgConnections) {
      const networkType = str(field(conn, 'networkType'));
      const networkId = str(field(conn, 'networkId'));
      const tgId = str(field(conn, 'transitGatewayId'));
      const connId = str(field(conn, 'id'));
      if (!tgId || !connId) continue;
      const sourceId = `tg-${tgId}`;
      if (!nodeIdSet.has(sourceId)) continue;

      // Resolve VPC (only meaningful for vpc-type connections)
      const vpcId = networkType === 'vpc' ? vpcCrnMap.get(networkId) : undefined;
      const targetId = vpcId ? `vpc-${vpcId}` : undefined;
      const vpcExists = targetId ? nodeIdSet.has(targetId) : false;

      // Count subnets belonging to this VPC (only for vpc-type)
      let connSubnets: RawItem[] = [];
      if (vpcId) {
        const vpcItem = vpcs.find((v) => str(field(v, 'id')) === vpcId);
        const vpcNameStr = vpcItem ? str(field(vpcItem, 'name')) : '';
        connSubnets = filteredSubnets.filter((s) => str(field(s, 'vpcName')) === vpcNameStr);
      }

      // Derive ownership type based on network_account_id vs user's account
      const networkAccountId = str(field(conn, 'networkAccountId'));
      let ownershipType: 'Own Account' | 'Cross Account' | 'Unknown' = 'Unknown';
      if (userAccountId) {
        if (!networkAccountId || networkAccountId === userAccountId) {
          ownershipType = 'Own Account';
        } else {
          ownershipType = 'Cross Account';
        }
      }

      // Create connection node
      const connNodeId = `tgconn-${connId}`;
      // Get prefixes from route reports, falling back to connection's prefix_filters (for GRE tunnels)
      const routeReportPrefixes = prefixesByConnection.get(connId) ?? [];
      const connPrefixFilterPrefixes = field(conn, 'prefixFilterPrefixes') as string[] | undefined;
      const connPrefixes = routeReportPrefixes.length > 0 ? routeReportPrefixes : (connPrefixFilterPrefixes ?? []);
      nodes.push({
        id: connNodeId,
        type: 'tgwConnectionNode',
        position: { x: 0, y: 0 },
        data: {
          label: str(field(conn, 'name')),
          nodeType: 'tgwConnection',
          connectionStatus: str(field(conn, 'status')),
          networkType,
          subnetCount: connSubnets.length,
          routePrefixes: connPrefixes,
          ownershipType,
          networkAccountId: networkAccountId || undefined,
        } satisfies VpcTopologyNodeData,
      });
      nodeIdSet.add(connNodeId);
      tgwConnectionCount++;

      // Edge: TGW → Connection Node
      edges.push({
        id: `tg-conn-${tgId}-${connId}`,
        source: sourceId,
        target: connNodeId,
        style: { stroke: '#198038', strokeWidth: 2 },
      });

      // Edge: Connection Node → VPC (only if VPC is in the graph)
      if (vpcId && vpcExists) {
        const existing = vpcConnNodeIds.get(vpcId) ?? [];
        existing.push(connNodeId);
        vpcConnNodeIds.set(vpcId, existing);

        edges.push({
          id: `conn-vpc-${connId}-${vpcId}`,
          source: connNodeId,
          target: targetId!,
          style: { stroke: '#198038', strokeWidth: 2 },
        });

        // Dashed edges: Connection Node → each subnet of this VPC
        if (visibleLayers.has('subnets')) {
          for (const subnet of connSubnets) {
            const subnetId = str(field(subnet, 'id'));
            const subnetNodeId = `subnet-${subnetId}`;
            if (nodeIdSet.has(subnetNodeId)) {
              edges.push({
                id: `conn-subnet-${connId}-${subnetId}`,
                source: connNodeId,
                target: subnetNodeId,
                style: { stroke: '#198038', strokeWidth: 1, strokeDasharray: '5 3' },
              });
            }
          }
        }
      }
    }

    // 3. Subnets
    if (visibleLayers.has('subnets')) {
      for (const subnet of filteredSubnets) {
        const id = `subnet-${str(field(subnet, 'id'))}`;
        const vpcName = str(field(subnet, 'vpcName'));
        const vpcId = vpcNameToId.get(vpcName);
        nodes.push({
          id,
          type: 'subnetNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(field(subnet, 'name')),
            nodeType: 'vpcSubnet',
            cidr: str(field(subnet, 'cidr')),
            zone: str(field(subnet, 'zone')),
            availableIps: field(subnet, 'availableIps') as number | undefined,
          } satisfies VpcTopologyNodeData,
        });
        nodeIdSet.add(id);

        if (vpcId) {
          edges.push({
            id: `vpc-subnet-${vpcId}-${str(field(subnet, 'id'))}`,
            source: `vpc-${vpcId}`,
            target: id,
            style: { stroke: '#0f62fe' },
          });
        }
      }
    }

    // Build subnet name → id map for instance matching
    const subnetNameToId = new Map<string, string>();
    for (const s of filteredSubnets) {
      subnetNameToId.set(str(field(s, 'name')), str(field(s, 'id')));
    }

    // Build subnet ID → VPC ID map (for LB→VPC fallback)
    const subnetIdToVpcId = new Map<string, string>();
    for (const s of filteredSubnets) {
      const subVpcName = str(field(s, 'vpcName'));
      const subVpcId = vpcNameToId.get(subVpcName);
      if (subVpcId) {
        subnetIdToVpcId.set(str(field(s, 'id')), subVpcId);
        subnetIdToVpcId.set(str(field(s, 'name')), subVpcId);
      }
    }

    // 4. Instances
    const filteredInstances = rawInstances.filter((i) => {
      const vpcName = str(field(i, 'vpcName'));
      return vpcNameToId.has(vpcName);
    });

    if (visibleLayers.has('instances')) {
      for (const inst of filteredInstances) {
        const id = `instance-${str(field(inst, 'id'))}`;
        nodes.push({
          id,
          type: 'instanceNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(field(inst, 'name')),
            nodeType: 'vpcInstance',
            status: str(field(inst, 'status')),
            profile: str(field(inst, 'profile')),
            vcpu: field(inst, 'vcpu') as number | undefined,
            memory: field(inst, 'memory') as number | undefined,
            primaryIp: str(field(inst, 'primaryIp')),
          } satisfies VpcTopologyNodeData,
        });
        nodeIdSet.add(id);

        // Try to link to subnet — use raw data for subnet reference
        const rawInst = (vpcCollectedData['vpcInstances'] ?? []) as RawItem[];
        const rawItem = rawInst.find((r) => str((r as RawItem).id) === str(field(inst, 'id')));
        let subnetId: string | undefined;
        if (rawItem) {
          const pni = rawItem.primary_network_interface as RawItem | undefined;
          const subRef = pni?.subnet as RawItem | undefined;
          subnetId = subRef?.id as string | undefined;
        }

        if (subnetId && visibleLayers.has('subnets') && nodeIdSet.has(`subnet-${subnetId}`)) {
          edges.push({
            id: `subnet-instance-${subnetId}-${str(field(inst, 'id'))}`,
            source: `subnet-${subnetId}`,
            target: id,
            style: { stroke: '#393939' },
          });
        } else {
          // Fall back to VPC → Instance edge
          const vpcName = str(field(inst, 'vpcName'));
          const vpcId = vpcNameToId.get(vpcName);
          if (vpcId) {
            edges.push({
              id: `vpc-instance-${vpcId}-${str(field(inst, 'id'))}`,
              source: `vpc-${vpcId}`,
              target: id,
              style: { stroke: '#393939' },
            });
          }
        }
      }
    }

    // 5. Public Gateways
    const filteredPgws = rawPgws.filter((g) => {
      const vpcName = str(field(g, 'vpcName'));
      return vpcNameToId.has(vpcName);
    });

    if (visibleLayers.has('publicGateways')) {
      for (const pgw of filteredPgws) {
        const id = `pgw-${str(field(pgw, 'id'))}`;
        const vpcName = str(field(pgw, 'vpcName'));
        const vpcId = vpcNameToId.get(vpcName);
        nodes.push({
          id,
          type: 'publicGatewayNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(field(pgw, 'name')),
            nodeType: 'vpcPublicGateway',
            floatingIp: str(field(pgw, 'floatingIp')),
          } satisfies VpcTopologyNodeData,
        });
        nodeIdSet.add(id);

        if (vpcId) {
          edges.push({
            id: `vpc-pgw-${vpcId}-${str(field(pgw, 'id'))}`,
            source: `vpc-${vpcId}`,
            target: id,
            style: { stroke: '#da1e28' },
          });
        }
      }
    }

    // 6. Load Balancers
    const filteredLbs = rawLbs.filter((lb) => {
      const region = str(field(lb, 'region'));
      if (regionFilter && region !== regionFilter) return false;
      return true;
    });

    if (visibleLayers.has('loadBalancers')) {
      for (const lb of filteredLbs) {
        const lbId = str(field(lb, 'id'));
        const id = `lb-${lbId}`;
        nodes.push({
          id,
          type: 'loadBalancerNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(field(lb, 'name')),
            nodeType: 'vpcLoadBalancer',
            hostname: str(field(lb, 'hostname')),
            isPublic: field(lb, 'isPublic') === true,
          } satisfies VpcTopologyNodeData,
        });
        nodeIdSet.add(id);

        // Get LB's subnet IDs (flat string arrays injected by backend)
        let lbSubnetIds = (field(lb, 'subnetIds') ?? []) as string[];
        if (lbSubnetIds.length === 0) {
          // Fallback: resolve subnet names to IDs
          const lbSubnetNames = (field(lb, 'subnetNames') ?? []) as string[];
          lbSubnetIds = lbSubnetNames
            .map((name) => subnetNameToId.get(name))
            .filter((v): v is string => !!v);
        }

        // Determine parent VPC via subnet → VPC map
        let parentVpcId: string | undefined;
        for (const subId of lbSubnetIds) {
          parentVpcId = subnetIdToVpcId.get(subId);
          if (parentVpcId) break;
        }

        // Always create VPC → LB edge
        if (parentVpcId && nodeIdSet.has(`vpc-${parentVpcId}`)) {
          edges.push({
            id: `vpc-lb-${parentVpcId}-${lbId}`,
            source: `vpc-${parentVpcId}`,
            target: id,
            style: { stroke: '#8a3ffc' },
          });
        }

        // Additionally create LB → Subnet dashed edges when subnets layer is visible
        if (visibleLayers.has('subnets')) {
          for (const subId of lbSubnetIds) {
            const subNodeId = `subnet-${subId}`;
            if (nodeIdSet.has(subNodeId)) {
              edges.push({
                id: `lb-subnet-${lbId}-${subId}`,
                source: id,
                target: subNodeId,
                style: { stroke: '#8a3ffc', strokeDasharray: '5 3' },
              });
            }
          }
        }
      }
    }

    // 7. VPN Gateways
    const filteredVpnGws = rawVpnGws.filter((v) => {
      const region = str(field(v, 'region'));
      if (regionFilter && region !== regionFilter) return false;
      return true;
    });

    if (visibleLayers.has('vpnGateways')) {
      for (const vpn of filteredVpnGws) {
        const id = `vpn-${str(field(vpn, 'id'))}`;
        const vpcName = str(field(vpn, 'vpcName'));
        const vpcId = vpcNameToId.get(vpcName);
        nodes.push({
          id,
          type: 'vpnGatewayNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(field(vpn, 'name')),
            nodeType: 'vpcVpnGateway',
            status: str(field(vpn, 'status')),
            mode: str(field(vpn, 'mode')),
          } satisfies VpcTopologyNodeData,
        });
        nodeIdSet.add(id);

        // VPN GW is attached to a subnet — find via raw data
        const rawVpnData = (vpcCollectedData['vpcVpnGateways'] ?? []) as RawItem[];
        const rawVpn = rawVpnData.find((r) => str((r as RawItem).id) === str(field(vpn, 'id')));
        const subRef = rawVpn?.subnet as { id: string; name: string } | undefined;
        if (subRef?.id && visibleLayers.has('subnets') && nodeIdSet.has(`subnet-${subRef.id}`)) {
          edges.push({
            id: `subnet-vpn-${subRef.id}-${str(field(vpn, 'id'))}`,
            source: `subnet-${subRef.id}`,
            target: id,
            style: { stroke: '#005d5d' },
          });
        } else if (vpcId) {
          // Fall back to VPC → VPN GW edge when subnet layer is off
          edges.push({
            id: `vpc-vpn-${vpcId}-${str(field(vpn, 'id'))}`,
            source: `vpc-${vpcId}`,
            target: id,
            style: { stroke: '#005d5d' },
          });
        }
      }
    }

    // Filter edges to only those with both source and target visible
    const visibleEdges = edges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

    // Collect unique regions
    const regionSet = new Set<string>();
    for (const vpc of rawVpcs) {
      const r = str(field(vpc, 'region'));
      if (r) regionSet.add(r);
    }

    return {
      nodes,
      edges: visibleEdges,
      regions: Array.from(regionSet).sort(),
      stats: {
        transitGateways: rawTransitGateways.length,
        tgwConnections: tgwConnectionCount,
        vpcs: vpcs.length,
        subnets: filteredSubnets.length,
        instances: filteredInstances.length,
        loadBalancers: filteredLbs.length,
        publicGateways: filteredPgws.length,
        vpnGateways: filteredVpnGws.length,
      },
    };
  }, [vpcCollectedData, regionFilter, visibleLayers, userAccountId]);
}
