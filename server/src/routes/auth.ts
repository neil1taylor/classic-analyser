import { Router } from 'express';
import type { Request, Response } from 'express';
import { SoftLayerClient } from '../services/softlayer/client.js';
import { VpcClient } from '../services/vpc/client.js';
import { PowerVsClient } from '../services/powervs/client.js';
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

// --- OAuth 2.0 PKCE endpoints ---

router.get('/oauth/config', (_req: Request, res: Response): void => {
  const clientId = process.env.IBM_OAUTH_CLIENT_ID;
  const redirectUri = process.env.IBM_OAUTH_REDIRECT_URI;

  if (!clientId) {
    res.status(501).json({ error: 'OAuth not configured', message: 'IBM_OAUTH_CLIENT_ID is not set.' });
    return;
  }

  res.json({
    clientId,
    authorizationEndpoint: 'https://iam.cloud.ibm.com/identity/authorize',
    redirectUri: redirectUri || `${_req.protocol}://${_req.get('host')}/auth/callback`,
  });
});

router.post('/oauth/token', async (req: Request, res: Response): Promise<void> => {
  const { code, code_verifier, redirect_uri } = req.body as {
    code?: string;
    code_verifier?: string;
    redirect_uri?: string;
  };

  if (!code || !code_verifier) {
    res.status(400).json({ error: 'Missing code or code_verifier' });
    return;
  }

  const clientId = process.env.IBM_OAUTH_CLIENT_ID;
  if (!clientId) {
    res.status(501).json({ error: 'OAuth not configured' });
    return;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier,
      client_id: clientId,
      redirect_uri: redirect_uri || process.env.IBM_OAUTH_REDIRECT_URI || '',
    });

    const resp = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });

    if (!resp.ok) {
      const errorBody = await resp.text().catch(() => '');
      logger.error('OAuth token exchange failed', { status: resp.status, body: errorBody.substring(0, 200) });
      res.status(resp.status).json({ error: 'Token exchange failed', message: errorBody.substring(0, 200) });
      return;
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    const error = err as Error;
    logger.error('OAuth token exchange error', { message: error.message });
    res.status(502).json({ error: 'Token exchange failed', message: error.message });
  }
});

router.post('/oauth/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refresh_token } = req.body as { refresh_token?: string };

  if (!refresh_token) {
    res.status(400).json({ error: 'Missing refresh_token' });
    return;
  }

  const clientId = process.env.IBM_OAUTH_CLIENT_ID;
  if (!clientId) {
    res.status(501).json({ error: 'OAuth not configured' });
    return;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: clientId,
    });

    const resp = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });

    if (!resp.ok) {
      const errorBody = await resp.text().catch(() => '');
      res.status(resp.status).json({ error: 'Token refresh failed', message: errorBody.substring(0, 200) });
      return;
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    const error = err as Error;
    res.status(502).json({ error: 'Token refresh failed', message: error.message });
  }
});

router.post('/oauth/revoke', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({ error: 'Missing token' });
    return;
  }

  const clientId = process.env.IBM_OAUTH_CLIENT_ID;
  if (!clientId) {
    res.status(501).json({ error: 'OAuth not configured' });
    return;
  }

  try {
    const body = new URLSearchParams({
      token,
      client_id: clientId,
      token_type_hint: 'refresh_token',
    });

    await fetch('https://iam.cloud.ibm.com/identity/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    res.json({ revoked: true });
  } catch (err) {
    const error = err as Error;
    logger.warn('Token revocation failed (non-fatal)', { message: error.message });
    res.json({ revoked: false, message: error.message });
  }
});

router.post('/validate-iam', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers['authorization'] as string | undefined;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }

  const iamToken = authHeader.slice(7).trim();

  const accountId = extractAccountIdFromToken(iamToken);

  const [classicResult, vpcResult, powerVsResult] = await Promise.allSettled([
    (async () => {
      const client = SoftLayerClient.fromIamToken(iamToken);
      return client.request<SLAccount>({
        service: 'SoftLayer_Account',
        method: 'getObject',
        objectMask: 'mask[id,companyName,email,firstName,lastName]',
      });
    })(),
    (async () => {
      const client = VpcClient.fromIamToken(iamToken);
      await client.request('us-south', 'vpcs?limit=1');
      return true;
    })(),
    (async () => {
      const client = PowerVsClient.fromIamToken(iamToken);
      const { discoverPowerVsWorkspaces } = await import('../services/powervs/workspaces.js');
      const workspaces = await discoverPowerVsWorkspaces(client);
      return workspaces.length > 0;
    })(),
  ]);

  const classicOk = classicResult.status === 'fulfilled';
  const vpcOk = vpcResult.status === 'fulfilled';
  const powerVsOk = powerVsResult.status === 'fulfilled' && powerVsResult.value === true;

  if (!classicOk && !vpcOk && !powerVsOk) {
    res.status(401).json({
      valid: false,
      error: 'Invalid token',
      message: 'The IAM token does not have access to any supported infrastructure domain.',
    });
    return;
  }

  const mode: string[] = [];
  if (classicOk) mode.push('classic');
  if (vpcOk) mode.push('vpc');
  if (powerVsOk) mode.push('powervs');

  let account: Record<string, unknown> = {};
  if (classicOk) {
    const slAccount = classicResult.value;
    account = {
      id: slAccount.id,
      companyName: slAccount.companyName,
      email: slAccount.email,
      firstName: slAccount.firstName,
      lastName: slAccount.lastName,
    };
  }

  if (accountId) {
    account.ibmCloudAccountId = accountId;
    try {
      const name = await getIbmCloudAccountName(accountId, iamToken);
      if (name) account.ibmCloudAccountName = name;
    } catch {
      // non-fatal
    }
  }

  if (!classicOk) {
    account.id = 0;
    account.companyName = (account.ibmCloudAccountName as string) || 'IBM Cloud Account';
    account.email = '';
    account.firstName = '';
    account.lastName = '';
  }

  logger.info('IAM token validated', { mode, accountId });

  res.json({
    valid: true,
    account,
    infrastructureMode: mode,
  });
});

export default router;
