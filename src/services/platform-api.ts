import type { PlatformCollectionProgress, PlatformCollectionError } from '@/contexts/PlatformDataContext';
import { createLogger } from '@/utils/logger';

const log = createLogger('Platform-API');

interface PlatformSSECallbacks {
  onProgress: (progress: PlatformCollectionProgress) => void;
  onData: (resourceKey: string, items: unknown[]) => void;
  onError: (error: PlatformCollectionError) => void;
  onComplete: (duration: number) => void;
}

export function collectPlatformDataStream(
  apiKey: string,
  { onProgress, onData, onError, onComplete }: PlatformSSECallbacks,
  authConfig?: { authMode?: 'apikey' | 'iam'; iamToken?: string },
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const url = '/api/platform/collect/stream';

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
            processPlatformSSEEvent(currentEvent, currentData, { onProgress, onData, onError, onComplete });
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
          processPlatformSSEEvent(evt, dat, { onProgress, onData, onError, onComplete });
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error during Platform Services collection';
      onError({ resourceType: 'connection', message });
    }
  })();

  return controller;
}

function processPlatformSSEEvent(
  event: string,
  data: string,
  callbacks: PlatformSSECallbacks,
): void {
  try {
    const parsed = JSON.parse(data);

    switch (event) {
      case 'progress':
        callbacks.onProgress(parsed as PlatformCollectionProgress);
        break;
      case 'data':
        if (parsed.resourceKey && Array.isArray(parsed.items)) {
          callbacks.onData(parsed.resourceKey, parsed.items);
        }
        break;
      case 'error':
        callbacks.onError(parsed as PlatformCollectionError);
        break;
      case 'complete':
        callbacks.onComplete(parsed.duration ?? 0);
        break;
    }
  } catch (err) {
    log.warn('Failed to parse Platform SSE event:', event, err);
  }
}

export async function exportPlatformData(
  data: Record<string, unknown[]>,
  accountName: string,
): Promise<Blob> {
  log.info('Exporting Platform Services data');
  const response = await fetch('/api/platform/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'platform-export',
    },
    body: JSON.stringify({ data, accountName }),
  });

  if (!response.ok) {
    throw new Error(`Platform Services export failed: ${response.status}`);
  }

  return response.blob();
}
