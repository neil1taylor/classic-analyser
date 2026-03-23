import type { ReportParserResult, ReportTopologyEdge } from './types';
import { createLogger } from '@/utils/logger';

const log = createLogger('ReportDrawio');

/**
 * Model type to resource key mapping.
 */
const MODEL_TYPE_MAP: Record<string, string> = {
  baremetal: 'bareMetal',
  virtualguest: 'virtualServers',
  virtualhost: 'virtualHosts',
  vlan: 'vlans',
  gateway: 'gateways',
  router: 'routers',
  transitGateway: 'classicTransitGateways',
  transitGatewayDevice: 'transitGatewayDevices',
  transitGatewayConnection: 'classicTransitGatewayConnections',
};

/**
 * Parse a draw.io XML file containing IBM Cloud network topology.
 * Extracts resource nodes (UserObject elements) and network connections (edges).
 */
export function parseDrawio(text: string): ReportParserResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  const data: Record<string, unknown[]> = {};
  const topology: ReportTopologyEdge[] = [];

  // Process each diagram tab (each represents a datacenter or overview)
  const diagrams = doc.querySelectorAll('diagram');

  for (const diagram of diagrams) {
    const diagramName = diagram.getAttribute('name') || '';

    // Skip the overview page (first tab with layout instructions)
    if (diagramName === '2469410' || !diagramName) {
      // Check if it's a generic overview (has "title" named cells but no resource objects)
      const userObjects = diagram.querySelectorAll('UserObject[modelType]');
      if (userObjects.length === 0) continue;
    }

    const datacenter = diagramName; // e.g., "tok04"

    // Extract resource nodes
    const userObjects = diagram.querySelectorAll('UserObject[modelType]');
    for (const uo of userObjects) {
      const modelType = uo.getAttribute('modelType') || '';
      const resourceKey = MODEL_TYPE_MAP[modelType];
      if (!resourceKey) continue;

      const resource = extractUserObjectAttributes(uo, modelType, datacenter);
      if (!resource) continue;

      if (!data[resourceKey]) data[resourceKey] = [];
      data[resourceKey].push(resource);
    }

    // Extract edges (LAN connections and implicit connections)
    const edges = diagram.querySelectorAll('mxCell[edge="1"]');
    for (const edge of edges) {
      const topologyEdge = extractEdge(edge);
      if (topologyEdge) {
        topology.push(topologyEdge);
      }
    }
  }

  // Log summary
  for (const [key, items] of Object.entries(data)) {
    log.info(`Parsed ${items.length} ${key} from drawio`);
  }
  log.info(`Parsed ${topology.length} topology edges from drawio`);

  return { data, topology };
}

function extractUserObjectAttributes(
  uo: Element,
  modelType: string,
  datacenter: string
): Record<string, unknown> | null {
  const slId = uo.getAttribute('sl_id');
  if (!slId) return null;

  const attrs: Record<string, unknown> = {
    id: isNumericId(slId) ? parseInt(slId) : slId,
    _source: 'drawio',
    datacenter,
  };

  // Extract all XML attributes as resource properties
  for (const attr of uo.attributes) {
    const name = attr.name;
    if (['id', 'label', 'placeholders', 'style'].includes(name)) continue;

    const value = attr.value;
    if (name === 'sl_id') {
      // Already handled as id
      continue;
    }

    // Convert known numeric fields
    if (['processors', 'memory', 'maxCpu', 'hostID'].includes(name)) {
      attrs[name] = parseInt(value) || value;
    } else if (['dedicated', 'localDiskFlag', 'global', 'is_billing'].includes(name)) {
      attrs[name] = value.toLowerCase() === 'true';
    } else {
      attrs[name] = value;
    }
  }

  // Model-specific normalization
  switch (modelType) {
    case 'baremetal':
      attrs.hostname = attrs.name;
      attrs.primaryIpAddress = attrs.PublicIP;
      attrs.primaryBackendIpAddress = attrs.PrivateIP;
      attrs.operatingSystemReferenceCode = attrs.OS;
      break;

    case 'virtualguest':
      attrs.hostname = attrs.name;
      attrs.primaryIpAddress = attrs.PublicIP;
      attrs.primaryBackendIpAddress = attrs.PrivateIP;
      attrs.operatingSystemReferenceCode = attrs.OS;
      attrs.maxMemory = attrs.memory;
      break;

    case 'vlan': {
      // Extract vlan number and name from the name field (e.g., "1104: vcs-tok04-DMZYZ")
      const vlanMatch = (attrs.name as string)?.match(/^(\d+):\s*(.+)$/);
      if (vlanMatch) {
        attrs.vlanNumber = parseInt(vlanMatch[1]);
        attrs.vlanName = vlanMatch[2].trim();
      }
      // The domain field indicates PRIVATE or PUBLIC
      attrs.networkSpace = attrs.domain;
      // Collect subnet attributes
      const subnets: string[] = [];
      for (const [key, val] of Object.entries(attrs)) {
        if (key.startsWith('subnet_') && typeof val === 'string') {
          subnets.push(val);
        }
      }
      if (subnets.length > 0) attrs.subnets = subnets;
      break;
    }

    case 'gateway':
      attrs.publicIpAddress = attrs.PublicIP;
      attrs.privateIpAddress = attrs.PrivateIP;
      break;

    case 'router':
      attrs.name = attrs.primaryName;
      attrs.networkSpace = attrs.domain;
      break;

    case 'transitGateway':
      // sl_id may include datacenter suffix (e.g., "uuid_tok04")
      if (typeof attrs.id === 'string' && attrs.id.includes('_')) {
        attrs.id = attrs.id.split('_').slice(0, -1).join('_');
      }
      break;

    case 'transitGatewayConnection':
      // sl_id may include datacenter suffix
      if (typeof attrs.id === 'string' && attrs.id.includes('_')) {
        const parts = (attrs.id as string).split('_');
        attrs.id = parts.slice(0, -1).join('_');
      }
      attrs.networkType = attrs.network_type;
      attrs.baseNetworkType = attrs.base_network_type;
      break;
  }

  return attrs;
}

function extractEdge(cell: Element): ReportTopologyEdge | null {
  const id = cell.getAttribute('id') || '';
  const source = cell.getAttribute('source') || '';
  const target = cell.getAttribute('target') || '';
  const style = cell.getAttribute('style') || '';

  if (!source || !target) return null;

  // Determine connection type from id and style
  let connectionType: ReportTopologyEdge['connectionType'] = 'IMPLICIT';

  const isBlue = style.includes('#0000FF') || style.includes('#0000ff');
  const isRed = style.includes('#FF0000') || style.includes('#ff0000');
  const isDashed = style.includes('dashed=1');

  if (id.includes('_TR') || isDashed) {
    connectionType = isRed ? 'PUBLIC_TRUNKED' : 'PRIVATE_TRUNKED';
  } else if (isBlue) {
    connectionType = 'PRIVATE_NATIVE';
  } else if (isRed) {
    connectionType = 'PUBLIC_NATIVE';
  } else if (id.startsWith('SLC_PRIVATE')) {
    connectionType = id.includes('_TR') ? 'PRIVATE_TRUNKED' : 'PRIVATE_NATIVE';
  } else if (id.startsWith('SLC_PUBLIC')) {
    connectionType = id.includes('_TR') ? 'PUBLIC_TRUNKED' : 'PUBLIC_NATIVE';
  }

  // Extract source/target types from IDs (format: SLO_{id}_{type})
  const sourceType = extractTypeFromId(source);
  const targetType = extractTypeFromId(target);

  return {
    id,
    source,
    sourceType,
    target,
    targetType,
    connectionType,
  };
}

function extractTypeFromId(id: string): string {
  // Format: SLO_{id}_{type} or SLC_{connection}_{id}_{type}_{id}_{type}
  const parts = id.split('_');
  if (parts.length >= 3 && parts[0] === 'SLO') {
    return parts[parts.length - 1]; // Last part is the type
  }
  return 'unknown';
}

function isNumericId(id: string): boolean {
  return /^\d+$/.test(id);
}
