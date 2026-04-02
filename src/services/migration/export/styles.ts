import type { Worksheet, Fill } from 'exceljs';

// ── Fills ────────────────────────────────────────────────────────────────

export const HEADER_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F62FE' },   // IBM Carbon blue
};

export const STATUS_FILLS: Record<string, Fill> = {
  ready:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } },
  'needs-work': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } },
  blocked:    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } },
};

export const SEVERITY_FILLS: Record<string, Fill> = {
  blocker: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } },
  warning: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } },
  info:    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCE5FF' } },
  passed:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } },
  unknown: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } },
};

// ── Number Formats ───────────────────────────────────────────────────────

export const CURRENCY_FORMAT = '"$"#,##0.00';
export const PERCENT_FORMAT = '0.0%';

// ── Helpers ──────────────────────────────────────────────────────────────

export function addHeaderStyle(ws: Worksheet): void {
  const row = ws.getRow(1);
  row.fill = HEADER_FILL;
  row.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  row.alignment = { vertical: 'middle', horizontal: 'left' };
  row.height = 24;
}

export function autoWidth(ws: Worksheet, maxRows = 100): void {
  ws.columns.forEach((col) => {
    if (!col || !col.values) return;
    let maxLen = 10;
    const vals = col.values as unknown[];
    const limit = Math.min(vals.length, maxRows + 1); // +1 for header
    for (let i = 0; i < limit; i++) {
      const len = vals[i] ? String(vals[i]).length : 0;
      if (len > maxLen) maxLen = Math.min(len, 60);
    }
    col.width = maxLen + 2;
  });
}

export function freezeHeaderRow(ws: Worksheet): void {
  ws.views = [{ state: 'frozen' as const, ySplit: 1, xSplit: 0, topLeftCell: 'A2', activeCell: 'A2' }];
}

export function addAutoFilter(ws: Worksheet): void {
  if (ws.rowCount > 1 && ws.columnCount > 0) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: ws.rowCount, column: ws.columnCount },
    };
  }
}

export function applyCurrencyFormat(ws: Worksheet, colKeys: string[]): void {
  const colIndices = colKeys.map((key) => {
    const col = ws.getColumn(key);
    return col ? col.number : -1;
  }).filter((n) => n > 0);

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // skip header
    for (const colIdx of colIndices) {
      const cell = row.getCell(colIdx);
      if (typeof cell.value === 'number') {
        cell.numFmt = CURRENCY_FORMAT;
      }
    }
  });
}

export function applyFillByValue(ws: Worksheet, colKey: string, fillMap: Record<string, Fill>): void {
  const col = ws.getColumn(colKey);
  if (!col) return;
  const colIdx = col.number;

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const cell = row.getCell(colIdx);
    const val = String(cell.value ?? '').toLowerCase();
    const fill = fillMap[val];
    if (fill) cell.fill = fill;
  });
}
