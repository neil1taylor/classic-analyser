import { config } from '../config.js';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

const TOKEN_CACHE_MS = 30 * 60 * 1000; // 30 minutes
const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';

export async function getIAMToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(IAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(config.WATSONX_API_KEY)}`,
  });

  if (!response.ok) {
    throw new Error(`IAM token request failed: ${response.status}`);
  }

  const data = await response.json() as { access_token: string };
  cachedToken = data.access_token;
  tokenExpiry = now + TOKEN_CACHE_MS;

  return cachedToken;
}
