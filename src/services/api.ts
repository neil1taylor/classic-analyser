import axios from 'axios';
import type { AccountInfo } from '@/types/resources';
import type { CollectionProgress, CollectionError } from '@/contexts/DataContext';
import { createLogger } from '@/utils/logger';
import { withRetry } from '@/utils/retry';

const log = createLogger('API');

let currentApiKey: string | null = null;
let currentIamToken: string | null = null;
let currentAuthMode: 'apikey' | 'iam' | null = null;

export function setAuthForRequests(mode: 'apikey' | 'iam' | null, key?: string | null, token?: string | null): void {
  currentAuthMode = mode;
  currentApiKey = key ?? null;
  currentIamToken = token ?? null;
}

export function setApiKeyForRequests(key: string | null): void {
  setAuthForRequests(key ? 'apikey' : null, key);
}

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (currentAuthMode === 'iam' && currentIamToken) {
    config.headers['Authorization'] = `Bearer ${currentIamToken}`;
  } else if (currentApiKey) {
    config.headers['X-API-Key'] = currentApiKey;
  }
  return config;
});

export async function validateApiKey(apiKey: string): Promise<AccountInfo> {
  log.info('Validating API key');
  const response = await withRetry(
    () => apiClient.post<{ valid: boolean; account: AccountInfo }>(
      '/auth/validate',
      {},
      { headers: { 'X-API-Key': apiKey } },
    ),
    { onRetry: (err, attempt) => log.warn(`API key validation retry ${attempt}:`, err.message) },
  );
  setApiKeyForRequests(apiKey);
  log.info('API key validated, account:', response.data.account.companyName);
  return response.data.account;
}

export async function exportData(
  data: Record<string, unknown[]>,
  accountName: string
): Promise<Blob> {
  log.info('Exporting data for account:', accountName);
  const response = await apiClient.post('/export', { data, accountName }, {
    responseType: 'blob',
  });
  log.info('Export complete');
  return response.data as Blob;
}

interface SSECallbacks {
  onProgress: (progress: CollectionProgress) => void;
  onData: (resourceKey: string, items: unknown[]) => void;
  onError: (error: CollectionError) => void;
  onComplete: (duration: number) => void;
}

export function collectDataStream(
  apiKey: string,
  { onProgress, onData, onError, onComplete }: SSECallbacks,
  options?: { skipBilling?: boolean; collectDiskUtil?: boolean },
  authConfig?: { authMode?: 'apikey' | 'iam'; iamToken?: string }
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const params = new URLSearchParams();
      if (options?.skipBilling) params.set('skipBilling', '1');
      if (options?.collectDiskUtil) params.set('diskUtil', '1');
      const qs = params.toString();
      const url = `/api/collect/stream${qs ? `?${qs}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: authConfig?.authMode === 'iam'
          ? { 'Authorization': `Bearer ${authConfig.iamToken}`, 'Accept': 'text/event-stream' }
          : { 'X-API-Key': apiKey, 'Accept': 'text/event-stream' },
        signal: controller.signal,
      });

      if (!response.ok) {
        onError({ resource: 'connection', message: `HTTP ${response.status}: ${response.statusText}` });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError({ resource: 'connection', message: 'No readable stream available' });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let currentData = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line === '' && currentEvent && currentData) {
            processSSEEvent(currentEvent, currentData, { onProgress, onData, onError, onComplete });
            currentEvent = '';
            currentData = '';
          }
        }
      }

      // Process any remaining buffered event
      if (buffer.trim()) {
        const remainingLines = buffer.split('\n');
        let currentEvent = '';
        let currentData = '';
        for (const line of remainingLines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          }
        }
        if (currentEvent && currentData) {
          processSSEEvent(currentEvent, currentData, { onProgress, onData, onError, onComplete });
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error during collection';
      onError({ resource: 'connection', message });
    }
  })();

  return controller;
}

function processSSEEvent(
  event: string,
  data: string,
  callbacks: SSECallbacks
): void {
  try {
    const parsed = JSON.parse(data);

    switch (event) {
      case 'progress':
        callbacks.onProgress(parsed as CollectionProgress);
        break;
      case 'data':
        if (parsed.resourceKey && Array.isArray(parsed.items)) {
          callbacks.onData(parsed.resourceKey, parsed.items);
        }
        break;
      case 'error':
        callbacks.onError(parsed as CollectionError);
        break;
      case 'complete':
        callbacks.onComplete(parsed.duration ?? 0);
        break;
    }
  } catch (err) {
    log.warn('Failed to parse SSE event:', event, err);
  }
}

export async function fetchVPCPricing(region?: string): Promise<import('@/types/migration').VPCPricingData> {
  log.info('Fetching VPC pricing', region ? `for ${region}` : '');
  const params = region ? { region } : {};
  const response = await withRetry(
    () => apiClient.get<import('@/types/migration').VPCPricingData>('/migration/pricing', { params }),
    { onRetry: (err, attempt) => log.warn(`VPC pricing fetch retry ${attempt}:`, err.message) },
  );
  log.info('VPC pricing loaded', response.data.generatedAt, `region=${response.data.region}`);
  return response.data;
}

export default apiClient;
