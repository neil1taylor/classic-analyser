import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache: { data, fetchedAt }
let cache: { data: unknown; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const CATALOG_BASE = 'https://globalcatalog.cloud.ibm.com/api/v1';
const HOURS_PER_MONTH = 730;

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
 * The text-only query (e.g. ?q=is.instance) returns individual profiles
 * instead of the parent service — adding kind:service narrows to the service entry.
 */
async function findService(serviceName: string): Promise<CatalogResource | null> {
  const url = `${CATALOG_BASE}?q=kind:service+${serviceName}`;
  const result = await fetchJson(url) as CatalogListResponse;
  return result.resources?.find((r) => r.name === serviceName) ?? null;
}

/**
 * Paginate through all children (plans) of a catalog service.
 * The Global Catalog uses `_offset` for pagination and caps at 50 per page.
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

    // Stop if we've collected all or this page added nothing new (pagination stalled)
    if (!addedAny || plans.length >= (page as unknown as { count?: number }).count!) break;
    offset += page.resources.length;
  }

  return plans;
}

async function fetchCatalogPricing(): Promise<unknown> {
  // Step 1: Find the is.instance service (kind:service filter is critical)
  const instanceService = await findService('is.instance');
  if (!instanceService?.children_url) {
    throw new Error('is.instance service not found in Global Catalog');
  }

  // Step 2: Get ALL plans (paginated — 119+ plans across multiple pages)
  const allPlans = await fetchAllPlans(instanceService.children_url);
  if (!allPlans.length) {
    throw new Error('No plans found for is.instance');
  }
  logger.info(`Found ${allPlans.length} instance plans in Global Catalog`);

  // Step 3: For each plan, find us-south deployment and extract instance-hour pricing.
  // The metric_id pattern is: part-is.instance-hours-{profileName}
  // Dedicated host metrics (dh-) are $0 and should be skipped.
  const profiles: Record<string, { monthlyCost: number }> = {};

  for (const plan of allPlans) {
    if (!plan.children_url) continue;

    let deploymentsResult: CatalogListResponse;
    try {
      deploymentsResult = await fetchJson(plan.children_url) as CatalogListResponse;
    } catch {
      continue;
    }

    // Find us-south deployment (or any deployment as fallback)
    const deployment = deploymentsResult.resources?.find(
      (d) => d.name?.includes('us-south')
    ) ?? deploymentsResult.resources?.[0];
    if (!deployment?.id) continue;

    // Fetch pricing for this deployment
    let pricingData: DeploymentPricing;
    try {
      pricingData = await fetchJson(`${CATALOG_BASE}/${deployment.id}/pricing`) as DeploymentPricing;
    } catch {
      continue;
    }

    if (!pricingData.metrics?.length) continue;

    // Extract profile pricing by scanning all metrics and matching profile names via regex.
    // Use || instead of ?? because part_ref is often "" (empty string), which ?? treats
    // as non-nullish, preventing metric_id from being checked.
    for (const metric of pricingData.metrics) {
      const ref = metric.part_ref || metric.metric_id || '';
      if (!ref || !metric.amounts?.length) continue;
      const match = ref.match(/([a-z]{2}\d[a-z]?d?-\d+x\d+)/);
      if (!match) continue;

      const name = match[1];
      const usd = metric.amounts.find((a) => a.currency === 'USD');
      const amount = usd ?? metric.amounts[0];
      const hourlyPrice = amount?.prices?.[0]?.price;
      if (hourlyPrice != null && hourlyPrice > 0) {
        profiles[name] = { monthlyCost: Math.round(hourlyPrice * HOURS_PER_MONTH * 100) / 100 };
      }
    }
  }

  // Step 4: Fetch bare metal server profiles (is.bare-metal-server)
  const bareMetalProfiles: Record<string, { monthlyCost: number }> = {};
  try {
    const bmService = await findService('is.bare-metal-server');
    if (bmService?.children_url) {
      const bmPlans = await fetchAllPlans(bmService.children_url);
      logger.info(`Found ${bmPlans.length} bare metal server plans in Global Catalog`);

      for (const plan of bmPlans) {
        if (!plan.children_url) continue;

        let deploymentsResult: CatalogListResponse;
        try {
          deploymentsResult = await fetchJson(plan.children_url) as CatalogListResponse;
        } catch {
          continue;
        }

        const deployment = deploymentsResult.resources?.find(
          (d) => d.name?.includes('us-south')
        ) ?? deploymentsResult.resources?.[0];
        if (!deployment?.id) continue;

        let pricingData: DeploymentPricing;
        try {
          pricingData = await fetchJson(`${CATALOG_BASE}/${deployment.id}/pricing`) as DeploymentPricing;
        } catch {
          continue;
        }

        if (!pricingData.metrics?.length) continue;

        // Same regex-based extraction for bare metal profiles
        for (const metric of pricingData.metrics) {
          const ref = metric.part_ref || metric.metric_id || '';
          if (!ref || !metric.amounts?.length) continue;
          const match = ref.match(/([a-z]{2}\d[a-z]?d?-\d+x\d+)/);
          if (!match) continue;

          const name = match[1];
          const usd = metric.amounts.find((a) => a.currency === 'USD');
          const amount = usd ?? metric.amounts[0];
          const hourlyPrice = amount?.prices?.[0]?.price;
          if (hourlyPrice != null && hourlyPrice > 0) {
            bareMetalProfiles[name] = { monthlyCost: Math.round(hourlyPrice * HOURS_PER_MONTH * 100) / 100 };
          }
        }
      }
    }
  } catch (err) {
    logger.warn('Failed to fetch bare metal server pricing from catalog', {
      error: (err as Error).message,
    });
  }

  // Also try to fetch storage and network pricing
  const storage = {
    'block-general': 0.10,
    'block-5iops': 0.13,
    'block-10iops': 0.20,
    'file': 0.12,
  };
  const network = {
    'floating-ip': 5.00,
    'vpn-gateway': 90.00,
    'load-balancer': 22.00,
  };

  // Try fetching is.volume pricing (same kind:service fix)
  try {
    const volService = await findService('is.volume');
    if (volService?.children_url) {
      const volPlans = await fetchJson(volService.children_url) as CatalogListResponse;
      for (const plan of volPlans.resources ?? []) {
        if (!plan.children_url) continue;
        const deps = await fetchJson(plan.children_url) as CatalogListResponse;
        const dep = deps.resources?.find((d) => d.name?.includes('us-south')) ?? deps.resources?.[0];
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

  // Try floating-ip pricing (same kind:service fix)
  try {
    const fipService = await findService('is.floating-ip');
    if (fipService?.children_url) {
      const fipPlans = await fetchJson(fipService.children_url) as CatalogListResponse;
      for (const plan of fipPlans.resources ?? []) {
        if (!plan.children_url) continue;
        const deps = await fetchJson(plan.children_url) as CatalogListResponse;
        const dep = deps.resources?.find((d) => d.name?.includes('us-south')) ?? deps.resources?.[0];
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
    region: 'us-south',
    profiles,
    bareMetalProfiles: Object.keys(bareMetalProfiles).length > 0 ? bareMetalProfiles : undefined,
    storage,
    network,
  };
}

async function loadFallbackPricing(): Promise<unknown> {
  // Resolve path relative to the project root
  // In dev: server/src/routes/ → ../../.. → project root → src/services/migration/data/
  // In prod: server/dist/routes/ → ../../.. → project root → src/services/migration/data/
  const fallbackPath = path.resolve(__dirname, '..', '..', '..', 'src', 'services', 'migration', 'data', 'vpcPricing.json');
  const content = await readFile(fallbackPath, 'utf-8');
  return JSON.parse(content);
}

router.get('/pricing', async (_req: Request, res: Response): Promise<void> => {
  // Check cache first
  if (cache && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
    res.json(cache.data);
    return;
  }

  // Try live catalog
  try {
    const data = await fetchCatalogPricing();
    const result = data as { profiles?: Record<string, { monthlyCost: number }> };
    if (result.profiles && Object.keys(result.profiles).length > 0) {
      // Merge fallback data for profiles missing from the live catalog.
      // Older-generation profiles (bx2-*, cx2-*, mx2-*) use per-vCPU/RAM pricing
      // in the catalog (under the gen2-instance aggregate plan) rather than
      // per-profile instance-hours metrics, so the regex extraction won't find them.
      try {
        const fallback = await loadFallbackPricing() as { profiles?: Record<string, { monthlyCost: number }> };
        if (fallback.profiles) {
          let merged = 0;
          for (const [name, value] of Object.entries(fallback.profiles)) {
            if (!result.profiles[name]) {
              result.profiles[name] = value;
              merged++;
            }
          }
          if (merged > 0) {
            logger.info(`Merged ${merged} profiles from fallback file into live catalog data`);
          }
        }
      } catch { /* fallback merge is best-effort */ }

      const enriched = { ...(data as object), source: 'live-catalog' };
      cache = { data: enriched, fetchedAt: Date.now() };
      logger.info('VPC pricing fetched from Global Catalog', {
        profileCount: Object.keys(result.profiles).length,
      });
      res.json(enriched);
      return;
    }
    // If no profiles were extracted, fall through to fallback
    logger.warn('Global Catalog returned no extractable profile pricing, using fallback');
  } catch (err) {
    logger.warn('Failed to fetch from Global Catalog, using fallback', {
      error: (err as Error).message,
    });
  }

  // Fallback to static JSON
  try {
    const fallback = { ...(await loadFallbackPricing() as object), source: 'fallback-file' };
    cache = { data: fallback, fetchedAt: Date.now() };
    res.json(fallback);
  } catch (err) {
    logger.error('Failed to load fallback pricing', { error: (err as Error).message });
    res.status(500).json({ error: 'Unable to load VPC pricing data' });
  }
});

export default router;
