/**
 * DOCX export service using the docx library.
 */
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  PageBreak,
} from 'docx';
import type { ExportData, ExportOptions, ResourceTypeMeta } from './types';
import { getResourceTypesForDomain, getDomainLabel, formatCellValue, buildSummaryRows } from './utils';
import { createLogger } from '@/utils/logger';

const log = createLogger('Export-DOCX');

const IBM_BLUE = '0F62FE';

export async function generateDOCX(
  exportData: ExportData,
  options: ExportOptions,
): Promise<Blob> {
  log.info('Generating DOCX export');

  const resourceTypes = getResourceTypesForDomain(exportData.domain);

  // --- Cover section children ---
  const coverChildren: Array<Paragraph | Table> = [
    new Paragraph({
      children: [new TextRun({ text: 'IBM Cloud Infrastructure Report', bold: true, size: 56, color: IBM_BLUE })],
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: getDomainLabel(exportData.domain), size: 32, color: '525252' })],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `Account: ${exportData.accountName}`, size: 24 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${exportData.timestamp}`, size: 24 })],
      spacing: { after: 100 },
    }),
  ];

  if (options.clientName) {
    coverChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `Client: ${options.clientName}`, size: 24 })],
        spacing: { after: 100 },
      }),
    );
  }

  // --- Summary table ---
  const summaryRows = buildSummaryRows(exportData);
  if (summaryRows.length > 0) {
    coverChildren.push(
      new Paragraph({
        text: 'Resource Summary',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );

    const totalCount = summaryRows.reduce((sum, r) => sum + r.count, 0);

    coverChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          createHeaderRow(['Resource Type', 'Count']),
          ...summaryRows.map((r) =>
            new TableRow({
              children: [
                createCell(r.label),
                createCell(String(r.count), AlignmentType.RIGHT),
              ],
            }),
          ),
          new TableRow({
            children: [
              createCell('Total', undefined, true),
              createCell(String(totalCount), AlignmentType.RIGHT, true),
            ],
          }),
        ],
      }),
    );

    coverChildren.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Build sections
  const sections: Array<{
    children: Array<Paragraph | Table>;
  }> = [{ children: coverChildren }];

  // --- Resource sections ---
  for (const rt of resourceTypes) {
    const items = exportData.data[rt.key];
    if (!items || items.length === 0) continue;

    const sectionChildren: Array<Paragraph | Table> = [
      new Paragraph({
        text: `${rt.label} (${items.length})`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),
      buildResourceTable(rt, items),
    ];
    sections.push({ children: sectionChildren });
  }

  const doc = new Document({
    sections: sections.map((s) => ({
      properties: {
        page: {
          size: {
            orientation: 'landscape' as const,
          },
        },
      },
      children: s.children,
    })),
  });

  const buffer = await Packer.toBlob(doc);
  log.info('DOCX generation complete');
  return buffer;
}

function buildResourceTable(rt: ResourceTypeMeta, items: unknown[]): Table {
  const visibleCols = rt.columns.filter((c) => c.defaultVisible);
  const headers = visibleCols.map((c) => c.header);

  const dataRows = items.slice(0, 500).map((item) => {
    const row = item as Record<string, unknown>;
    return new TableRow({
      children: visibleCols.map((col) =>
        createCell(formatCellValue(row[col.field], col.dataType)),
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [createHeaderRow(headers), ...dataRows],
  });
}

function createHeaderRow(headers: string[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 16, color: 'FFFFFF' })],
            }),
          ],
          shading: { fill: IBM_BLUE, type: ShadingType.CLEAR, color: IBM_BLUE },
          borders: cellBorders(),
        }),
    ),
  });
}

function createCell(
  text: string,
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType],
  bold?: boolean,
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 16, bold })],
        alignment,
      }),
    ],
    borders: cellBorders(),
  });
}

function cellBorders() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'D0D0D0' };
  return { top: border, bottom: border, left: border, right: border };
}
