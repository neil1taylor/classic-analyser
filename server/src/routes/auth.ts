import { Router } from 'express';
import type { Request, Response } from 'express';
import { SoftLayerClient } from '../services/softlayer/client.js';
import type { SLAccount } from '../services/softlayer/types.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Exchange an IBM Cloud API key for an IAM access token.
 */
async function getIamToken(apiKey: string): Promise<string> {
  const resp = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
  });
  if (!resp.ok) {
    throw new Error(`IAM token exchange failed: ${resp.status}`);
  }
  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Decode the JWT access token (without verification) and extract the BSS account ID.
 */
function extractAccountIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload?.account?.bss ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch the IBM Cloud account name using the Accounts API.
 */
async function getIbmCloudAccountName(
  accountId: string,
  iamToken: string,
): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://accounts.cloud.ibm.com/coe/v2/accounts/${accountId}`,
      { headers: { Authorization: `Bearer ${iamToken}` } },
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as { entity?: { name?: string } };
    return data?.entity?.name ?? null;
  } catch {
    return null;
  }
}

router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey || apiKey.trim().length === 0) {
    res.status(401).json({
      error: 'API key required',
      message: 'Provide your IBM Cloud API key in the X-API-Key header.',
    });
    return;
  }

  const client = new SoftLayerClient(apiKey.trim());

  try {
    const account = await client.request<SLAccount>({
      service: 'SoftLayer_Account',
      method: 'getObject',
      objectMask: 'mask[id,companyName,email,firstName,lastName]',
    });

    logger.info('API key validated successfully', {
      accountId: account.id,
      companyName: account.companyName,
    });

    // Attempt to get IBM Cloud account info (non-blocking on failure)
    let ibmCloudAccountId: string | undefined;
    let ibmCloudAccountName: string | undefined;

    try {
      const iamToken = await getIamToken(apiKey.trim());
      const bssAccountId = extractAccountIdFromToken(iamToken);
      if (bssAccountId) {
        ibmCloudAccountId = bssAccountId;
        const name = await getIbmCloudAccountName(bssAccountId, iamToken);
        if (name) {
          ibmCloudAccountName = name;
        }
        logger.info('IBM Cloud account info retrieved', {
          ibmCloudAccountId,
          ibmCloudAccountName: ibmCloudAccountName ?? '(unknown)',
        });
      }
    } catch (iamErr) {
      logger.warn('Failed to retrieve IBM Cloud account info (non-fatal)', {
        message: (iamErr as Error).message,
      });
    }

    res.json({
      valid: true,
      account: {
        id: account.id,
        companyName: account.companyName,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        ...(ibmCloudAccountId && { ibmCloudAccountId }),
        ...(ibmCloudAccountName && { ibmCloudAccountName }),
      },
    });
  } catch (err) {
    const error = err as Error & { statusCode?: number; body?: string };

    logger.error('Auth validation error', { statusCode: error.statusCode, message: error.message });

    if (error.statusCode === 401 || error.statusCode === 403) {
      res.status(401).json({
        valid: false,
        error: 'Invalid API key',
        message: 'The provided IBM Cloud API key is invalid or lacks Classic Infrastructure permissions.',
      });
      return;
    }

    // SoftLayer sometimes returns 500 with auth-related error in body
    const bodyLower = (error.body ?? '').toLowerCase();
    if (bodyLower.includes('invalid api') || bodyLower.includes('unauthorized') || bodyLower.includes('authentication')) {
      res.status(401).json({
        valid: false,
        error: 'Invalid API key',
        message: 'The provided IBM Cloud API key is invalid. Please check and try again.',
      });
      return;
    }

    res.status(502).json({
      valid: false,
      error: 'Validation failed',
      message: error.message || 'Unable to validate API key. The SoftLayer API may be unavailable.',
    });
  }
});

export default router;
