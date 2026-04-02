import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { dataReducer, initialDataState, type DataAction } from './dataReducer';
import { transformItems } from '@/services/transform';

export type CollectionStatus = 'idle' | 'collecting' | 'complete' | 'error' | 'cancelled';
export type DataSource = 'none' | 'collected' | 'imported';

export interface CollectionProgress {
  phase: string;
  resource: string;
  status: string;
  totalResources: number;
  completedResources: number;
}

export interface CollectionError {
  resource: string;
  message: string;
}

interface DataContextValue {
  collectedData: Record<string, unknown[]>;
  collectionStatus: CollectionStatus;
  progress: CollectionProgress;
  errors: CollectionError[];
  collectionDuration: number | null;
  dataSource: DataSource;
  importFilename: string | null;
  importTimestamp: Date | null;
  setResourceData: (key: string, items: unknown[]) => void;
  setProgress: (progress: CollectionProgress) => void;
  addError: (error: CollectionError) => void;
  setStatus: (status: CollectionStatus) => void;
  setCollectionDuration: (duration: number | null) => void;
  clearData: () => void;
  importData: (data: Record<string, unknown[]>, filename: string) => void;
  dispatch: React.Dispatch<DataAction>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, initialDataState);

  const setResourceData = useCallback((key: string, items: unknown[]) => {
    dispatch({ type: 'SET_RESOURCE_DATA', key, items });
  }, []);

  const setProgress = useCallback((progress: CollectionProgress) => {
    dispatch({ type: 'SET_PROGRESS', progress });
  }, []);

  const addError = useCallback((error: CollectionError) => {
    dispatch({ type: 'ADD_ERROR', error });
  }, []);

  const setStatus = useCallback((status: CollectionStatus) => {
    dispatch({ type: 'SET_STATUS', status });
  }, []);

  const setCollectionDuration = useCallback((duration: number | null) => {
    dispatch({ type: 'SET_COLLECTION_DURATION', duration });
  }, []);

  const clearData = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA' });
  }, []);

  const importData = useCallback((data: Record<string, unknown[]>, filename: string) => {
    // Apply the same transforms used during API collection so that
    // nested SoftLayer fields (e.g. status.name, publicIpAddress.ipAddress)
    // are flattened to the field names the UI tables expect.
    const transformed: Record<string, unknown[]> = {};
    for (const [key, items] of Object.entries(data)) {
      transformed[key] = transformItems(key, items);
    }
    dispatch({ type: 'IMPORT_DATA', data: transformed, filename });
  }, []);

  const value: DataContextValue = {
    ...state,
    setResourceData,
    setProgress,
    addError,
    setStatus,
    setCollectionDuration,
    clearData,
    importData,
    dispatch,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export default DataContext;
