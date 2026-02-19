import React, { createContext, useContext, useState, useCallback } from 'react';

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
}

const initialProgress: CollectionProgress = {
  phase: '',
  resource: '',
  status: '',
  totalResources: 0,
  completedResources: 0,
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [collectedData, setCollectedData] = useState<Record<string, unknown[]>>({});
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>('idle');
  const [progress, setProgressState] = useState<CollectionProgress>(initialProgress);
  const [errors, setErrors] = useState<CollectionError[]>([]);
  const [collectionDuration, setCollectionDurationState] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('none');
  const [importFilename, setImportFilename] = useState<string | null>(null);
  const [importTimestamp, setImportTimestamp] = useState<Date | null>(null);

  const setResourceData = useCallback((key: string, items: unknown[]) => {
    setCollectedData((prev) => ({ ...prev, [key]: items }));
    if (dataSource === 'none') setDataSource('collected');
  }, [dataSource]);

  const setProgress = useCallback((p: CollectionProgress) => {
    setProgressState(p);
  }, []);

  const addError = useCallback((error: CollectionError) => {
    setErrors((prev) => [...prev, error]);
  }, []);

  const setStatus = useCallback((status: CollectionStatus) => {
    setCollectionStatus(status);
  }, []);

  const setCollectionDuration = useCallback((duration: number | null) => {
    setCollectionDurationState(duration);
  }, []);

  const clearData = useCallback(() => {
    setCollectedData({});
    setCollectionStatus('idle');
    setProgressState(initialProgress);
    setErrors([]);
    setCollectionDurationState(null);
    setDataSource('none');
    setImportFilename(null);
    setImportTimestamp(null);
  }, []);

  const importData = useCallback((data: Record<string, unknown[]>, filename: string) => {
    setCollectedData({});
    setCollectionStatus('idle');
    setProgressState(initialProgress);
    setErrors([]);
    setCollectionDurationState(null);

    setCollectedData(data);
    setDataSource('imported');
    setImportFilename(filename);
    setImportTimestamp(new Date());
    setCollectionStatus('complete');
  }, []);

  const value: DataContextValue = {
    collectedData,
    collectionStatus,
    progress,
    errors,
    collectionDuration,
    dataSource,
    importFilename,
    importTimestamp,
    setResourceData,
    setProgress,
    addError,
    setStatus,
    setCollectionDuration,
    clearData,
    importData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export default DataContext;
