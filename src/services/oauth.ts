import { createLogger } from '@/utils/logger';

const log = createLogger('OAuth');

export function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface OAuthConfig {
  clientId: string;
  authorizationEndpoint: string;
  redirectUri: string;
}

export async function fetchOAuthConfig(): Promise<OAuthConfig> {
  const response = await fetch('/api/auth/oauth/config');
  if (!response.ok) {
    throw new Error(`OAuth not configured: ${response.status}`);
  }
  return response.json();
}

export async function buildAuthorizationUrl(codeChallenge: string): Promise<string> {
  const config = await fetchOAuthConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: 'openid',
  });
  return `${config.authorizationEndpoint}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  log.info('Exchanging authorization code for tokens');
  const config = await fetchOAuthConfig();
  const response = await fetch('/api/auth/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message || `Token exchange failed: ${response.status}`);
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
