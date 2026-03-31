import { useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformData } from '@/contexts/PlatformDataContext';
import { collectPlatformDataStream } from '@/services/platform-api';
import { transformPlatformItems } from '@/services/platform-transform';
import { createLogger } from '@/utils/logger';

const log = createLogger('Platform-Collection');

interface UsePlatformDataCollectionReturn {
  startPlatformCollection: () => void;
  cancelPlatformCollection: () => void;
  isPlatformCollecting: boolean;
}

export function usePlatformDataCollection(): UsePlatformDataCollectionReturn {
  const { apiKey, iamToken, authMode } = useAuth();
  const {
    platformCollectionStatus,
    setPlatformResourceData,
    setPlatformProgress,
    addPlatformError,
    setPlatformStatus,
    setPlatformCollectionDuration,
    clearPlatformData,
  } = usePlatformData();

  const abortControllerRef = useRef<AbortController | null>(null);
  const isPlatformCollecting = platformCollectionStatus === 'collecting';

  const startPlatformCollection = useCallback(() => {
    if (!apiKey && !iamToken) return;

    log.info('Starting Platform Services data collection');
    clearPlatformData();
    setPlatformStatus('collecting');

    const controller = collectPlatformDataStream(apiKey || '', {
      onProgress: (progress) => {
        setPlatformProgress(progress);
      },
      onData: (resourceKey, items) => {
        const transformed = transformPlatformItems(resourceKey, items);
        setPlatformResourceData(resourceKey, transformed);
      },
      onError: (error) => {
        addPlatformError(error);
      },
      onComplete: (duration) => {
        log.info('Platform Services collection complete, duration:', duration, 'ms');
        setPlatformCollectionDuration(duration);
        setPlatformStatus('complete');
        abortControllerRef.current = null;
      },
    }, { authMode: authMode || undefined, iamToken: iamToken || undefined });

    abortControllerRef.current = controller;
  }, [apiKey, iamToken, authMode, clearPlatformData, setPlatformStatus, setPlatformProgress, setPlatformResourceData, addPlatformError, setPlatformCollectionDuration]);

  const cancelPlatformCollection = useCallback(() => {
    log.warn('Platform Services collection cancelled by user');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPlatformStatus('cancelled');
  }, [setPlatformStatus]);

  return { startPlatformCollection, cancelPlatformCollection, isPlatformCollecting };
}
