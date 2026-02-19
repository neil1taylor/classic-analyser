import {
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
} from 'docx';
import { BLUE, WHITE, DARK, LIGHT_BG } from './styles';

// ── Cell helpers ────────────────────────────────────────────────────────

export function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: BLUE, fill: BLUE },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: true,
            color: WHITE,
            size: 20,
          }),
        ],
      }),
    ],
  });
}

export function dataCell(text: string): TableCell {
  return new TableCell({
    margins: { top: 30, bottom: 30, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: 20,
            color: DARK,
          }),
        ],
      }),
    ],
  });
}

export function altDataCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: LIGHT_BG, fill: LIGHT_BG },
    margins: { top: 30, bottom: 30, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: 20,
            color: DARK,
          }),
        ],
      }),
    ],
  });
}

// ── Full table builder ──────────────────────────────────────────────────

export function createStyledTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h) => headerCell(h)),
  });

  const dataRows = rows.map(
    (row, idx) =>
      new TableRow({
        children: row.map((cell) => (idx % 2 === 1 ? altDataCell(cell) : dataCell(cell))),
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
    },
    rows: [headerRow, ...dataRows],
  });
}

// ── Formatting ──────────────────────────────────────────────────────────

export function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
