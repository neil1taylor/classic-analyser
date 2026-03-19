import { describe, it, expect } from 'vitest';
import { vpcDataReducer, initialVpcDataState, initialVpcProgress } from './vpcDataReducer';
import type { VpcDataState, VpcDataAction } from './vpcDataReducer';

describe('vpcDataReducer', () => {
  describe('SET_RESOURCE_DATA', () => {
    it('adds resource data', () => {
      const items = [{ id: 'vpc-1' }];
      const result = vpcDataReducer(initialVpcDataState, {
        type: 'SET_RESOURCE_DATA',
        key: 'instances',
        items,
      });
      expect(result.vpcCollectedData.instances).toBe(items);
    });
  });

  describe('SET_PROGRESS', () => {
    it('updates progress', () => {
      const progress = { ...initialVpcProgress, phase: 'Collecting', completedResources: 3, totalResources: 26 };
      const result = vpcDataReducer(initialVpcDataState, { type: 'SET_PROGRESS', progress });
      expect(result.vpcProgress).toBe(progress);
    });
  });

  describe('ADD_ERROR', () => {
    it('appends error', () => {
      const error = { resource:'vpcs', message: 'forbidden' };
      const result = vpcDataReducer(initialVpcDataState, { type: 'ADD_ERROR', error });
      expect(result.vpcErrors).toHaveLength(1);
      expect(result.vpcErrors[0]).toBe(error);
    });
  });

  describe('SET_STATUS', () => {
    it('updates status', () => {
      const result = vpcDataReducer(initialVpcDataState, { type: 'SET_STATUS', status: 'complete' });
      expect(result.vpcCollectionStatus).toBe('complete');
    });
  });

  describe('SET_COLLECTION_DURATION', () => {
    it('sets duration', () => {
      const result = vpcDataReducer(initialVpcDataState, { type: 'SET_COLLECTION_DURATION', duration: 15000 });
      expect(result.vpcCollectionDuration).toBe(15000);
    });
  });

  describe('SET_USER_ACCOUNT_ID', () => {
    it('sets account ID', () => {
      const result = vpcDataReducer(initialVpcDataState, { type: 'SET_USER_ACCOUNT_ID', accountId: 'abc123' });
      expect(result.userAccountId).toBe('abc123');
    });

    it('clears account ID with null', () => {
      const state: VpcDataState = { ...initialVpcDataState, userAccountId: 'abc' };
      const result = vpcDataReducer(state, { type: 'SET_USER_ACCOUNT_ID', accountId: null });
      expect(result.userAccountId).toBeNull();
    });
  });

  describe('CLEAR_DATA', () => {
    it('returns initial state', () => {
      const state: VpcDataState = {
        ...initialVpcDataState,
        vpcCollectedData: { vpcs: [{ id: '1' }] },
        vpcCollectionStatus: 'complete',
        userAccountId: 'abc',
      };
      const result = vpcDataReducer(state, { type: 'CLEAR_DATA' });
      expect(result).toEqual(initialVpcDataState);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const result = vpcDataReducer(initialVpcDataState, { type: 'UNKNOWN' } as unknown as VpcDataAction);
      expect(result).toBe(initialVpcDataState);
    });
  });
});
