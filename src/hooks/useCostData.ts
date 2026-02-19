import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';

function field(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key];
}

function num(item: unknown, key: string): number {
  return Number(field(item, key) ?? 0);
}

function str(item: unknown, key: string): string {
  return String(field(item, key) ?? '');
}

export interface CostByCategory {
  group: string;
  value: number;
}

export interface CostByDC {
  datacenter: string;
  compute: number;
  storage: number;
  network: number;
  other: number;
  total: number;
}

export interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
}

export function useCostData() {
  const { collectedData } = useData();

  return useMemo(() => {
    const vsis = collectedData['virtualServers'] ?? [];
    const bms = collectedData['bareMetal'] ?? [];
    const blockStorage = collectedData['blockStorage'] ?? [];
    const fileStorage = collectedData['fileStorage'] ?? [];
    const firewalls = collectedData['firewalls'] ?? [];
    const loadBalancers = collectedData['loadBalancers'] ?? [];

    // Total cost by resource category
    const computeVSI = vsis.reduce((sum: number, i) => sum + num(i, 'recurringFee'), 0);
    const computeBM = bms.reduce((sum: number, i) => sum + num(i, 'recurringFee'), 0);
    const storageBlock = blockStorage.reduce((sum: number, i) => sum + num(i, 'recurringFee'), 0);
    const storageFile = fileStorage.reduce((sum: number, i) => sum + num(i, 'recurringFee'), 0);
    const networkFW = firewalls.reduce((sum: number, i) => sum + num(i, 'recurringFee'), 0);
    const networkLB = loadBalancers.reduce((sum: number, i) => sum + num(i, 'recurringFee'), 0);

    const totalCost = computeVSI + computeBM + storageBlock + storageFile + networkFW + networkLB;

    const costByCategory: CostByCategory[] = [
      { group: 'Virtual Servers', value: Math.round(computeVSI * 100) / 100 },
      { group: 'Bare Metal', value: Math.round(computeBM * 100) / 100 },
      { group: 'Block Storage', value: Math.round(storageBlock * 100) / 100 },
      { group: 'File Storage', value: Math.round(storageFile * 100) / 100 },
      { group: 'Firewalls', value: Math.round(networkFW * 100) / 100 },
      { group: 'Load Balancers', value: Math.round(networkLB * 100) / 100 },
    ].filter((c) => c.value > 0);

    // Cost by datacenter (stacked)
    const dcMap = new Map<string, { compute: number; storage: number; network: number; other: number }>();
    const addToDC = (items: unknown[], field_name: string, category: 'compute' | 'storage' | 'network' | 'other') => {
      for (const item of items) {
        const dc = str(item, 'datacenter') || 'Unknown';
        const fee = num(item, field_name);
        if (!dcMap.has(dc)) dcMap.set(dc, { compute: 0, storage: 0, network: 0, other: 0 });
        dcMap.get(dc)![category] += fee;
      }
    };

    addToDC(vsis, 'recurringFee', 'compute');
    addToDC(bms, 'recurringFee', 'compute');
    addToDC(blockStorage, 'recurringFee', 'storage');
    addToDC(fileStorage, 'recurringFee', 'storage');
    addToDC(firewalls, 'recurringFee', 'network');

    const costByDC: CostByDC[] = Array.from(dcMap.entries())
      .map(([datacenter, costs]) => ({
        datacenter,
        ...costs,
        total: costs.compute + costs.storage + costs.network + costs.other,
      }))
      .sort((a, b) => b.total - a.total);

    // Treemap data
    const treemap: TreemapNode = {
      name: 'Total',
      children: [
        {
          name: 'Compute',
          children: [
            ...vsis.map((v) => ({ name: str(v, 'hostname') || `VSI ${num(v, 'id')}`, value: num(v, 'recurringFee') })),
            ...bms.map((b) => ({ name: str(b, 'hostname') || `BM ${num(b, 'id')}`, value: num(b, 'recurringFee') })),
          ].filter((n) => n.value > 0),
        },
        {
          name: 'Storage',
          children: [
            ...blockStorage.map((s) => ({ name: str(s, 'username') || `Block ${num(s, 'id')}`, value: num(s, 'recurringFee') })),
            ...fileStorage.map((s) => ({ name: str(s, 'username') || `File ${num(s, 'id')}`, value: num(s, 'recurringFee') })),
          ].filter((n) => n.value > 0),
        },
        {
          name: 'Network',
          children: [
            ...firewalls.map((f) => ({ name: str(f, 'primaryIpAddress') || `FW ${num(f, 'id')}`, value: num(f, 'recurringFee') })),
            ...loadBalancers.map((l) => ({ name: str(l, 'name') || `LB ${num(l, 'id')}`, value: num(l, 'recurringFee') })),
          ].filter((n) => n.value > 0),
        },
      ].filter((c) => c.children && c.children.length > 0),
    };

    // Stacked bar data for Carbon Charts (need array of {group, key, value})
    const stackedBarData: { group: string; key: string; value: number }[] = [];
    for (const dc of costByDC) {
      if (dc.compute > 0) stackedBarData.push({ group: 'Compute', key: dc.datacenter, value: Math.round(dc.compute * 100) / 100 });
      if (dc.storage > 0) stackedBarData.push({ group: 'Storage', key: dc.datacenter, value: Math.round(dc.storage * 100) / 100 });
      if (dc.network > 0) stackedBarData.push({ group: 'Network', key: dc.datacenter, value: Math.round(dc.network * 100) / 100 });
    }

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      costByCategory,
      costByDC,
      treemap,
      stackedBarData,
    };
  }, [collectedData]);
}
