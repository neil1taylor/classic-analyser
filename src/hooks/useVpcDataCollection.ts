import { useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVpcData } from '@/contexts/VpcDataContext';
import { collectVpcDataStream } from '@/services/vpc-api';
import { transformVpcItems } from '@/services/vpc-transform';
import { createLogger } from '@/utils/logger';

const log = createLogger('VPC-Collection');

interface UseVpcDataCollectionReturn {
  startVpcCollection: () => void;
  cancelVpcCollection: () => void;
  isVpcCollecting: boolean;
}

export function useVpcDataCollection(): UseVpcDataCollectionReturn {
  const { apiKey, iamToken, authMode } = useAuth();
  const {
    vpcCollectionStatus,
    setVpcResourceData,
    setVpcProgress,
    addVpcError,
    setVpcStatus,
    setVpcCollectionDuration,
    setUserAccountId,
    clearVpcData,
  } = useVpcData();

  const abortControllerRef = useRef<AbortController | null>(null);
  const isVpcCollecting = vpcCollectionStatus === 'collecting';

  const startVpcCollection = useCallback(() => {
    if (!apiKey && !iamToken) return;

    log.info('Starting VPC data collection');
    clearVpcData();
    setVpcStatus('collecting');

    const controller = collectVpcDataStream(apiKey || '', {
      onProgress: (progress) => {
        setVpcProgress(progress);
      },
      onData: (resourceKey, items) => {
        const transformed = transformVpcItems(resourceKey, items);
        setVpcResourceData(resourceKey, transformed);
      },
      onError: (error) => {
        addVpcError(error);
      },
      onComplete: (duration) => {
        log.info('VPC collection complete, duration:', duration, 'ms');
        setVpcCollectionDuration(duration);
        setVpcStatus('complete');
        abortControllerRef.current = null;
      },
      onMetadata: (metadata) => {
        if (metadata.userAccountId) {
          log.info('Received user account ID');
          setUserAccountId(metadata.userAccountId);
        }
      },
    }, { authMode: authMode || undefined, iamToken: iamToken || undefined });

    abortControllerRef.current = controller;
  }, [apiKey, iamToken, authMode, clearVpcData, setVpcStatus, setVpcProgress, setVpcResourceData, addVpcError, setVpcCollectionDuration, setUserAccountId]);

  const cancelVpcCollection = useCallback(() => {
    log.warn('VPC collection cancelled by user');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setVpcStatus('cancelled');
  }, [setVpcStatus]);

  return { startVpcCollection, cancelVpcCollection, isVpcCollecting };
}
