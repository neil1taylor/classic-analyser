/**
 * PDF export service using jsPDF and jspdf-autotable.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportData, ExportOptions, ResourceTypeMeta } from './types';
import { getResourceTypesForDomain, formatCellValue, buildSummaryRows } from './utils';
import { createLogger } from '@/utils/logger';

const log = createLogger('Export-PDF');

export async function generatePDF(
  exportData: ExportData,
  options: ExportOptions,
): Promise<Blob> {
  log.info('Generating PDF export');

  const orientation = 'landscape';
  const format = options.pageSize === 'letter' ? 'letter' : 'a4';
  const doc = new jsPDF({ orientation, format });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- Cover page ---
  doc.setFillColor(15, 98, 254); // IBM Blue
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('IBM Cloud Infrastructure Report', 20, 35);

  doc.setFontSize(14);
  doc.text(domainLabel(exportData.domain), 20, 50);

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(16);
  const yStart = 80;
  doc.text(`Account: ${exportData.accountName}`, 20, yStart);
  doc.text(`Generated: ${exportData.timestamp}`, 20, yStart + 12);

  if (options.clientName) {
    doc.text(`Client: ${options.clientName}`, 20, yStart + 24);
  }

  // Summary section
  const summaryRows = buildSummaryRows(exportData);
  if (summaryRows.length > 0) {
    doc.setFontSize(12);
    let sY = yStart + 48;
    doc.setFontSize(18);
    doc.text('Resource Summary', 20, sY);
    sY += 10;

    autoTable(doc, {
      startY: sY,
      head: [['Resource Type', 'Count']],
      body: summaryRows.map((r) => [r.label, String(r.count)]),
      theme: 'grid',
      headStyles: { fillColor: [15, 98, 254] },
      margin: { left: 20, right: 20 },
    });
  }

  // --- Resource pages ---
  const resourceTypes = getResourceTypesForDomain(exportData.domain);

  for (const rt of resourceTypes) {
    const items = exportData.data[rt.key];
    if (!items || items.length === 0) continue;

    doc.addPage(format, orientation);
    addResourceTable(doc, rt, items, pageWidth, pageHeight);
  }

  log.info('PDF generation complete');
  return doc.output('blob');
}

function addResourceTable(
  doc: jsPDF,
  rt: ResourceTypeMeta,
  items: unknown[],
  _pageWidth: number,
  _pageHeight: number,
): void {
  const visibleCols = rt.columns.filter((c) => c.defaultVisible);
  const headers = visibleCols.map((c) => c.header);

  const body = items.map((item) => {
    const row = item as Record<string, unknown>;
    return visibleCols.map((col) => formatCellValue(row[col.field], col.dataType));
  });

  doc.setFontSize(16);
  doc.setTextColor(50, 50, 50);
  doc.text(`${rt.label} (${items.length})`, 14, 20);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body,
    theme: 'striped',
    headStyles: { fillColor: [15, 98, 254], fontSize: 7 },
    bodyStyles: { fontSize: 6 },
    margin: { left: 14, right: 14 },
    styles: { overflow: 'ellipsize', cellWidth: 'auto' },
    tableWidth: 'auto',
  });
}

function domainLabel(domain: string): string {
  switch (domain) {
    case 'classic':
      return 'Classic Infrastructure';
    case 'vpc':
      return 'VPC Infrastructure';
    case 'powervs':
      return 'PowerVS Infrastructure';
    default:
      return 'Infrastructure';
  }
}
