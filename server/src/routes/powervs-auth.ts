import { Router } from 'express';
import type { Request, Response } from 'express';
import { PowerVsClient } from '../services/powervs/client.js';
import { discoverPowerVsWorkspaces } from '../services/powervs/workspaces.js';
import logger from '../utils/logger.js';

const router = Router();

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

  const client = new PowerVsClient(apiKey.trim());

  let iamToken: string;
  try {
    iamToken = await client.exchangeToken();
    logger.info('PowerVS IAM token exchange succeeded');
  } catch (err) {
    const error = err as Error;
    logger.error('PowerVS IAM token exchange failed', { message: error.message });
    res.status(401).json({
      valid: false,
      error: 'Invalid API key',
      message: 'The provided IBM Cloud API key is invalid or cannot be exchanged for an IAM token.',
    });
    return;
  }

  const ibmCloudAccountId = client.getAccountId();

  try {
    const workspaces = await discoverPowerVsWorkspaces(client);
    logger.info('PowerVS workspace discovery completed', {
      workspaceCount: workspaces.length,
      workspaceNames: workspaces.map((w) => w.name),
    });

    if (workspaces.length === 0) {
      res.status(403).json({
        valid: false,
        error: 'No PowerVS workspaces',
        message: 'No PowerVS workspaces found in this account. PowerVS features are not available.',
      });
      return;
    }

    logger.info('PowerVS API key validated successfully', {
      workspaceCount: workspaces.length,
    });

    let ibmCloudAccountName: string | undefined;
    if (ibmCloudAccountId) {
      try {
        const name = await getIbmCloudAccountName(ibmCloudAccountId, iamToken);
        if (name) ibmCloudAccountName = name;
      } catch {
        // non-fatal
      }
    }

    res.json({
      valid: true,
      account: {
        ...(ibmCloudAccountId && { ibmCloudAccountId }),
        ...(ibmCloudAccountName && { ibmCloudAccountName }),
      },
      workspaceCount: workspaces.length,
    });
  } catch (err) {
    const error = err as Error & { statusCode?: number; body?: string };
    logger.error('PowerVS workspace discovery failed', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body?.substring(0, 500),
    });

    // Don't mask Resource Controller errors as "Invalid API key"
    // The token exchanged fine — this is a workspace discovery failure
    res.status(502).json({
      valid: false,
      error: 'Workspace discovery failed',
      message: `Unable to discover PowerVS workspaces: ${error.message}`,
    });
  }
});

export default router;
