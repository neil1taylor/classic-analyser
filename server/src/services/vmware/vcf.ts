import type { VMwareClient } from './client.js';
import type {
  DirectorSite,
  PVDC,
  VCFCluster,
  VDC,
  MultitenantDirectorSite,
} from './types.js';
import logger from '../../utils/logger.js';

/**
 * VCF as a Service uses a **regional** base URL:
 *   https://api.{region}.vmware.cloud.ibm.com/v1
 *
 * This is different from the VCF for Classic API which uses
 * api.vmware-solutions.cloud.ibm.com. We auto-discover the
 * working region by probing known IBM Cloud regions in parallel.
 */
const VCF_REGIONS = [
  'us-south',
  'us-east',
  'eu-de',
  'eu-gb',
  'eu-es',
  'eu-fr2',
  'jp-tok',
  'jp-osa',
  'au-syd',
  'ca-tor',
  'br-sao',
];

function vcfBaseUrl(region: string): string {
  return `https://api.${region}.vmware.cloud.ibm.com/v1`;
}

// Cache the discovered base URL so subsequent calls skip discovery
let discoveredBaseUrl: string | null = null;

/**
 * Discover the VCF as a Service base URL by probing regions in parallel.
 * Uses the /director_site_regions endpoint as a lightweight probe.
 * Returns immediately when the first region responds successfully,
 * without waiting for slower regions to finish or retry.
 */
async function discoverVcfBase(client: VMwareClient): Promise<string | null> {
  if (discoveredBaseUrl) return discoveredBaseUrl;

  logger.info('VCF as a Service: probing regions', { regions: VCF_REGIONS });

  // Use a lightweight probe: single fetch with short timeout, no retries
  const probeRegion = async (region: string): Promise<string> => {
    const base = vcfBaseUrl(region);
    const token = await client.exchangeToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${base}/director_site_regions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      // Any response (even 403) means the regional endpoint exists
      if (response.ok || response.status !== 404) {
        return base;
      }
      throw new Error(`Region ${region} returned 404`);
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    // Promise.any resolves with the first successful probe
    discoveredBaseUrl = await Promise.any(VCF_REGIONS.map(probeRegion));
    logger.info('VCF as a Service: discovered regional endpoint', { baseUrl: discoveredBaseUrl });
    return discoveredBaseUrl;
  } catch {
    // AggregateError: all regions failed
    logger.warn('VCF as a Service: no regional endpoint found across all regions');
    return null;
  }
}

/**
 * Extract array from API response that may be:
 * - A direct array: [...]
 * - Wrapped in a known key: { "key": [...] }
 * - Wrapped in an unknown key: { "some_other_key": [...] }
 */
function extractArray<T>(data: unknown, ...preferredKeys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of preferredKeys) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

export async function getDirectorSites(client: VMwareClient): Promise<DirectorSite[]> {
  try {
    const base = await discoverVcfBase(client);
    if (!base) return [];

    const data = await client.request<unknown>(
      'GET',
      `${base}/director_sites`
    );
    const sites = extractArray<DirectorSite>(data, 'director_sites', 'resources', 'items');
    logger.info('Collected VCF director sites', {
      count: sites.length,
      responseType: Array.isArray(data) ? 'array' : typeof data,
      topKeys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data as Record<string, unknown>) : [],
    });
    return sites;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('No access to VCF as a Service API (director_sites)', { statusCode: error.statusCode });
    } else {
      logger.warn('Failed to collect VCF director sites', { message: error.message, statusCode: error.statusCode });
    }
    return [];
  }
}

export async function getDirectorSitePvdcs(
  client: VMwareClient,
  siteId: string
): Promise<PVDC[]> {
  try {
    const base = discoveredBaseUrl;
    if (!base) return [];

    const data = await client.request<unknown>(
      'GET',
      `${base}/director_sites/${siteId}/pvdcs`
    );
    const raw = extractArray<PVDC>(data, 'pvdcs', 'resources', 'items');
    const pvdcs = raw.map((p) => ({
      ...p,
      director_site_id: siteId,
    }));
    logger.info('Collected PVDCs for director site', { siteId, count: pvdcs.length });
    return pvdcs;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('No access to PVDCs for director site', { siteId, statusCode: error.statusCode });
    } else {
      logger.warn('Failed to collect PVDCs for director site', { siteId, message: error.message });
    }
    return [];
  }
}

export async function getPvdcClusters(
  client: VMwareClient,
  siteId: string,
  pvdcId: string
): Promise<VCFCluster[]> {
  try {
    const base = discoveredBaseUrl;
    if (!base) return [];

    const data = await client.request<unknown>(
      'GET',
      `${base}/director_sites/${siteId}/pvdcs/${pvdcId}/clusters`
    );
    const raw = extractArray<VCFCluster>(data, 'clusters', 'resources', 'items');
    const clusters = raw.map((c) => ({
      ...c,
      pvdc_id: pvdcId,
      director_site_id: siteId,
    }));
    logger.info('Collected VCF clusters for PVDC', { siteId, pvdcId, count: clusters.length });
    return clusters;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('No access to VCF clusters for PVDC', { siteId, pvdcId, statusCode: error.statusCode });
    } else {
      logger.warn('Failed to collect VCF clusters for PVDC', { siteId, pvdcId, message: error.message });
    }
    return [];
  }
}

export async function getVDCs(client: VMwareClient): Promise<VDC[]> {
  try {
    const base = discoveredBaseUrl;
    if (!base) return [];

    const data = await client.request<unknown>(
      'GET',
      `${base}/vdcs`
    );
    const vdcs = extractArray<VDC>(data, 'vdcs', 'resources', 'items');
    logger.info('Collected VDCs', {
      count: vdcs.length,
      responseType: Array.isArray(data) ? 'array' : typeof data,
      topKeys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data as Record<string, unknown>) : [],
    });
    return vdcs;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('No access to VDCs API', { statusCode: error.statusCode });
    } else {
      logger.warn('Failed to collect VDCs', { message: error.message, statusCode: error.statusCode });
    }
    return [];
  }
}

export async function getMultitenantDirectorSites(client: VMwareClient): Promise<MultitenantDirectorSite[]> {
  try {
    const base = discoveredBaseUrl;
    if (!base) return [];

    const data = await client.request<unknown>(
      'GET',
      `${base}/multitenant_director_sites`
    );
    const sites = extractArray<MultitenantDirectorSite>(data, 'multitenant_director_sites', 'resources', 'items');
    logger.info('Collected multitenant director sites', {
      count: sites.length,
      responseType: Array.isArray(data) ? 'array' : typeof data,
      topKeys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data as Record<string, unknown>) : [],
    });
    return sites;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('No access to multitenant director sites', { statusCode: error.statusCode });
    } else {
      logger.warn('Failed to collect multitenant director sites', { message: error.message, statusCode: error.statusCode });
    }
    return [];
  }
}

/**
 * Pre-discover the VCF as a Service regional endpoint.
 * Call this before invoking any VCF functions in parallel.
 * Returns the discovered base URL or null if no region is available.
 */
export async function discoverVcfRegion(client: VMwareClient): Promise<string | null> {
  return discoverVcfBase(client);
}

/** Reset the cached base URL (useful for testing or when API key changes). */
export function resetVcfBaseUrl(): void {
  discoveredBaseUrl = null;
}
