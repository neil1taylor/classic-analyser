import type { ResourceInstanceListResponse, PowerVsWorkspace } from './types.js';
import { PowerVsClient, zoneToApiRegion } from './client.js';
import logger from '../../utils/logger.js';

// IBM Cloud resource ID for PowerVS service
const POWER_IAAS_RESOURCE_ID = 'abd259f0-9990-11e8-acc8-b9f54a8f1661';

/**
 * Parse a PowerVS workspace CRN to extract zone and cloud instance ID.
 * CRN format: crn:v1:bluemix:public:power-iaas:{zone}:a/{account_id}:{cloud_instance_id}::
 */
function parsePowerVsCrn(crn: string): { zone: string; cloudInstanceId: string } | null {
  const parts = crn.split(':');
  if (parts.length < 8) return null;
  const zone = parts[5]; // location segment
  const cloudInstanceId = parts[7]; // resource instance segment
  if (!zone || !cloudInstanceId) return null;
  return { zone, cloudInstanceId };
}

/**
 * Discover all PowerVS workspaces in the account via the Resource Controller API.
 */
export async function discoverPowerVsWorkspaces(
  client: PowerVsClient,
): Promise<PowerVsWorkspace[]> {
  const workspaces: PowerVsWorkspace[] = [];
  let nextUrl: string | null = `/v2/resource_instances?resource_id=${POWER_IAAS_RESOURCE_ID}&limit=100`;

  while (nextUrl) {
    const response: ResourceInstanceListResponse = await client.requestResourceController<ResourceInstanceListResponse>(nextUrl);

    logger.info('Resource Controller response page', {
      rows_count: response.rows_count,
      resourcesInPage: response.resources?.length ?? 0,
      hasNextUrl: !!response.next_url,
    });

    for (const instance of response.resources) {
      logger.info('Resource instance found', {
        name: instance.name,
        state: instance.state,
        type: (instance as Record<string, unknown>).type,
        crn: instance.crn?.substring(0, 80),
      });

      if (instance.state !== 'active' && instance.state !== 'provisioning') {
        logger.info('Skipping workspace with state', { name: instance.name, state: instance.state });
        continue;
      }

      const parsed = parsePowerVsCrn(instance.crn);
      if (!parsed) {
        logger.warn('Could not parse PowerVS workspace CRN', { crn: instance.crn });
        continue;
      }

      workspaces.push({
        id: instance.id,
        guid: instance.guid,
        crn: instance.crn,
        name: instance.name,
        state: instance.state,
        region_id: instance.region_id,
        resource_group_id: instance.resource_group_id,
        created_at: instance.created_at,
        updated_at: instance.updated_at,
        _zone: parsed.zone,
        _apiRegion: zoneToApiRegion(parsed.zone),
        _cloudInstanceId: parsed.cloudInstanceId,
      });
    }

    nextUrl = response.next_url ?? null;
  }

  logger.info(`Discovered ${workspaces.length} PowerVS workspaces`);
  return workspaces;
}
