import { createLogger } from '@/utils/logger';

const log = createLogger('OAuth');

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function exchangePasscodeForTokens(passcode: string): Promise<TokenResponse> {
  log.info('Exchanging passcode for tokens');
  const response = await fetch('/api/auth/passcode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message || `Passcode exchange failed: ${response.status}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  log.info('Refreshing access token');
  const response = await fetch('/api/auth/oauth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

export async function revokeToken(refreshToken: string): Promise<void> {
  log.info('Revoking refresh token');
  await fetch('/api/auth/oauth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: refreshToken }),
  }).catch(() => {
    // Best-effort revocation
  });
}

export interface IamValidationResult {
  valid: boolean;
  account: {
    id: number;
    companyName: string;
    email: string;
    firstName: string;
    lastName: string;
    ibmCloudAccountId?: string;
    ibmCloudAccountName?: string;
  };
  infrastructureMode: string[];
}

export async function validateIamToken(accessToken: string): Promise<IamValidationResult> {
  log.info('Validating IAM token against all domains');
  const response = await fetch('/api/auth/validate-iam', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message || `IAM validation failed: ${response.status}`);
  }

  return response.json();
}
