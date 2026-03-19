// Retry utility with exponential backoff for API calls

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  retryableErrors?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryableErrors'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

/**
 * Determine if an error is retryable (transient)
 * - Network errors
 * - Timeout errors
 * - 5xx server errors
 * - 429 rate limiting
 *
 * NOTE: AbortErrors are NOT retryable - they are intentional cancellations
 * (e.g., React StrictMode cleanup, user navigation, etc.)
 */
export function isRetryableError(error: Error): boolean {
  if (error.name === 'AbortError') {
    return false;
  }

  const message = error.message.toLowerCase();

  if (message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout')) {
    return true;
  }

  const statusMatch = message.match(/\b(5\d{2}|429)\b/);
  if (statusMatch) {
    return true;
  }

  return false;
}

function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffFactor: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  const jitter = cappedDelay * (0.75 + Math.random() * 0.5);
  return Math.round(jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffFactor,
  } = { ...DEFAULT_OPTIONS, ...options };

  const shouldRetry = options?.retryableErrors || isRetryableError;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries && shouldRetry(lastError)) {
        const delayMs = calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffFactor);
        options?.onRetry?.(lastError, attempt + 1, delayMs);
        await sleep(delayMs);
      } else {
        throw lastError;
      }
    }
  }

  throw lastError;
}

export function createRetryWrapper<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: RetryOptions
): (...args: TArgs) => Promise<TReturn> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}
