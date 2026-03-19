import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { powerVsDataReducer, initialPowerVsDataState, type PowerVsDataAction } from '../context/powerVsDataReducer';

export type PowerVsCollectionStatus = 'idle' | 'collecting' | 'complete' | 'error' | 'cancelled';

export interface PowerVsCollectionProgress {
  completed: number;
  total: number;
  currentResource: string;
}

export interface PowerVsCollectionError {
  resourceType: string;
  message: string;
}

interface PowerVsDataContextValue {
  pvsCollectedData: Record<string, unknown[]>;
  pvsCollectionStatus: PowerVsCollectionStatus;
  pvsProgress: PowerVsCollectionProgress;
  pvsErrors: PowerVsCollectionError[];
  pvsCollectionDuration: number | null;
  pvsUserAccountId: string | null;
  setPvsResourceData: (key: string, items: unknown[]) => void;
  setPvsProgress: (progress: PowerVsCollectionProgress) => void;
  addPvsError: (error: PowerVsCollectionError) => void;
  setPvsStatus: (status: PowerVsCollectionStatus) => void;
  setPvsCollectionDuration: (duration: number | null) => void;
  setPvsUserAccountId: (accountId: string | null) => void;
  clearPvsData: () => void;
  dispatch: React.Dispatch<PowerVsDataAction>;
}

const PowerVsDataContext = createContext<PowerVsDataContextValue | undefined>(undefined);

export function usePowerVsData(): PowerVsDataContextValue {
  const context = useContext(PowerVsDataContext);
  if (!context) {
    throw new Error('usePowerVsData must be used within a PowerVsDataProvider');
  }
  return context;
}

export function PowerVsDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(powerVsDataReducer, initialPowerVsDataState);

  const setPvsResourceData = useCallback((key: string, items: unknown[]) => {
    dispatch({ type: 'SET_RESOURCE_DATA', key, items });
  }, []);

  const setPvsProgress = useCallback((progress: PowerVsCollectionProgress) => {
    dispatch({ type: 'SET_PROGRESS', progress });
  }, []);

  const addPvsError = useCallback((error: PowerVsCollectionError) => {
    dispatch({ type: 'ADD_ERROR', error });
  }, []);

  const setPvsStatus = useCallback((status: PowerVsCollectionStatus) => {
    dispatch({ type: 'SET_STATUS', status });
  }, []);

  const setPvsCollectionDuration = useCallback((duration: number | null) => {
    dispatch({ type: 'SET_COLLECTION_DURATION', duration });
  }, []);

  const setPvsUserAccountId = useCallback((accountId: string | null) => {
    dispatch({ type: 'SET_USER_ACCOUNT_ID', accountId });
  }, []);

  const clearPvsData = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA' });
  }, []);

  const value: PowerVsDataContextValue = {
    ...state,
    setPvsResourceData,
    setPvsProgress,
    addPvsError,
    setPvsStatus,
    setPvsCollectionDuration,
    setPvsUserAccountId,
    clearPvsData,
    dispatch,
  };

  return <PowerVsDataContext.Provider value={value}>{children}</PowerVsDataContext.Provider>;
}

export default PowerVsDataContext;
