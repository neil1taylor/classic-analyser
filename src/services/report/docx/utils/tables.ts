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
import { GRAY, WHITE, DARK, FONT_FAMILY } from './styles';

const TABLE_HEADER_BG = '525252';   // Dark gray — matches vcf_migration
const CELL_MARGINS = { top: 100, bottom: 100, left: 140, right: 140 };

// ── Cell helpers ────────────────────────────────────────────────────────

export function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: TABLE_HEADER_BG, fill: TABLE_HEADER_BG },
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: true,
            color: WHITE,
            size: 22,
            font: FONT_FAMILY,
          }),
        ],
      }),
    ],
  });
}

export function dataCell(text: string): TableCell {
  return new TableCell({
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: 20,
            color: DARK,
            font: FONT_FAMILY,
          }),
        ],
      }),
    ],
  });
}

export function altDataCell(text: string): TableCell {
  return new TableCell({
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: 20,
            color: DARK,
            font: FONT_FAMILY,
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
