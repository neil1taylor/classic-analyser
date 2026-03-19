import { describe, it, expect } from 'vitest';
import { dataReducer, initialDataState, initialProgress } from './dataReducer';
import type { DataState, DataAction } from './dataReducer';

describe('dataReducer', () => {
  describe('SET_RESOURCE_DATA', () => {
    it('adds resource data to collectedData', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = dataReducer(initialDataState, {
        type: 'SET_RESOURCE_DATA',
        key: 'virtualServers',
        items,
      });
      expect(result.collectedData.virtualServers).toBe(items);
    });

    it('flips dataSource from none to collected', () => {
      const result = dataReducer(initialDataState, {
        type: 'SET_RESOURCE_DATA',
        key: 'vlans',
        items: [{ id: 1 }],
      });
      expect(result.dataSource).toBe('collected');
    });

    it('preserves existing dataSource if not none', () => {
      const state: DataState = { ...initialDataState, dataSource: 'imported' };
      const result = dataReducer(state, {
        type: 'SET_RESOURCE_DATA',
        key: 'vlans',
        items: [{ id: 1 }],
      });
      expect(result.dataSource).toBe('imported');
    });
  });

  describe('SET_PROGRESS', () => {
    it('updates progress', () => {
      const progress = { ...initialProgress, phase: 'Scanning', completedResources: 5, totalResources: 10 };
      const result = dataReducer(initialDataState, { type: 'SET_PROGRESS', progress });
      expect(result.progress).toBe(progress);
    });
  });

  describe('ADD_ERROR', () => {
    it('appends error to errors array', () => {
      const error = { resource:'vlans', message: 'timeout' };
      const result = dataReducer(initialDataState, { type: 'ADD_ERROR', error });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe(error);
    });

    it('preserves existing errors', () => {
      const state: DataState = {
        ...initialDataState,
        errors: [{ resource:'a', message: 'first' }],
      };
      const error = { resource:'b', message: 'second' };
      const result = dataReducer(state, { type: 'ADD_ERROR', error });
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('SET_STATUS', () => {
    it('updates collectionStatus', () => {
      const result = dataReducer(initialDataState, { type: 'SET_STATUS', status: 'collecting' });
      expect(result.collectionStatus).toBe('collecting');
    });
  });

  describe('SET_COLLECTION_DURATION', () => {
    it('sets duration', () => {
      const result = dataReducer(initialDataState, { type: 'SET_COLLECTION_DURATION', duration: 42000 });
      expect(result.collectionDuration).toBe(42000);
    });

    it('clears duration with null', () => {
      const state: DataState = { ...initialDataState, collectionDuration: 5000 };
      const result = dataReducer(state, { type: 'SET_COLLECTION_DURATION', duration: null });
      expect(result.collectionDuration).toBeNull();
    });
  });

  describe('CLEAR_DATA', () => {
    it('returns initialDataState', () => {
      const state: DataState = {
        ...initialDataState,
        collectedData: { vlans: [{ id: 1 }] },
        collectionStatus: 'complete',
        dataSource: 'collected',
      };
      const result = dataReducer(state, { type: 'CLEAR_DATA' });
      expect(result).toEqual(initialDataState);
    });
  });

  describe('IMPORT_DATA', () => {
    it('resets state and sets import metadata', () => {
      const data = { vlans: [{ id: 1 }], subnets: [{ id: 2 }] };
      const result = dataReducer(initialDataState, {
        type: 'IMPORT_DATA',
        data,
        filename: 'export.xlsx',
      });
      expect(result.collectedData).toBe(data);
      expect(result.dataSource).toBe('imported');
      expect(result.importFilename).toBe('export.xlsx');
      expect(result.importTimestamp).toBeInstanceOf(Date);
      expect(result.collectionStatus).toBe('complete');
      expect(result.errors).toEqual([]);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const result = dataReducer(initialDataState, { type: 'UNKNOWN' } as unknown as DataAction);
      expect(result).toBe(initialDataState);
    });
  });
});
