# Data Tables

## Overview

Each resource type has a dedicated data table that provides full access to the collected data. Tables support sorting, searching, filtering, column customization, and export.

## Table Features

### Sorting

Click any column header to cycle through sort states:

1. **Ascending** (A-Z, 0-9)
2. **Descending** (Z-A, 9-0)
3. **Unsorted** (original order)

A sort indicator arrow appears on the active sort column.

### Global Search

The search box in the toolbar filters across all visible columns. Type any term to instantly filter rows to those containing a match. The search is case-insensitive and updates as you type.

### Column Filtering

Per-column dropdown filters provide multi-select checkboxes for value-based filtering:

- Click the filter icon on any column header
- Select one or more values from the checkbox list
- Multiple column filters combine with **AND** logic (a row must match all active filters)
- Active filter count is displayed in the toolbar

### Column Visibility

Toggle columns on or off via the column settings button in the toolbar. Hidden columns are excluded from search and export.

### Column Resizing

Drag column borders to adjust width. Column widths persist for the current session.

### Row Selection

- Individual row checkboxes for selecting specific rows
- Header checkbox for select-all / deselect-all
- Selected row count displayed in the toolbar
- Selected rows can be exported independently

### Row Expansion

Click the expand icon on any row to see the full resource details rendered as a nested JSON view. This shows all fields, including those not displayed as table columns.

## Pagination

| Page Size | Use Case                          |
|-----------|-----------------------------------|
| 10        | Default, quick browsing           |
| 25        | Medium datasets                   |
| 50        | Larger review sessions            |
| 100       | Bulk inspection                   |
| All       | Complete view (use with caution on large datasets) |

Navigation controls at the bottom of the table provide page forward/back buttons. The toolbar shows the current page number, total row count, and active filter count.

## Virtualization

For large datasets, tables automatically use virtual scrolling (windowed rendering). Only the visible rows plus a small buffer are rendered in the DOM at any time. This keeps the UI responsive even with thousands of rows.

Virtualization is automatic and transparent — no user action is required.

## Advanced Filtering

- Apply text or value filters on individual columns
- Multiple filters across different columns combine with AND logic
- Use the **Clear All** button to reset all active filters at once
- Filter state is indicated by a badge count in the toolbar

## Table Toolbar

The toolbar provides quick access to all table controls:

| Control        | Description                                                   |
|----------------|---------------------------------------------------------------|
| Search         | Global text search across all visible columns                 |
| Filter         | Open advanced column filters                                  |
| Columns        | Toggle column visibility                                      |
| Export         | Export to XLSX: all rows, filtered rows, or selected rows     |
| Row Count      | Displays total rows and filtered/selected counts              |

## Export from Tables

When exporting from a data table, you can choose the scope:

- **All rows** — exports the complete dataset for this resource type
- **Filtered rows** — exports only rows matching the current filters
- **Selected rows** — exports only rows with checked selection boxes
