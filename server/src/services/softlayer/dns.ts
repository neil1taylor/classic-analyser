import type { SoftLayerClient } from './client.js';
import type { SLDomain, FlatDNSRecord } from './types.js';
import logger from '../../utils/logger.js';

export async function getDomains(client: SoftLayerClient): Promise<SLDomain[]> {
  const objectMask =
    'mask[id,name,serial,updateDate,resourceRecords[id,host,type,data,ttl]]';

  try {
    const result = await client.requestAllPages<SLDomain>({
      service: 'SoftLayer_Account',
      method: 'getDomains',
      objectMask,
    });
    logger.info('Collected DNS domains', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect DNS domains (403)');
      return [];
    }
    throw error;
  }
}

export async function getDomainsShallow(client: SoftLayerClient): Promise<SLDomain[]> {
  const objectMask =
    'mask[id,name,serial,updateDate]';

  try {
    const result = await client.requestAllPages<SLDomain>({
      service: 'SoftLayer_Account',
      method: 'getDomains',
      objectMask,
    });
    logger.info('Collected DNS domains (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect DNS domains (403)');
      return [];
    }
    throw error;
  }
}

export function flattenDNSRecords(domains: SLDomain[]): FlatDNSRecord[] {
  const records: FlatDNSRecord[] = [];

  for (const domain of domains) {
    if (!domain.resourceRecords || !Array.isArray(domain.resourceRecords)) {
      continue;
    }

    for (const record of domain.resourceRecords) {
      records.push({
        domainId: domain.id ?? 0,
        domainName: domain.name ?? '',
        id: record.id,
        host: record.host,
        type: record.type,
        data: record.data,
        ttl: record.ttl,
        priority: record.priority,
      });
    }
  }

  logger.info('Flattened DNS records', { count: records.length });
  return records;
}
