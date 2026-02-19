import React from 'react';
import { Search, MultiSelect, Button } from '@carbon/react';
import { DocumentExport } from '@carbon/icons-react';
import type { ColumnDefinition } from '@/types/resources';

interface TableToolbarProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  globalSearch: string;
  onSearchChange: (search: string) => void;
  onColumnsChange: (fields: string[]) => void;
  onExport: () => void;
  totalRows: number;
  filteredRows: number;
  selectedCount: number;
  isExporting: boolean;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  columns,
  visibleColumns,
  globalSearch,
  onSearchChange,
  onColumnsChange,
  onExport,
  totalRows,
  filteredRows,
  selectedCount,
  isExporting,
}) => {
  const columnItems = columns.map((col) => ({
    id: col.field,
    text: col.header,
  }));

  const selectedColumnItems = columnItems.filter((item) => visibleColumns.includes(item.id));

  const rowCountText = (() => {
    const parts: string[] = [];
    parts.push(`${filteredRows.toLocaleString()} of ${totalRows.toLocaleString()} rows`);
    if (selectedCount > 0) {
      parts.push(`${selectedCount} selected`);
    }
    return parts.join(' | ');
  })();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.75rem',
        padding: '0.5rem 0',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
        <Search
          id="table-global-search"
          labelText="Search all columns"
          placeholder="Search all columns..."
          value={globalSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          size="sm"
        />
      </div>

      <div style={{ flex: '0 0 auto', minWidth: '200px' }}>
        <MultiSelect
          id="column-visibility"
          titleText=""
          hideLabel
          label="Columns"
          items={columnItems}
          itemToString={(item: { id: string; text: string } | null) => item?.text ?? ''}
          initialSelectedItems={selectedColumnItems}
          onChange={({ selectedItems }: { selectedItems: Array<{ id: string; text: string }> }) => {
            onColumnsChange(selectedItems.map((item) => item.id));
          }}
          size="sm"
        />
      </div>

      <div style={{ paddingBottom: '1px' }}>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={DocumentExport}
          onClick={onExport}
          disabled={isExporting}
        >
          Export
        </Button>
      </div>

      <span
        style={{
          marginLeft: 'auto',
          fontSize: '0.75rem',
          color: 'var(--cds-text-secondary)',
          whiteSpace: 'nowrap',
          paddingBottom: '0.5rem',
        }}
      >
        {rowCountText}
      </span>
    </div>
  );
};

export default TableToolbar;
