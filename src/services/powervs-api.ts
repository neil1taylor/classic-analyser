import type { PowerVsCollectionProgress, PowerVsCollectionError } from '@/contexts/PowerVsDataContext';
import { createLogger } from '@/utils/logger';
import { withRetry } from '@/utils/retry';

const log = createLogger('PowerVS-API');

export interface PowerVsAuthResult {
  valid: boolean;
  account?: {
    ibmCloudAccountId?: string;
    ibmCloudAccountName?: string;
  };
  workspaceCount?: number;
}

export async function validatePowerVsApiKey(apiKey: string): Promise<PowerVsAuthResult> {
  log.info('Validating PowerVS API key via IAM');
  return withRetry(
    async () => {
      const response = await fetch('/api/powervs/auth/validate', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`PowerVS auth validation failed: ${response.status}`);
      }

      return response.json();
    },
    { onRetry: (err, attempt) => log.warn(`PowerVS API key validation retry ${attempt}:`, err.message) },
  );
}

interface PowerVsSSECallbacks {
  onProgress: (progress: PowerVsCollectionProgress) => void;
  onData: (resourceKey: string, items: unknown[]) => void;
  onError: (error: PowerVsCollectionError) => void;
  onComplete: (duration: number) => void;
  onMetadata?: (metadata: { userAccountId?: string }) => void;
}

export function collectPowerVsDataStream(
  apiKey: string,
  { onProgress, onData, onError, onComplete, onMetadata }: PowerVsSSECallbacks,
  authConfig?: { authMode?: 'apikey' | 'iam'; iamToken?: string },
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const url = '/api/powervs/collect/stream';

      const response = await fetch(url, {
        method: 'GET',
        headers: authConfig?.authMode === 'iam'
          ? { 'Authorization': `Bearer ${authConfig.iamToken}`, 'Accept': 'text/event-stream' }
          : { 'X-API-Key': apiKey, 'Accept': 'text/event-stream' },
        signal: controller.signal,
      });

      if (!response.ok) {
        onError({ resourceType: 'connection', message: `HTTP ${response.status}: ${response.statusText}` });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError({ resourceType: 'connection', message: 'No readable stream available' });
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
            processPowerVsSSEEvent(currentEvent, currentData, { onProgress, onData, onError, onComplete, onMetadata });
            currentEvent = '';
            currentData = '';
          }
        }
      }

      // Process any remaining buffered event
      if (buffer.trim()) {
        const remainingLines = buffer.split('\n');
        let evt = '';
        let dat = '';
        for (const line of remainingLines) {
          if (line.startsWith('event:')) evt = line.slice(6).trim();
          else if (line.startsWith('data:')) dat = line.slice(5).trim();
        }
        if (evt && dat) {
          processPowerVsSSEEvent(evt, dat, { onProgress, onData, onError, onComplete, onMetadata });
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error during PowerVS collection';
      onError({ resourceType: 'connection', message });
    }
  })();

  return controller;
}

function processPowerVsSSEEvent(
  event: string,
  data: string,
  callbacks: PowerVsSSECallbacks,
): void {
  try {
    const parsed = JSON.parse(data);

    switch (event) {
      case 'progress':
        callbacks.onProgress(parsed as PowerVsCollectionProgress);
        break;
      case 'data':
        if (parsed.resourceKey && Array.isArray(parsed.items)) {
          callbacks.onData(parsed.resourceKey, parsed.items);
        }
        break;
      case 'error':
        callbacks.onError(parsed as PowerVsCollectionError);
        break;
      case 'complete':
        callbacks.onComplete(parsed.duration ?? 0);
        break;
      case 'metadata':
        if (callbacks.onMetadata) {
          callbacks.onMetadata(parsed as { userAccountId?: string });
        }
        break;
    }
  } catch (err) {
    log.warn('Failed to parse PowerVS SSE event:', event, err);
  }
}

export async function exportPowerVsData(
  data: Record<string, unknown[]>,
  accountName: string,
): Promise<Blob> {
  log.info('Exporting PowerVS data');
  const response = await fetch('/api/powervs/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'powervs-export',
    },
    body: JSON.stringify({ data, accountName }),
  });

  if (!response.ok) {
    throw new Error(`PowerVS export failed: ${response.status}`);
  }

  return response.blob();
}
