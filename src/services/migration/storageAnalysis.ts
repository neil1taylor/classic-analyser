import type { StorageAssessment, BlockVolumeAssessment, FileVolumeAssessment, MigrationPreferences, StorageMigrationStrategy } from '@/types/migration';
import { mapStorageTier, isSdpAvailable, mapFileStorageProfile, type StorageTierContext } from './data/storageTiers';

function num(item: unknown, key: string): number {
  return Number((item as Record<string, unknown>)[key] ?? 0);
}
function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

/** Heuristic: volume is likely part of a multi-volume VM if attached to a guest with >1 volume. */
function detectConsistencyGroupNeed(item: unknown, allBlockStorage: unknown[]): boolean {
  const guests = (item as Record<string, unknown>)['allowedVirtualGuests'];
  if (!Array.isArray(guests) || guests.length === 0) return false;

  const guestIds = new Set(guests.map((g: Record<string, unknown>) => Number(g['id'])));

  // Count how many other block volumes share a guest
  let sharedVolumes = 0;
  for (const other of allBlockStorage) {
    if (other === item) continue;
    const otherGuests = (other as Record<string, unknown>)['allowedVirtualGuests'];
    if (!Array.isArray(otherGuests)) continue;
    for (const og of otherGuests) {
      if (guestIds.has(Number((og as Record<string, unknown>)['id']))) {
        sharedVolumes++;
        break;
      }
    }
  }
  return sharedVolumes > 0;
}

function assessBlockVolume(
  item: unknown,
  allBlockStorage: unknown[],
  context: StorageTierContext,
): BlockVolumeAssessment {
  const capacityGB = num(item, 'capacityGb');
  const iops = num(item, 'iops');
  const tierLevel = str(item, 'storageTierLevel');

  const needsConsistencyGroup = detectConsistencyGroupNeed(item, allBlockStorage);
  const volumeContext: StorageTierContext = { ...context, needsConsistencyGroup };
  const tierResult = mapStorageTier(tierLevel, iops, volumeContext);

  const strategy: StorageMigrationStrategy = capacityGB < 2000 ? 'snapshot' : 'replication';

  const notes: string[] = [];
  notes.push(`Classic tier: ${tierLevel || 'unknown'} → VPC profile: ${tierResult.primary.vpcProfile}`);
  notes.push(`Migration strategy: ${strategy === 'snapshot' ? 'Snapshot-based (via COS)' : 'Replication-based'}`);
  if (tierResult.fallback) {
    notes.push(`Gen 1 fallback: ${tierResult.fallback.vpcProfile}`);
  }

  const profileNotes: string[] = [];
  if (tierResult.primary.generation === 2) {
    profileNotes.push('Gen 2 sdp: set IOPS to match or exceed source');
    if (tierResult.primary.limitations) {
      profileNotes.push(...tierResult.primary.limitations.filter(l => !l.includes('boot')));
    }
    if (needsConsistencyGroup) {
      // Should not happen since we exclude sdp for these, but just in case
      profileNotes.push('Volume shares a host with other volumes — verify snapshot strategy');
    }
  }
  if (needsConsistencyGroup && tierResult.primary.generation === 1) {
    profileNotes.push('Gen 1 selected: volume shares a host with other volumes (consistency group snapshots supported)');
  }

  return {
    id: num(item, 'id'),
    username: str(item, 'username'),
    capacityGB,
    iops,
    tier: tierLevel,
    vpcProfile: tierResult.primary.vpcProfile,
    vpcIOPS: tierResult.primary.vpcIOPS,
    profileGeneration: tierResult.primary.generation,
    profileNotes,
    currentFee: num(item, 'recurringFee'),
    strategy,
    notes,
  };
}

function assessFileVolume(item: unknown): FileVolumeAssessment {
  const capacityGB = num(item, 'capacityGb');
  const iops = num(item, 'iops');
  const tierLevel = str(item, 'storageTierLevel');
  const profile = mapFileStorageProfile(tierLevel, iops);

  const notes: string[] = [];
  notes.push(profile.notes);
  notes.push('VPC File Share uses NFS v4.1 — verify application compatibility (Classic uses NFS v3)');

  const profileNotes: string[] = [];
  if (profile.alternative) {
    profileNotes.push(`Alternative: ${profile.alternative} profile (higher IOPS ceiling)`);
  }

  return {
    id: num(item, 'id'),
    username: str(item, 'username'),
    capacityGB,
    iops,
    tier: tierLevel,
    vpcProfile: profile.vpcProfile,
    vpcIOPS: profile.vpcIOPS,
    profileNotes,
    currentFee: num(item, 'recurringFee'),
    notes,
  };
}

export function analyzeStorage(
  collectedData: Record<string, unknown[]>,
  preferences: MigrationPreferences,
): StorageAssessment {
  const allBlockStorage = collectedData['blockStorage'] ?? [];
  const allFileStorage = collectedData['fileStorage'] ?? [];
  const objectStorage = collectedData['objectStorage'] ?? [];

  // Separate K8s-consumed storage — migrates with the cluster, not individually
  const isKube = (item: unknown) => !!(item as Record<string, unknown>)['_isKubeStorage'];
  const blockStorage = allBlockStorage.filter(item => !isKube(item));
  const fileStorage = allFileStorage.filter(item => !isKube(item));
  const kubeBlockStorage = allBlockStorage.filter(isKube);
  const kubeFileStorage = allFileStorage.filter(isKube);

  const context: StorageTierContext = {
    targetRegion: preferences.targetRegion,
    needsConsistencyGroup: false, // per-volume override in assessBlockVolume
  };

  const blockAssessments = blockStorage.map(item => assessBlockVolume(item, blockStorage, context));
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

  const sdpAvailable = isSdpAvailable(preferences.targetRegion);
  const sdpCount = blockAssessments.filter(v => v.profileGeneration === 2).length;
  const gen1Count = blockAssessments.filter(v => v.profileGeneration === 1).length;

  if (sdpAvailable && sdpCount > 0) {
    recommendations.push(
      `${sdpCount} volume(s) recommended for Gen 2 sdp profile (up to 64K IOPS, 32 TB). ` +
      'Note: sdp does not support consistency group snapshots. Not recommended for boot volumes (GPT detection issue — may boot BIOS instead of UEFI; must not be used with secure boot).',
    );
  }
  if (!sdpAvailable && blockStorage.length > 0) {
    recommendations.push(
      `Gen 2 sdp profile is not available in ${preferences.targetRegion}. All volumes mapped to Gen 1 profiles.`,
    );
  }
  if (gen1Count > 0 && sdpAvailable) {
    recommendations.push(
      `${gen1Count} volume(s) mapped to Gen 1 profiles (require consistency group snapshots).`,
    );
  }
  if (fileStorage.length > 0) {
    recommendations.push('Test NFS v4.1 compatibility before migrating file storage volumes (Classic uses NFS v3)');
  }
  if (totalBlockGB > 5000) {
    recommendations.push('Consider replication-based migration for large block storage volumes to minimise downtime');
  }
  if (objectStorage.length > 0) {
    recommendations.push('Object Storage uses the same IBM COS service — no migration needed, update endpoint configuration only');
  }

  // K8s-consumed storage summary
  const kubeBlockCount = kubeBlockStorage.length;
  const kubeFileCount = kubeFileStorage.length;
  const kubeTotal = kubeBlockCount + kubeFileCount;
  let kubeStorage: StorageAssessment['kubeStorage'];

  if (kubeTotal > 0) {
    const kubeBlockGB = kubeBlockStorage.reduce((sum, v) => sum + Number((v as Record<string, unknown>)['capacityGb'] ?? 0), 0);
    const kubeFileGB = kubeFileStorage.reduce((sum, v) => sum + Number((v as Record<string, unknown>)['capacityGb'] ?? 0), 0);
    const kubeTotalGB = kubeBlockGB + kubeFileGB;

    kubeStorage = {
      totalVolumes: kubeTotal,
      totalCapacityGB: kubeTotalGB,
      blockCount: kubeBlockCount,
      fileCount: kubeFileCount,
    };

    recommendations.push(
      `${kubeTotal} storage volume(s) (${kubeTotalGB} GB) excluded from assessment — consumed by IKS/ROKS clusters. ` +
      `These volumes migrate with the Kubernetes cluster, not individually. ` +
      `(${kubeBlockCount} block, ${kubeFileCount} file)`,
    );
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
    kubeStorage,
    score,
    recommendations,
  };
}
