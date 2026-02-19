import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableState } from './useTableState';
import type { ColumnDefinition } from '@/types/resources';

const columns: ColumnDefinition[] = [
  { field: 'id', header: 'ID', dataType: 'number', defaultVisible: true, sortable: true },
  { field: 'name', header: 'Name', dataType: 'string', defaultVisible: true, sortable: true },
  { field: 'status', header: 'Status', dataType: 'string', defaultVisible: false, sortable: true },
];

const sampleData: Record<string, unknown>[] = [
  { id: 3, name: 'Charlie', status: 'active' },
  { id: 1, name: 'Alice', status: 'inactive' },
  { id: 2, name: 'Bob', status: 'active' },
];

describe('useTableState', () => {
  it('initializes with correct default visible columns', () => {
    const { result } = renderHook(() => useTableState(columns, sampleData));
    expect(result.current.visibleColumns).toEqual(['id', 'name']);
  });

  it('returns all data when no filters applied', () => {
    const { result } = renderHook(() => useTableState(columns, sampleData));
    expect(result.current.filteredAndSortedData).toHaveLength(3);
  });

  describe('sorting (3-state cycle)', () => {
    it('sorts ascending on first click', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setSort('name'); });

      expect(result.current.sortColumn).toBe('name');
      expect(result.current.sortDirection).toBe('asc');
      expect(result.current.filteredAndSortedData[0].name).toBe('Alice');
    });

    it('sorts descending on second click', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setSort('name'); });
      act(() => { result.current.setSort('name'); });

      expect(result.current.sortDirection).toBe('desc');
      expect(result.current.filteredAndSortedData[0].name).toBe('Charlie');
    });

    it('clears sort on third click', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setSort('name'); });
      act(() => { result.current.setSort('name'); });
      act(() => { result.current.setSort('name'); });

      expect(result.current.sortDirection).toBe('none');
    });

    it('resets to asc when switching columns', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setSort('name'); });
      act(() => { result.current.setSort('name'); }); // desc
      act(() => { result.current.setSort('id'); }); // new column -> asc

      expect(result.current.sortColumn).toBe('id');
      expect(result.current.sortDirection).toBe('asc');
    });
  });

  describe('filtering', () => {
    it('filters by column value', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setFilter('name', 'Alice'); });

      expect(result.current.filteredAndSortedData).toHaveLength(1);
      expect(result.current.filteredAndSortedData[0].name).toBe('Alice');
    });

    it('clears filter when empty value set', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setFilter('status', 'active'); });
      act(() => { result.current.setFilter('status', ''); });

      expect(result.current.filteredAndSortedData).toHaveLength(3);
    });

    it('clearFilters resets all filters and search', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => {
        result.current.setFilter('status', 'active');
        result.current.setGlobalSearch('bob');
      });
      act(() => { result.current.clearFilters(); });

      expect(result.current.filteredAndSortedData).toHaveLength(3);
      expect(result.current.globalSearch).toBe('');
    });
  });

  describe('global search', () => {
    it('searches across all columns', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setGlobalSearch('alice'); });

      expect(result.current.filteredAndSortedData).toHaveLength(1);
      expect(result.current.filteredAndSortedData[0].name).toBe('Alice');
    });

    it('is case-insensitive', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setGlobalSearch('BOB'); });

      expect(result.current.filteredAndSortedData).toHaveLength(1);
    });
  });

  describe('pagination', () => {
    it('paginates data correctly', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setPageSize(2); });

      expect(result.current.paginatedData).toHaveLength(2);
      expect(result.current.currentPage).toBe(1);
    });

    it('navigates to a different page', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setPageSize(2); });
      act(() => { result.current.setPage(2); });

      expect(result.current.paginatedData).toHaveLength(1);
    });
  });

  describe('column visibility', () => {
    it('toggles column visibility', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      expect(result.current.visibleColumns).not.toContain('status');

      act(() => { result.current.toggleColumn('status'); });
      expect(result.current.visibleColumns).toContain('status');

      act(() => { result.current.toggleColumn('status'); });
      expect(result.current.visibleColumns).not.toContain('status');
    });

    it('sets visible columns directly', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.setVisibleColumns(['id']); });
      expect(result.current.visibleColumns).toEqual(['id']);
    });
  });

  describe('row selection', () => {
    it('toggles row selection', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.toggleRow(0); });
      expect(result.current.selectedRows.has(0)).toBe(true);

      act(() => { result.current.toggleRow(0); });
      expect(result.current.selectedRows.has(0)).toBe(false);
    });

    it('toggles all rows', () => {
      const { result } = renderHook(() => useTableState(columns, sampleData));

      act(() => { result.current.toggleAllRows(); });
      expect(result.current.selectedRows.size).toBe(3);

      act(() => { result.current.toggleAllRows(); });
      expect(result.current.selectedRows.size).toBe(0);
    });
  });
});
