import axios from 'axios';
import type { AccountInfo } from '@/types/resources';
import type { CollectionProgress, CollectionError } from '@/contexts/DataContext';
import { createLogger } from '@/utils/logger';

const log = createLogger('API');

let currentApiKey: string | null = null;

export function setApiKeyForRequests(key: string | null): void {
  currentApiKey = key;
}

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (currentApiKey) {
    config.headers['X-API-Key'] = currentApiKey;
  }
  return config;
});

export async function validateApiKey(apiKey: string): Promise<AccountInfo> {
  log.info('Validating API key');
  const response = await apiClient.post<{ valid: boolean; account: AccountInfo }>(
    '/auth/validate',
    {},
    { headers: { 'X-API-Key': apiKey } },
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
  options?: { skipBilling?: boolean }
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const params = new URLSearchParams();
      if (options?.skipBilling) params.set('skipBilling', '1');
      const qs = params.toString();
      const url = `/api/collect/stream${qs ? `?${qs}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'text/event-stream',
        },
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

export async function fetchVPCPricing(): Promise<import('@/types/migration').VPCPricingData> {
  log.info('Fetching VPC pricing');
  const response = await apiClient.get<import('@/types/migration').VPCPricingData>('/migration/pricing');
  log.info('VPC pricing loaded', response.data.generatedAt);
  return response.data;
}

export default apiClient;
