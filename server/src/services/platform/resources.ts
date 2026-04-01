import type { VpcClient } from '../vpc/client.js';
import type { ServiceInstance, ResourceGroup } from './types.js';
import { KNOWN_SERVICES } from './types.js';
import logger from '../../utils/logger.js';

/**
 * Extract the service name from an IBM Cloud CRN.
 * CRN format: crn:v1:bluemix:public:<service-name>:<region>:a/<account>::<type>:<id>
 */
function extractServiceNameFromCrn(crn?: string): string | null {
  if (!crn) return null;
  const parts = crn.split(':');
  // parts[4] is the service name
  return parts.length >= 5 && parts[4] ? parts[4] : null;
}

/**
 * Extract the region from an IBM Cloud CRN.
 */
function extractRegionFromCrn(crn?: string): string | null {
  if (!crn) return null;
  const parts = crn.split(':');
  // parts[5] is the region
  return parts.length >= 6 && parts[5] ? parts[5] : null;
}

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
    const allInstances = await client.requestAllResourceControllerPages<ServiceInstance>(
      '/v2/resource_instances?limit=100',
      'resources',
    );

    // Filter out infrastructure sub-resources already collected in VPC/PowerVS/Classic domains
    const EXCLUDED_CRN_SERVICES = new Set([
      'is',           // VPC infrastructure (is.vpc, is.subnet, etc. — CRN service name is just "is")
      'power-iaas',   // PowerVS workspaces
      'transit',      // Transit Gateways (collected in VPC domain)
      'directlink',   // Direct Link (collected in VPC domain)
    ]);

    const instances = allInstances.filter((instance) => {
      const rid = instance.resource_id ?? '';
      const crnService = extractServiceNameFromCrn(instance.crn) ?? '';
      if (rid.startsWith('is.') || crnService.startsWith('is.')) return false;
      if (EXCLUDED_CRN_SERVICES.has(rid) || EXCLUDED_CRN_SERVICES.has(crnService)) return false;
      return true;
    });

    logger.info('Collected service instances', {
      total: allInstances.length,
      filtered: instances.length,
      excluded: allInstances.length - instances.length,
    });

    // Enrich with computed fields
    for (const instance of instances) {
      // Try KNOWN_SERVICES by resource_id first, then by CRN service name
      const crnServiceName = extractServiceNameFromCrn(instance.crn);
      const known = KNOWN_SERVICES[instance.resource_id] ?? (crnServiceName ? KNOWN_SERVICES[crnServiceName] : undefined);
      instance._serviceType = known?.name ?? crnServiceName ?? instance.resource_id;
      instance._serviceCategory = known?.category ?? 'Other';
      instance._location = instance.region_id ?? extractRegionFromCrn(instance.crn) ?? instance.location ?? '';

      if (resourceGroupMap && instance.resource_group_id) {
        instance._resourceGroupName = resourceGroupMap.get(instance.resource_group_id) ?? instance.resource_group_id;
      }
    }

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
