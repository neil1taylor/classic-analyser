import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Pagination, Tooltip } from '@carbon/react';
import { ArrowUp, ArrowDown, ArrowsVertical, ChevronRight } from '@carbon/icons-react';
import { flexRender } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ColumnDefinition } from '@/types/resources';
import { get, formatValue } from '@/utils/formatters';
import { useTableState } from '@/hooks/useTableState';
import { useExport } from '@/hooks/useExport';
import { useData } from '@/contexts/DataContext';
import TableToolbar from '@/components/tables/TableToolbar';
import ColumnFilter from '@/components/tables/ColumnFilter';
import ColumnResizer from '@/components/tables/ColumnResizer';
import RowDetailPanel from '@/components/tables/RowDetailPanel';
import ExportDialog from '@/components/common/ExportDialog';
import type { ExportScope } from '@/components/common/ExportDialog';
import type { ExportFormat } from '@/services/export';

interface DataTableProps {
  resourceKey: string;
  columns: ColumnDefinition[];
  data: Record<string, unknown>[];
}

const ROW_HEIGHT = 40;
const VIRTUALIZATION_THRESHOLD = 100;

const AppDataTable: React.FC<DataTableProps> = ({ resourceKey, columns, data }) => {
  const {
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
    setVisibleColumns,
    toggleRow,
    toggleAllRows,
    setGlobalSearch,
    table,
  } = useTableState(columns, data);

  const { collectedData } = useData();
  const { exportTable, exportSelected, isExporting } = useExport();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Reset expanded row on page change
  useEffect(() => {
    setExpandedRow(null);
  }, [currentPage]);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    columns.forEach((col) => {
      widths[col.field] = 150;
    });
    return widths;
  });

  const handleResize = useCallback((field: string, delta: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [field]: Math.max(60, (prev[field] || 150) + delta),
    }));
  }, []);

  const filteredColumns = useMemo(
    () => columns.filter((col) => visibleColumns.includes(col.field)),
    [columns, visibleColumns]
  );

  const pageOffset = (currentPage - 1) * pageSize;

  const allSelected = filteredAndSortedData.length > 0 && selectedRows.size === filteredAndSortedData.length;

  const getSortIcon = (field: string) => {
    if (sortColumn !== field || sortDirection === 'none') return ArrowsVertical;
    return sortDirection === 'asc' ? ArrowUp : ArrowDown;
  };

  const handleExport = async (scope: ExportScope, _filteredOnly: boolean, format: ExportFormat = 'xlsx') => {
    switch (scope) {
      case 'all':
      case 'currentTable':
        await exportTable(resourceKey, filteredAndSortedData, format);
        break;
      case 'selectedRows': {
        const selected = filteredAndSortedData.filter((_, i) => selectedRows.has(i));
        await exportSelected(resourceKey, selected, format);
        break;
      }
    }
  };

  // Virtualization for the body
  const parentRef = useRef<HTMLDivElement>(null);
  const useVirtualization = paginatedData.length > VIRTUALIZATION_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index: number) => {
      const globalIndex = pageOffset + index;
      // If expanded, give extra height for the detail panel
      return expandedRow === globalIndex ? ROW_HEIGHT + 200 : ROW_HEIGHT;
    }, [expandedRow, pageOffset]),
    overscan: 10,
  });

  const renderRow = (row: Record<string, unknown>, localIndex: number) => {
    const globalIndex = pageOffset + localIndex;
    const isSelected = selectedRows.has(globalIndex);
    const isExpanded = expandedRow === globalIndex;

    return (
      <React.Fragment key={globalIndex}>
        <div
          role="row"
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid var(--cds-border-subtle)',
            backgroundColor: isSelected
              ? 'var(--cds-layer-selected)'
              : localIndex % 2 === 0
                ? 'var(--cds-layer)'
                : 'var(--cds-layer-accent)',
            height: `${ROW_HEIGHT}px`,
            cursor: 'pointer',
            width: 'fit-content',
            minWidth: '100%',
          }}
          onClick={() => toggleRow(globalIndex)}
          aria-selected={isSelected}
        >
          <div
            style={{
              width: '36px',
              minWidth: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setExpandedRow(isExpanded ? null : globalIndex);
            }}
            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                setExpandedRow(isExpanded ? null : globalIndex);
              }
            }}
          >
            <ChevronRight
              size={16}
              style={{
                transition: 'transform 150ms',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          </div>
          <div
            style={{
              width: '48px',
              minWidth: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleRow(globalIndex)}
              aria-label={`Select row ${globalIndex + 1}`}
            />
          </div>
          {filteredColumns.map((col) => {
            const value = get(row, col.field);
            const formatted = formatValue(value, col.dataType, col.field);
            const isEstimated = col.field === 'recurringFee' && get(row, 'estimatedCost') === true;
            const isNoBilling = col.field === 'recurringFee' && get(row, 'noBillingItem') === true;
            const width = columnWidths[col.field] || 150;

            return (
              <div
                key={col.field}
                role="cell"
                style={{
                  width: `${width}px`,
                  minWidth: `${width}px`,
                  padding: '0 0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.875rem',
                }}
                title={isEstimated ? undefined : isNoBilling ? 'Hourly VSI with no active billing item' : formatted}
              >
                {isNoBilling ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', fontStyle: 'italic' }}>
                    No billing item
                  </span>
                ) : (
                  <>
                    {formatted}
                    {isEstimated && (
                      <Tooltip label="Estimated from hourly rate — actual cost may differ" align="bottom">
                        <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', marginLeft: '0.25rem' }}>
                          (est.)
                        </span>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        {isExpanded && (
          <RowDetailPanel
            row={row}
            resourceKey={resourceKey}
            columns={columns}
            collectedData={collectedData}
          />
        )}
      </React.Fragment>
    );
  };

  return (
    <div>
      <TableToolbar
        columns={columns}
        visibleColumns={visibleColumns}
        globalSearch={globalSearch}
        onSearchChange={setGlobalSearch}
        onColumnsChange={setVisibleColumns}
        onExport={() => setExportDialogOpen(true)}
        totalRows={data.length}
        filteredRows={filteredAndSortedData.length}
        selectedCount={selectedRows.size}
        isExporting={isExporting}
      />

      <div style={{ overflowX: 'auto', border: '1px solid var(--cds-border-subtle)' }}>
        {/* Header */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--cds-border-strong)', background: 'var(--cds-layer-accent)', width: 'fit-content', minWidth: '100%' }}>
          <div style={{ width: '36px', minWidth: '36px' }} />
          <div
            style={{
              width: '48px',
              minWidth: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem 0',
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAllRows}
              aria-label="Select all rows"
            />
          </div>
          {filteredColumns.map((col) => {
            const SortIcon = getSortIcon(col.field);
            const width = columnWidths[col.field] || 150;

            // Use flexRender for the header content from the TanStack table column
            const tanstackColumn = table.getColumn(col.field);
            const headerContent = tanstackColumn
              ? flexRender(tanstackColumn.columnDef.header, {
                  column: tanstackColumn,
                  header: table.getHeaderGroups()[0]?.headers.find(h => h.id === col.field),
                  table,
                } as never)
              : col.header;

            return (
              <div
                key={col.field}
                style={{
                  position: 'relative',
                  width: `${width}px`,
                  minWidth: `${width}px`,
                  padding: '0.5rem 0.75rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                onClick={col.sortable ? () => setSort(col.field) : undefined}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {headerContent}
                </span>
                {col.sortable && <SortIcon size={14} />}
                <ColumnResizer columnField={col.field} onResize={handleResize} />
              </div>
            );
          })}
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--cds-border-subtle)', background: 'var(--cds-layer)', width: 'fit-content', minWidth: '100%' }}>
          <div style={{ width: '36px', minWidth: '36px' }} />
          <div style={{ width: '48px', minWidth: '48px' }} />
          {filteredColumns.map((col) => {
            const width = columnWidths[col.field] || 150;
            return (
              <div
                key={col.field}
                style={{
                  width: `${width}px`,
                  minWidth: `${width}px`,
                  padding: '0.25rem',
                }}
              >
                <ColumnFilter
                  field={col.field}
                  header={col.header}
                  value={filters[col.field] || ''}
                  onChange={setFilter}
                />
              </div>
            );
          })}
        </div>

        {/* Body */}
        {filteredAndSortedData.length === 0 ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--cds-text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            {data.length === 0 ? 'No data collected for this resource type.' : 'No rows match the current filters.'}
          </div>
        ) : useVirtualization ? (
          /* Virtualized rendering for large datasets */
          <div
            ref={parentRef}
            style={{
              height: `${Math.min(paginatedData.length * ROW_HEIGHT, 600)}px`,
              overflow: 'auto',
            }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const row = paginatedData[virtualItem.index];
                if (!row) return null;
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    {renderRow(row, virtualItem.index)}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Standard rendering for small datasets */
          <div>
            {paginatedData.map((row, localIndex) => renderRow(row, localIndex))}
          </div>
        )}
      </div>

      {filteredAndSortedData.length > 0 && (
        <Pagination
          totalItems={filteredAndSortedData.length}
          pageSize={pageSize}
          pageSizes={[10, 25, 50, 100]}
          page={currentPage}
          onChange={({ page, pageSize: newPageSize }: { page: number; pageSize: number }) => {
            if (newPageSize !== pageSize) {
              setPageSize(newPageSize);
            } else {
              setPage(page);
            }
          }}
        />
      )}

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
        hasSelectedRows={selectedRows.size > 0}
        hasCurrentTable
        isExporting={isExporting}
      />
    </div>
  );
};

export default AppDataTable;
