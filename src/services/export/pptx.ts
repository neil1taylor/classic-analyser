/**
 * PPTX export service using pptxgenjs.
 */
import PptxGenJS from 'pptxgenjs';
import type { ExportData, ExportOptions } from './types';
import { getResourceTypesForDomain, getDomainLabel, formatCellValue, buildSummaryRows } from './utils';
import { createLogger } from '@/utils/logger';

const log = createLogger('Export-PPTX');

const IBM_BLUE = '0F62FE';
const LIGHT_GRAY = 'F4F4F4';

export async function generatePPTX(
  exportData: ExportData,
  options: ExportOptions,
): Promise<Blob> {
  log.info('Generating PPTX export');

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
  pptx.author = 'IBM Cloud Infrastructure Explorer';
  pptx.title = `${getDomainLabel(exportData.domain)} Report`;

  // --- Title slide ---
  const titleSlide = pptx.addSlide();
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: '100%',
    h: '40%',
    fill: { color: IBM_BLUE },
  });

  titleSlide.addText('IBM Cloud Infrastructure Report', {
    x: 0.75,
    y: 0.6,
    w: 11,
    h: 1,
    fontSize: 32,
    color: 'FFFFFF',
    bold: true,
  });

  titleSlide.addText(getDomainLabel(exportData.domain), {
    x: 0.75,
    y: 1.5,
    w: 11,
    h: 0.6,
    fontSize: 20,
    color: 'FFFFFF',
  });

  const details = [`Account: ${exportData.accountName}`, `Generated: ${exportData.timestamp}`];
  if (options.clientName) details.push(`Client: ${options.clientName}`);

  titleSlide.addText(details.join('\n'), {
    x: 0.75,
    y: 3.5,
    w: 11,
    h: 1.5,
    fontSize: 14,
    color: '525252',
    lineSpacingMultiple: 1.5,
  });

  // --- Summary slide ---
  const summaryRows = buildSummaryRows(exportData);
  if (summaryRows.length > 0) {
    const summarySlide = pptx.addSlide();
    summarySlide.addText('Resource Summary', {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: '161616',
    });

    const totalCount = summaryRows.reduce((sum, r) => sum + r.count, 0);

    const tableRows: PptxGenJS.TableRow[] = [
      [
        { text: 'Resource Type', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 11 } },
        { text: 'Category', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 11 } },
        { text: 'Count', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 11, align: 'right' } },
      ],
      ...summaryRows.map((r, i) => [
        { text: r.label, options: { fontSize: 10, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
        { text: r.category, options: { fontSize: 10, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
        { text: String(r.count), options: { fontSize: 10, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      ]),
      [
        { text: 'Total', options: { bold: true, fontSize: 11 } },
        { text: '', options: { fontSize: 11 } },
        { text: String(totalCount), options: { bold: true, fontSize: 11, align: 'right' as const } },
      ],
    ];

    summarySlide.addTable(tableRows, {
      x: 0.5,
      y: 1.1,
      w: 12,
      colW: [6, 3, 3],
      border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
      autoPage: true,
    });
  }

  // --- Category breakdown slides ---
  const categories = new Map<string, Array<{ label: string; count: number }>>();
  for (const row of summaryRows) {
    const existing = categories.get(row.category) || [];
    existing.push({ label: row.label, count: row.count });
    categories.set(row.category, existing);
  }

  for (const [category, resources] of categories) {
    const slide = pptx.addSlide();
    slide.addText(category, {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: '161616',
    });

    const catTotal = resources.reduce((sum, r) => sum + r.count, 0);
    slide.addText(`${resources.length} resource types | ${catTotal} total resources`, {
      x: 0.5,
      y: 0.9,
      w: 12,
      h: 0.4,
      fontSize: 12,
      color: '525252',
    });

    const rows: PptxGenJS.TableRow[] = [
      [
        { text: 'Resource Type', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 11 } },
        { text: 'Count', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 11, align: 'right' } },
      ],
      ...resources.map((r, i) => [
        { text: r.label, options: { fontSize: 10, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
        { text: String(r.count), options: { fontSize: 10, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      ]),
    ];

    slide.addTable(rows, {
      x: 0.5,
      y: 1.5,
      w: 12,
      colW: [9, 3],
      border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
    });
  }

  // --- Resource detail slides (top 20 rows per type) ---
  const resourceTypes = getResourceTypesForDomain(exportData.domain);
  for (const rt of resourceTypes) {
    const items = exportData.data[rt.key];
    if (!items || items.length === 0) continue;

    const slide = pptx.addSlide();
    slide.addText(`${rt.label} (${items.length})`, {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.6,
      fontSize: 20,
      bold: true,
      color: '161616',
    });

    const visibleCols = rt.columns.filter((c) => c.defaultVisible).slice(0, 6); // limit columns for slide width
    const headers: PptxGenJS.TableRow = visibleCols.map((c) => ({
      text: c.header,
      options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 },
    }));

    const preview = items.slice(0, 15);
    const dataRows: PptxGenJS.TableRow[] = preview.map((item, i) => {
      const row = item as Record<string, unknown>;
      return visibleCols.map((col) => ({
        text: formatCellValue(row[col.field], col.dataType),
        options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } },
      }));
    });

    slide.addTable([headers, ...dataRows], {
      x: 0.3,
      y: 1.1,
      w: 12.7,
      border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
      autoPage: true,
    });

    if (items.length > 15) {
      slide.addText(`Showing 15 of ${items.length} rows. See XLSX export for full data.`, {
        x: 0.5,
        y: 6.8,
        w: 12,
        h: 0.4,
        fontSize: 9,
        color: '8D8D8D',
        italic: true,
      });
    }
  }

  const blob = await pptx.write({ outputType: 'blob' }) as Blob;
  log.info('PPTX generation complete');
  return blob;
}
