import type { SoftLayerClient } from './client.js';
import type {
  SLBlockStorage,
  SLFileStorage,
  SLObjectStorage,
  SLSnapshot,
} from './types.js';
import logger from '../../utils/logger.js';

export async function getIscsiNetworkStorage(client: SoftLayerClient): Promise<SLBlockStorage[]> {
  const objectMask =
    'mask[id,username,capacityGb,iops,storageType,storageTierLevel,serviceResourceBackendIpAddress,lunId,allowedVirtualGuests[id,hostname],allowedHardware[id,hostname],allowedSubnets,snapshotCapacityGb,schedules,replicationPartners[id,username,serviceResourceBackendIpAddress],billingItem[recurringFee],createDate,notes,hasEncryptionAtRest,serviceResource[datacenter[name]],parentVolume[snapshotSizeBytes]]';

  // Try both iSCSI and general network storage endpoints to capture all block storage types
  const results: SLBlockStorage[] = [];

  try {
    const iscsi = await client.requestAllPages<SLBlockStorage>({
      service: 'SoftLayer_Account',
      method: 'getIscsiNetworkStorage',
      objectMask,
    });
    results.push(...iscsi);
    logger.info('Collected iSCSI block storage volumes', { count: iscsi.length });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode !== 403 && error.statusCode !== 404) {
      throw error;
    }
    logger.warn('Insufficient permissions to collect iSCSI storage');
  }

  // Also fetch from getNetworkStorage with block storage filter
  try {
    const networkStorage = await client.requestAllPages<SLBlockStorage>({
      service: 'SoftLayer_Account',
      method: 'getNetworkStorage',
      objectMask,
      additionalParams: {
        'objectFilter': '{"networkStorage":{"storageType":{"keyName":{"operation":"in","options":[{"name":"data","value":["ENDURANCE_BLOCK_STORAGE","PERFORMANCE_BLOCK_STORAGE"]}]}}}}',
      },
    });
    // Deduplicate by ID
    const existingIds = new Set(results.map((r) => r.id));
    for (const vol of networkStorage) {
      if (vol.id && !existingIds.has(vol.id)) {
        results.push(vol);
      }
    }
    logger.info('Collected network block storage volumes', { count: networkStorage.length, totalAfterDedup: results.length });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode !== 403 && error.statusCode !== 404) {
      throw error;
    }
    logger.warn('Insufficient permissions to collect network storage');
  }

  logger.info('Total block storage volumes', { count: results.length });
  return results;
}

export async function getNasNetworkStorage(client: SoftLayerClient): Promise<SLFileStorage[]> {
  const objectMask =
    'mask[id,username,capacityGb,iops,storageType,storageTierLevel,serviceResourceBackendIpAddress,fileNetworkMountAddress,allowedVirtualGuests[id,hostname],allowedHardware[id,hostname],allowedSubnets,snapshotCapacityGb,schedules,replicationPartners[id,username,serviceResourceBackendIpAddress],billingItem[recurringFee],createDate,notes,bytesUsed,hasEncryptionAtRest,serviceResource[datacenter[name]],parentVolume[snapshotSizeBytes]]';

  try {
    const result = await client.requestAllPages<SLFileStorage>({
      service: 'SoftLayer_Account',
      method: 'getNasNetworkStorage',
      objectMask,
    });
    logger.info('Collected file storage volumes', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect file storage (403)');
      return [];
    }
    throw error;
  }
}

export async function getIscsiNetworkStorageShallow(client: SoftLayerClient): Promise<SLBlockStorage[]> {
  const objectMask =
    'mask[id,username,capacityGb,storageType[keyName],serviceResourceBackendIpAddress,createDate]';

  const results: SLBlockStorage[] = [];

  try {
    const iscsi = await client.requestAllPages<SLBlockStorage>({
      service: 'SoftLayer_Account',
      method: 'getIscsiNetworkStorage',
      objectMask,
    });
    results.push(...iscsi);
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode !== 403 && error.statusCode !== 404) throw error;
  }

  try {
    const networkStorage = await client.requestAllPages<SLBlockStorage>({
      service: 'SoftLayer_Account',
      method: 'getNetworkStorage',
      objectMask,
      additionalParams: {
        'objectFilter': '{"networkStorage":{"storageType":{"keyName":{"operation":"in","options":[{"name":"data","value":["ENDURANCE_BLOCK_STORAGE","PERFORMANCE_BLOCK_STORAGE"]}]}}}}',
      },
    });
    const existingIds = new Set(results.map((r) => r.id));
    for (const vol of networkStorage) {
      if (vol.id && !existingIds.has(vol.id)) {
        results.push(vol);
      }
    }
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode !== 403 && error.statusCode !== 404) throw error;
  }

  logger.info('Collected block storage volumes (shallow)', { count: results.length });
  return results;
}

export async function getNasNetworkStorageShallow(client: SoftLayerClient): Promise<SLFileStorage[]> {
  const objectMask =
    'mask[id,username,capacityGb,storageType[keyName],fileNetworkMountAddress,createDate]';

  try {
    const result = await client.requestAllPages<SLFileStorage>({
      service: 'SoftLayer_Account',
      method: 'getNasNetworkStorage',
      objectMask,
    });
    logger.info('Collected file storage volumes (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect file storage (403)');
      return [];
    }
    throw error;
  }
}

export async function getHubNetworkStorage(client: SoftLayerClient): Promise<SLObjectStorage[]> {
  const objectMask =
    'mask[id,username,storageType,capacityGb,bytesUsed,billingItem[recurringFee],createDate]';

  try {
    const result = await client.requestAllPages<SLObjectStorage>({
      service: 'SoftLayer_Account',
      method: 'getHubNetworkStorage',
      objectMask,
    });
    logger.info('Collected object storage accounts', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect object storage (403)');
      return [];
    }
    throw error;
  }
}

export async function getStorageSnapshots(
  client: SoftLayerClient,
  volumeId: number
): Promise<SLSnapshot[]> {
  const objectMask = 'mask[id,createDate,sizeBytes,notes]';
  try {
    const result = await client.requestAllPages<SLSnapshot>({
      service: 'SoftLayer_Network_Storage',
      resourceId: volumeId,
      method: 'getSnapshots',
      objectMask,
    });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Could not collect snapshots for volume', { volumeId });
      return [];
    }
    throw error;
  }
}
