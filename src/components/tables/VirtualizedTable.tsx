import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { ColumnDefinition } from '@/types/resources';
import { get, formatValue } from '@/utils/formatters';

interface VirtualizedTableProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  data: Record<string, unknown>[];
  rowHeight: number;
  height: number;
  selectedRows: Set<number>;
  onToggleRow: (index: number) => void;
  columnWidths: Record<string, number>;
}

const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  columns,
  visibleColumns,
  data,
  rowHeight,
  height,
  selectedRows,
  onToggleRow,
  columnWidths,
}) => {
  const filteredColumns = columns.filter((col) => visibleColumns.includes(col.field));

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = data[index];
      const isSelected = selectedRows.has(index);

      return (
        <div
          role="row"
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid var(--cds-border-subtle)',
            backgroundColor: isSelected
              ? 'var(--cds-layer-selected)'
              : index % 2 === 0
                ? 'var(--cds-layer)'
                : 'var(--cds-layer-accent)',
            cursor: 'pointer',
            width: 'fit-content',
            minWidth: '100%',
          }}
          onClick={() => onToggleRow(index)}
          aria-selected={isSelected}
        >
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
              onChange={() => onToggleRow(index)}
              aria-label={`Select row ${index + 1}`}
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
                title={isEstimated ? `${formatted} (est. from hourly rate)` : isNoBilling ? 'Hourly VSI with no active billing item' : formatted}
              >
                {isNoBilling ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', fontStyle: 'italic' }}>
                    No billing item
                  </span>
                ) : (
                  <>
                    {formatted}
                    {isEstimated && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', marginLeft: '0.25rem' }}>
                        (est.)
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      );
    },
    [data, filteredColumns, selectedRows, onToggleRow, columnWidths]
  );

  return (
    <List
      height={height}
      itemCount={data.length}
      itemSize={rowHeight}
      width="100%"
      overscanCount={5}
    >
      {Row}
    </List>
  );
};

export default VirtualizedTable;
