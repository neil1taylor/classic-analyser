import type { IAMTokenResponse } from './types.js';
import logger from '../../utils/logger.js';

const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export class VMwareClient {
  private apiKey: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static fromIamToken(token: string): VMwareClient {
    const client = Object.create(VMwareClient.prototype) as VMwareClient;
    client.apiKey = '';
    client.accessToken = token;
    client.tokenExpiry = Date.now() / 1000 + 3600;
    return client;
  }

  async exchangeToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() / 1000 < this.tokenExpiry - 60) {
      return this.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: this.apiKey,
    });

    const response = await fetch(IAM_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`IAM token exchange failed: ${response.status} ${response.statusText} ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json() as IAMTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = data.expiration;

    logger.info('IAM token exchange successful');
    return this.accessToken;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.exchangeToken();
      return true;
    } catch (err) {
      const error = err as Error;
      logger.warn('VMware IAM token exchange failed — VMware collection will be skipped', {
        message: error.message,
      });
      return false;
    }
  }

  async request<T>(method: string, url: string, options?: { body?: unknown }): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.exchangeToken();

        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
        };

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const statusCode = response.status;

          if ((statusCode === 429 || statusCode === 503) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 4000;
            logger.warn('VMware API rate limited or unavailable, retrying', {
              url,
              statusCode,
              attempt: attempt + 1,
              retryInMs: delay,
            });
            await this.sleep(delay);
            continue;
          }

          let errorBody = '';
          try {
            errorBody = await response.text();
          } catch {
            // ignore read errors
          }

          const error = new Error(
            `VMware API error: ${statusCode} ${response.statusText}`
          ) as Error & { statusCode: number; body: string };
          error.statusCode = statusCode;
          error.body = errorBody;
          throw error;
        }

        const data = await response.json() as T;
        // Log the top-level keys of the response for debugging API structure
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          logger.debug('VMware API response keys', {
            url,
            keys: Object.keys(data as Record<string, unknown>),
          });
        } else if (Array.isArray(data)) {
          logger.debug('VMware API response is array', {
            url,
            length: (data as unknown[]).length,
          });
        }
        return data;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 429 || error.statusCode === 503) {
          if (attempt >= MAX_RETRIES) throw error;
          continue;
        }
        if (attempt < MAX_RETRIES && !error.statusCode) {
          const delay = RETRY_DELAYS[attempt] || 4000;
          logger.warn('VMware API network error, retrying', {
            url,
            message: error.message,
            attempt: attempt + 1,
            retryInMs: delay,
          });
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
