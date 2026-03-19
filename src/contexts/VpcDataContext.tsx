import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { vpcDataReducer, initialVpcDataState, type VpcDataAction } from './vpcDataReducer';

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
  dispatch: React.Dispatch<VpcDataAction>;
}

const VpcDataContext = createContext<VpcDataContextValue | undefined>(undefined);

export function useVpcData(): VpcDataContextValue {
  const context = useContext(VpcDataContext);
  if (!context) {
    throw new Error('useVpcData must be used within a VpcDataProvider');
  }
  return context;
}

export function VpcDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(vpcDataReducer, initialVpcDataState);

  const setVpcResourceData = useCallback((key: string, items: unknown[]) => {
    dispatch({ type: 'SET_RESOURCE_DATA', key, items });
  }, []);

  const setVpcProgress = useCallback((progress: VpcCollectionProgress) => {
    dispatch({ type: 'SET_PROGRESS', progress });
  }, []);

  const addVpcError = useCallback((error: VpcCollectionError) => {
    dispatch({ type: 'ADD_ERROR', error });
  }, []);

  const setVpcStatus = useCallback((status: VpcCollectionStatus) => {
    dispatch({ type: 'SET_STATUS', status });
  }, []);

  const setVpcCollectionDuration = useCallback((duration: number | null) => {
    dispatch({ type: 'SET_COLLECTION_DURATION', duration });
  }, []);

  const setUserAccountId = useCallback((accountId: string | null) => {
    dispatch({ type: 'SET_USER_ACCOUNT_ID', accountId });
  }, []);

  const clearVpcData = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA' });
  }, []);

  const value: VpcDataContextValue = {
    ...state,
    setVpcResourceData,
    setVpcProgress,
    addVpcError,
    setVpcStatus,
    setVpcCollectionDuration,
    setUserAccountId,
    clearVpcData,
    dispatch,
  };

  return <VpcDataContext.Provider value={value}>{children}</VpcDataContext.Provider>;
}

export default VpcDataContext;
