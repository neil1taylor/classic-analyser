/**
 * Shared IAM token exchange and account info utilities.
 * Used by Classic, VPC, and PowerVS auth routes.
 */

/**
 * Exchange an IBM Cloud API key for an IAM access token.
 */
export async function getIamToken(apiKey: string): Promise<string> {
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
export function extractAccountIdFromToken(token: string): string | null {
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
export async function getIbmCloudAccountName(
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
