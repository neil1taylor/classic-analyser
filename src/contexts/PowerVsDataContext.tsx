import React, { createContext, useContext, useState, useCallback } from 'react';

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
}

const initialProgress: PowerVsCollectionProgress = {
  completed: 0,
  total: 0,
  currentResource: '',
};

const PowerVsDataContext = createContext<PowerVsDataContextValue | undefined>(undefined);

export function usePowerVsData(): PowerVsDataContextValue {
  const context = useContext(PowerVsDataContext);
  if (!context) {
    throw new Error('usePowerVsData must be used within a PowerVsDataProvider');
  }
  return context;
}

export function PowerVsDataProvider({ children }: { children: React.ReactNode }) {
  const [pvsCollectedData, setPvsCollectedData] = useState<Record<string, unknown[]>>({});
  const [pvsCollectionStatus, setPvsCollectionStatus] = useState<PowerVsCollectionStatus>('idle');
  const [pvsProgress, setPvsProgressState] = useState<PowerVsCollectionProgress>(initialProgress);
  const [pvsErrors, setPvsErrors] = useState<PowerVsCollectionError[]>([]);
  const [pvsCollectionDuration, setPvsCollectionDurationState] = useState<number | null>(null);
  const [pvsUserAccountId, setPvsUserAccountIdState] = useState<string | null>(null);

  const setPvsResourceData = useCallback((key: string, items: unknown[]) => {
    setPvsCollectedData((prev) => ({ ...prev, [key]: items }));
  }, []);

  const setPvsProgress = useCallback((p: PowerVsCollectionProgress) => {
    setPvsProgressState(p);
  }, []);

  const addPvsError = useCallback((error: PowerVsCollectionError) => {
    setPvsErrors((prev) => [...prev, error]);
  }, []);

  const setPvsStatus = useCallback((status: PowerVsCollectionStatus) => {
    setPvsCollectionStatus(status);
  }, []);

  const setPvsCollectionDuration = useCallback((duration: number | null) => {
    setPvsCollectionDurationState(duration);
  }, []);

  const setPvsUserAccountId = useCallback((accountId: string | null) => {
    setPvsUserAccountIdState(accountId);
  }, []);

  const clearPvsData = useCallback(() => {
    setPvsCollectedData({});
    setPvsCollectionStatus('idle');
    setPvsProgressState(initialProgress);
    setPvsErrors([]);
    setPvsCollectionDurationState(null);
    setPvsUserAccountIdState(null);
  }, []);

  const value: PowerVsDataContextValue = {
    pvsCollectedData,
    pvsCollectionStatus,
    pvsProgress,
    pvsErrors,
    pvsCollectionDuration,
    pvsUserAccountId,
    setPvsResourceData,
    setPvsProgress,
    addPvsError,
    setPvsStatus,
    setPvsCollectionDuration,
    setPvsUserAccountId,
    clearPvsData,
  };

  return <PowerVsDataContext.Provider value={value}>{children}</PowerVsDataContext.Provider>;
}

export default PowerVsDataContext;
