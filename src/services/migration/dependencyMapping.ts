import type { DependencyGraph, DependencyNode, DependencyEdge } from '@/types/migration';

function num(item: unknown, key: string): number {
  return Number((item as Record<string, unknown>)[key] ?? 0);
}
function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

export function buildDependencyGraph(
  collectedData: Record<string, unknown[]>,
): DependencyGraph {
  const nodes: DependencyNode[] = [];
  const edges: DependencyEdge[] = [];
  const nodeIds = new Set<string>();

  function addNode(id: string, type: string, label: string, datacenter: string) {
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({ id, type, label, datacenter });
    }
  }

  // Add gateways
  for (const gw of collectedData['gateways'] ?? []) {
    const id = `gw-${num(gw, 'id')}`;
    addNode(id, 'gateway', str(gw, 'name') || `Gateway ${num(gw, 'id')}`, str(gw, 'datacenter'));
  }

  // Add VLANs
  for (const vlan of collectedData['vlans'] ?? []) {
    const id = `vlan-${num(vlan, 'id')}`;
    const dc = str(vlan, 'datacenter');
    addNode(id, 'vlan', str(vlan, 'name') || `VLAN ${num(vlan, 'vlanNumber')}`, dc);

    // Gateway → VLAN
    const gwName = str(vlan, 'gateway');
    if (gwName) {
      const gw = (collectedData['gateways'] ?? []).find(
        (g) => str(g, 'name') === gwName || str(g, 'publicIp') === gwName,
      );
      if (gw) {
        edges.push({ source: `gw-${num(gw, 'id')}`, target: id, relationship: 'routes' });
      }
    }
  }

  // Add subnets
  for (const subnet of collectedData['subnets'] ?? []) {
    const id = `subnet-${num(subnet, 'id')}`;
    addNode(id, 'subnet', `${str(subnet, 'networkIdentifier')}/${num(subnet, 'cidr')}`, str(subnet, 'datacenter'));

    // VLAN → Subnet
    const vlanNum = num(subnet, 'vlanNumber');
    const parentVlan = (collectedData['vlans'] ?? []).find((v) => num(v, 'vlanNumber') === vlanNum);
    if (parentVlan) {
      edges.push({ source: `vlan-${num(parentVlan, 'id')}`, target: id, relationship: 'contains' });
    }
  }

  // Add VSIs
  for (const vsi of collectedData['virtualServers'] ?? []) {
    const id = `vsi-${num(vsi, 'id')}`;
    addNode(id, 'vsi', str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`, str(vsi, 'datacenter'));
  }

  // Add Bare Metal
  for (const bm of collectedData['bareMetal'] ?? []) {
    const id = `bm-${num(bm, 'id')}`;
    addNode(id, 'bareMetal', str(bm, 'hostname') || `BM ${num(bm, 'id')}`, str(bm, 'datacenter'));
  }

  // Add Block Storage → compute connections
  for (const vol of collectedData['blockStorage'] ?? []) {
    const id = `block-${num(vol, 'id')}`;
    addNode(id, 'blockStorage', str(vol, 'username') || `Block ${num(vol, 'id')}`, '');

    // Approximate: connect to VSIs in the same datacenter
    const dc = str(vol, 'datacenter');
    if (dc) {
      const vsisInDC = (collectedData['virtualServers'] ?? []).filter((v) => str(v, 'datacenter') === dc);
      if (vsisInDC.length > 0) {
        edges.push({ source: `vsi-${num(vsisInDC[0], 'id')}`, target: id, relationship: 'uses-storage' });
      }
    }
  }

  // Add File Storage
  for (const vol of collectedData['fileStorage'] ?? []) {
    const id = `file-${num(vol, 'id')}`;
    addNode(id, 'fileStorage', str(vol, 'username') || `File ${num(vol, 'id')}`, '');
  }

  // Add Firewalls → VLAN
  for (const fw of collectedData['firewalls'] ?? []) {
    const id = `fw-${num(fw, 'id')}`;
    addNode(id, 'firewall', str(fw, 'firewallType') || `FW ${num(fw, 'id')}`, str(fw, 'datacenter'));

    const vlanNum = num(fw, 'vlanNumber');
    const parentVlan = (collectedData['vlans'] ?? []).find((v) => num(v, 'vlanNumber') === vlanNum);
    if (parentVlan) {
      edges.push({ source: id, target: `vlan-${num(parentVlan, 'id')}`, relationship: 'protects' });
    }
  }

  // Add Load Balancers
  for (const lb of collectedData['loadBalancers'] ?? []) {
    const id = `lb-${num(lb, 'id')}`;
    addNode(id, 'loadBalancer', str(lb, 'name') || `LB ${num(lb, 'id')}`, '');
  }

  return { nodes, edges };
}
