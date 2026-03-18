import logger from '../../utils/logger.js';

const BASE_URL = 'https://api.softlayer.com/rest/v3.1';
const DEFAULT_RESULT_LIMIT = 100;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export interface SoftLayerRequestOptions {
  service: string;
  method: string;
  objectMask?: string;
  resultLimit?: number;
  offset?: number;
  additionalParams?: Record<string, string>;
}

export class SoftLayerClient {
  private authHeader: string;
  onPageProgress?: (method: string, totalSoFar: number) => void;

  constructor(apiKey: string) {
    const credentials = Buffer.from(`apikey:${apiKey}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  static fromIamToken(token: string): SoftLayerClient {
    const client = Object.create(SoftLayerClient.prototype) as SoftLayerClient;
    client.authHeader = `Bearer ${token}`;
    return client;
  }

  private buildUrl(options: SoftLayerRequestOptions): string {
    const { service, method, objectMask, resultLimit, offset, additionalParams } = options;

    // Build query string manually — SoftLayer requires unencoded brackets
    // in objectMask and unencoded commas in resultLimit.
    // URL.searchParams.set() would encode these, breaking the API calls.
    const params: string[] = [];

    if (objectMask) {
      params.push(`objectMask=${objectMask}`);
    }
    if (resultLimit !== undefined) {
      const off = offset ?? 0;
      params.push(`resultLimit=${off},${resultLimit}`);
    }
    if (additionalParams) {
      for (const [key, value] of Object.entries(additionalParams)) {
        // SoftLayer params like objectFilter need unencoded JSON
        params.push(`${key}=${value}`);
      }
    }

    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return `${BASE_URL}/${service}/${method}.json${qs}`;
  }

  async request<T>(options: SoftLayerRequestOptions): Promise<T> {
    const url = this.buildUrl(options);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const statusCode = response.status;

          if ((statusCode === 429 || statusCode === 503) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 4000;
            logger.warn('Rate limited or service unavailable, retrying', {
              service: options.service,
              method: options.method,
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

          logger.warn('SoftLayer API error response', {
            service: options.service,
            method: options.method,
            statusCode,
            body: errorBody.substring(0, 500),
          });

          const error = new Error(
            `SoftLayer API error: ${statusCode} ${response.statusText}`
          ) as Error & { statusCode: number; body: string };
          error.statusCode = statusCode;
          error.body = errorBody;
          throw error;
        }

        const data = await response.json() as T;
        return data;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 429 || error.statusCode === 503) {
          // already handled above
          if (attempt >= MAX_RETRIES) throw error;
          continue;
        }
        if (attempt < MAX_RETRIES && !error.statusCode) {
          const delay = RETRY_DELAYS[attempt] || 4000;
          logger.warn('Network error, retrying', {
            service: options.service,
            method: options.method,
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

  async requestAllPages<T>(options: Omit<SoftLayerRequestOptions, 'resultLimit' | 'offset'>): Promise<T[]> {
    const pageSize = DEFAULT_RESULT_LIMIT;
    let currentOffset = 0;
    const allResults: T[] = [];

    logger.debug('Starting paginated request', {
      service: options.service,
      method: options.method,
    });

    while (true) {
      const pageData = await this.request<T[]>({
        ...options,
        resultLimit: pageSize,
        offset: currentOffset,
      });

      if (!Array.isArray(pageData)) {
        logger.warn('Non-array response in paginated request, returning as single item', {
          service: options.service,
          method: options.method,
        });
        return [pageData as T];
      }

      allResults.push(...pageData);

      if (currentOffset > 0) {
        this.onPageProgress?.(options.method, allResults.length);
      }

      logger.debug('Page collected', {
        service: options.service,
        method: options.method,
        pageItems: pageData.length,
        totalSoFar: allResults.length,
        offset: currentOffset,
      });

      if (pageData.length < pageSize) {
        break;
      }

      currentOffset += pageSize;
    }

    logger.info('Paginated request complete', {
      service: options.service,
      method: options.method,
      totalItems: allResults.length,
    });

    return allResults;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
