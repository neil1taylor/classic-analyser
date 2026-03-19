import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheGet, cacheSet, cacheClear, hashKey } from './cache';

describe('AI cache', () => {
  beforeEach(() => {
    cacheClear();
  });

  describe('cacheSet / cacheGet', () => {
    it('stores and retrieves values', () => {
      cacheSet('key1', { data: 'hello' });
      expect(cacheGet<{ data: string }>('key1')).toEqual({ data: 'hello' });
    });

    it('returns undefined for missing keys', () => {
      expect(cacheGet('nonexistent')).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    it('expires entries after TTL', () => {
      cacheSet('expire-me', 'value');
      // Advance time past TTL (24 hours)
      vi.useFakeTimers();
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      expect(cacheGet('expire-me')).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe('max capacity eviction', () => {
    it('evicts oldest entries when exceeding max capacity', () => {
      // Fill cache to max (50 entries)
      for (let i = 0; i < 51; i++) {
        cacheSet(`key-${i}`, `value-${i}`);
      }
      // The first entry should have been evicted
      expect(cacheGet('key-0')).toBeUndefined();
      // Later entries should still exist
      expect(cacheGet('key-50')).toBe('value-50');
    });
  });

  describe('cacheClear', () => {
    it('removes all entries', () => {
      cacheSet('a', 1);
      cacheSet('b', 2);
      cacheClear();
      expect(cacheGet('a')).toBeUndefined();
      expect(cacheGet('b')).toBeUndefined();
    });
  });

  describe('hashKey', () => {
    it('produces consistent hashes', () => {
      const data = { query: 'test', context: [1, 2, 3] };
      expect(hashKey(data)).toBe(hashKey(data));
    });

    it('produces different hashes for different inputs', () => {
      expect(hashKey('a')).not.toBe(hashKey('b'));
    });
  });
});
