import type { VpcCollectionStatus, VpcCollectionProgress, VpcCollectionError } from '../contexts/VpcDataContext';

export interface VpcDataState {
  vpcCollectedData: Record<string, unknown[]>;
  vpcCollectionStatus: VpcCollectionStatus;
  vpcProgress: VpcCollectionProgress;
  vpcErrors: VpcCollectionError[];
  vpcCollectionDuration: number | null;
  userAccountId: string | null;
}

export type VpcDataAction =
  | { type: 'SET_RESOURCE_DATA'; key: string; items: unknown[] }
  | { type: 'SET_PROGRESS'; progress: VpcCollectionProgress }
  | { type: 'ADD_ERROR'; error: VpcCollectionError }
  | { type: 'SET_STATUS'; status: VpcCollectionStatus }
  | { type: 'SET_COLLECTION_DURATION'; duration: number | null }
  | { type: 'SET_USER_ACCOUNT_ID'; accountId: string | null }
  | { type: 'CLEAR_DATA' };

export const initialVpcProgress: VpcCollectionProgress = {
  phase: '',
  resource: '',
  status: '',
  totalResources: 0,
  completedResources: 0,
};

export const initialVpcDataState: VpcDataState = {
  vpcCollectedData: {},
  vpcCollectionStatus: 'idle',
  vpcProgress: initialVpcProgress,
  vpcErrors: [],
  vpcCollectionDuration: null,
  userAccountId: null,
};

export function vpcDataReducer(state: VpcDataState, action: VpcDataAction): VpcDataState {
  switch (action.type) {
    case 'SET_RESOURCE_DATA':
      return {
        ...state,
        vpcCollectedData: { ...state.vpcCollectedData, [action.key]: action.items },
      };

    case 'SET_PROGRESS':
      return { ...state, vpcProgress: action.progress };

    case 'ADD_ERROR':
      return { ...state, vpcErrors: [...state.vpcErrors, action.error] };

    case 'SET_STATUS':
      return { ...state, vpcCollectionStatus: action.status };

    case 'SET_COLLECTION_DURATION':
      return { ...state, vpcCollectionDuration: action.duration };

    case 'SET_USER_ACCOUNT_ID':
      return { ...state, userAccountId: action.accountId };

    case 'CLEAR_DATA':
      return initialVpcDataState;

    default:
      return state;
  }
}
