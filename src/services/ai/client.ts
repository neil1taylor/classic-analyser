/**
 * AI client for watsonx.ai chat endpoints.
 * Supports both regular POST and SSE streaming.
 */
import type { AIChatMessage } from '@/types/ai';
import axios from 'axios';

const TIMEOUT_MS = 30_000;

interface ChatRequest {
  messages: AIChatMessage[];
  context?: Record<string, unknown>;
  modelTier?: 'fast' | 'complex';
}

interface ChatResponse {
  response: string;
}

/**
 * Send a chat message and receive a complete response.
 * Returns null on failure (graceful degradation).
 */
export async function sendChatMessage(
  request: ChatRequest,
  apiKey: string,
): Promise<string | null> {
  try {
    const res = await axios.post<ChatResponse>('/api/ai/chat', request, {
      timeout: TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });
    return res.data?.response ?? null;
  } catch {
    return null;
  }
}

/**
 * Stream a chat response via SSE.
 * Calls onToken for each token received, onDone when complete, onError on failure.
 * Returns an abort function.
 */
export function streamChatMessage(
  request: ChatRequest,
  apiKey: string,
  callbacks: {
    onToken: (text: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  },
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        callbacks.onError(`AI service returned ${response.status}`);
        return;
      }

      if (!response.body) {
        callbacks.onError('No response body');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                callbacks.onDone();
                return;
              }
              try {
                const parsed = JSON.parse(data) as { text?: string; error?: string };
                if (parsed.error) {
                  callbacks.onError(parsed.error);
                  return;
                }
                if (parsed.text) {
                  callbacks.onToken(parsed.text);
                }
              } catch {
                // Skip unparseable events
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      callbacks.onDone();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError((err as Error).message || 'Stream failed');
      }
    }
  })();

  return () => controller.abort();
}
