// Generic localStorage persistence hook with account fingerprinting
import { useState, useCallback } from 'react';
import { getAccountFingerprint, fingerprintsMatch } from '@/utils/accountIdentifier';

interface PersistedData<T> {
  version: number;
  environmentFingerprint: string;
  data: T;
  createdAt: string;
  modifiedAt: string;
}

interface UseLocalPreferencesOptions<T> {
  storageKey: string;
  version: number;
  defaultValue: T;
  accountId?: string;
  accountName?: string;
}

function readFromStorage<T>(
  fullKey: string,
  version: number,
  fingerprint: string | undefined,
  defaultValue: T,
): T {
  try {
    const stored = localStorage.getItem(fullKey);
    if (!stored) return defaultValue;

    const parsed: PersistedData<T> = JSON.parse(stored);
    if (parsed.version !== version) return defaultValue;
    if (fingerprint && !fingerprintsMatch(parsed.environmentFingerprint, fingerprint)) {
      return defaultValue;
    }
    return parsed.data;
  } catch {
    return defaultValue;
  }
}

export function useLocalPreferences<T>({
  storageKey,
  version,
  defaultValue,
  accountId,
  accountName,
}: UseLocalPreferencesOptions<T>) {
  const fingerprint = accountId ? getAccountFingerprint(accountId, accountName) : undefined;
  const fullKey = fingerprint ? `${storageKey}:${fingerprint}` : storageKey;

  const [data, setData] = useState<T>(() =>
    readFromStorage(fullKey, version, fingerprint, defaultValue)
  );

  const persist = useCallback((newData: T) => {
    setData(newData);
    try {
      const now = new Date().toISOString();
      const existing = localStorage.getItem(fullKey);
      const createdAt = existing ? (JSON.parse(existing) as PersistedData<T>).createdAt : now;

      const persisted: PersistedData<T> = {
        version,
        environmentFingerprint: fingerprint ?? '',
        data: newData,
        createdAt,
        modifiedAt: now,
      };
      localStorage.setItem(fullKey, JSON.stringify(persisted));
    } catch {
      // localStorage full or unavailable
    }
  }, [fullKey, version, fingerprint]);

  const reset = useCallback(() => {
    setData(readFromStorage(fullKey, version, fingerprint, defaultValue));
    try {
      localStorage.removeItem(fullKey);
    } catch {
      // ignore
    }
  }, [fullKey, version, fingerprint, defaultValue]);

  return { data, persist, reset };
}
