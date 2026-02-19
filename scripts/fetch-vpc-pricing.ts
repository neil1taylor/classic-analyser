/**
 * Standalone script to fetch VPC instance pricing from the IBM Cloud Global Catalog API
 * and write it to src/services/migration/data/vpcPricing.json.
 *
 * Usage: npx tsx scripts/fetch-vpc-pricing.ts
 *
 * The Global Catalog API is public and requires no authentication.
 */

import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_BASE = 'https://globalcatalog.cloud.ibm.com/api/v1';
const HOURS_PER_MONTH = 730;
const OUTPUT_PATH = path.resolve(__dirname, '..', 'src', 'services', 'migration', 'data', 'vpcPricing.json');

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
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

function extractHourlyRate(metrics: PricingMetric[], metricId: string): number | null {
  const metric = metrics.find((m) =>
    m.metric_id === metricId || m.part_ref?.includes(metricId)
  );
  if (!metric?.amounts) return null;
  const usd = metric.amounts.find((a) => a.currency === 'USD');
  const amount = usd ?? metric.amounts[0];
  if (!amount?.prices?.length) return null;
  return amount.prices[0]?.price ?? null;
}

async function fetchServicePricing(serviceName: string): Promise<{ deploymentId: string; pricing: DeploymentPricing } | null> {
  const result = await fetchJson(`${CATALOG_BASE}?q=${serviceName}&include=*`) as CatalogListResponse;
  const service = result.resources?.find((r) => r.name === serviceName);
  if (!service?.children_url) return null;

  const plans = await fetchJson(service.children_url) as CatalogListResponse;
  for (const plan of plans.resources ?? []) {
    if (!plan.children_url) continue;
    const deps = await fetchJson(plan.children_url) as CatalogListResponse;
    const dep = deps.resources?.find((d) => d.name?.includes('us-south')) ?? deps.resources?.[0];
    if (!dep?.id) continue;
    const pricing = await fetchJson(`${CATALOG_BASE}/${dep.id}/pricing`) as DeploymentPricing;
    if (pricing.metrics?.length) {
      return { deploymentId: dep.id, pricing };
    }
  }
  return null;
}

async function main() {
  console.log('Fetching VPC pricing from IBM Cloud Global Catalog...\n');

  const profiles: Record<string, { monthlyCost: number }> = {};

  // Fetch is.instance pricing
  console.log('1. Fetching is.instance (VPC VSI profiles)...');
  try {
    const serviceUrl = `${CATALOG_BASE}?q=is.instance&include=*`;
    const serviceResult = await fetchJson(serviceUrl) as CatalogListResponse;
    const instanceService = serviceResult.resources?.find((r) => r.name === 'is.instance');

    if (instanceService?.children_url) {
      const plansResult = await fetchJson(instanceService.children_url) as CatalogListResponse;
      console.log(`   Found ${plansResult.resources?.length ?? 0} plans`);

      for (const plan of plansResult.resources ?? []) {
        if (!plan.children_url) continue;

        let deploymentsResult: CatalogListResponse;
        try {
          deploymentsResult = await fetchJson(plan.children_url) as CatalogListResponse;
        } catch { continue; }

        const deployment = deploymentsResult.resources?.find(
          (d) => d.name?.includes('us-south')
        ) ?? deploymentsResult.resources?.[0];
        if (!deployment?.id) continue;

        const pricingUrl = `${CATALOG_BASE}/${deployment.id}/pricing`;
        let pricingData: DeploymentPricing;
        try {
          pricingData = await fetchJson(pricingUrl) as DeploymentPricing;
        } catch { continue; }

        if (!pricingData.metrics?.length) continue;

        for (const metric of pricingData.metrics) {
          const ref = metric.part_ref || metric.metric_id || '';
          if (!ref || !metric.amounts?.length) continue;
          const match = ref.match(/([a-z]{2}\d[a-z]?-\d+x\d+)/);
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
    }
  } catch (err) {
    console.error('   Error fetching is.instance:', (err as Error).message);
  }
  console.log(`   Extracted pricing for ${Object.keys(profiles).length} profiles`);

  // Storage pricing
  const storage = {
    'block-general': 0.10,
    'block-5iops': 0.13,
    'block-10iops': 0.20,
    'file': 0.12,
  };

  console.log('2. Fetching is.volume (block storage)...');
  try {
    const vol = await fetchServicePricing('is.volume');
    if (vol?.pricing.metrics) {
      const gp = extractHourlyRate(vol.pricing.metrics, 'general-purpose');
      if (gp != null) storage['block-general'] = Math.round(gp * HOURS_PER_MONTH * 100) / 100;
      const r5 = extractHourlyRate(vol.pricing.metrics, '5iops');
      if (r5 != null) storage['block-5iops'] = Math.round(r5 * HOURS_PER_MONTH * 100) / 100;
      const r10 = extractHourlyRate(vol.pricing.metrics, '10iops');
      if (r10 != null) storage['block-10iops'] = Math.round(r10 * HOURS_PER_MONTH * 100) / 100;
      console.log('   Storage pricing updated from catalog');
    }
  } catch (err) {
    console.log('   Using default storage prices:', (err as Error).message);
  }

  // Network pricing
  const network = {
    'floating-ip': 5.00,
    'vpn-gateway': 90.00,
    'load-balancer': 22.00,
  };

  console.log('3. Fetching is.floating-ip...');
  try {
    const fip = await fetchServicePricing('is.floating-ip');
    if (fip?.pricing.metrics) {
      const rate = extractHourlyRate(fip.pricing.metrics, 'floating-ip');
      if (rate != null) network['floating-ip'] = Math.round(rate * HOURS_PER_MONTH * 100) / 100;
      console.log('   Floating IP pricing updated');
    }
  } catch (err) {
    console.log('   Using default floating-ip price:', (err as Error).message);
  }

  console.log('4. Fetching is.vpn...');
  try {
    const vpn = await fetchServicePricing('is.vpn');
    if (vpn?.pricing.metrics) {
      const rate = extractHourlyRate(vpn.pricing.metrics, 'vpn');
      if (rate != null) network['vpn-gateway'] = Math.round(rate * HOURS_PER_MONTH * 100) / 100;
      console.log('   VPN pricing updated');
    }
  } catch (err) {
    console.log('   Using default VPN price:', (err as Error).message);
  }

  console.log('5. Fetching is.load-balancer...');
  try {
    const lb = await fetchServicePricing('is.load-balancer');
    if (lb?.pricing.metrics) {
      const rate = extractHourlyRate(lb.pricing.metrics, 'load-balancer');
      if (rate != null) network['load-balancer'] = Math.round(rate * HOURS_PER_MONTH * 100) / 100;
      console.log('   Load Balancer pricing updated');
    }
  } catch (err) {
    console.log('   Using default LB price:', (err as Error).message);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    region: 'us-south',
    profiles,
    storage,
    network,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`\nWritten to ${OUTPUT_PATH}`);
  console.log(`  Profiles: ${Object.keys(profiles).length}`);
  console.log(`  Storage tiers: ${Object.keys(storage).length}`);
  console.log(`  Network resources: ${Object.keys(network).length}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
