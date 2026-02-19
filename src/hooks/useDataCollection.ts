import { useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { collectDataStream } from '@/services/api';
import { mapResourceKey, transformItems } from '@/services/transform';
import { createLogger } from '@/utils/logger';

const log = createLogger('Collection');

export interface CollectionOptions {
  skipBilling?: boolean;
}

interface UseDataCollectionReturn {
  startCollection: (options?: CollectionOptions) => void;
  cancelCollection: () => void;
  isCollecting: boolean;
}

export function useDataCollection(): UseDataCollectionReturn {
  const { apiKey } = useAuth();
  const {
    collectionStatus,
    setResourceData,
    setProgress,
    addError,
    setStatus,
    setCollectionDuration,
    clearData,
  } = useData();

  const abortControllerRef = useRef<AbortController | null>(null);
  const isCollecting = collectionStatus === 'collecting';

  const startCollection = useCallback((options?: CollectionOptions) => {
    if (!apiKey) return;

    log.info('Starting data collection', options);
    clearData();
    setStatus('collecting');

    const controller = collectDataStream(apiKey, {
      onProgress: (progress) => {
        setProgress(progress);
      },
      onData: (resourceKey, items) => {
        const mappedKey = mapResourceKey(resourceKey);
        const transformed = transformItems(mappedKey, items);
        setResourceData(mappedKey, transformed);
      },
      onError: (error) => {
        addError(error);
      },
      onComplete: (duration) => {
        log.info('Collection complete, duration:', duration, 'ms');
        setCollectionDuration(duration);
        setStatus('complete');
        abortControllerRef.current = null;
      },
    }, options);

    abortControllerRef.current = controller;
  }, [apiKey, clearData, setStatus, setProgress, setResourceData, addError, setCollectionDuration]);

  const cancelCollection = useCallback(() => {
    log.warn('Collection cancelled by user');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('cancelled');
  }, [setStatus]);

  return { startCollection, cancelCollection, isCollecting };
}
