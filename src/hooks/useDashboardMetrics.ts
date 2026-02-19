import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';

export interface ResourceMetric {
  dcCount: number;
  subMetrics: string;
}

export interface DistributionEntry {
  group: string;
  value: number;
}

interface DashboardMetrics {
  resourceMetrics: Record<string, ResourceMetric>;
  osDist: DistributionEntry[];
  dcDist: DistributionEntry[];
  cpuDist: DistributionEntry[];
  totalServers: number;
  vmwareOverlap: { esxiHosts: number; vmwareVlans: number; vmwareStorage: number };
}

function getField(item: unknown, field: string): unknown {
  return (item as Record<string, unknown>)[field];
}

function groupByField(items: unknown[], field: string): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const item of items) {
    const val = String(getField(item, field) ?? 'Unknown');
    groups[val] = (groups[val] ?? 0) + 1;
  }
  return groups;
}

function topN(groups: Record<string, number>, n: number): [string, number][] {
  return Object.entries(groups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function simplifyOS(os: string): string {
  const lower = os.toLowerCase();
  if (lower.includes('ubuntu')) return 'Ubuntu';
  if (lower.includes('centos')) return 'CentOS';
  if (lower.includes('red hat') || lower.includes('rhel')) return 'RHEL';
  if (lower.includes('windows')) return 'Windows';
  if (lower.includes('debian')) return 'Debian';
  if (lower.includes('rocky')) return 'Rocky';
  if (lower.includes('alma')) return 'AlmaLinux';
  const firstWord = os.split(/[\s.(/]+/)[0];
  return firstWord || 'Other';
}

export function useDashboardMetrics(): DashboardMetrics {
  const { collectedData } = useData();

  return useMemo(() => {
    const resourceMetrics: Record<string, ResourceMetric> = {};

    // Build per-resource metrics
    for (const [key, items] of Object.entries(collectedData)) {
      if (!items || items.length === 0) {
        resourceMetrics[key] = {
          dcCount: 0,
          subMetrics: '',
        };
        continue;
      }

      // Datacenter distribution
      const dcGroups = groupByField(items, 'datacenter');
      const dcEntries = Object.entries(dcGroups).sort((a, b) => b[1] - a[1]);

      // Top 2 DCs for sub-metrics
      const top2 = dcEntries.slice(0, 2);
      const subMetrics = top2
        .map(([dc, count]) => `${count} ${dc}`)
        .join(' | ');

      resourceMetrics[key] = {
        dcCount: dcEntries.length,
        subMetrics: subMetrics || '',
      };
    }

    // Compute resources (VSIs + bare metal)
    const vsis = collectedData['virtualServers'] ?? [];
    const bms = collectedData['bareMetal'] ?? [];
    const computeItems = [...vsis, ...bms];
    const totalServers = computeItems.length;

    // OS distribution
    const osGroups: Record<string, number> = {};
    for (const item of computeItems) {
      const rawOS = String(getField(item, 'os') ?? 'Unknown');
      const simplified = simplifyOS(rawOS);
      osGroups[simplified] = (osGroups[simplified] ?? 0) + 1;
    }
    const osDist: DistributionEntry[] = topN(osGroups, 10)
      .map(([group, value]) => ({ group, value }));

    // DC distribution
    const dcGroups = groupByField(computeItems, 'datacenter');
    const dcDist: DistributionEntry[] = topN(dcGroups, 10)
      .map(([group, value]) => ({ group, value }));

    // CPU distribution (VSIs only, grouped into buckets)
    const cpuBuckets: Record<string, number> = {};
    for (const item of vsis) {
      const cpu = Number(getField(item, 'maxCpu') ?? 0);
      let bucket: string;
      if (cpu <= 2) bucket = '2 vCPU';
      else if (cpu <= 4) bucket = '4 vCPU';
      else if (cpu <= 8) bucket = '8 vCPU';
      else bucket = '16+ vCPU';
      cpuBuckets[bucket] = (cpuBuckets[bucket] ?? 0) + 1;
    }
    const cpuOrder = ['2 vCPU', '4 vCPU', '8 vCPU', '16+ vCPU'];
    const cpuDist: DistributionEntry[] = cpuOrder
      .filter((b) => cpuBuckets[b])
      .map((group) => ({ group, value: cpuBuckets[group] }));

    // VMware overlap metrics from cross-references
    const crossRefs = collectedData['vmwareCrossReferences'] ?? [];
    let esxiHosts = 0;
    let vmwareVlans = 0;
    let vmwareStorage = 0;
    for (const ref of crossRefs) {
      const crt = String(getField(ref, 'classicResourceType') ?? '');
      if (crt === 'Bare Metal') esxiHosts++;
      else if (crt === 'VLAN') vmwareVlans++;
      else if (crt === 'Block Storage' || crt === 'File Storage') vmwareStorage++;
    }
    const vmwareOverlap = { esxiHosts, vmwareVlans, vmwareStorage };

    return { resourceMetrics, osDist, dcDist, cpuDist, totalServers, vmwareOverlap };
  }, [collectedData]);
}
