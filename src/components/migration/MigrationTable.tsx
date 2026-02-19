import React, { useState, useMemo } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Pagination,
  Search,
  Tooltip,
} from '@carbon/react';

export interface MigrationColumnDef {
  key: string;
  header: string;
  group: string;
  headerTooltip?: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface ColumnGroup {
  id: string;
  label: string;
  className: string;
}

export interface MigrationTableProps {
  title?: string;
  columns: MigrationColumnDef[];
  columnGroups: ColumnGroup[];
  rows: Array<Record<string, unknown> & { id: string }>;
  pageSize?: number;
  pageSizes?: number[];
  emptyMessage?: string;
}

const MigrationTable: React.FC<MigrationTableProps> = ({
  title,
  columns,
  columnGroups,
  rows,
  pageSize: defaultPageSize = 10,
  pageSizes = [10, 25, 50],
  emptyMessage = 'No data available.',
}) => {
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(defaultPageSize);

  // Filter rows by search text across all columns
  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return rows;
    const lower = searchText.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(lower);
      })
    );
  }, [rows, searchText, columns]);

  // Paginate
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * currentPageSize;
    return filteredRows.slice(start, start + currentPageSize);
  }, [filteredRows, page, currentPageSize]);

  // Build group header spans — ordered by first appearance in columns
  const groupSpans = useMemo(() => {
    const spans: { group: ColumnGroup; colSpan: number }[] = [];
    let currentGroupId: string | null = null;
    for (const col of columns) {
      if (col.group === currentGroupId) {
        spans[spans.length - 1].colSpan++;
      } else {
        currentGroupId = col.group;
        const groupDef = columnGroups.find((g) => g.id === col.group);
        if (groupDef) {
          spans.push({ group: groupDef, colSpan: 1 });
        }
      }
    }
    return spans;
  }, [columns, columnGroups]);

  // Build a lookup: column key → group className for cell tinting
  const columnGroupClass = useMemo(() => {
    const map: Record<string, string> = {};
    for (const col of columns) {
      const groupDef = columnGroups.find((g) => g.id === col.group);
      if (groupDef) map[col.key] = groupDef.className;
    }
    return map;
  }, [columns, columnGroups]);

  // Carbon DataTable headers format
  const headers = columns.map((c) => ({ key: c.key, header: c.header }));

  // Build tooltip lookup from column defs
  const headerTooltipMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const col of columns) {
      if (col.headerTooltip) map[col.key] = col.headerTooltip;
    }
    return map;
  }, [columns]);

  // Render lookup for custom cell renderers
  const renderMap = useMemo(() => {
    const map: Record<string, MigrationColumnDef['render']> = {};
    for (const col of columns) {
      if (col.render) map[col.key] = col.render;
    }
    return map;
  }, [columns]);

  return (
    <div className="migration-table">
      {title && (
        <h5 className="migration-table__title">{title}</h5>
      )}
      <Search
        size="sm"
        placeholder="Search…"
        labelText="Search"
        closeButtonLabelText="Clear search"
        value={searchText}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setSearchText(e.target.value);
          setPage(1);
        }}
        className="migration-table__search"
      />
      {paginatedRows.length === 0 ? (
        <p className="migration-table__empty">{emptyMessage}</p>
      ) : (
        <DataTable rows={paginatedRows} headers={headers}>
          {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()} size="sm" className="migration-table__table">
              <TableHead>
                {/* Group header row */}
                <TableRow className="migration-table__group-row">
                  {groupSpans.map((span) => (
                    <TableHeader
                      key={span.group.id}
                      colSpan={span.colSpan}
                      className={`migration-table__group-header ${span.group.className}`}
                    >
                      {span.group.label}
                    </TableHeader>
                  ))}
                </TableRow>
                {/* Column header row */}
                <TableRow>
                  {dtHeaders.map((header) => {
                    const { key, ...headerProps } = getHeaderProps({ header });
                    return (
                      <TableHeader
                        key={key}
                        {...headerProps}
                        className={columnGroupClass[header.key] || ''}
                      >
                        {headerTooltipMap[header.key] ? (
                          <Tooltip label={headerTooltipMap[header.key]} align="bottom">
                            <span>{header.header}</span>
                          </Tooltip>
                        ) : header.header}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {dtRows.map((row) => {
                  const { key, ...rowProps } = getRowProps({ row });
                  const sourceRow = paginatedRows.find((r) => r.id === row.id);
                  return (
                    <TableRow key={key} {...rowProps}>
                      {row.cells.map((cell) => {
                        const colKey = cell.info.header;
                        const renderer = renderMap[colKey];
                        return (
                          <TableCell
                            key={cell.id}
                            className={columnGroupClass[colKey] || ''}
                          >
                            {renderer && sourceRow
                              ? renderer(sourceRow[colKey], sourceRow)
                              : cell.value}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DataTable>
      )}
      {filteredRows.length > 0 && (
        <Pagination
          totalItems={filteredRows.length}
          pageSize={currentPageSize}
          pageSizes={pageSizes}
          page={page}
          onChange={({ page: newPage, pageSize: newSize }: { page: number; pageSize: number }) => {
            setPage(newPage);
            setCurrentPageSize(newSize);
          }}
          className="migration-table__pagination"
        />
      )}
    </div>
  );
};

export default MigrationTable;
