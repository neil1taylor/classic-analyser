import type { IAMTokenResponse } from './types.js';
import logger from '../../utils/logger.js';

const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

// Zone-to-region mapping for PowerVS API endpoints
const ZONE_TO_REGION: Record<string, string> = {
  dal10: 'us-south',
  dal12: 'us-south',
  dal14: 'us-south',
  'us-south': 'us-south',
  'us-east': 'us-east',
  wdc06: 'us-east',
  wdc07: 'us-east',
  tor01: 'tor',
  tor04: 'tor',
  tor05: 'tor',
  mon01: 'mon',
  sao01: 'sao',
  sao04: 'sao',
  sao05: 'sao',
  'eu-de-1': 'eu-de',
  'eu-de-2': 'eu-de',
  lon04: 'lon',
  lon06: 'lon',
  mad02: 'mad',
  mad04: 'mad',
  syd04: 'syd',
  syd05: 'syd',
  tok04: 'tok',
  osa21: 'osa',
};

export function zoneToApiRegion(zone: string): string {
  return ZONE_TO_REGION[zone] ?? zone;
}

export class PowerVsClient {
  private apiKey: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getAccountId(): string | null {
    if (!this.accessToken) return null;
    try {
      const parts = this.accessToken.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return payload?.account?.bss ?? null;
    } catch {
      return null;
    }
  }

  async exchangeToken(): Promise<string> {
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
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `IAM token exchange failed: ${response.status} ${response.statusText} ${errorBody.substring(0, 200)}`,
      );
    }

    const data = (await response.json()) as IAMTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = data.expiration;

    logger.info('PowerVS IAM token exchange successful');
    return this.accessToken;
  }

  /**
   * Make a GET request to the PowerVS API.
   * @param region - API region (e.g. 'us-south')
   * @param cloudInstanceId - Workspace GUID
   * @param path - API path after /pcloud/v1/cloud-instances/{id}/
   * @param crn - Full workspace CRN (sent as CRN header)
   */
  async request<T>(
    region: string,
    cloudInstanceId: string,
    path: string,
    crn: string,
  ): Promise<T> {
    const url = `https://${region}.power-iaas.cloud.ibm.com/pcloud/v1/cloud-instances/${cloudInstanceId}/${path}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.exchangeToken();

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            CRN: crn,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const statusCode = response.status;

          if ((statusCode === 429 || statusCode === 503) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 4000;
            logger.warn('PowerVS API rate limited, retrying', {
              url: path,
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
            // ignore
          }

          const error = new Error(
            `PowerVS API error: ${statusCode} ${response.statusText}`,
          ) as Error & { statusCode: number; body: string };
          error.statusCode = statusCode;
          error.body = errorBody;
          throw error;
        }

        return (await response.json()) as T;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 429 || error.statusCode === 503) {
          if (attempt >= MAX_RETRIES) throw error;
          continue;
        }
        if (attempt < MAX_RETRIES && !error.statusCode) {
          const delay = RETRY_DELAYS[attempt] || 4000;
          logger.warn('PowerVS API network error, retrying', {
            url: path,
            message: error.message,
            attempt: attempt + 1,
          });
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Make a GET request to the PowerVS v1 API (non-pcloud endpoints).
   * URL pattern: https://{region}.power-iaas.cloud.ibm.com/v1/{path}
   * Used for newer resources like SSH keys, network security groups, host groups.
   */
  async requestV1<T>(
    region: string,
    path: string,
    crn: string,
  ): Promise<T> {
    const url = `https://${region}.power-iaas.cloud.ibm.com/v1/${path}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.exchangeToken();

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            CRN: crn,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const statusCode = response.status;

          if ((statusCode === 429 || statusCode === 503) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 4000;
            logger.warn('PowerVS v1 API rate limited, retrying', {
              url: path,
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
            // ignore
          }

          const error = new Error(
            `PowerVS v1 API error: ${statusCode} ${response.statusText}`,
          ) as Error & { statusCode: number; body: string };
          error.statusCode = statusCode;
          error.body = errorBody;
          throw error;
        }

        return (await response.json()) as T;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 429 || error.statusCode === 503) {
          if (attempt >= MAX_RETRIES) throw error;
          continue;
        }
        if (attempt < MAX_RETRIES && !error.statusCode) {
          const delay = RETRY_DELAYS[attempt] || 4000;
          logger.warn('PowerVS v1 API network error, retrying', {
            url: path,
            message: error.message,
            attempt: attempt + 1,
          });
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Make a GET request to the IBM Cloud Resource Controller API.
   */
  async requestResourceController<T>(path: string): Promise<T> {
    const url = `https://resource-controller.cloud.ibm.com${path}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.exchangeToken();

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const statusCode = response.status;

          if ((statusCode === 429 || statusCode === 503) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 4000;
            await this.sleep(delay);
            continue;
          }

          let errorBody = '';
          try {
            errorBody = await response.text();
          } catch {
            // ignore
          }

          const error = new Error(
            `Resource Controller API error: ${statusCode} ${response.statusText}`,
          ) as Error & { statusCode: number; body: string };
          error.statusCode = statusCode;
          error.body = errorBody;
          throw error;
        }

        const data = (await response.json()) as T;
        logger.debug('Resource Controller response', {
          path: path.substring(0, 100),
          status: response.status,
          dataKeys: Object.keys(data as Record<string, unknown>),
        });
        return data;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (attempt < MAX_RETRIES && (!error.statusCode || error.statusCode === 429 || error.statusCode === 503)) {
          const delay = RETRY_DELAYS[attempt] || 4000;
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
