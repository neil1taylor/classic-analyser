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
  directLinkTenant: 'directLinkGateways',
  directLinkVlan: 'vlans',
  directLinkRouter: 'routers',
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

      const result = extractUserObjectAttributes(uo, modelType, datacenter);
      if (!result) continue;

      if (!data[resourceKey]) data[resourceKey] = [];
      data[resourceKey].push(result.resource);

      // Add any extra resources (e.g., subnets extracted from VLANs)
      if (result.extraResources) {
        for (const [extraKey, extraItems] of Object.entries(result.extraResources)) {
          if (!data[extraKey]) data[extraKey] = [];
          data[extraKey].push(...extraItems);
        }
      }
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

  // Post-process: enrich gateways with member and inside VLAN counts from edges
  enrichGatewaysFromEdges(data, topology);

  // Post-process: set primaryRouter on VLANs from router→vlan edges
  enrichVlansWithRouter(data, topology);

  // Log summary
  for (const [key, items] of Object.entries(data)) {
    log.info(`Parsed ${items.length} ${key} from drawio`);
  }
  log.info(`Parsed ${topology.length} topology edges from drawio`);

  return { data, topology };
}

interface ExtractionResult {
  resource: Record<string, unknown>;
  extraResources?: Record<string, Record<string, unknown>[]>;
}

function extractUserObjectAttributes(
  uo: Element,
  modelType: string,
  datacenter: string
): ExtractionResult | null {
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
  const extraResources: Record<string, Record<string, unknown>[]> = {};
  switch (modelType) {
    case 'baremetal':
      attrs.hostname = attrs.name;
      attrs.primaryIpAddress = attrs.PublicIP;
      attrs.primaryBackendIpAddress = attrs.PrivateIP;
      attrs.operatingSystemReferenceCode = attrs.OS;
      attrs.processorPhysicalCoreAmount = attrs.processors;
      attrs.networkSpace = attrs.domain;
      // Collect tag_* attributes into tagReferences format
      attrs.tagReferences = collectTags(attrs);
      break;

    case 'virtualguest':
      attrs.hostname = attrs.name;
      attrs.primaryIpAddress = attrs.PublicIP;
      attrs.primaryBackendIpAddress = attrs.PrivateIP;
      attrs.operatingSystemReferenceCode = attrs.OS;
      attrs.maxMemory = attrs.memory;
      attrs.startCpus = attrs.maxCpu;
      attrs.dedicatedAccountHostOnlyFlag = attrs.dedicated;
      attrs.networkSpace = attrs.domain;
      // Collect tag_* attributes into tagReferences format
      attrs.tagReferences = collectTags(attrs);
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
      // Extract subnet attributes as both a summary on the VLAN and separate subnet resources
      const subnetStrings: string[] = [];
      const subnetResources: Record<string, unknown>[] = [];
      for (const [key, val] of Object.entries(attrs)) {
        if (key.startsWith('subnet_') && typeof val === 'string') {
          subnetStrings.push(val);
          // Format: "TYPE CIDR" e.g. "ADDITIONAL_PRIMARY 10.221.32.0/26"
          const subnetMatch = val.match(/^(\S+)\s+(\S+?)\/(\d+)$/);
          if (subnetMatch) {
            subnetResources.push({
              id: `${attrs.id}_${key}`,
              _source: 'drawio',
              datacenter,
              subnetType: subnetMatch[1],
              networkIdentifier: subnetMatch[2],
              cidr: parseInt(subnetMatch[3]),
              networkVlanId: attrs.id,
              vlanNumber: attrs.vlanNumber,
            });
          }
          // Remove subnet_N keys from the VLAN resource
          delete attrs[key];
        }
      }
      if (subnetStrings.length > 0) attrs.subnets = subnetStrings;
      if (subnetResources.length > 0) {
        extraResources.subnets = subnetResources;
      }
      break;
    }

    case 'gateway':
      attrs.hostname = attrs.name;
      attrs.publicIpAddress = attrs.PublicIP;
      attrs.privateIpAddress = attrs.PrivateIP;
      attrs.publicIPv6Address = attrs.PublicIPv6Address;
      attrs.networkSpace = attrs.domain;
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
      // Map drawio field names to what the transform expects
      attrs.network_account_id = attrs.transit_network_account_id;
      break;

    case 'directLinkTenant':
      attrs.speed_mbps = parseInt(attrs.link_speed as string) || undefined;
      attrs.bgp_status = attrs.bgp_status;
      attrs.operational_status = attrs.operational_status;
      attrs.global = (attrs.global_routing as string)?.toLowerCase() === 'true';
      attrs.type = 'dedicated';
      break;

    case 'directLinkVlan':
      // Direct Link VLANs — map to vlans with INTERCONNECT network space
      attrs.vlanNumber = parseInt(attrs.name as string) || undefined;
      attrs.networkSpace = attrs.domain; // INTERCONNECT
      break;

    case 'directLinkRouter':
      attrs.name = attrs.primaryName;
      attrs.networkSpace = attrs.domain; // INTERCONNECT
      break;
  }

  const result: ExtractionResult = { resource: attrs };
  if (Object.keys(extraResources).length > 0) {
    result.extraResources = extraResources;
  }
  return result;
}

/**
 * Enrich gateway resources with member counts and inside VLAN counts
 * derived from topology edges.
 *
 * - implconnection from gateway→baremetal = gateway member (BM hardware)
 * - lanconnection from vlan→gateway = inside VLAN
 */
function enrichGatewaysFromEdges(
  data: Record<string, unknown[]>,
  topology: ReportTopologyEdge[]
): void {
  const gateways = data.gateways as Record<string, unknown>[] | undefined;
  if (!gateways || gateways.length === 0) return;

  // Build gateway lookup by SLO id format: SLO_{id}_gateway
  const gatewayById = new Map<string, Record<string, unknown>>();
  for (const gw of gateways) {
    gatewayById.set(String(gw.id), gw);
  }

  // Count members and inside VLANs per gateway
  const memberCount = new Map<string, number>();
  const insideVlanIds = new Map<string, Set<string>>();

  for (const edge of topology) {
    const sourceId = extractSlId(edge.source);
    const targetId = extractSlId(edge.target);
    const sourceType = edge.sourceType;
    const targetType = edge.targetType;

    // implconnection: gateway → baremetal = member
    if (sourceType === 'gateway' && targetType === 'baremetal' && sourceId) {
      memberCount.set(sourceId, (memberCount.get(sourceId) || 0) + 1);
    }
    if (targetType === 'gateway' && sourceType === 'baremetal' && targetId) {
      memberCount.set(targetId, (memberCount.get(targetId) || 0) + 1);
    }

    // lanconnection: vlan → gateway = inside VLAN
    if (targetType === 'gateway' && sourceType === 'vlan' && targetId && sourceId) {
      if (!insideVlanIds.has(targetId)) insideVlanIds.set(targetId, new Set());
      insideVlanIds.get(targetId)!.add(sourceId);
    }
    if (sourceType === 'gateway' && targetType === 'vlan' && sourceId && targetId) {
      if (!insideVlanIds.has(sourceId)) insideVlanIds.set(sourceId, new Set());
      insideVlanIds.get(sourceId)!.add(targetId);
    }
  }

  // Apply counts to gateway resources
  for (const gw of gateways) {
    const id = String(gw.id);
    const members = memberCount.get(id) || 0;
    const vlans = insideVlanIds.get(id)?.size || 0;
    // Set as raw fields that the transform expects
    gw.members = Array(members).fill({});
    gw.insideVlans = Array(vlans).fill({});
  }
}

/**
 * Enrich VLAN resources with primaryRouter from router→vlan topology edges.
 */
function enrichVlansWithRouter(
  data: Record<string, unknown[]>,
  topology: ReportTopologyEdge[]
): void {
  const vlans = data.vlans as Record<string, unknown>[] | undefined;
  const routers = data.routers as Record<string, unknown>[] | undefined;
  if (!vlans || vlans.length === 0 || !routers || routers.length === 0) return;

  // Build router lookup by id
  const routerById = new Map<string, Record<string, unknown>>();
  for (const r of routers) {
    routerById.set(String(r.id), r);
  }

  // Build vlan→router mapping from edges
  const vlanRouter = new Map<string, string>();
  for (const edge of topology) {
    const sourceId = extractSlId(edge.source);
    const targetId = extractSlId(edge.target);
    const sourceType = edge.sourceType;
    const targetType = edge.targetType;

    if (sourceType === 'router' && targetType === 'vlan' && sourceId && targetId) {
      vlanRouter.set(targetId, sourceId);
    }
    if (targetType === 'router' && sourceType === 'vlan' && targetId && sourceId) {
      vlanRouter.set(sourceId, targetId);
    }
  }

  // Apply router hostname to VLANs
  for (const vlan of vlans) {
    const routerId = vlanRouter.get(String(vlan.id));
    if (routerId) {
      const router = routerById.get(routerId);
      if (router) {
        vlan.primaryRouter = router.name || router.primaryName;
      }
    }
  }
}

/**
 * Extract the SoftLayer ID from an SLO-format node ID.
 * Format: SLO_{sl_id}_{type} → returns sl_id
 */
function extractSlId(nodeId: string): string | null {
  const parts = nodeId.split('_');
  if (parts.length >= 3 && parts[0] === 'SLO') {
    // Everything between SLO_ and _type is the sl_id
    return parts.slice(1, -1).join('_');
  }
  return null;
}

/**
 * Collect tag_* attributes into the tagReferences format expected by flattenTags().
 * Drawio stores tags as tag_12345="value" attributes.
 */
function collectTags(attrs: Record<string, unknown>): { tag: { name: string } }[] {
  const tags: { tag: { name: string } }[] = [];
  for (const [key, val] of Object.entries(attrs)) {
    if (key.startsWith('tag_') && typeof val === 'string') {
      tags.push({ tag: { name: val } });
      delete attrs[key];
    }
  }
  return tags;
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
