import type { IAMTokenResponse } from './types.js';
import logger from '../../utils/logger.js';

const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';
const VPC_API_VERSION = '2024-06-01';
const TRANSIT_GW_API_BASE = 'https://transit.cloud.ibm.com';
const TRANSIT_GW_API_VERSION = '2024-01-01';
const DIRECT_LINK_API_BASE = 'https://directlink.cloud.ibm.com';
const DIRECT_LINK_API_VERSION = '2024-06-01';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout per request

export class VpcClient {
  private apiKey: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static fromIamToken(token: string): VpcClient {
    const client = Object.create(VpcClient.prototype) as VpcClient;
    client.apiKey = '';
    client.accessToken = token;
    client.tokenExpiry = Date.now() / 1000 + 3600;
    return client;
  }

  /**
   * Extract account ID from cached IAM token JWT.
   * The token contains an account.bss claim with the account ID.
   */
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
        'Accept': 'application/json',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`IAM token exchange failed: ${response.status} ${response.statusText} ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json() as IAMTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = data.expiration;

    logger.info('VPC IAM token exchange successful');
    return this.accessToken;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.exchangeToken();
      return true;
    } catch (err) {
      const error = err as Error;
      logger.warn('VPC IAM token exchange failed', { message: error.message });
      return false;
    }
  }

  async request<T>(region: string, path: string): Promise<T> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `https://${region}.iaas.cloud.ibm.com/v1/${path}${separator}version=${VPC_API_VERSION}&generation=2`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.exchangeToken();

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          const statusCode = response.status;

          if ((statusCode === 429 || statusCode === 503) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 4000;
            logger.warn('VPC API rate limited, retrying', {
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
            `VPC API error: ${statusCode} ${response.statusText}`
          ) as Error & { statusCode: number; body: string };
          error.statusCode = statusCode;
          error.body = errorBody;
          throw error;
        }

        return await response.json() as T;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 429 || error.statusCode === 503) {
          if (attempt >= MAX_RETRIES) throw error;
          continue;
        }
        if (attempt < MAX_RETRIES && !error.statusCode) {
          const delay = RETRY_DELAYS[attempt] || 4000;
          logger.warn('VPC API network error, retrying', {
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
   * Fetch all pages for a paginated VPC API endpoint.
   * VPC APIs use cursor-based pagination via `next.href`.
   */
  async requestAllPages<T>(region: string, path: string, itemsKey: string): Promise<T[]> {
    const allItems: T[] = [];
    let currentPath = path;

    while (currentPath) {
      const response = await this.request<Record<string, unknown>>(region, currentPath);
      const items = response[itemsKey] as T[] | undefined;
      if (items && Array.isArray(items)) {
        allItems.push(...items);
      }

      const next = response.next as { href?: string } | undefined;
      if (next?.href) {
        // Extract path from full URL — the href is absolute
        try {
          const nextUrl = new URL(next.href);
          currentPath = nextUrl.pathname.replace('/v1/', '') + nextUrl.search;
        } catch {
          break;
        }
      } else {
        break;
      }
    }

    return allItems;
  }

  /**
   * Make a request to the Transit Gateway API (different base URL).
   */
  async requestTransitGateway<T>(path: string): Promise<T> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${TRANSIT_GW_API_BASE}/v1/${path}${separator}version=${TRANSIT_GW_API_VERSION}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.exchangeToken();

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          const statusCode = response.status;

          if ((statusCode === 429 || statusCode === 503) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 4000;
            logger.warn('Transit GW API rate limited, retrying', {
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
            `Transit GW API error: ${statusCode} ${response.statusText}`
          ) as Error & { statusCode: number; body: string };
          error.statusCode = statusCode;
          error.body = errorBody;
          throw error;
        }

        return await response.json() as T;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 429 || error.statusCode === 503) {
          if (attempt >= MAX_RETRIES) throw error;
          continue;
        }
        if (attempt < MAX_RETRIES && !error.statusCode) {
          const delay = RETRY_DELAYS[attempt] || 4000;
          logger.warn('Transit GW API network error, retrying', {
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
   * Make a POST request to the Transit Gateway API.
   */
  async postTransitGateway<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${TRANSIT_GW_API_BASE}/v1/${path}${separator}version=${TRANSIT_GW_API_VERSION}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.exchangeToken();

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          const statusCode = response.status;

          if ((statusCode === 429 || statusCode === 503) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 4000;
            logger.warn('Transit GW API POST rate limited, retrying', {
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
            `Transit GW API POST error: ${statusCode} ${response.statusText}`
          ) as Error & { statusCode: number; body: string };
          error.statusCode = statusCode;
          error.body = errorBody;
          throw error;
        }

        return await response.json() as T;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 429 || error.statusCode === 503) {
          if (attempt >= MAX_RETRIES) throw error;
          continue;
        }
        if (attempt < MAX_RETRIES && !error.statusCode) {
          const delay = RETRY_DELAYS[attempt] || 4000;
          logger.warn('Transit GW API POST network error, retrying', {
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
   * Fetch all pages for a paginated Transit Gateway API endpoint.
   */
  async requestAllTransitGatewayPages<T>(path: string, itemsKey: string): Promise<T[]> {
    const allItems: T[] = [];
    let currentPath = path;

    while (currentPath) {
      const response = await this.requestTransitGateway<Record<string, unknown>>(currentPath);
      const items = response[itemsKey] as T[] | undefined;
      if (items && Array.isArray(items)) {
        allItems.push(...items);
      }

      const next = response.next as { href?: string } | undefined;
      if (next?.href) {
        try {
          const nextUrl = new URL(next.href);
          currentPath = nextUrl.pathname.replace('/v1/', '') + nextUrl.search;
        } catch {
          break;
        }
      } else {
        break;
      }
    }

    return allItems;
  }

  /**
   * Make a request to the Direct Link API (different base URL).
   */
  async requestDirectLink<T>(path: string): Promise<T> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${DIRECT_LINK_API_BASE}/v1/${path}${separator}version=${DIRECT_LINK_API_VERSION}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.exchangeToken();

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          const statusCode = response.status;

          if ((statusCode === 429 || statusCode === 503) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 4000;
            logger.warn('Direct Link API rate limited, retrying', {
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
            `Direct Link API error: ${statusCode} ${response.statusText}`
          ) as Error & { statusCode: number; body: string };
          error.statusCode = statusCode;
          error.body = errorBody;
          throw error;
        }

        return await response.json() as T;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 429 || error.statusCode === 503) {
          if (attempt >= MAX_RETRIES) throw error;
          continue;
        }
        if (attempt < MAX_RETRIES && !error.statusCode) {
          const delay = RETRY_DELAYS[attempt] || 4000;
          logger.warn('Direct Link API network error, retrying', {
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
   * Fetch all pages for a paginated Direct Link API endpoint.
   */
  async requestAllDirectLinkPages<T>(path: string, itemsKey: string): Promise<T[]> {
    const allItems: T[] = [];
    let currentPath = path;

    while (currentPath) {
      const response = await this.requestDirectLink<Record<string, unknown>>(currentPath);
      const items = response[itemsKey] as T[] | undefined;
      if (items && Array.isArray(items)) {
        allItems.push(...items);
      }

      const next = response.next as { href?: string } | undefined;
      if (next?.href) {
        try {
          const nextUrl = new URL(next.href);
          currentPath = nextUrl.pathname.replace('/v1/', '') + nextUrl.search;
        } catch {
          break;
        }
      } else {
        break;
      }
    }

    return allItems;
  }

  /**
   * Make a DELETE request to the Transit Gateway API.
   */
  async deleteTransitGateway(path: string): Promise<void> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${TRANSIT_GW_API_BASE}/v1/${path}${separator}version=${TRANSIT_GW_API_VERSION}`;

    try {
      const token = await this.exchangeToken();

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      // 204 No Content is the expected success response; 404 means already gone
      if (!response.ok && response.status !== 204 && response.status !== 404) {
        logger.warn(`Transit GW DELETE failed: ${response.status} ${response.statusText}`, { path });
      }
    } catch (err) {
      const error = err as Error;
      logger.warn('Transit GW DELETE error', { path, message: error.message });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
