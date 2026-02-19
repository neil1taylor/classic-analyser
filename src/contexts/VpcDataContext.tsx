import React, { createContext, useContext, useState, useCallback } from 'react';

export type VpcCollectionStatus = 'idle' | 'collecting' | 'complete' | 'error' | 'cancelled';

export interface VpcCollectionProgress {
  phase: string;
  resource: string;
  status: string;
  totalResources: number;
  completedResources: number;
}

export interface VpcCollectionError {
  resource: string;
  message: string;
}

interface VpcDataContextValue {
  vpcCollectedData: Record<string, unknown[]>;
  vpcCollectionStatus: VpcCollectionStatus;
  vpcProgress: VpcCollectionProgress;
  vpcErrors: VpcCollectionError[];
  vpcCollectionDuration: number | null;
  userAccountId: string | null;
  setVpcResourceData: (key: string, items: unknown[]) => void;
  setVpcProgress: (progress: VpcCollectionProgress) => void;
  addVpcError: (error: VpcCollectionError) => void;
  setVpcStatus: (status: VpcCollectionStatus) => void;
  setVpcCollectionDuration: (duration: number | null) => void;
  setUserAccountId: (accountId: string | null) => void;
  clearVpcData: () => void;
}

const initialProgress: VpcCollectionProgress = {
  phase: '',
  resource: '',
  status: '',
  totalResources: 0,
  completedResources: 0,
};

const VpcDataContext = createContext<VpcDataContextValue | undefined>(undefined);

export function useVpcData(): VpcDataContextValue {
  const context = useContext(VpcDataContext);
  if (!context) {
    throw new Error('useVpcData must be used within a VpcDataProvider');
  }
  return context;
}

export function VpcDataProvider({ children }: { children: React.ReactNode }) {
  const [vpcCollectedData, setVpcCollectedData] = useState<Record<string, unknown[]>>({});
  const [vpcCollectionStatus, setVpcCollectionStatus] = useState<VpcCollectionStatus>('idle');
  const [vpcProgress, setVpcProgressState] = useState<VpcCollectionProgress>(initialProgress);
  const [vpcErrors, setVpcErrors] = useState<VpcCollectionError[]>([]);
  const [vpcCollectionDuration, setVpcCollectionDurationState] = useState<number | null>(null);
  const [userAccountId, setUserAccountIdState] = useState<string | null>(null);

  const setVpcResourceData = useCallback((key: string, items: unknown[]) => {
    setVpcCollectedData((prev) => ({ ...prev, [key]: items }));
  }, []);

  const setVpcProgress = useCallback((p: VpcCollectionProgress) => {
    setVpcProgressState(p);
  }, []);

  const addVpcError = useCallback((error: VpcCollectionError) => {
    setVpcErrors((prev) => [...prev, error]);
  }, []);

  const setVpcStatus = useCallback((status: VpcCollectionStatus) => {
    setVpcCollectionStatus(status);
  }, []);

  const setVpcCollectionDuration = useCallback((duration: number | null) => {
    setVpcCollectionDurationState(duration);
  }, []);

  const setUserAccountId = useCallback((accountId: string | null) => {
    setUserAccountIdState(accountId);
  }, []);

  const clearVpcData = useCallback(() => {
    setVpcCollectedData({});
    setVpcCollectionStatus('idle');
    setVpcProgressState(initialProgress);
    setVpcErrors([]);
    setVpcCollectionDurationState(null);
    setUserAccountIdState(null);
  }, []);

  const value: VpcDataContextValue = {
    vpcCollectedData,
    vpcCollectionStatus,
    vpcProgress,
    vpcErrors,
    vpcCollectionDuration,
    userAccountId,
    setVpcResourceData,
    setVpcProgress,
    addVpcError,
    setVpcStatus,
    setVpcCollectionDuration,
    setUserAccountId,
    clearVpcData,
  };

  return <VpcDataContext.Provider value={value}>{children}</VpcDataContext.Provider>;
}

export default VpcDataContext;
