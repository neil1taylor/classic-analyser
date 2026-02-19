import type { VpcClient } from './client.js';
import type { VpcRegion } from './types.js';
import logger from '../../utils/logger.js';

const SEED_REGION = 'us-south';

/**
 * Discover all available VPC regions by calling the regions API
 * from a known seed region.
 */
export async function discoverVpcRegions(client: VpcClient): Promise<string[]> {
  try {
    const response = await client.request<{ regions: VpcRegion[] }>(SEED_REGION, 'regions');
    const available = (response.regions ?? [])
      .filter((r) => r.status === 'available')
      .map((r) => r.name);

    logger.info('VPC regions discovered', { count: available.length, regions: available });
    return available;
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to discover VPC regions', { message: error.message });
    // Fall back to known regions
    return [
      'us-south', 'us-east', 'eu-gb', 'eu-de', 'eu-es',
      'jp-tok', 'jp-osa', 'au-syd', 'ca-tor', 'br-sao',
    ];
  }
}
