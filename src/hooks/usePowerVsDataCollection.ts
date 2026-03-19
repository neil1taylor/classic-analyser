import { useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { collectPowerVsDataStream } from '@/services/powervs-api';
import { transformPowerVsItems } from '@/services/powervs-transform';
import { createLogger } from '@/utils/logger';

const log = createLogger('PowerVS-Collection');

interface UsePowerVsDataCollectionReturn {
  startPvsCollection: () => void;
  cancelPvsCollection: () => void;
  isPvsCollecting: boolean;
}

export function usePowerVsDataCollection(): UsePowerVsDataCollectionReturn {
  const { apiKey, iamToken, authMode } = useAuth();
  const {
    pvsCollectionStatus,
    setPvsResourceData,
    setPvsProgress,
    addPvsError,
    setPvsStatus,
    setPvsCollectionDuration,
    setPvsUserAccountId,
    clearPvsData,
  } = usePowerVsData();

  const abortControllerRef = useRef<AbortController | null>(null);
  const isPvsCollecting = pvsCollectionStatus === 'collecting';

  const startPvsCollection = useCallback(() => {
    if (!apiKey && !iamToken) return;

    log.info('Starting PowerVS data collection');
    clearPvsData();
    setPvsStatus('collecting');

    const controller = collectPowerVsDataStream(apiKey || '', {
      onProgress: (progress) => {
        setPvsProgress(progress);
      },
      onData: (resourceKey, items) => {
        const transformed = transformPowerVsItems(resourceKey, items);
        setPvsResourceData(resourceKey, transformed);
      },
      onError: (error) => {
        addPvsError(error);
      },
      onComplete: (duration) => {
        log.info('PowerVS collection complete, duration:', duration, 'ms');
        setPvsCollectionDuration(duration);
        setPvsStatus('complete');
        abortControllerRef.current = null;
      },
      onMetadata: (metadata) => {
        if (metadata.userAccountId) {
          log.info('Received user account ID');
          setPvsUserAccountId(metadata.userAccountId);
        }
      },
    }, { authMode: authMode || undefined, iamToken: iamToken || undefined });

    abortControllerRef.current = controller;
  }, [apiKey, iamToken, authMode, clearPvsData, setPvsStatus, setPvsProgress, setPvsResourceData, addPvsError, setPvsCollectionDuration, setPvsUserAccountId]);

  const cancelPvsCollection = useCallback(() => {
    log.warn('PowerVS collection cancelled by user');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPvsStatus('cancelled');
  }, [setPvsStatus]);

  return { startPvsCollection, cancelPvsCollection, isPvsCollecting };
}
