import type { VpcCollectionProgress, VpcCollectionError } from '@/contexts/VpcDataContext';
import { createLogger } from '@/utils/logger';

const log = createLogger('VPC-API');

export interface VpcAuthResult {
  valid: boolean;
  account?: {
    ibmCloudAccountId?: string;
    ibmCloudAccountName?: string;
  };
}

export async function validateVpcApiKey(apiKey: string): Promise<VpcAuthResult> {
  log.info('Validating VPC API key via IAM');
  const response = await fetch('/api/vpc/auth/validate', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`VPC auth validation failed: ${response.status}`);
  }

  return response.json();
}

interface VpcSSECallbacks {
  onProgress: (progress: VpcCollectionProgress) => void;
  onData: (resourceKey: string, items: unknown[]) => void;
  onError: (error: VpcCollectionError) => void;
  onComplete: (duration: number) => void;
  onMetadata?: (metadata: { userAccountId?: string }) => void;
}

export function collectVpcDataStream(
  apiKey: string,
  { onProgress, onData, onError, onComplete }: VpcSSECallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const url = '/api/vpc/collect/stream';

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
            processVpcSSEEvent(currentEvent, currentData, { onProgress, onData, onError, onComplete });
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
          processVpcSSEEvent(evt, dat, { onProgress, onData, onError, onComplete });
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error during VPC collection';
      onError({ resource: 'connection', message });
    }
  })();

  return controller;
}

function processVpcSSEEvent(
  event: string,
  data: string,
  callbacks: VpcSSECallbacks,
): void {
  try {
    const parsed = JSON.parse(data);

    switch (event) {
      case 'progress':
        callbacks.onProgress(parsed as VpcCollectionProgress);
        break;
      case 'data':
        if (parsed.resourceKey && Array.isArray(parsed.items)) {
          callbacks.onData(parsed.resourceKey, parsed.items);
        }
        break;
      case 'error':
        callbacks.onError(parsed as VpcCollectionError);
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
    log.warn('Failed to parse VPC SSE event:', event, err);
  }
}

export async function exportVpcData(
  data: Record<string, unknown[]>,
  accountName: string,
): Promise<Blob> {
  log.info('Exporting VPC data');
  const response = await fetch('/api/vpc/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'vpc-export', // middleware requires a key
    },
    body: JSON.stringify({ data, accountName }),
  });

  if (!response.ok) {
    throw new Error(`VPC export failed: ${response.status}`);
  }

  return response.blob();
}
