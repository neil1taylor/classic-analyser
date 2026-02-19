import type { SoftLayerClient } from './client.js';
import type { SLSSLCertificate, SLSSHKey } from './types.js';
import logger from '../../utils/logger.js';

export async function getSecurityCertificates(client: SoftLayerClient): Promise<SLSSLCertificate[]> {
  const objectMask =
    'mask[id,commonName,organizationName,validityBegin,validityDays,validityEnd,createDate,modifyDate,notes]';

  try {
    const result = await client.requestAllPages<SLSSLCertificate>({
      service: 'SoftLayer_Account',
      method: 'getSecurityCertificates',
      objectMask,
    });
    logger.info('Collected SSL certificates', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect SSL certificates (403)');
      return [];
    }
    throw error;
  }
}

export async function getSshKeys(client: SoftLayerClient): Promise<SLSSHKey[]> {
  const objectMask =
    'mask[id,label,fingerprint,createDate,modifyDate,notes]';

  try {
    const result = await client.requestAllPages<SLSSHKey>({
      service: 'SoftLayer_Account',
      method: 'getSshKeys',
      objectMask,
    });
    logger.info('Collected SSH keys', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect SSH keys (403)');
      return [];
    }
    throw error;
  }
}
