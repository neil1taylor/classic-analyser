import { useMemo } from 'react';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
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

interface PvsTopologyResult {
  nodes: Node[];
  edges: Edge[];
  zones: string[];
  stats: {
    transitGateways: number;
    tgwConnections: number;
    workspaces: number;
    instances: number;
    networks: number;
    volumes: number;
    cloudConnections: number;
  };
}

export function usePowerVsTopologyData(
  zoneFilter: string | null,
  visibleLayers: Set<string>,
): PvsTopologyResult {
  const { pvsCollectedData } = usePowerVsData();
  const { vpcCollectedData, userAccountId } = useVpcData();

  return useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeIdSet = new Set<string>();

    const rawWorkspaces = (pvsCollectedData['pvsWorkspaces'] ?? []) as RawItem[];
    const rawInstances = (pvsCollectedData['pvsInstances'] ?? []) as RawItem[];
    const rawNetworks = (pvsCollectedData['pvsNetworks'] ?? []) as RawItem[];
    const rawVolumes = (pvsCollectedData['pvsVolumes'] ?? []) as RawItem[];
    const rawCloudConns = (pvsCollectedData['pvsCloudConnections'] ?? []) as RawItem[];

    // TGW data: prefer PowerVS context (collected during PVS scan), fall back to VPC context
    const pvsTransitGateways = (pvsCollectedData['transitGateways'] ?? []) as RawItem[];
    const vpcTransitGateways = (vpcCollectedData['transitGateways'] ?? []) as RawItem[];
    const rawTransitGateways = pvsTransitGateways.length > 0 ? pvsTransitGateways : vpcTransitGateways;

    const pvsTgConns = (pvsCollectedData['transitGatewayConnections'] ?? []) as RawItem[];
    const vpcTgConns = (vpcCollectedData['transitGatewayConnections'] ?? []) as RawItem[];
    const rawTgConnections = pvsTgConns.length > 0 ? pvsTgConns : vpcTgConns;

    const pvsTgwRoutePrefixes = (pvsCollectedData['tgwRoutePrefixes'] ?? []) as RawItem[];
    const vpcTgwRoutePrefixes = (vpcCollectedData['tgwRoutePrefixes'] ?? []) as RawItem[];
    const rawTgwRoutePrefixes = pvsTgwRoutePrefixes.length > 0 ? pvsTgwRoutePrefixes : vpcTgwRoutePrefixes;

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

    // Filter workspaces by zone
    const workspaces = zoneFilter
      ? rawWorkspaces.filter((w) => str(field(w, 'zone')) === zoneFilter)
      : rawWorkspaces;

    const wsGuidSet = new Set(workspaces.map((w) => str(field(w, 'guid'))));
    const wsNameSet = new Set(workspaces.map((w) => str(field(w, 'name'))));

    // Build workspace GUID → node ID map
    const wsGuidToNodeId = new Map<string, string>();
    for (const ws of workspaces) {
      const guid = str(field(ws, 'guid'));
      wsGuidToNodeId.set(guid, `ws-${guid}`);
    }

    // Filter TGW connections to only power_virtual_server type that connect to visible workspaces
    const pvsTgConnections = rawTgConnections.filter((conn) => {
      if (str(field(conn, 'networkType')) !== 'power_virtual_server') return false;
      const networkId = str(field(conn, 'networkId'));
      if (!networkId) return false;
      // Parse workspace GUID from CRN: crn:v1:bluemix:public:power-iaas:...::<guid>::
      const crnParts = networkId.split(':');
      const wsGuid = crnParts.length > 7 ? crnParts[7] : '';
      return wsGuid && wsGuidSet.has(wsGuid);
    });

    // Identify relevant TGW IDs (those that have at least one PowerVS connection to a visible workspace)
    const relevantTgIds = new Set<string>();
    for (const conn of pvsTgConnections) {
      relevantTgIds.add(str(field(conn, 'transitGatewayId')));
    }

    // Count total TGW connections per gateway (for display purposes)
    const tgConnectionCounts = new Map<string, number>();
    for (const conn of rawTgConnections) {
      const tgId = str(field(conn, 'transitGatewayId'));
      tgConnectionCounts.set(tgId, (tgConnectionCounts.get(tgId) ?? 0) + 1);
    }

    // 0. Transit Gateway nodes
    for (const tg of rawTransitGateways) {
      const tgRawId = str(field(tg, 'id'));
      if (!relevantTgIds.has(tgRawId)) continue;
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

    // 0b. TGW Connection nodes (power_virtual_server type only)
    let tgwConnectionCount = 0;
    // Map: workspace GUID → list of TGW connection node IDs (for edges)
    const wsGuidToTgConnNodeIds = new Map<string, string[]>();

    for (const conn of pvsTgConnections) {
      const tgId = str(field(conn, 'transitGatewayId'));
      const connId = str(field(conn, 'id'));
      if (!tgId || !connId) continue;
      const sourceId = `tg-${tgId}`;
      if (!nodeIdSet.has(sourceId)) continue;

      const networkId = str(field(conn, 'networkId'));
      const crnParts = networkId.split(':');
      const wsGuid = crnParts.length > 7 ? crnParts[7] : '';

      // Derive ownership type
      const networkAccountId = str(field(conn, 'networkAccountId'));
      let ownershipType: 'Own Account' | 'Cross Account' | 'Unknown' = 'Unknown';
      if (userAccountId) {
        if (!networkAccountId || networkAccountId === userAccountId) {
          ownershipType = 'Own Account';
        } else {
          ownershipType = 'Cross Account';
        }
      }

      // Get route prefixes
      const routeReportPrefixes = prefixesByConnection.get(connId) ?? [];
      const connPrefixFilterPrefixes = field(conn, 'prefixFilterPrefixes') as string[] | undefined;
      const connPrefixes = routeReportPrefixes.length > 0 ? routeReportPrefixes : (connPrefixFilterPrefixes ?? []);

      const connNodeId = `tgconn-${connId}`;
      nodes.push({
        id: connNodeId,
        type: 'tgwConnectionNode',
        position: { x: 0, y: 0 },
        data: {
          label: str(field(conn, 'name')),
          nodeType: 'tgwConnection',
          connectionStatus: str(field(conn, 'status')),
          networkType: 'power_virtual_server',
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

      // Edge: Connection Node → Workspace
      if (wsGuid && wsGuidToNodeId.has(wsGuid)) {
        const existing = wsGuidToTgConnNodeIds.get(wsGuid) ?? [];
        existing.push(connNodeId);
        wsGuidToTgConnNodeIds.set(wsGuid, existing);

        edges.push({
          id: `conn-ws-${connId}-${wsGuid}`,
          source: connNodeId,
          target: `ws-${wsGuid}`,
          style: { stroke: '#198038', strokeWidth: 2 },
        });
      }
    }

    // 1. Workspace nodes (always visible)
    for (const ws of workspaces) {
      const id = `ws-${str(field(ws, 'guid'))}`;
      nodes.push({
        id,
        type: 'pvsWorkspaceNode',
        position: { x: 0, y: 0 },
        data: {
          label: str(field(ws, 'name')),
          nodeType: 'pvsWorkspace',
          zone: str(field(ws, 'zone')),
          state: str(field(ws, 'state')),
        },
      });
      nodeIdSet.add(id);
    }

    // Filter resources to visible workspaces
    const filteredInstances = rawInstances.filter((i) => wsNameSet.has(str(field(i, 'workspace'))));
    const filteredNetworks = rawNetworks.filter((n) => wsNameSet.has(str(field(n, 'workspace'))));
    const filteredVolumes = rawVolumes.filter((v) => wsNameSet.has(str(field(v, 'workspace'))));
    const filteredCloudConns = rawCloudConns.filter((c) => wsNameSet.has(str(field(c, 'workspace'))));

    // Build workspace name → guid map
    const wsNameToGuid = new Map<string, string>();
    for (const ws of workspaces) {
      wsNameToGuid.set(str(field(ws, 'name')), str(field(ws, 'guid')));
    }

    // 2. Network nodes
    if (visibleLayers.has('networks')) {
      for (const net of filteredNetworks) {
        const id = `net-${str(field(net, 'networkID'))}`;
        const wsName = str(field(net, 'workspace'));
        const wsGuid = wsNameToGuid.get(wsName);
        nodes.push({
          id,
          type: 'pvsNetworkNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(field(net, 'name')),
            nodeType: 'pvsNetwork',
            networkType: str(field(net, 'type')),
            cidr: str(field(net, 'cidr')),
          },
        });
        nodeIdSet.add(id);

        if (wsGuid) {
          edges.push({
            id: `ws-net-${wsGuid}-${str(field(net, 'networkID'))}`,
            source: `ws-${wsGuid}`,
            target: id,
            style: { stroke: '#0f62fe' },
          });
        }
      }
    }

    // 3. Instance nodes
    if (visibleLayers.has('instances')) {
      for (const inst of filteredInstances) {
        const id = `inst-${str(field(inst, 'pvmInstanceID'))}`;
        const wsName = str(field(inst, 'workspace'));
        const wsGuid = wsNameToGuid.get(wsName);
        nodes.push({
          id,
          type: 'pvsInstanceNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(field(inst, 'serverName')),
            nodeType: 'pvsInstance',
            status: str(field(inst, 'status')),
            sysType: str(field(inst, 'sysType')),
            processors: field(inst, 'processors'),
            memory: field(inst, 'memory'),
          },
        });
        nodeIdSet.add(id);

        if (wsGuid) {
          edges.push({
            id: `ws-inst-${wsGuid}-${str(field(inst, 'pvmInstanceID'))}`,
            source: `ws-${wsGuid}`,
            target: id,
            style: { stroke: '#393939' },
          });
        }
      }
    }

    // 4. Volume nodes
    if (visibleLayers.has('volumes')) {
      for (const vol of filteredVolumes) {
        const id = `vol-${str(field(vol, 'volumeID'))}`;
        const wsName = str(field(vol, 'workspace'));
        const wsGuid = wsNameToGuid.get(wsName);
        nodes.push({
          id,
          type: 'pvsVolumeNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(field(vol, 'name')),
            nodeType: 'pvsVolume',
            size: field(vol, 'size'),
            diskType: str(field(vol, 'diskType')),
            state: str(field(vol, 'state')),
          },
        });
        nodeIdSet.add(id);

        if (wsGuid) {
          edges.push({
            id: `ws-vol-${wsGuid}-${str(field(vol, 'volumeID'))}`,
            source: `ws-${wsGuid}`,
            target: id,
            style: { stroke: '#da1e28', strokeDasharray: '5 3' },
          });
        }
      }
    }

    // 5. Cloud Connection nodes
    if (visibleLayers.has('cloudConnections')) {
      for (const cc of filteredCloudConns) {
        const id = `cc-${str(field(cc, 'cloudConnectionID'))}`;
        const wsName = str(field(cc, 'workspace'));
        const wsGuid = wsNameToGuid.get(wsName);
        nodes.push({
          id,
          type: 'pvsCloudConnectionNode',
          position: { x: 0, y: 0 },
          data: {
            label: str(field(cc, 'name')),
            nodeType: 'pvsCloudConnection',
            speed: field(cc, 'speed'),
            globalRouting: field(cc, 'globalRouting'),
            transitEnabled: field(cc, 'transitEnabled'),
          },
        });
        nodeIdSet.add(id);

        if (wsGuid) {
          edges.push({
            id: `ws-cc-${wsGuid}-${str(field(cc, 'cloudConnectionID'))}`,
            source: `ws-${wsGuid}`,
            target: id,
            style: { stroke: '#198038', strokeWidth: 2 },
          });
        }
      }
    }

    // Filter edges to only those with both source and target visible
    const visibleEdges = edges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

    // Collect unique zones
    const zoneSet = new Set<string>();
    for (const ws of rawWorkspaces) {
      const z = str(field(ws, 'zone'));
      if (z) zoneSet.add(z);
    }

    return {
      nodes,
      edges: visibleEdges,
      zones: Array.from(zoneSet).sort(),
      stats: {
        transitGateways: relevantTgIds.size,
        tgwConnections: tgwConnectionCount,
        workspaces: workspaces.length,
        instances: filteredInstances.length,
        networks: filteredNetworks.length,
        volumes: filteredVolumes.length,
        cloudConnections: filteredCloudConns.length,
      },
    };
  }, [pvsCollectedData, vpcCollectedData, zoneFilter, visibleLayers, userAccountId]);
}
