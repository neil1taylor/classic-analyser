const MAX_ENTRIES = 100;
const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  value: unknown;
  createdAt: number;
}

const cache = new Map<string, CacheEntry>();

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.createdAt > TTL_MS) {
      cache.delete(key);
    }
  }
}

export function cacheGet(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(key);
    return undefined;
  }

  // Move to end for LRU behavior
  cache.delete(key);
  cache.set(key, entry);

  return entry.value;
}

export function cacheSet(key: string, value: unknown): void {
  // Remove if already exists (to update position)
  cache.delete(key);

  // Evict expired entries first
  evictExpired();

  // If still at max, remove the oldest entry (first in map)
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }

  cache.set(key, {
    value,
    createdAt: Date.now(),
  });
}
