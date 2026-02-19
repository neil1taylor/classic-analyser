import type { StorageAssessment, BlockVolumeAssessment, FileVolumeAssessment, MigrationPreferences, StorageMigrationStrategy } from '@/types/migration';
import { mapStorageTier } from './data/storageTiers';

function num(item: unknown, key: string): number {
  return Number((item as Record<string, unknown>)[key] ?? 0);
}
function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

function assessBlockVolume(item: unknown): BlockVolumeAssessment {
  const capacityGB = num(item, 'capacityGb');
  const iops = num(item, 'iops');
  const tierLevel = str(item, 'storageTierLevel');
  const tierMapping = mapStorageTier(tierLevel, iops);

  const strategy: StorageMigrationStrategy = capacityGB < 2000 ? 'snapshot' : 'replication';

  const notes: string[] = [];
  notes.push(`Classic tier: ${tierLevel || 'unknown'} → VPC profile: ${tierMapping.vpcProfile}`);
  notes.push(`Migration strategy: ${strategy === 'snapshot' ? 'Snapshot-based (via COS)' : 'Replication-based'}`);

  return {
    id: num(item, 'id'),
    username: str(item, 'username'),
    capacityGB,
    iops,
    tier: tierLevel,
    vpcProfile: tierMapping.vpcProfile,
    vpcIOPS: tierMapping.vpcIOPS,
    currentFee: num(item, 'recurringFee'),
    strategy,
    notes,
  };
}

function assessFileVolume(item: unknown): FileVolumeAssessment {
  return {
    id: num(item, 'id'),
    username: str(item, 'username'),
    capacityGB: num(item, 'capacityGb'),
    currentFee: num(item, 'recurringFee'),
    notes: ['Migrate to VPC File Share (NFS v4.1) — verify application compatibility with NFS version'],
  };
}

export function analyzeStorage(
  collectedData: Record<string, unknown[]>,
  _preferences: MigrationPreferences,
): StorageAssessment {
  const blockStorage = collectedData['blockStorage'] ?? [];
  const fileStorage = collectedData['fileStorage'] ?? [];
  const objectStorage = collectedData['objectStorage'] ?? [];

  const blockAssessments = blockStorage.map(assessBlockVolume);
  const fileAssessments = fileStorage.map(assessFileVolume);

  const totalBlockGB = blockAssessments.reduce((sum, v) => sum + v.capacityGB, 0);
  const totalFileGB = fileAssessments.reduce((sum, v) => sum + v.capacityGB, 0);

  // Score: storage is generally straightforward
  const totalVolumes = blockStorage.length + fileStorage.length;
  let score = 100;
  if (totalVolumes > 50) score -= 10;
  if (totalBlockGB > 10000) score -= 10; // Large data = longer transfer
  if (fileStorage.length > 0) score -= 5; // NFS v3→v4.1 consideration
  score = Math.max(0, score);

  const recommendations: string[] = [];
  if (fileStorage.length > 0) {
    recommendations.push('Test NFS v4.1 compatibility before migrating file storage volumes');
  }
  if (totalBlockGB > 5000) {
    recommendations.push('Consider replication-based migration for large block storage volumes to minimise downtime');
  }
  if (objectStorage.length > 0) {
    recommendations.push('Object Storage uses the same IBM COS service — no migration needed, update endpoint configuration only');
  }

  return {
    blockStorage: {
      totalVolumes: blockStorage.length,
      totalCapacityGB: totalBlockGB,
      volumeAssessments: blockAssessments,
    },
    fileStorage: {
      totalVolumes: fileStorage.length,
      totalCapacityGB: totalFileGB,
      volumeAssessments: fileAssessments,
    },
    objectStorage: {
      totalAccounts: objectStorage.length,
      migrationRequired: false,
      notes: objectStorage.length > 0
        ? ['Object Storage is the same service in Classic and VPC — update endpoints only']
        : [],
    },
    score,
    recommendations,
  };
}
