const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 50;

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

function evictOldest(): void {
  if (cache.size <= MAX_ENTRIES) return;
  const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = oldest.slice(0, cache.size - MAX_ENTRIES);
  for (const [key] of toRemove) {
    cache.delete(key);
  }
}

export function hashKey(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

export function cacheGet<T>(key: string): T | undefined {
  evictExpired();
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T): void {
  cache.set(key, { value, timestamp: Date.now() });
  evictOldest();
}

export function cacheClear(): void {
  cache.clear();
}
