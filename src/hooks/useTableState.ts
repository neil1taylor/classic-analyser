import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type ColumnDef,
  type Table,
  type FilterFn,
} from '@tanstack/react-table';
import type { ColumnDefinition } from '@/types/resources';
import { get, formatValue } from '@/utils/formatters';

type SortDirection = 'asc' | 'desc' | 'none';

export interface UseTableStateReturn {
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
  table: Table<Record<string, unknown>>;
}

// Custom global filter that searches formatted values across all columns
const globalFilterFn: FilterFn<Record<string, unknown>> = (
  row,
  _columnId,
  filterValue,
  addMeta,
) => {
  if (!filterValue) return true;
  const searchLower = String(filterValue).toLowerCase();
  const meta = addMeta as unknown as { columnDefs: ColumnDefinition[] } | undefined;
  const columnDefs = meta?.columnDefs;
  if (!columnDefs) return true;

  return columnDefs.some((col) => {
    const val = get(row.original, col.field);
    const formatted = formatValue(val, col.dataType);
    return formatted.toLowerCase().includes(searchLower);
  });
};

export function useTableState(
  columns: ColumnDefinition[],
  data: Record<string, unknown>[]
): UseTableStateReturn {
  // Track sort state with our 3-state cycle (asc -> desc -> none)
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');
  const [columnFilters, setColumnFiltersRaw] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [globalSearch, setGlobalSearchState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);
  const [visibleColumnsState, setVisibleColumnsState] = useState<string[]>(
    () => columns.filter((c) => c.defaultVisible).map((c) => c.field)
  );

  // Reset table state when columns change (navigating between resource types)
  const prevColumnsRef = useRef(columns);
  useEffect(() => {
    if (prevColumnsRef.current !== columns) {
      prevColumnsRef.current = columns;
      setVisibleColumnsState(columns.filter((c) => c.defaultVisible).map((c) => c.field));
      setSortColumn(null);
      setSortDirection('none');
      setColumnFiltersRaw({});
      setSelectedRows(new Set());
      setGlobalSearchState('');
      setCurrentPage(1);
      setPageSizeState(25);
    }
  }, [columns]);

  // Convert our sort state to TanStack sorting state
  const sorting: SortingState = useMemo(() => {
    if (!sortColumn || sortDirection === 'none') return [];
    return [{ id: sortColumn, desc: sortDirection === 'desc' }];
  }, [sortColumn, sortDirection]);

  // Convert our column filters to TanStack column filters
  const tanstackColumnFilters: ColumnFiltersState = useMemo(() => {
    return Object.entries(columnFilters).map(([id, value]) => ({ id, value }));
  }, [columnFilters]);

  // Convert visible columns to TanStack visibility state
  const columnVisibility: VisibilityState = useMemo(() => {
    const vis: VisibilityState = {};
    columns.forEach((col) => {
      vis[col.field] = visibleColumnsState.includes(col.field);
    });
    return vis;
  }, [columns, visibleColumnsState]);

  // Build TanStack column definitions
  const tanstackColumns: ColumnDef<Record<string, unknown>>[] = useMemo(
    () =>
      columns.map((col) => ({
        id: col.field,
        accessorFn: (row: Record<string, unknown>) => get(row, col.field),
        header: col.header,
        enableSorting: col.sortable,
        sortingFn: (rowA, rowB) => {
          const aVal = get(rowA.original, col.field);
          const bVal = get(rowB.original, col.field);

          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;

          if (col.dataType === 'number' || col.dataType === 'currency' || col.dataType === 'bytes') {
            return Number(aVal) - Number(bVal);
          } else if (col.dataType === 'date') {
            return new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
          } else if (col.dataType === 'boolean') {
            return (aVal === true ? 1 : 0) - (bVal === true ? 1 : 0);
          }
          return String(aVal).localeCompare(String(bVal));
        },
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          const val = get(row.original, col.field);
          const formatted = formatValue(val, col.dataType);
          return formatted.toLowerCase().includes(String(filterValue).toLowerCase());
        },
        meta: { dataType: col.dataType, field: col.field },
      })),
    [columns]
  );

  // Store column defs ref for globalFilterFn
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: {
      sorting,
      columnFilters: tanstackColumnFilters,
      columnVisibility,
      globalFilter: globalSearch,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onSortingChange: () => {
      // We manage sorting externally via our 3-state cycle
    },
    onColumnFiltersChange: () => {
      // We manage filters externally
    },
    onGlobalFilterChange: () => {
      // We manage global filter externally
    },
    onPaginationChange: () => {
      // We manage pagination externally
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      return globalFilterFn(row, columnId, filterValue, { columnDefs: columnsRef.current } as never);
    },
    manualPagination: false,
    autoResetPageIndex: false,
  });

  // Get the sorted+filtered rows from the table
  const sortedFilteredData = useMemo(() => {
    // getSortedRowModel already applies both filtering and sorting
    return table.getSortedRowModel().rows
      .filter((row) => {
        // Only include rows that pass all filters
        const filteredIds = new Set(table.getFilteredRowModel().rows.map(r => r.id));
        return filteredIds.has(row.id);
      })
      .map((row) => row.original);
  }, [table, data, sorting, tanstackColumnFilters, globalSearch]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFilteredData.slice(start, start + pageSize);
  }, [sortedFilteredData, currentPage, pageSize]);

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
    setColumnFiltersRaw((prev) => {
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
    setColumnFiltersRaw({});
    setGlobalSearchState('');
    setSelectedRows(new Set());
    setCurrentPage(1);
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  const toggleAllRows = useCallback(() => {
    setSelectedRows((prev) => {
      if (prev.size === sortedFilteredData.length) {
        return new Set();
      }
      return new Set(sortedFilteredData.map((_, i) => i));
    });
  }, [sortedFilteredData]);

  return {
    sortColumn,
    sortDirection,
    filters: columnFilters,
    visibleColumns: visibleColumnsState,
    selectedRows,
    globalSearch,
    filteredAndSortedData: sortedFilteredData,
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
    table,
  };
}
