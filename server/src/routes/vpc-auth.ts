import { Router } from 'express';
import type { Request, Response } from 'express';
import { VpcClient } from '../services/vpc/client.js';
import logger from '../utils/logger.js';
import { getIbmCloudAccountName } from '../utils/iam.js';

const router = Router();

router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey || apiKey.trim().length === 0) {
    res.status(401).json({
      error: 'API key required',
      message: 'Provide your IBM Cloud API key in the X-API-Key header.',
    });
    return;
  }

  const client = new VpcClient(apiKey.trim());

  try {
    const iamToken = await client.exchangeToken();
    const ibmCloudAccountId = client.getAccountId();

    logger.info('VPC API key validated successfully via IAM token exchange');

    // Attempt to get IBM Cloud account name (non-blocking on failure)
    let ibmCloudAccountName: string | undefined;
    if (ibmCloudAccountId) {
      try {
        const name = await getIbmCloudAccountName(ibmCloudAccountId, iamToken);
        if (name) {
          ibmCloudAccountName = name;
        }
        logger.info('IBM Cloud account info retrieved for VPC auth', {
          ibmCloudAccountId,
          ibmCloudAccountName: ibmCloudAccountName ?? '(unknown)',
        });
      } catch (accountErr) {
        logger.warn('Failed to retrieve IBM Cloud account name for VPC auth (non-fatal)', {
          message: (accountErr as Error).message,
        });
      }
    }

    res.json({
      valid: true,
      account: {
        ...(ibmCloudAccountId && { ibmCloudAccountId }),
        ...(ibmCloudAccountName && { ibmCloudAccountName }),
      },
    });
  } catch (err) {
    const error = err as Error;

    logger.error('VPC auth validation error', { message: error.message });

    const msg = error.message.toLowerCase();
    if (msg.includes('401') || msg.includes('403') || msg.includes('invalid') || msg.includes('unauthorized')) {
      res.status(401).json({
        valid: false,
        error: 'Invalid API key',
        message: 'The provided IBM Cloud API key is invalid or cannot be exchanged for an IAM token.',
      });
      return;
    }

    res.status(502).json({
      valid: false,
      error: 'Validation failed',
      message: error.message || 'Unable to validate API key via IAM.',
    });
  }
});

export default router;
