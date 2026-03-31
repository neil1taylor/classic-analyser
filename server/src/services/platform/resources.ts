import type { VpcClient } from '../vpc/client.js';
import type { ServiceInstance, ResourceGroup } from './types.js';
import { KNOWN_SERVICES } from './types.js';
import logger from '../../utils/logger.js';

/**
 * Fetch all resource groups for the account.
 */
export async function getResourceGroups(client: VpcClient): Promise<ResourceGroup[]> {
  try {
    const groups = await client.requestAllResourceControllerPages<ResourceGroup>(
      '/v2/resource_groups',
      'resources',
    );
    logger.info('Collected resource groups', { count: groups.length });
    return groups;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect resource groups', { statusCode: error.statusCode });
      return [];
    }
    throw error;
  }
}

/**
 * Fetch all service instances from the Resource Controller API.
 * Enriches each instance with _serviceType and _serviceCategory from the known services map.
 */
export async function getAllServiceInstances(
  client: VpcClient,
  resourceGroupMap?: Map<string, string>,
): Promise<ServiceInstance[]> {
  try {
    const instances = await client.requestAllResourceControllerPages<ServiceInstance>(
      '/v2/resource_instances?limit=100',
      'resources',
    );

    // Enrich with computed fields
    for (const instance of instances) {
      const known = KNOWN_SERVICES[instance.resource_id];
      instance._serviceType = known?.name ?? instance.resource_id;
      instance._serviceCategory = known?.category ?? 'Other';

      if (resourceGroupMap && instance.resource_group_id) {
        instance._resourceGroupName = resourceGroupMap.get(instance.resource_group_id) ?? instance.resource_group_id;
      }
    }

    logger.info('Collected service instances', { count: instances.length });
    return instances;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect service instances', { statusCode: error.statusCode });
      return [];
    }
    throw error;
  }
}
