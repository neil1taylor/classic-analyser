/**
 * Handover ZIP bundle export service.
 * Creates a ZIP containing the XLSX export plus metadata JSON.
 */
import JSZip from 'jszip';
import type { ExportData, ExportOptions } from './types';
import { getDomainLabel, buildSummaryRows } from './utils';
import { createLogger } from '@/utils/logger';

const log = createLogger('Export-Handover');

/**
 * Function to generate the XLSX blob, provided by the caller
 * so we do not duplicate XLSX generation logic.
 */
export type XlsxGenerator = (data: Record<string, unknown[]>, accountName: string) => Promise<Blob>;

export async function generateHandoverZip(
  exportData: ExportData,
  options: ExportOptions,
  xlsxGenerator: XlsxGenerator,
): Promise<Blob> {
  log.info('Generating handover ZIP');

  const zip = new JSZip();
  const timestamp = exportData.timestamp;
  const sanitizedName = exportData.accountName.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Generate and add the XLSX file
  const xlsxBlob = await xlsxGenerator(exportData.data, exportData.accountName);
  const xlsxFilename = `${sanitizedName}_${exportData.domain}_export_${timestamp}.xlsx`;
  zip.file(xlsxFilename, xlsxBlob);

  // Build metadata
  const summaryRows = buildSummaryRows(exportData);
  const metadata = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'IBM Cloud Infrastructure Explorer',
    account: {
      name: exportData.accountName,
      domain: exportData.domain,
      domainLabel: getDomainLabel(exportData.domain),
    },
    client: options.clientName || null,
    exportTimestamp: timestamp,
    resources: Object.fromEntries(
      summaryRows.map((r) => [r.key, { label: r.label, count: r.count, category: r.category }]),
    ),
    totalResources: summaryRows.reduce((sum, r) => sum + r.count, 0),
    files: [xlsxFilename, 'metadata.json'],
  };

  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // Add a README
  const readme = [
    `# IBM Cloud Infrastructure Handover`,
    ``,
    `**Account:** ${exportData.accountName}`,
    `**Domain:** ${getDomainLabel(exportData.domain)}`,
    `**Generated:** ${new Date().toISOString()}`,
    options.clientName ? `**Client:** ${options.clientName}` : '',
    ``,
    `## Contents`,
    ``,
    `- \`${xlsxFilename}\` — Full infrastructure data (Excel workbook)`,
    `- \`metadata.json\` — Machine-readable metadata and resource summary`,
    `- \`README.md\` — This file`,
    ``,
    `## Resource Summary`,
    ``,
    `| Resource Type | Category | Count |`,
    `|---|---|---|`,
    ...summaryRows.map((r) => `| ${r.label} | ${r.category} | ${r.count} |`),
    `| **Total** | | **${summaryRows.reduce((s, r) => s + r.count, 0)}** |`,
    ``,
  ]
    .filter(Boolean)
    .join('\n');

  zip.file('README.md', readme);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  log.info('Handover ZIP generation complete');
  return blob;
}
