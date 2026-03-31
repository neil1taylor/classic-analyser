import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { platformDataReducer, initialPlatformDataState, type PlatformDataAction } from './platformDataReducer';

export type PlatformCollectionStatus = 'idle' | 'collecting' | 'complete' | 'error' | 'cancelled';

export interface PlatformCollectionProgress {
  completed: number;
  total: number;
  currentResource: string;
}

export interface PlatformCollectionError {
  resourceType: string;
  message: string;
}

interface PlatformDataContextValue {
  platformCollectedData: Record<string, unknown[]>;
  platformCollectionStatus: PlatformCollectionStatus;
  platformProgress: PlatformCollectionProgress;
  platformErrors: PlatformCollectionError[];
  platformCollectionDuration: number | null;
  setPlatformResourceData: (key: string, items: unknown[]) => void;
  setPlatformProgress: (progress: PlatformCollectionProgress) => void;
  addPlatformError: (error: PlatformCollectionError) => void;
  setPlatformStatus: (status: PlatformCollectionStatus) => void;
  setPlatformCollectionDuration: (duration: number | null) => void;
  clearPlatformData: () => void;
  dispatch: React.Dispatch<PlatformDataAction>;
}

const PlatformDataContext = createContext<PlatformDataContextValue | undefined>(undefined);

export function usePlatformData(): PlatformDataContextValue {
  const context = useContext(PlatformDataContext);
  if (!context) {
    throw new Error('usePlatformData must be used within a PlatformDataProvider');
  }
  return context;
}

export function PlatformDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(platformDataReducer, initialPlatformDataState);

  const setPlatformResourceData = useCallback((key: string, items: unknown[]) => {
    dispatch({ type: 'SET_RESOURCE_DATA', key, items });
  }, []);

  const setPlatformProgress = useCallback((progress: PlatformCollectionProgress) => {
    dispatch({ type: 'SET_PROGRESS', progress });
  }, []);

  const addPlatformError = useCallback((error: PlatformCollectionError) => {
    dispatch({ type: 'ADD_ERROR', error });
  }, []);

  const setPlatformStatus = useCallback((status: PlatformCollectionStatus) => {
    dispatch({ type: 'SET_STATUS', status });
  }, []);

  const setPlatformCollectionDuration = useCallback((duration: number | null) => {
    dispatch({ type: 'SET_COLLECTION_DURATION', duration });
  }, []);

  const clearPlatformData = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA' });
  }, []);

  const value: PlatformDataContextValue = {
    ...state,
    setPlatformResourceData,
    setPlatformProgress,
    addPlatformError,
    setPlatformStatus,
    setPlatformCollectionDuration,
    clearPlatformData,
    dispatch,
  };

  return <PlatformDataContext.Provider value={value}>{children}</PlatformDataContext.Provider>;
}

export default PlatformDataContext;
