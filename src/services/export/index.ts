/**
 * Export orchestrator — unified entry point for all export formats.
 */
import type { ExportFormat, ExportOptions, ExportData } from './types';
import type { XlsxGenerator } from './handover';
import { createLogger } from '@/utils/logger';

const log = createLogger('Export');

export type { ExportFormat, ExportOptions, ExportData } from './types';
export type { InfrastructureDomain } from './types';

/**
 * Generate an export in the requested format.
 *
 * For XLSX, the caller should use the existing export path (server-side).
 * For PDF, DOCX, PPTX, and Handover ZIP, generation happens client-side.
 *
 * @param format - The desired output format
 * @param exportData - The data to export with metadata
 * @param options - Format-specific options
 * @param xlsxGenerator - Function to generate XLSX blob (needed for handover ZIP)
 * @returns A Blob of the generated file
 */
export async function exportAs(
  format: ExportFormat,
  exportData: ExportData,
  options: ExportOptions,
  xlsxGenerator?: XlsxGenerator,
): Promise<Blob> {
  log.info(`Exporting as ${format} for domain ${exportData.domain}`);

  switch (format) {
    case 'pdf': {
      const { generatePDF } = await import('./pdf');
      return generatePDF(exportData, options);
    }
    case 'docx': {
      const { generateDOCX } = await import('./docx');
      return generateDOCX(exportData, options);
    }
    case 'pptx': {
      const { generatePPTX } = await import('./pptx');
      return generatePPTX(exportData, options);
    }
    case 'handover': {
      if (!xlsxGenerator) {
        throw new Error('XLSX generator function is required for handover ZIP export');
      }
      const { generateHandoverZip } = await import('./handover');
      return generateHandoverZip(exportData, options, xlsxGenerator);
    }
    case 'xlsx':
      throw new Error('XLSX export should use the existing server-side export path');
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Get the file extension for a given export format.
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'xlsx':
      return 'xlsx';
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'pptx':
      return 'pptx';
    case 'handover':
      return 'zip';
  }
}

/**
 * Get the MIME type for a given export format.
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'handover':
      return 'application/zip';
  }
}

/**
 * Get the display label for a given export format.
 */
export function getFormatLabel(format: ExportFormat): string {
  switch (format) {
    case 'xlsx':
      return 'Excel Workbook (.xlsx)';
    case 'pdf':
      return 'PDF Document (.pdf)';
    case 'docx':
      return 'Word Document (.docx)';
    case 'pptx':
      return 'PowerPoint (.pptx)';
    case 'handover':
      return 'Handover Package (.zip)';
  }
}
