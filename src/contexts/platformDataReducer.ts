import type { PlatformCollectionStatus, PlatformCollectionProgress, PlatformCollectionError } from '../contexts/PlatformDataContext';

export interface PlatformDataState {
  platformCollectedData: Record<string, unknown[]>;
  platformCollectionStatus: PlatformCollectionStatus;
  platformProgress: PlatformCollectionProgress;
  platformErrors: PlatformCollectionError[];
  platformCollectionDuration: number | null;
}

export type PlatformDataAction =
  | { type: 'SET_RESOURCE_DATA'; key: string; items: unknown[] }
  | { type: 'SET_PROGRESS'; progress: PlatformCollectionProgress }
  | { type: 'ADD_ERROR'; error: PlatformCollectionError }
  | { type: 'SET_STATUS'; status: PlatformCollectionStatus }
  | { type: 'SET_COLLECTION_DURATION'; duration: number | null }
  | { type: 'CLEAR_DATA' };

export const initialPlatformProgress: PlatformCollectionProgress = {
  completed: 0,
  total: 0,
  currentResource: '',
};

export const initialPlatformDataState: PlatformDataState = {
  platformCollectedData: {},
  platformCollectionStatus: 'idle',
  platformProgress: initialPlatformProgress,
  platformErrors: [],
  platformCollectionDuration: null,
};

export function platformDataReducer(state: PlatformDataState, action: PlatformDataAction): PlatformDataState {
  switch (action.type) {
    case 'SET_RESOURCE_DATA':
      return {
        ...state,
        platformCollectedData: { ...state.platformCollectedData, [action.key]: action.items },
      };

    case 'SET_PROGRESS':
      return { ...state, platformProgress: action.progress };

    case 'ADD_ERROR':
      return { ...state, platformErrors: [...state.platformErrors, action.error] };

    case 'SET_STATUS':
      return { ...state, platformCollectionStatus: action.status };

    case 'SET_COLLECTION_DURATION':
      return { ...state, platformCollectionDuration: action.duration };

    case 'CLEAR_DATA':
      return initialPlatformDataState;

    default:
      return state;
  }
}
