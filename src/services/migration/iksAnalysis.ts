import type { VSIMigration, IKSClusterAnalysis, IKSCluster, IKSWorkerMapping } from '@/types/migration';
import { mapToIKSFlavour } from './data/iksFlavours';
import { mapDatacenterToVPC } from './data/datacenterMapping';

const IKS_DISCOUNT_RATE = 0.55;
const HOURS_PER_MONTH = 730;

export function analyzeIKSWorkers(vsiMigrations: VSIMigration[]): IKSClusterAnalysis {
  const iksWorkers = vsiMigrations.filter(m => m.iksClusterId);

  if (iksWorkers.length === 0) {
    return { clusters: [], totalWorkers: 0, totalClusters: 0, totalMonthlyCost: 0, unmappedWorkers: 0 };
  }

  const clusterMap = new Map<string, VSIMigration[]>();
  for (const worker of iksWorkers) {
    const id = worker.iksClusterId!;
    if (!clusterMap.has(id)) clusterMap.set(id, []);
    clusterMap.get(id)!.push(worker);
  }

  let unmappedWorkers = 0;
  const clusters: IKSCluster[] = [];

  for (const [clusterId, workers] of clusterMap) {
    const workerMappings: IKSWorkerMapping[] = workers.map(w => {
      const memoryGB = w.memoryMB / 1024;
      const flavour = mapToIKSFlavour(w.cpu, memoryGB);
      if (!flavour) unmappedWorkers++;

      const monthlyCost = flavour
        ? flavour.hourlyRate * HOURS_PER_MONTH * (1 - IKS_DISCOUNT_RATE)
        : 0;

      return {
        hostname: w.hostname,
        cores: w.cpu,
        memoryGB,
        datacenter: w.datacenter,
        mappedFlavour: flavour,
        monthlyCost,
      };
    });

    const datacenters = [...new Set(workerMappings.map(w => w.datacenter).filter(Boolean))];
    const firstDC = datacenters[0] ?? '';
    const dcMapping = mapDatacenterToVPC(firstDC);

    clusters.push({
      clusterId,
      workers: workerMappings,
      totalWorkers: workerMappings.length,
      totalMonthlyCost: workerMappings.reduce((sum, w) => sum + w.monthlyCost, 0),
      datacenters,
      targetRegion: dcMapping?.vpcRegion ?? 'unknown',
    });
  }

  return {
    clusters,
    totalWorkers: iksWorkers.length,
    totalClusters: clusters.length,
    totalMonthlyCost: clusters.reduce((sum, c) => sum + c.totalMonthlyCost, 0),
    unmappedWorkers,
  };
}
