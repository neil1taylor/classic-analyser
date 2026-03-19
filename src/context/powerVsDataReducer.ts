import type { PowerVsCollectionStatus, PowerVsCollectionProgress, PowerVsCollectionError } from '../contexts/PowerVsDataContext';

export interface PowerVsDataState {
  pvsCollectedData: Record<string, unknown[]>;
  pvsCollectionStatus: PowerVsCollectionStatus;
  pvsProgress: PowerVsCollectionProgress;
  pvsErrors: PowerVsCollectionError[];
  pvsCollectionDuration: number | null;
  pvsUserAccountId: string | null;
}

export type PowerVsDataAction =
  | { type: 'SET_RESOURCE_DATA'; key: string; items: unknown[] }
  | { type: 'SET_PROGRESS'; progress: PowerVsCollectionProgress }
  | { type: 'ADD_ERROR'; error: PowerVsCollectionError }
  | { type: 'SET_STATUS'; status: PowerVsCollectionStatus }
  | { type: 'SET_COLLECTION_DURATION'; duration: number | null }
  | { type: 'SET_USER_ACCOUNT_ID'; accountId: string | null }
  | { type: 'CLEAR_DATA' };

export const initialPowerVsProgress: PowerVsCollectionProgress = {
  completed: 0,
  total: 0,
  currentResource: '',
};

export const initialPowerVsDataState: PowerVsDataState = {
  pvsCollectedData: {},
  pvsCollectionStatus: 'idle',
  pvsProgress: initialPowerVsProgress,
  pvsErrors: [],
  pvsCollectionDuration: null,
  pvsUserAccountId: null,
};

export function powerVsDataReducer(state: PowerVsDataState, action: PowerVsDataAction): PowerVsDataState {
  switch (action.type) {
    case 'SET_RESOURCE_DATA':
      return {
        ...state,
        pvsCollectedData: { ...state.pvsCollectedData, [action.key]: action.items },
      };

    case 'SET_PROGRESS':
      return { ...state, pvsProgress: action.progress };

    case 'ADD_ERROR':
      return { ...state, pvsErrors: [...state.pvsErrors, action.error] };

    case 'SET_STATUS':
      return { ...state, pvsCollectionStatus: action.status };

    case 'SET_COLLECTION_DURATION':
      return { ...state, pvsCollectionDuration: action.duration };

    case 'SET_USER_ACCOUNT_ID':
      return { ...state, pvsUserAccountId: action.accountId };

    case 'CLEAR_DATA':
      return initialPowerVsDataState;

    default:
      return state;
  }
}
