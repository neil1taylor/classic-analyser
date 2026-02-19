import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ColumnDefinition } from '@/types/resources';
import { get, formatValue } from '@/utils/formatters';

type SortDirection = 'asc' | 'desc' | 'none';

interface UseTableStateReturn {
  sortColumn: string | null;
  sortDirection: SortDirection;
  filters: Record<string, string>;
  visibleColumns: string[];
  selectedRows: Set<number>;
  globalSearch: string;
  filteredAndSortedData: Record<string, unknown>[];
  paginatedData: Record<string, unknown>[];
  currentPage: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (column: string) => void;
  setFilter: (column: string, value: string) => void;
  toggleColumn: (field: string) => void;
  setVisibleColumns: (fields: string[]) => void;
  toggleRow: (index: number) => void;
  toggleAllRows: () => void;
  setGlobalSearch: (search: string) => void;
  clearFilters: () => void;
}

export function useTableState(
  columns: ColumnDefinition[],
  data: Record<string, unknown>[]
): UseTableStateReturn {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumnsState] = useState<string[]>(
    () => columns.filter((c) => c.defaultVisible).map((c) => c.field)
  );
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [globalSearch, setGlobalSearchState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);

  // Reset table state when columns change (navigating between resource types)
  const prevColumnsRef = useRef(columns);
  useEffect(() => {
    if (prevColumnsRef.current !== columns) {
      prevColumnsRef.current = columns;
      setVisibleColumnsState(columns.filter((c) => c.defaultVisible).map((c) => c.field));
      setSortColumn(null);
      setSortDirection('none');
      setFilters({});
      setSelectedRows(new Set());
      setGlobalSearchState('');
      setCurrentPage(1);
      setPageSizeState(25);
    }
  }, [columns]);

  const setSort = useCallback((column: string) => {
    setSortColumn((prevCol) => {
      if (prevCol !== column) {
        setSortDirection('asc');
        return column;
      }
      setSortDirection((prevDir) => {
        if (prevDir === 'asc') return 'desc';
        if (prevDir === 'desc') return 'none';
        return 'asc';
      });
      return column;
    });
  }, []);

  const setFilter = useCallback((column: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) {
        next[column] = value;
      } else {
        delete next[column];
      }
      return next;
    });
    setSelectedRows(new Set());
    setCurrentPage(1);
  }, []);

  const toggleColumn = useCallback((field: string) => {
    setVisibleColumnsState((prev) => {
      if (prev.includes(field)) {
        return prev.filter((f) => f !== field);
      }
      return [...prev, field];
    });
  }, []);

  const setVisibleColumns = useCallback((fields: string[]) => {
    setVisibleColumnsState(fields);
  }, []);

  const toggleRow = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const setGlobalSearch = useCallback((search: string) => {
    setGlobalSearchState(search);
    setSelectedRows(new Set());
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setGlobalSearchState('');
    setSelectedRows(new Set());
    setCurrentPage(1);
  }, []);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply global search
    if (globalSearch) {
      const searchLower = globalSearch.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = get(row, col.field);
          const formatted = formatValue(val, col.dataType);
          return formatted.toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply per-column filters
    const activeFilters = Object.entries(filters);
    if (activeFilters.length > 0) {
      result = result.filter((row) =>
        activeFilters.every(([field, filterValue]) => {
          const col = columns.find((c) => c.field === field);
          if (!col) return true;
          const val = get(row, field);
          const formatted = formatValue(val, col.dataType);
          return formatted.toLowerCase().includes(filterValue.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection !== 'none') {
      const col = columns.find((c) => c.field === sortColumn);
      result.sort((a, b) => {
        const aVal = get(a, sortColumn);
        const bVal = get(b, sortColumn);

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;
        if (col?.dataType === 'number' || col?.dataType === 'currency' || col?.dataType === 'bytes') {
          comparison = Number(aVal) - Number(bVal);
        } else if (col?.dataType === 'date') {
          comparison = new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
        } else if (col?.dataType === 'boolean') {
          comparison = (aVal === true ? 1 : 0) - (bVal === true ? 1 : 0);
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, globalSearch, filters, sortColumn, sortDirection, columns]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const toggleAllRows = useCallback(() => {
    setSelectedRows((prev) => {
      if (prev.size === filteredAndSortedData.length) {
        return new Set();
      }
      return new Set(filteredAndSortedData.map((_, i) => i));
    });
  }, [filteredAndSortedData]);

  return {
    sortColumn,
    sortDirection,
    filters,
    visibleColumns,
    selectedRows,
    globalSearch,
    filteredAndSortedData,
    paginatedData,
    currentPage,
    pageSize,
    setPage,
    setPageSize,
    setSort,
    setFilter,
    toggleColumn,
    setVisibleColumns,
    toggleRow,
    toggleAllRows,
    setGlobalSearch,
    clearFilters,
  };
}
