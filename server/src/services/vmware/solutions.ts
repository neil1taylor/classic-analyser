import type { VMwareClient } from './client.js';
import type { VMwareInstance, VMwareCluster, VMwareHost, VMwareVlan, VMwareSubnet, VMwareNetworkResult } from './types.js';
import logger from '../../utils/logger.js';

const VCF_CLASSIC_V2 = 'https://api.vmware-solutions.cloud.ibm.com/v2';
const VCF_CLASSIC_V1 = 'https://api.vmware-solutions.cloud.ibm.com/v1';
const GLOBAL_SEARCH_URL = 'https://api.global-search-tagging.cloud.ibm.com/v3/resources/search';

interface SearchResult {
  crn?: string;
  name?: string;
  type?: string;
  family?: string;
  resource_id?: string;
  [key: string]: unknown;
}

/**
 * Discover VMware instances via IBM Cloud Global Search API.
 * The VMware Solutions API has no list endpoint — only GET by ID.
 * Global Search finds resources of type "vmware-solutions".
 */
async function searchVMwareResources(client: VMwareClient): Promise<SearchResult[]> {
  try {
    const token = await client.exchangeToken();
    const response = await fetch(`${GLOBAL_SEARCH_URL}?limit=100`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'type:vmware-solutions',
        fields: ['crn', 'name', 'type', 'family', 'resource_id', 'region', 'account_id'],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn('Global Search API error', {
        statusCode: response.status,
        body: body.substring(0, 300),
      });
      return [];
    }

    const data = await response.json() as { items?: SearchResult[] };
    logger.info('Global Search: VMware resources found', {
      count: data.items?.length ?? 0,
      names: data.items?.map((i) => i.name).filter(Boolean),
    });
    return data.items ?? [];
  } catch (err) {
    const error = err as Error;
    logger.warn('Global Search API failed', { message: error.message });
    return [];
  }
}

/**
 * Extract the VMware instance ID (UUID) from a CRN.
 * CRN format: crn:v1:cname:ctype:service-name:location:scope:service-instance:resource-type:resource
 * Example:    crn:v1:bluemix:public:vmware-solutions:global:a/ACCT:UUID::
 * The service-instance (index 7) contains the UUID.
 */
function extractInstanceId(crn: string): string | null {
  const parts = crn.split(':');
  // Service-instance is at index 7 in the standard CRN format
  if (parts.length >= 8 && parts[7]) {
    return parts[7];
  }
  // Fallback: try last non-empty part
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i]) return parts[i];
  }
  return null;
}

/**
 * Result from getVMwareInstances: instances + embedded clusters extracted
 * from the GET /v2/vcenters (list) or /v2/vcenters/{id} (detail) response.
 * Clusters are inline in the detail response — no separate API call needed.
 */
export interface VMwareInstancesResult {
  instances: VMwareInstance[];
  clusters: VMwareCluster[];
}

export async function getVMwareInstances(client: VMwareClient): Promise<VMwareInstancesResult> {
  const result: VMwareInstancesResult = { instances: [], clusters: [] };

  try {
    // Try the v2 list endpoint first (returns {"vcenters": [...]})
    let instanceIds: string[] = [];
    try {
      const data = await client.request<unknown>(
        'GET',
        `${VCF_CLASSIC_V2}/vcenters`
      );

      // Extract array from response (direct array or wrapped in "vcenters" key)
      let items: Record<string, unknown>[] = [];
      if (Array.isArray(data)) {
        items = data as Record<string, unknown>[];
      } else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        // Prefer "vcenters" key, then fall back to first array found
        if (Array.isArray(obj.vcenters)) {
          items = obj.vcenters as Record<string, unknown>[];
        } else {
          for (const value of Object.values(obj)) {
            if (Array.isArray(value)) {
              items = value as Record<string, unknown>[];
              break;
            }
          }
        }
      }

      if (items.length > 0) {
        logger.info('VCF for Classic: list endpoint returned instances', { count: items.length });
        instanceIds = items.map((inst) => String(inst.id ?? '')).filter(Boolean);

        // The list endpoint returns summary data — store as baseline
        for (const inst of items) {
          const id = String(inst.id ?? '');
          result.instances.push({ ...inst, id } as VMwareInstance);
        }
      } else {
        logger.info('VCF for Classic: list endpoint returned empty vcenters array', {
          dataType: typeof data,
          isArray: Array.isArray(data),
          keys: data && typeof data === 'object' && !Array.isArray(data)
            ? Object.keys(data as Record<string, unknown>)
            : [],
          vcenterArrayLen: data && typeof data === 'object' && !Array.isArray(data)
            ? ((data as Record<string, unknown>).vcenters as unknown[] | undefined)?.length
            : undefined,
        });
      }
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      logger.warn('VCF for Classic: list endpoint not available', {
        statusCode: error.statusCode,
        message: error.message,
      });
    }

    // If list endpoint returned no instances, fall back to Global Search
    if (instanceIds.length === 0) {
      const resources = await searchVMwareResources(client);
      if (resources.length === 0) {
        logger.info('No VMware instances found via list or Global Search');
        return result;
      }

      // Filter to only vCenter instances (exclude HCX licenses, etc.)
      // vCenter IDs are UUIDs; non-vCenter IDs start with "prod-" or similar
      const vcenterResources = resources.filter((r) => {
        if (!r.crn) return false;
        const id = extractInstanceId(r.crn);
        if (!id) return false;
        // UUID pattern: 8-4-4-4-12 hex chars
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (!isUUID) {
          logger.debug('Global Search: skipping non-vCenter resource', {
            name: r.name,
            id,
          });
        }
        return isUUID;
      });

      if (vcenterResources.length === 0) {
        logger.info('Global Search found VMware resources but none are vCenter instances', {
          totalFound: resources.length,
          names: resources.map((r) => r.name),
        });
        return result;
      }

      instanceIds = vcenterResources
        .map((r) => extractInstanceId(r.crn!))
        .filter((id): id is string => !!id);

      // Store basic info from search results
      for (const resource of vcenterResources) {
        const instanceId = extractInstanceId(resource.crn!);
        if (!instanceId) continue;
        result.instances.push({
          id: instanceId,
          name: resource.name,
          type: resource.type,
          crn: resource.crn,
        } as VMwareInstance);
      }
    }

    // Fetch full detail for each instance via v1 (includes embedded clusters)
    const detailedInstances: VMwareInstance[] = [];
    for (const instanceId of instanceIds) {
      try {
        const detail = await client.request<Record<string, unknown>>(
          'GET',
          `${VCF_CLASSIC_V1}/vcenters/${instanceId}`
        );
        if (detail && typeof detail === 'object') {
          // Verify this looks like a real vCenter response (has name or status)
          if (detail.name || detail.status || detail.clusters) {
            detailedInstances.push({ ...detail, id: instanceId } as VMwareInstance);
            extractClustersFromInstance(instanceId, detail, result.clusters);
          } else {
            logger.debug('VCF for Classic: detail response has no vCenter fields, skipping', {
              instanceId,
              keys: Object.keys(detail).slice(0, 10),
            });
          }
        }
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 404 || error.statusCode === 403) {
          // Instance not found or not accessible — don't include search summary
          logger.debug('VCF for Classic: instance not accessible via detail API', {
            instanceId,
            statusCode: error.statusCode,
          });
        } else {
          logger.warn('Failed to fetch VMware instance detail', {
            instanceId,
            statusCode: error.statusCode,
            message: error.message,
          });
          // Keep summary entry only for unexpected errors (network, 500, etc.)
          const existing = result.instances.find((i) => i.id === instanceId);
          if (existing) detailedInstances.push(existing);
        }
      }
    }

    // Replace summary instances with verified detailed ones
    result.instances = detailedInstances;

    logger.info('Collected VMware instances', {
      instances: result.instances.length,
      clusters: result.clusters.length,
    });

    return result;
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to collect VMware instances', { message: error.message });
    return result;
  }
}

/**
 * Extract clusters embedded in a vCenter instance response.
 * The GET /v1/vcenters/{id} response includes clusters inline.
 */
function extractClustersFromInstance(
  instanceId: string,
  instanceData: Record<string, unknown>,
  out: VMwareCluster[]
): void {
  const clusters = instanceData.clusters;
  if (!Array.isArray(clusters)) return;

  for (const c of clusters as Record<string, unknown>[]) {
    out.push({
      ...c,
      id: c.cluster_id ?? c.id,
      name: c.cluster_name ?? c.name,
      instance_id: instanceId,
      datacenter: c.location,
      host_count: c.num_hosts,
      status: c.state,
      storage_type: c.storage_type,
    } as VMwareCluster);
  }
}

/**
 * Fetch clusters for a specific VMware instance via separate API call.
 * Fallback in case clusters are not embedded in the instance response.
 */
export async function getVMwareClusters(
  client: VMwareClient,
  instanceId: string
): Promise<VMwareCluster[]> {
  try {
    const data = await client.request<unknown>(
      'GET',
      `${VCF_CLASSIC_V1}/vcenters/${instanceId}/clusters`
    );
    let raw: VMwareCluster[] = [];
    if (Array.isArray(data)) {
      raw = data as VMwareCluster[];
    } else if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
          raw = value as VMwareCluster[];
          break;
        }
      }
    }
    const clusters = raw.map((c) => ({
      ...c,
      instance_id: instanceId,
    }));
    logger.info('Collected VMware clusters for instance', {
      instanceId,
      count: clusters.length,
    });
    return clusters;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.debug('VMware clusters endpoint not available for instance', { instanceId, statusCode: error.statusCode });
    } else {
      logger.warn('Failed to collect VMware clusters for instance', { instanceId, message: error.message });
    }
    return [];
  }
}

/**
 * Fetch cluster detail (with hosts) for a specific cluster.
 * GET /v1/vcenters/{instance_id}/clusters/{cluster_id}
 * Returns flattened VMwareHost records — one per ESXi host.
 */
export async function getVMwareClusterHosts(
  client: VMwareClient,
  instanceId: string,
  clusterId: string,
  clusterName: string,
  location: string,
): Promise<VMwareHost[]> {
  try {
    const data = await client.request<Record<string, unknown>>(
      'GET',
      `${VCF_CLASSIC_V1}/vcenters/${instanceId}/clusters/${clusterId}`
    );

    if (!data || typeof data !== 'object') return [];

    // Hosts may be in "hosts", "esxi_hosts", or "nodes"
    let rawHosts: Record<string, unknown>[] = [];
    for (const key of ['hosts', 'esxi_hosts', 'nodes']) {
      if (Array.isArray(data[key])) {
        rawHosts = data[key] as Record<string, unknown>[];
        break;
      }
    }
    // Fallback: any top-level array
    if (rawHosts.length === 0) {
      for (const value of Object.values(data)) {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          rawHosts = value as Record<string, unknown>[];
          break;
        }
      }
    }

    if (rawHosts.length > 0) {
      logger.info('VMware host raw sample', {
        instanceId,
        clusterId,
        topKeys: Object.keys(rawHosts[0]),
      });
    }

    const hosts: VMwareHost[] = rawHosts.map((h) => {
      // Extract nested fields from actual API structure:
      //   name: { hostname: "esxi000", domain: "lontest.ibmcloud.priv" }
      //   public_network: { ip_address: "158.176.129.138" }
      //   private_network: { ip_address: "10.72.158.5" }
      //   system: { cpu_GHz, cpu_count, memory, os, processor, uplink_count }
      const nameObj = h.name as Record<string, unknown> | undefined;
      const pubNet = h.public_network as Record<string, unknown> | undefined;
      const privNet = h.private_network as Record<string, unknown> | undefined;
      const sysObj = h.system as Record<string, unknown> | undefined;

      let hostname = '';
      if (typeof h.fqdn === 'string') {
        hostname = h.fqdn;
      } else if (nameObj && typeof nameObj === 'object') {
        const hn = String(nameObj.hostname ?? '');
        const dom = String(nameObj.domain ?? '');
        hostname = hn && dom ? `${hn}.${dom}` : hn || dom;
      }

      const publicIp = String(
        (pubNet && typeof pubNet === 'object' ? pubNet.ip_address : null) ??
        h.primary_ip ?? h.public_ip ?? h.ip_address ?? ''
      );

      const privateIp = String(
        (privNet && typeof privNet === 'object' ? privNet.ip_address : null) ??
        h.backend_ip ?? h.private_ip ?? ''
      );

      return {
        id: String(h.id ?? ''),
        hostname,
        primaryIp: publicIp,
        backendIp: privateIp,
        hardwareId: h.id != null ? Number(h.id) : undefined,
        status: String(h.state ?? h.status ?? ''),
        version: String(h.version ?? ''),
        memory: sysObj && typeof sysObj === 'object' ? Number(sysObj.memory ?? 0) : undefined,
        cpuCount: sysObj && typeof sysObj === 'object' ? Number(sysObj.cpu_count ?? 0) : undefined,
        os: sysObj && typeof sysObj === 'object' ? String(sysObj.os ?? '') : '',
        clusterId,
        clusterName,
        instanceId,
        location,
      } as VMwareHost;
    });

    logger.info('Collected VMware hosts for cluster', {
      instanceId,
      clusterId,
      count: hosts.length,
    });
    return hosts;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.debug('VMware cluster detail not available', { instanceId, clusterId, statusCode: error.statusCode });
    } else {
      logger.warn('Failed to fetch VMware cluster hosts', { instanceId, clusterId, message: error.message });
    }
    return [];
  }
}

/**
 * Fetch VLANs (and embedded subnets) for a specific VMware cluster.
 * GET /v2/vcenters/{instance_id}/clusters/{cluster_id}/vlans
 * Returns VMwareNetworkResult with both VLANs and flattened subnets.
 */
export async function getVMwareClusterVlans(
  client: VMwareClient,
  instanceId: string,
  clusterId: string,
  clusterName: string,
  location: string,
): Promise<VMwareNetworkResult> {
  const result: VMwareNetworkResult = { vlans: [], subnets: [] };

  try {
    const data = await client.request<unknown>(
      'GET',
      `${VCF_CLASSIC_V2}/vcenters/${instanceId}/clusters/${clusterId}/vlans`
    );

    if (!data || typeof data !== 'object') return result;

    // Response may be a direct array or wrapped in a key
    let rawVlans: Record<string, unknown>[] = [];
    if (Array.isArray(data)) {
      rawVlans = data as Record<string, unknown>[];
    } else {
      const obj = data as Record<string, unknown>;
      for (const key of ['array_vlans', 'vlans', 'network_vlans', 'resources', 'items']) {
        if (Array.isArray(obj[key])) {
          rawVlans = obj[key] as Record<string, unknown>[];
          break;
        }
      }
      if (rawVlans.length === 0) {
        for (const value of Object.values(obj)) {
          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            rawVlans = value as Record<string, unknown>[];
            break;
          }
        }
      }
    }

    if (rawVlans.length > 0) {
      logger.info('VMware VLAN raw sample', {
        instanceId,
        clusterId,
        topKeys: Object.keys(rawVlans[0]),
      });
    }

    for (const v of rawVlans) {
      // Spread all primitive fields
      const vlanPrimitives: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        if (val === null || val === undefined) continue;
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          vlanPrimitives[k] = val;
        }
      }

      const vlanNumber = v.number ?? v.vlan_number ?? v.vlanNumber;
      const vlanId = String(v.id ?? v.number ?? '');
      const vlanName = String(v.name ?? '');
      const vlanType = String(v.purpose ?? v.type ?? v.vlan_type ?? '');

      result.vlans.push({
        ...vlanPrimitives,
        id: vlanId,
        vlanNumber: vlanNumber != null ? Number(vlanNumber) : undefined,
        name: vlanName,
        type: vlanType,
        purpose: String(v.purpose ?? ''),
        primaryRouter: String(v.primary_router ?? v.router ?? v.primaryRouter ?? ''),
        link: String(v.link ?? ''),
        clusterId,
        clusterName,
        instanceId,
        location,
      });

      // Extract subnets embedded in the VLAN
      const subnetsField = v.subnets ?? v.network_subnets ?? v.subnet;
      if (Array.isArray(subnetsField)) {
        for (const s of subnetsField as Record<string, unknown>[]) {
          // Spread all primitive fields from subnet
          const subPrimitives: Record<string, unknown> = {};
          for (const [k, val] of Object.entries(s)) {
            if (val === null || val === undefined) continue;
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
              subPrimitives[k] = val;
            }
          }

          // network_identifier contains CIDR (e.g., "10.242.54.0/25")
          const networkId = String(s.network_identifier ?? s.network ?? '');
          const cidr = String(s.cidr ?? s.cidr_block ?? networkId);

          // Compute netmask from CIDR prefix length if not provided
          let netmask = String(s.netmask ?? s.subnet_mask ?? '');
          if (!netmask && cidr.includes('/')) {
            const prefix = parseInt(cidr.split('/')[1], 10);
            if (!isNaN(prefix)) {
              const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
              netmask = `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
            }
          }

          // Extract subnet ID from link URL (e.g., ".../subnets/2621520" → "2621520")
          let subnetId = String(s.id ?? s.subnet_id ?? '');
          if (!subnetId && typeof s.link === 'string') {
            const linkMatch = (s.link as string).match(/subnets\/(\d+)/);
            if (linkMatch) subnetId = linkMatch[1];
          }
          if (!subnetId) subnetId = networkId;

          result.subnets.push({
            ...subPrimitives,
            id: subnetId,
            cidr,
            networkIdentifier: networkId,
            netmask,
            gateway: String(s.gateway ?? s.gateway_ip ?? ''),
            subnetType: String(s.subnet_type ?? s.type ?? ''),
            purpose: String(s.purpose ?? ''),
            vlanNumber: vlanNumber != null ? Number(vlanNumber) : undefined,
            vlanId,
            vlanName,
            clusterId,
            clusterName,
            instanceId,
            location,
          });
        }
      }
    }

    logger.info('Collected VMware network for cluster', {
      instanceId,
      clusterId,
      vlans: result.vlans.length,
      subnets: result.subnets.length,
    });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.debug('VMware cluster VLANs not available', { instanceId, clusterId, statusCode: error.statusCode });
    } else {
      logger.warn('Failed to fetch VMware cluster VLANs', { instanceId, clusterId, message: error.message });
    }
    return result;
  }
}
