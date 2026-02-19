import type { SoftLayerClient } from './client.js';
import type { SLUser, SLBillingItem, SLEventLog } from './types.js';
import logger from '../../utils/logger.js';

export async function getUsers(client: SoftLayerClient): Promise<SLUser[]> {
  const objectMask =
    'mask[id,username,email,firstName,lastName,createDate,statusDate,userStatus,roles,permissions]';

  try {
    const result = await client.requestAllPages<SLUser>({
      service: 'SoftLayer_Account',
      method: 'getUsers',
      objectMask,
    });
    logger.info('Collected users', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect users (403)');
      return [];
    }
    throw error;
  }
}

export async function getAllBillingItems(client: SoftLayerClient): Promise<SLBillingItem[]> {
  const objectMask =
    'mask[id,description,categoryCode,recurringFee,createDate,cancellationDate,notes]';

  try {
    const result = await client.requestAllPages<SLBillingItem>({
      service: 'SoftLayer_Account',
      method: 'getAllBillingItems',
      objectMask,
    });
    logger.info('Collected billing items', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect billing items (403)');
      return [];
    }
    throw error;
  }
}

export async function getAllBillingItemsShallow(client: SoftLayerClient): Promise<SLBillingItem[]> {
  const objectMask =
    'mask[id,description,categoryCode,recurringFee,createDate]';

  try {
    const result = await client.requestAllPages<SLBillingItem>({
      service: 'SoftLayer_Account',
      method: 'getAllBillingItems',
      objectMask,
    });
    logger.info('Collected billing items (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect billing items (403)');
      return [];
    }
    throw error;
  }
}

export async function getEventLog(client: SoftLayerClient): Promise<SLEventLog[]> {
  const objectMask =
    'mask[eventName,eventCreateDate,userType,userId,username,objectName,objectId,traceId,metaData]';

  try {
    const result = await client.request<SLEventLog[]>({
      service: 'SoftLayer_Event_Log',
      method: 'getAllObjects',
      objectMask,
      resultLimit: 500,
      offset: 0,
    });
    const entries = Array.isArray(result) ? result : [];
    logger.info('Collected event log entries', { count: entries.length });
    return entries;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect event log (403)');
      return [];
    }
    throw error;
  }
}
