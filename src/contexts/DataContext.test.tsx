import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DataProvider, useData } from './DataContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}

describe('DataContext', () => {
  it('starts with idle status and empty data', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    expect(result.current.collectionStatus).toBe('idle');
    expect(result.current.collectedData).toEqual({});
    expect(result.current.dataSource).toBe('none');
  });

  it('setResourceData accumulates data', () => {
    const { result } = renderHook(() => useData(), { wrapper });

    act(() => {
      result.current.setResourceData('virtualServers', [{ id: 1 }]);
    });
    expect(result.current.collectedData.virtualServers).toEqual([{ id: 1 }]);
    expect(result.current.dataSource).toBe('collected');

    act(() => {
      result.current.setResourceData('vlans', [{ id: 2 }]);
    });
    expect(result.current.collectedData.vlans).toEqual([{ id: 2 }]);
    expect(result.current.collectedData.virtualServers).toEqual([{ id: 1 }]);
  });

  it('importData sets data and marks source as imported', () => {
    const { result } = renderHook(() => useData(), { wrapper });

    act(() => {
      result.current.importData(
        { virtualServers: [{ id: 1 }], vlans: [{ id: 2 }] },
        'export.xlsx'
      );
    });

    // importData runs transformItems which enriches raw data with computed fields
    expect(result.current.collectedData.virtualServers).toHaveLength(1);
    expect(result.current.collectedData.virtualServers![0]).toEqual(
      expect.objectContaining({ id: 1 })
    );
    expect(result.current.dataSource).toBe('imported');
    expect(result.current.importFilename).toBe('export.xlsx');
    expect(result.current.importTimestamp).toBeInstanceOf(Date);
    expect(result.current.collectionStatus).toBe('complete');
  });

  it('clearData resets all state', () => {
    const { result } = renderHook(() => useData(), { wrapper });

    act(() => {
      result.current.setResourceData('virtualServers', [{ id: 1 }]);
      result.current.setStatus('complete');
    });

    act(() => {
      result.current.clearData();
    });

    expect(result.current.collectedData).toEqual({});
    expect(result.current.collectionStatus).toBe('idle');
    expect(result.current.dataSource).toBe('none');
    expect(result.current.importFilename).toBeNull();
    expect(result.current.collectionDuration).toBeNull();
    expect(result.current.errors).toEqual([]);
  });

  it('setProgress updates progress state', () => {
    const { result } = renderHook(() => useData(), { wrapper });

    act(() => {
      result.current.setProgress({
        phase: 'Shallow Scan',
        resource: 'virtualGuests',
        status: 'collecting',
        totalResources: 36,
        completedResources: 5,
      });
    });

    expect(result.current.progress.phase).toBe('Shallow Scan');
    expect(result.current.progress.completedResources).toBe(5);
  });

  it('addError accumulates errors', () => {
    const { result } = renderHook(() => useData(), { wrapper });

    act(() => {
      result.current.addError({ resource: 'vlans', message: 'Failed' });
    });
    act(() => {
      result.current.addError({ resource: 'subnets', message: 'Timeout' });
    });

    expect(result.current.errors).toHaveLength(2);
  });

  it('setCollectionDuration stores duration', () => {
    const { result } = renderHook(() => useData(), { wrapper });

    act(() => {
      result.current.setCollectionDuration(5000);
    });

    expect(result.current.collectionDuration).toBe(5000);
  });

  it('throws when useData is used outside DataProvider', () => {
    expect(() => {
      renderHook(() => useData());
    }).toThrow('useData must be used within a DataProvider');
  });
});
