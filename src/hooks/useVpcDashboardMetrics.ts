import { useMemo } from 'react';
import { useVpcData } from '@/contexts/VpcDataContext';

export interface VpcDistributionEntry {
  group: string;
  value: number;
}

export interface VpcResourceMetric {
  dcCount: number;
  subMetrics: string;
}

interface VpcDashboardMetrics {
  regionDist: VpcDistributionEntry[];
  vpcDist: VpcDistributionEntry[];
  profileDist: VpcDistributionEntry[];
  totalInstances: number;
  totalResources: number;
  totalVpcs: number;
  totalSubnets: number;
  totalVolumes: number;
  totalVCPU: number;
  totalMemoryGB: number;
  totalStorageGB: number;
  regionMetrics: Record<string, VpcResourceMetric>;
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

export function useVpcDashboardMetrics(): VpcDashboardMetrics {
  const { vpcCollectedData } = useVpcData();

  return useMemo(() => {
    const instances = vpcCollectedData['vpcInstances'] ?? [];
    const vpcs = vpcCollectedData['vpcs'] ?? [];
    const subnets = vpcCollectedData['vpcSubnets'] ?? [];
    const volumes = vpcCollectedData['vpcVolumes'] ?? [];

    // Region distribution (across all VPC resources)
    const allItems = [
      ...instances,
      ...(vpcCollectedData['vpcBareMetalServers'] ?? []),
    ];
    const regionGroups = groupByField(allItems.length > 0 ? allItems : [...vpcs, ...subnets], 'region');
    const regionDist: VpcDistributionEntry[] = topN(regionGroups, 10)
      .map(([group, value]) => ({ group, value }));

    // VPC distribution (instances by VPC name)
    const vpcGroups = groupByField(instances, 'vpcName');
    const vpcDist: VpcDistributionEntry[] = topN(vpcGroups, 10)
      .map(([group, value]) => ({ group, value }));

    // Profile distribution (instances by profile)
    const profileGroups = groupByField(instances, 'profile');
    const profileDist: VpcDistributionEntry[] = topN(profileGroups, 10)
      .map(([group, value]) => ({ group, value }));

    // Compute totals
    const totalVCPU = instances.reduce((s: number, v) => s + Number(getField(v, 'vcpu') ?? 0), 0);
    const totalMemoryGB = instances.reduce((s: number, v) => s + Number(getField(v, 'memory') ?? 0), 0);
    const totalStorageGB = volumes.reduce((s: number, v) => s + Number(getField(v, 'capacity') ?? 0), 0);

    // Per-resource region metrics
    const regionMetrics: Record<string, VpcResourceMetric> = {};
    for (const [key, items] of Object.entries(vpcCollectedData)) {
      if (!items || items.length === 0) {
        regionMetrics[key] = { dcCount: 0, subMetrics: '' };
        continue;
      }

      const rGroups = groupByField(items, 'region');
      const rEntries = Object.entries(rGroups).sort((a, b) => b[1] - a[1]);
      const top2 = rEntries.slice(0, 2);
      const subMetrics = top2
        .map(([region, count]) => `${count} ${region}`)
        .join(' | ');

      regionMetrics[key] = {
        dcCount: rEntries.length,
        subMetrics: subMetrics || '',
      };
    }

    const totalResources = Object.values(vpcCollectedData)
      .reduce((sum, items) => sum + (items ? items.length : 0), 0);

    return {
      regionDist,
      vpcDist,
      profileDist,
      totalInstances: instances.length,
      totalResources,
      totalVpcs: vpcs.length,
      totalSubnets: subnets.length,
      totalVolumes: volumes.length,
      totalVCPU,
      totalMemoryGB,
      totalStorageGB,
      regionMetrics,
    };
  }, [vpcCollectedData]);
}
