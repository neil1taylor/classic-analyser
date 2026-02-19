import React from 'react';
import {
  sectionStyle,
  headingStyle,
  paragraphStyle,
  listStyle,
} from '../docsStyles';

const DataTablesSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      Data Tables
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      Working with resource data tables and their features
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Table Features</h3>
      <p style={paragraphStyle}>
        Each resource type has a dedicated data table with the following capabilities:
      </p>
      <ul style={listStyle}>
        <li><strong>Sorting:</strong> Click any column header to sort ascending or descending. A second click reverses the order. A third click removes the sort.</li>
        <li><strong>Global Search:</strong> Use the search box in the toolbar to filter rows across all visible columns simultaneously.</li>
        <li><strong>Column Filtering:</strong> Click the filter icon on individual column headers to filter by specific values within that column.</li>
        <li><strong>Column Visibility:</strong> Toggle columns on or off using the column settings button in the toolbar.</li>
        <li><strong>Column Resizing:</strong> Drag column borders to resize columns to your preferred width.</li>
        <li><strong>Row Selection:</strong> Select individual rows with checkboxes, or use the header checkbox to select all visible rows.</li>
        <li><strong>Row Expansion:</strong> Click the expand icon on a row to see the full resource details in a nested view.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Pagination</h3>
      <p style={paragraphStyle}>
        Tables support configurable page sizes (10, 25, 50, 100, or All rows). Use the pagination
        controls at the bottom of the table to navigate between pages. The current page, total rows,
        and active filter count are displayed in the toolbar.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Virtualization</h3>
      <p style={paragraphStyle}>
        For large datasets, tables use virtual scrolling (windowed rendering) to maintain smooth
        performance. Only the visible rows plus a small buffer are rendered in the DOM, regardless
        of the total row count. This is automatic and transparent &mdash; you interact with the
        table normally.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Advanced Filtering</h3>
      <p style={paragraphStyle}>
        The advanced filter panel provides more granular control:
      </p>
      <ul style={listStyle}>
        <li><strong>Per-column filters:</strong> Set individual text or value filters on specific columns.</li>
        <li><strong>Combination:</strong> Multiple column filters combine with AND logic &mdash; rows must match all active filters.</li>
        <li><strong>Clear all:</strong> Reset all active filters with a single click.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Table Toolbar</h3>
      <p style={paragraphStyle}>
        The toolbar above each table provides quick access to common actions:
      </p>
      <ul style={listStyle}>
        <li><strong>Search:</strong> Global text search across all visible columns.</li>
        <li><strong>Filter:</strong> Open the advanced filter panel.</li>
        <li><strong>Columns:</strong> Toggle column visibility.</li>
        <li><strong>Export:</strong> Export all rows, filtered rows, or selected rows to XLSX.</li>
        <li><strong>Row count:</strong> Displays total and filtered row counts.</li>
      </ul>
    </section>
  </div>
);

export default DataTablesSection;
