import { describe, it, expect } from 'vitest';
import { powerVsDataReducer, initialPowerVsDataState } from './powerVsDataReducer';
import type { PowerVsDataState, PowerVsDataAction } from './powerVsDataReducer';

describe('powerVsDataReducer', () => {
  describe('SET_RESOURCE_DATA', () => {
    it('adds resource data', () => {
      const items = [{ id: 'pvs-1' }];
      const result = powerVsDataReducer(initialPowerVsDataState, {
        type: 'SET_RESOURCE_DATA',
        key: 'pvsInstances',
        items,
      });
      expect(result.pvsCollectedData.pvsInstances).toBe(items);
    });
  });

  describe('SET_PROGRESS', () => {
    it('updates progress', () => {
      const progress = { completed: 5, total: 22, currentResource: 'PVM Instances' };
      const result = powerVsDataReducer(initialPowerVsDataState, { type: 'SET_PROGRESS', progress });
      expect(result.pvsProgress).toBe(progress);
    });
  });

  describe('ADD_ERROR', () => {
    it('appends error', () => {
      const error = { resourceType:'networks', message: 'timeout' };
      const result = powerVsDataReducer(initialPowerVsDataState, { type: 'ADD_ERROR', error });
      expect(result.pvsErrors).toHaveLength(1);
      expect(result.pvsErrors[0]).toBe(error);
    });
  });

  describe('SET_STATUS', () => {
    it('updates status', () => {
      const result = powerVsDataReducer(initialPowerVsDataState, { type: 'SET_STATUS', status: 'error' });
      expect(result.pvsCollectionStatus).toBe('error');
    });
  });

  describe('SET_COLLECTION_DURATION', () => {
    it('sets duration', () => {
      const result = powerVsDataReducer(initialPowerVsDataState, { type: 'SET_COLLECTION_DURATION', duration: 30000 });
      expect(result.pvsCollectionDuration).toBe(30000);
    });
  });

  describe('SET_USER_ACCOUNT_ID', () => {
    it('sets account ID', () => {
      const result = powerVsDataReducer(initialPowerVsDataState, { type: 'SET_USER_ACCOUNT_ID', accountId: 'pvs-acct' });
      expect(result.pvsUserAccountId).toBe('pvs-acct');
    });

    it('clears account ID with null', () => {
      const state: PowerVsDataState = { ...initialPowerVsDataState, pvsUserAccountId: 'x' };
      const result = powerVsDataReducer(state, { type: 'SET_USER_ACCOUNT_ID', accountId: null });
      expect(result.pvsUserAccountId).toBeNull();
    });
  });

  describe('CLEAR_DATA', () => {
    it('returns initial state', () => {
      const state: PowerVsDataState = {
        ...initialPowerVsDataState,
        pvsCollectedData: { pvsInstances: [{ id: '1' }] },
        pvsCollectionStatus: 'complete',
      };
      const result = powerVsDataReducer(state, { type: 'CLEAR_DATA' });
      expect(result).toEqual(initialPowerVsDataState);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const result = powerVsDataReducer(initialPowerVsDataState, { type: 'UNKNOWN' } as unknown as PowerVsDataAction);
      expect(result).toBe(initialPowerVsDataState);
    });
  });
});
