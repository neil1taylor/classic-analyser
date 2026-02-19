import { useMemo } from 'react';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';

export interface PvsDistributionEntry {
  group: string;
  value: number;
}

export interface PvsResourceMetric {
  zoneCount: number;
  subMetrics: string;
}

interface PvsDashboardMetrics {
  zoneDist: PvsDistributionEntry[];
  workspaceDist: PvsDistributionEntry[];
  sysTypeDist: PvsDistributionEntry[];
  totalInstances: number;
  totalResources: number;
  totalWorkspaces: number;
  totalNetworks: number;
  totalVolumes: number;
  totalProcessors: number;
  totalMemoryGB: number;
  totalStorageGB: number;
  zoneMetrics: Record<string, PvsResourceMetric>;
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

export function usePowerVsDashboardMetrics(): PvsDashboardMetrics {
  const { pvsCollectedData } = usePowerVsData();

  return useMemo(() => {
    const instances = pvsCollectedData['pvsInstances'] ?? [];
    const workspaces = pvsCollectedData['pvsWorkspaces'] ?? [];
    const networks = pvsCollectedData['pvsNetworks'] ?? [];
    const volumes = pvsCollectedData['pvsVolumes'] ?? [];

    // Zone distribution
    const zoneGroups = groupByField(instances.length > 0 ? instances : [...workspaces, ...networks], 'zone');
    const zoneDist: PvsDistributionEntry[] = topN(zoneGroups, 10)
      .map(([group, value]) => ({ group, value }));

    // Workspace distribution (instances by workspace)
    const wsGroups = groupByField(instances, 'workspace');
    const workspaceDist: PvsDistributionEntry[] = topN(wsGroups, 10)
      .map(([group, value]) => ({ group, value }));

    // System type distribution
    const sysTypeGroups = groupByField(instances, 'sysType');
    const sysTypeDist: PvsDistributionEntry[] = topN(sysTypeGroups, 10)
      .map(([group, value]) => ({ group, value }));

    // Compute totals
    const totalProcessors = instances.reduce((s: number, v) => s + Number(getField(v, 'processors') ?? 0), 0);
    const totalMemoryGB = instances.reduce((s: number, v) => s + Number(getField(v, 'memory') ?? 0), 0);
    const totalStorageGB = volumes.reduce((s: number, v) => s + Number(getField(v, 'size') ?? 0), 0);

    // Per-resource zone metrics
    const zoneMetrics: Record<string, PvsResourceMetric> = {};
    for (const [key, items] of Object.entries(pvsCollectedData)) {
      if (!items || items.length === 0) {
        zoneMetrics[key] = { zoneCount: 0, subMetrics: '' };
        continue;
      }

      const zGroups = groupByField(items, 'zone');
      const zEntries = Object.entries(zGroups).sort((a, b) => b[1] - a[1]);
      const top2 = zEntries.slice(0, 2);
      const subMetrics = top2
        .map(([zone, count]) => `${count} ${zone}`)
        .join(' | ');

      zoneMetrics[key] = {
        zoneCount: zEntries.length,
        subMetrics: subMetrics || '',
      };
    }

    const totalResources = Object.values(pvsCollectedData)
      .reduce((sum, items) => sum + (items ? items.length : 0), 0);

    return {
      zoneDist,
      workspaceDist,
      sysTypeDist,
      totalInstances: instances.length,
      totalResources,
      totalWorkspaces: workspaces.length,
      totalNetworks: networks.length,
      totalVolumes: volumes.length,
      totalProcessors,
      totalMemoryGB,
      totalStorageGB,
      zoneMetrics,
    };
  }, [pvsCollectedData]);
}
