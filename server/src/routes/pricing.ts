import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache keyed by region: { data, fetchedAt }
const cache = new Map<string, { data: unknown; fetchedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const CATALOG_BASE = 'https://globalcatalog.cloud.ibm.com/api/v1';
const HOURS_PER_MONTH = 730;

// All VPC regions to fetch pricing for
const VPC_REGIONS = [
  'au-syd', 'br-sao', 'ca-mon', 'ca-tor', 'eu-de', 'eu-es',
  'eu-gb', 'in-che', 'in-mum', 'jp-osa', 'jp-tok', 'us-east', 'us-south',
];

interface CatalogResource {
  id: string;
  name: string;
  children_url?: string;
}

interface CatalogListResponse {
  resources: CatalogResource[];
  next?: string;
}

interface PricingMetric {
  part_ref?: string;
  metric_id?: string;
  amounts?: Array<{
    country?: string;
    currency?: string;
    prices?: Array<{
      quantity_tier?: number;
      price?: number;
    }>;
  }>;
}

interface DeploymentPricing {
  metrics?: PricingMetric[];
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

function extractHourlyRate(metrics: PricingMetric[], metricId: string): number | null {
  const metric = metrics.find((m) =>
    m.metric_id === metricId || m.part_ref?.includes(metricId)
  );
  if (!metric?.amounts) return null;

  // Prefer USD pricing
  const usd = metric.amounts.find((a) => a.currency === 'USD');
  const amount = usd ?? metric.amounts[0];
  if (!amount?.prices?.length) return null;

  // Use the first (lowest) tier price
  return amount.prices[0]?.price ?? null;
}

/**
 * Find a catalog service by name using kind:service filter.
 */
async function findService(serviceName: string): Promise<CatalogResource | null> {
  const url = `${CATALOG_BASE}?q=kind:service+${serviceName}`;
  const result = await fetchJson(url) as CatalogListResponse;
  return result.resources?.find((r) => r.name === serviceName) ?? null;
}

/**
 * Paginate through all children (plans) of a catalog service.
 */
async function fetchAllPlans(childrenUrl: string): Promise<CatalogResource[]> {
  const plans: CatalogResource[] = [];
  let offset = 0;
  const seen = new Set<string>();

  for (;;) {
    const separator = childrenUrl.includes('?') ? '&' : '?';
    const url = `${childrenUrl}${separator}_offset=${offset}`;
    const page = await fetchJson(url) as CatalogListResponse;
    if (!page.resources?.length) break;

    let addedAny = false;
    for (const r of page.resources) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        plans.push(r);
        addedAny = true;
      }
    }

    if (!addedAny || plans.length >= (page as unknown as { count?: number }).count!) break;
    offset += page.resources.length;
  }

  return plans;
}

async function fetchRegionDeploymentPricing(
  plans: CatalogResource[],
  region: string,
): Promise<Record<string, { monthlyCost: number; hourlyRate: number }>> {
  const profiles: Record<string, { monthlyCost: number; hourlyRate: number }> = {};

  for (const plan of plans) {
    if (!plan.children_url) continue;

    let deploymentsResult: CatalogListResponse;
    try {
      deploymentsResult = await fetchJson(plan.children_url) as CatalogListResponse;
    } catch {
      continue;
    }

    const deployment = deploymentsResult.resources?.find(
      (d) => d.name?.includes(region)
    ) ?? deploymentsResult.resources?.[0];
    if (!deployment?.id) continue;

    let pricingData: DeploymentPricing;
    try {
      pricingData = await fetchJson(`${CATALOG_BASE}/${deployment.id}/pricing`) as DeploymentPricing;
    } catch {
      continue;
    }

    if (!pricingData.metrics?.length) continue;

    for (const metric of pricingData.metrics) {
      const ref = metric.part_ref || metric.metric_id || '';
      if (!ref || !metric.amounts?.length) continue;
      const match = ref.match(/([a-z]{2}\d[a-z]?d?c?-\d+x\d+)/);
      if (!match) continue;

      const name = match[1];
      const usd = metric.amounts.find((a) => a.currency === 'USD');
      const amount = usd ?? metric.amounts[0];
      const hourlyPrice = amount?.prices?.[0]?.price;
      if (hourlyPrice != null && hourlyPrice > 0) {
        profiles[name] = {
          monthlyCost: Math.round(hourlyPrice * HOURS_PER_MONTH * 100) / 100,
          hourlyRate: hourlyPrice,
        };
      }
    }
  }

  return profiles;
}

async function fetchCatalogPricing(targetRegion: string): Promise<unknown> {
  // Step 1: Find the is.instance service
  const instanceService = await findService('is.instance');
  if (!instanceService?.children_url) {
    throw new Error('is.instance service not found in Global Catalog');
  }

  // Step 2: Get ALL plans (paginated)
  const allPlans = await fetchAllPlans(instanceService.children_url);
  if (!allPlans.length) {
    throw new Error('No plans found for is.instance');
  }
  logger.info(`Found ${allPlans.length} instance plans in Global Catalog`);

  // Step 3: Fetch pricing for the target region
  const profiles = await fetchRegionDeploymentPricing(allPlans, targetRegion);

  // Step 4: Fetch bare metal server profiles
  const bareMetalProfiles: Record<string, { monthlyCost: number; hourlyRate: number }> = {};
  try {
    const bmService = await findService('is.bare-metal-server');
    if (bmService?.children_url) {
      const bmPlans = await fetchAllPlans(bmService.children_url);
      logger.info(`Found ${bmPlans.length} bare metal server plans in Global Catalog`);
      const bmPricing = await fetchRegionDeploymentPricing(bmPlans, targetRegion);
      Object.assign(bareMetalProfiles, bmPricing);
    }
  } catch (err) {
    logger.warn('Failed to fetch bare metal server pricing from catalog', {
      error: (err as Error).message,
    });
  }

  // Step 5: Fetch storage and network pricing (defaults as fallback)
  const storage = {
    'block-general': 0.10,
    'block-5iops': 0.13,
    'block-10iops': 0.16,
    'file': 0.12,
  };
  const network = {
    'floating-ip': 5.00,
    'vpn-gateway': 99.00,
    'load-balancer': 21.60,
  };

  // Try fetching is.volume pricing
  try {
    const volService = await findService('is.volume');
    if (volService?.children_url) {
      const volPlans = await fetchJson(volService.children_url) as CatalogListResponse;
      for (const plan of volPlans.resources ?? []) {
        if (!plan.children_url) continue;
        const deps = await fetchJson(plan.children_url) as CatalogListResponse;
        const dep = deps.resources?.find((d) => d.name?.includes(targetRegion)) ?? deps.resources?.[0];
        if (!dep?.id) continue;
        const pricing = await fetchJson(`${CATALOG_BASE}/${dep.id}/pricing`) as DeploymentPricing;
        if (!pricing.metrics?.length) continue;
        const gpRate = extractHourlyRate(pricing.metrics, 'general-purpose');
        if (gpRate != null) storage['block-general'] = Math.round(gpRate * HOURS_PER_MONTH * 100) / 100;
        const r5 = extractHourlyRate(pricing.metrics, '5iops');
        if (r5 != null) storage['block-5iops'] = Math.round(r5 * HOURS_PER_MONTH * 100) / 100;
        const r10 = extractHourlyRate(pricing.metrics, '10iops');
        if (r10 != null) storage['block-10iops'] = Math.round(r10 * HOURS_PER_MONTH * 100) / 100;
        break;
      }
    }
  } catch { /* use defaults */ }

  // Try floating-ip pricing
  try {
    const fipService = await findService('is.floating-ip');
    if (fipService?.children_url) {
      const fipPlans = await fetchJson(fipService.children_url) as CatalogListResponse;
      for (const plan of fipPlans.resources ?? []) {
        if (!plan.children_url) continue;
        const deps = await fetchJson(plan.children_url) as CatalogListResponse;
        const dep = deps.resources?.find((d) => d.name?.includes(targetRegion)) ?? deps.resources?.[0];
        if (!dep?.id) continue;
        const pricing = await fetchJson(`${CATALOG_BASE}/${dep.id}/pricing`) as DeploymentPricing;
        const rate = extractHourlyRate(pricing.metrics ?? [], 'floating-ip');
        if (rate != null) network['floating-ip'] = Math.round(rate * HOURS_PER_MONTH * 100) / 100;
        break;
      }
    }
  } catch { /* use defaults */ }

  return {
    generatedAt: new Date().toISOString(),
    region: targetRegion,
    profiles,
    bareMetalProfiles: Object.keys(bareMetalProfiles).length > 0 ? bareMetalProfiles : undefined,
    storage,
    network,
  };
}

async function loadFallbackPricing(): Promise<unknown> {
  const fallbackPath = path.resolve(__dirname, '..', '..', '..', 'src', 'services', 'migration', 'data', 'vpcPricing.json');
  const content = await readFile(fallbackPath, 'utf-8');
  return JSON.parse(content);
}

async function loadRegionalFallbackPricing(): Promise<Record<string, unknown> | null> {
  try {
    // Try project-relative path first (works in both dev and prod)
    const regionalPath = path.resolve(__dirname, '..', '..', '..', 'server', 'src', 'data', 'vpcRegionalPricing.json');
    const content = await readFile(regionalPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    try {
      // Fallback: resolve relative to __dirname (dev layout)
      const altPath = path.resolve(__dirname, '..', 'data', 'vpcRegionalPricing.json');
      const content = await readFile(altPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

/**
 * Resolve fallback pricing for a specific region.
 * First tries the regional fallback file, then falls back to the default (us-south) file.
 */
async function loadRegionSpecificFallback(region: string): Promise<unknown> {
  const regionalData = await loadRegionalFallbackPricing();
  if (regionalData && regionalData[region]) {
    return {
      generatedAt: '2026-03-13T00:00:00.000Z',
      region,
      source: 'fallback-file',
      ...(regionalData[region] as object),
    };
  }
  // Fall back to default us-south pricing
  const fallback = await loadFallbackPricing();
  return { ...(fallback as object), source: 'fallback-file' };
}

router.get('/pricing', async (req: Request, res: Response): Promise<void> => {
  const targetRegion = (req.query.region as string) || 'us-south';

  // Check cache for this region
  const cached = cache.get(targetRegion);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    res.json(cached.data);
    return;
  }

  // Try live catalog
  try {
    const data = await fetchCatalogPricing(targetRegion);
    const result = data as { profiles?: Record<string, { monthlyCost: number }> };
    if (result.profiles && Object.keys(result.profiles).length > 0) {
      // Merge fallback data for profiles missing from the live catalog
      try {
        const fallback = await loadRegionSpecificFallback(targetRegion) as {
          profiles?: Record<string, { monthlyCost: number }>;
        };
        if (fallback.profiles) {
          let merged = 0;
          for (const [name, value] of Object.entries(fallback.profiles)) {
            if (!result.profiles[name]) {
              result.profiles[name] = value;
              merged++;
            }
          }
          if (merged > 0) {
            logger.info(`Merged ${merged} profiles from fallback file into live catalog data for ${targetRegion}`);
          }
        }
      } catch { /* fallback merge is best-effort */ }

      // Add regional pricing from fallback for other regions (so frontend can switch regions client-side)
      const regionalData = await loadRegionalFallbackPricing();
      const enriched = {
        ...(data as object),
        source: 'live-catalog',
        regionalPricing: regionalData ?? undefined,
      };
      cache.set(targetRegion, { data: enriched, fetchedAt: Date.now() });
      logger.info(`VPC pricing fetched from Global Catalog for ${targetRegion}`, {
        profileCount: Object.keys(result.profiles).length,
      });
      res.json(enriched);
      return;
    }
    logger.warn(`Global Catalog returned no extractable profile pricing for ${targetRegion}, using fallback`);
  } catch (err) {
    logger.warn(`Failed to fetch from Global Catalog for ${targetRegion}, using fallback`, {
      error: (err as Error).message,
    });
  }

  // Fallback to static JSON
  try {
    const fallback = await loadRegionSpecificFallback(targetRegion);
    const regionalData = await loadRegionalFallbackPricing();
    const result = { ...(fallback as object), regionalPricing: regionalData ?? undefined };
    cache.set(targetRegion, { data: result, fetchedAt: Date.now() });
    res.json(result);
  } catch (err) {
    logger.error('Failed to load fallback pricing', { error: (err as Error).message });
    res.status(500).json({ error: 'Unable to load VPC pricing data' });
  }
});

export default router;
