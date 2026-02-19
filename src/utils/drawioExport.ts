import type { Node, Edge } from '@xyflow/react';

// --- Node dimension mapping (mirrors useDagreLayout.ts) ---

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
  transitGateway: { width: 200, height: 120 },
  vpnGateway: { width: 160, height: 80 },
  vpc: { width: 160, height: 70 },
  vpcSubnet: { width: 160, height: 80 },
  vpcInstance: { width: 150, height: 80 },
  vpcLoadBalancer: { width: 160, height: 60 },
  vpcPublicGateway: { width: 140, height: 60 },
  vpcVpnGateway: { width: 140, height: 60 },
};

const RF_TYPE_TO_DIM_KEY: Record<string, string> = {
  transitGatewayNode: 'transitGateway',
  vpcNode: 'vpc',
  subnetNode: 'vpcSubnet',
  instanceNode: 'vpcInstance',
  loadBalancerNode: 'vpcLoadBalancer',
  publicGatewayNode: 'vpcPublicGateway',
  vpnGatewayNode: 'vpnGateway',
};

const DEFAULT_DIMS = { width: 140, height: 60 };

function getNodeDims(node: Node): { width: number; height: number } {
  const nodeType = (node.data as Record<string, unknown>)?.nodeType as string | undefined;
  const rfKey = node.type ? RF_TYPE_TO_DIM_KEY[node.type] : undefined;
  return NODE_DIMENSIONS[rfKey ?? nodeType ?? ''] ?? DEFAULT_DIMS;
}

// --- XML escaping ---

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Node style mapping ---

interface StyleConfig {
  fillColor: string;
  strokeColor: string;
  fontColor: string;
  extra: string;
}

function getNodeStyle(node: Node): StyleConfig {
  const data = node.data as Record<string, unknown>;
  const type = node.type ?? '';

  switch (type) {
    // VPC types
    case 'transitGatewayNode':
      return { fillColor: '#161616', strokeColor: '#161616', fontColor: '#ffffff', extra: '' };
    case 'tgwConnectionNode':
      return { fillColor: '#ffffff', strokeColor: '#198038', fontColor: '#161616', extra: 'strokeWidth=3;' };
    case 'vpcNode':
      return { fillColor: '#ffffff', strokeColor: '#0f62fe', fontColor: '#161616', extra: 'strokeWidth=2;' };
    case 'subnetNode':
      return { fillColor: '#ffffff', strokeColor: '#8d8d8d', fontColor: '#161616', extra: 'dashed=1;' };
    case 'instanceNode':
      return { fillColor: '#ffffff', strokeColor: '#e0e0e0', fontColor: '#161616', extra: '' };
    case 'loadBalancerNode':
      return { fillColor: '#ffffff', strokeColor: '#8a3ffc', fontColor: '#161616', extra: '' };
    case 'publicGatewayNode':
      return { fillColor: '#ffffff', strokeColor: '#da1e28', fontColor: '#161616', extra: '' };
    case 'vpnGatewayNode':
      return { fillColor: '#ffffff', strokeColor: '#005d5d', fontColor: '#161616', extra: '' };

    // Classic types
    case 'internetNode':
      return { fillColor: '#161616', strokeColor: '#161616', fontColor: '#ffffff', extra: '' };
    case 'routerNode': {
      const routerType = data.routerType as string | undefined;
      const color = routerType === 'fcr' ? '#da1e28' : '#0f62fe';
      return { fillColor: '#ffffff', strokeColor: color, fontColor: '#161616', extra: 'strokeWidth=2;' };
    }
    case 'gatewayNode':
      return { fillColor: '#ffffff', strokeColor: '#525252', fontColor: '#161616', extra: 'strokeWidth=2;' };
    case 'vlanNode': {
      const networkSpace = data.networkSpace as string | undefined;
      const color = networkSpace === 'public' ? '#da1e28' : '#0f62fe';
      return { fillColor: '#ffffff', strokeColor: color, fontColor: '#161616', extra: 'dashed=1;' };
    }
    case 'firewallNode':
      return { fillColor: '#ffffff', strokeColor: '#da1e28', fontColor: '#161616', extra: 'strokeWidth=2;' };
    case 'vsiNode':
      return { fillColor: '#ffffff', strokeColor: '#e0e0e0', fontColor: '#161616', extra: '' };
    case 'bareMetalNode':
      return { fillColor: '#ffffff', strokeColor: '#002d9c', fontColor: '#161616', extra: '' };
    case 'storageNode':
      return { fillColor: '#ffffff', strokeColor: '#0f62fe', fontColor: '#161616', extra: 'dashed=1;' };

    default:
      return { fillColor: '#ffffff', strokeColor: '#393939', fontColor: '#161616', extra: '' };
  }
}

// --- Label construction ---

function buildLabel(node: Node): string {
  const data = node.data as Record<string, unknown>;
  const label = (data.label as string) ?? '';
  const type = node.type ?? '';

  const parts: string[] = [label];

  switch (type) {
    // VPC
    case 'transitGatewayNode': {
      const loc = data.location as string | undefined;
      const isGlobal = data.isGlobal as boolean | undefined;
      const connCount = data.connectionCount as number | undefined;
      if (loc) parts.push(`${loc}${isGlobal ? ' (global)' : ''}`);
      if (connCount != null) parts.push(`${connCount} connections`);
      break;
    }
    case 'tgwConnectionNode': {
      const status = data.connectionStatus as string | undefined;
      const netType = data.networkType as string | undefined;
      const subnetCount = data.subnetCount as number | undefined;
      if (status) parts.push(status);
      if (netType) parts.push(`Type: ${netType}`);
      if (subnetCount != null) parts.push(`${subnetCount} subnets reachable`);
      break;
    }
    case 'vpcNode': {
      const region = data.region as string | undefined;
      if (region) parts.push(region);
      break;
    }
    case 'subnetNode': {
      const cidr = data.cidr as string | undefined;
      const zone = data.zone as string | undefined;
      if (cidr) parts.push(cidr);
      if (zone) parts.push(zone);
      break;
    }
    case 'instanceNode': {
      const profile = data.profile as string | undefined;
      const ip = data.primaryIp as string | undefined;
      if (profile) parts.push(profile);
      if (ip) parts.push(ip);
      break;
    }
    case 'loadBalancerNode': {
      const hostname = data.hostname as string | undefined;
      if (hostname) parts.push(hostname);
      break;
    }
    case 'publicGatewayNode': {
      const fip = data.floatingIp as string | undefined;
      if (fip) parts.push(fip);
      break;
    }
    case 'vpnGatewayNode': {
      const mode = data.mode as string | undefined;
      if (mode) parts.push(mode);
      break;
    }

    // Classic
    case 'internetNode':
      // label is already "Internet"
      break;
    case 'routerNode': {
      const dc = data.datacenter as string | undefined;
      if (dc) parts.push(dc);
      break;
    }
    case 'gatewayNode': {
      const ip = data.ip as string | undefined;
      const memberCount = data.memberCount as number | undefined;
      if (ip) parts.push(ip);
      if (memberCount != null) parts.push(`${memberCount} members`);
      break;
    }
    case 'vlanNode': {
      const dc = data.datacenter as string | undefined;
      const subnetCount = data.subnetCount as number | undefined;
      if (dc) parts.push(dc);
      if (subnetCount != null) parts.push(`${subnetCount} subnets`);
      break;
    }
    case 'firewallNode': {
      const ip = data.ip as string | undefined;
      if (ip) parts.push(ip);
      break;
    }
    case 'vsiNode': {
      const cpu = data.cpu as number | undefined;
      const memory = data.memory as number | undefined;
      const ip = data.ip as string | undefined;
      if (cpu != null && memory != null) parts.push(`${cpu} vCPU · ${memory} GB`);
      if (ip) parts.push(ip);
      break;
    }
    case 'bareMetalNode': {
      const cpu = data.cpu as number | undefined;
      const memory = data.memory as number | undefined;
      const ip = data.ip as string | undefined;
      if (cpu != null && memory != null) parts.push(`${cpu} cores · ${memory} GB`);
      if (ip) parts.push(ip);
      break;
    }
    case 'storageNode': {
      const cap = data.capacityGb as number | undefined;
      const sType = data.storageType as string | undefined;
      if (cap != null) parts.push(`${cap} GB`);
      if (sType) parts.push(sType);
      break;
    }
  }

  return parts.filter(Boolean).join('\n');
}

// --- Main export functions ---

export function generateDrawioXml(nodes: Node[], edges: Edge[], diagramName: string): string {
  let cellId = 2; // 0 and 1 are reserved

  const nodeIdMap = new Map<string, number>();
  const cellsXml: string[] = [];

  // Vertex cells for nodes
  for (const node of nodes) {
    const id = cellId++;
    nodeIdMap.set(node.id, id);

    const dims = getNodeDims(node);
    const style = getNodeStyle(node);
    const label = escapeXml(buildLabel(node));

    const x = node.position?.x ?? 0;
    const y = node.position?.y ?? 0;

    const styleStr =
      `rounded=1;whiteSpace=wrap;html=1;` +
      `fillColor=${style.fillColor};` +
      `strokeColor=${style.strokeColor};` +
      `fontColor=${style.fontColor};` +
      style.extra;

    cellsXml.push(
      `        <mxCell id="${id}" value="${label}" style="${styleStr}" vertex="1" parent="1">` +
      `\n          <mxGeometry x="${x}" y="${y}" width="${dims.width}" height="${dims.height}" as="geometry"/>` +
      `\n        </mxCell>`
    );
  }

  // Edge cells
  for (const edge of edges) {
    const id = cellId++;
    const sourceId = nodeIdMap.get(edge.source);
    const targetId = nodeIdMap.get(edge.target);
    if (sourceId == null || targetId == null) continue;

    const edgeStyle = edge.style as Record<string, unknown> | undefined;
    const strokeColor = (edgeStyle?.stroke as string) ?? '#393939';
    const strokeWidth = (edgeStyle?.strokeWidth as number) ?? 1;
    const isDashed = edgeStyle?.strokeDasharray != null;

    let styleStr =
      `edgeStyle=orthogonalEdgeStyle;rounded=1;` +
      `endArrow=none;startArrow=none;` +
      `strokeColor=${strokeColor};` +
      `strokeWidth=${strokeWidth};`;

    if (isDashed) {
      styleStr += 'dashed=1;dashPattern=5 3;';
    }

    cellsXml.push(
      `        <mxCell id="${id}" value="" style="${styleStr}" edge="1" source="${sourceId}" target="${targetId}" parent="1">` +
      `\n          <mxGeometry relative="1" as="geometry"/>` +
      `\n        </mxCell>`
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mxfile>',
    `  <diagram name="${escapeXml(diagramName)}">`,
    '    <mxGraphModel>',
    '      <root>',
    '        <mxCell id="0"/>',
    '        <mxCell id="1" parent="0"/>',
    ...cellsXml,
    '      </root>',
    '    </mxGraphModel>',
    '  </diagram>',
    '</mxfile>',
  ].join('\n');
}

export function downloadDrawio(nodes: Node[], edges: Edge[], filename: string): void {
  const diagramName = filename.replace(/\.drawio$/, '');
  const xml = generateDrawioXml(nodes, edges, diagramName);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.drawio') ? filename : `${filename}.drawio`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
