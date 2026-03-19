import type { CollectionStatus, DataSource, CollectionProgress, CollectionError } from '../contexts/DataContext';

export interface DataState {
  collectedData: Record<string, unknown[]>;
  collectionStatus: CollectionStatus;
  progress: CollectionProgress;
  errors: CollectionError[];
  collectionDuration: number | null;
  dataSource: DataSource;
  importFilename: string | null;
  importTimestamp: Date | null;
}

export type DataAction =
  | { type: 'SET_RESOURCE_DATA'; key: string; items: unknown[] }
  | { type: 'SET_PROGRESS'; progress: CollectionProgress }
  | { type: 'ADD_ERROR'; error: CollectionError }
  | { type: 'SET_STATUS'; status: CollectionStatus }
  | { type: 'SET_COLLECTION_DURATION'; duration: number | null }
  | { type: 'CLEAR_DATA' }
  | { type: 'IMPORT_DATA'; data: Record<string, unknown[]>; filename: string };

export const initialProgress: CollectionProgress = {
  phase: '',
  resource: '',
  status: '',
  totalResources: 0,
  completedResources: 0,
};

export const initialDataState: DataState = {
  collectedData: {},
  collectionStatus: 'idle',
  progress: initialProgress,
  errors: [],
  collectionDuration: null,
  dataSource: 'none',
  importFilename: null,
  importTimestamp: null,
};

export function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'SET_RESOURCE_DATA':
      return {
        ...state,
        collectedData: { ...state.collectedData, [action.key]: action.items },
        dataSource: state.dataSource === 'none' ? 'collected' : state.dataSource,
      };

    case 'SET_PROGRESS':
      return { ...state, progress: action.progress };

    case 'ADD_ERROR':
      return { ...state, errors: [...state.errors, action.error] };

    case 'SET_STATUS':
      return { ...state, collectionStatus: action.status };

    case 'SET_COLLECTION_DURATION':
      return { ...state, collectionDuration: action.duration };

    case 'CLEAR_DATA':
      return initialDataState;

    case 'IMPORT_DATA':
      return {
        ...initialDataState,
        collectedData: action.data,
        dataSource: 'imported',
        importFilename: action.filename,
        importTimestamp: new Date(),
        collectionStatus: 'complete',
      };

    default:
      return state;
  }
}
