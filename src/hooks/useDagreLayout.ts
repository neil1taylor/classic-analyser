import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

export type LayoutMode = 'dagre' | 'manual';

const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  internet: { width: 120, height: 60 },
  router: { width: 140, height: 60 },
  gateway: { width: 140, height: 70 },
  vlan: { width: 160, height: 120 },
  subnet: { width: 160, height: 50 },
  firewall: { width: 130, height: 60 },
  vsi: { width: 140, height: 70 },
  bareMetal: { width: 140, height: 70 },
  storage: { width: 150, height: 60 },
  subnetDetail: { width: 200, height: 110 },
  dualNicDevice: { width: 180, height: 100 },
  privateNetwork: { width: 160, height: 60 },
  privateNetworkBus: { width: 600, height: 50 },
  cloudServices: { width: 160, height: 70 },
  directLink: { width: 160, height: 70 },
  transitGateway: { width: 200, height: 120 },
  tgwConnection: { width: 190, height: 110 },
  vpnGateway: { width: 160, height: 80 },
  vpc: { width: 160, height: 70 },
  vpcSubnet: { width: 160, height: 80 },
  vpcInstance: { width: 150, height: 80 },
  vpcLoadBalancer: { width: 160, height: 60 },
  vpcPublicGateway: { width: 140, height: 60 },
  vpcVpnGateway: { width: 140, height: 60 },
  pvsWorkspace: { width: 160, height: 70 },
  pvsNetwork: { width: 150, height: 80 },
  pvsInstance: { width: 150, height: 80 },
  pvsVolume: { width: 140, height: 70 },
  pvsCloudConnection: { width: 160, height: 80 },
};

const DEFAULT_DIMS = { width: 140, height: 60 };

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options?: { rankdir?: string; ranksep?: number; nodesep?: number },
): Node[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: options?.rankdir ?? 'TB',
    ranksep: options?.ranksep ?? 130,
    nodesep: options?.nodesep ?? 50,
  });

  // Map React Flow node type to dimension key
  const rfTypeToDimKey: Record<string, string> = {
    subnetDetailNode: 'subnetDetail',
    dualNicDeviceNode: 'dualNicDevice',
    privateNetworkNode: 'privateNetwork',
    privateNetworkBusNode: 'privateNetworkBus',
    cloudServicesNode: 'cloudServices',
    transitGatewayNode: 'transitGateway',
    tgwConnectionNode: 'tgwConnection',
    directLinkNode: 'directLink',
    vpcNode: 'vpc',
    subnetNode: 'vpcSubnet',
    instanceNode: 'vpcInstance',
    loadBalancerNode: 'vpcLoadBalancer',
    publicGatewayNode: 'vpcPublicGateway',
    vpnGatewayNode: 'vpnGateway',
    pvsWorkspaceNode: 'pvsWorkspace',
    pvsNetworkNode: 'pvsNetwork',
    pvsInstanceNode: 'pvsInstance',
    pvsVolumeNode: 'pvsVolume',
    pvsCloudConnectionNode: 'pvsCloudConnection',
  };

  nodes.forEach((node) => {
    const nodeType = (node.data as Record<string, unknown>)?.nodeType as string | undefined;
    const rfKey = node.type ? rfTypeToDimKey[node.type] : undefined;
    const dims = NODE_DIMENSIONS[rfKey ?? nodeType ?? ''] ?? DEFAULT_DIMS;
    g.setNode(node.id, { width: dims.width, height: dims.height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const nodeType = (node.data as Record<string, unknown>)?.nodeType as string | undefined;
    const rfKey = node.type ? rfTypeToDimKey[node.type] : undefined;
    const dims = NODE_DIMENSIONS[rfKey ?? nodeType ?? ''] ?? DEFAULT_DIMS;
    return {
      ...node,
      position: {
        x: pos.x - dims.width / 2,
        y: pos.y - dims.height / 2,
      },
    };
  });
}
