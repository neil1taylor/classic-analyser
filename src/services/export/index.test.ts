import { describe, it, expect, vi } from 'vitest';
import { getFileExtension, getMimeType, getFormatLabel, exportAs } from './index';
import type { ExportData, ExportOptions } from './types';

describe('getFileExtension', () => {
  it('returns correct extensions', () => {
    expect(getFileExtension('xlsx')).toBe('xlsx');
    expect(getFileExtension('pdf')).toBe('pdf');
    expect(getFileExtension('docx')).toBe('docx');
    expect(getFileExtension('pptx')).toBe('pptx');
    expect(getFileExtension('handover')).toBe('zip');
  });
});

describe('getMimeType', () => {
  it('returns correct MIME types', () => {
    expect(getMimeType('xlsx')).toContain('spreadsheetml');
    expect(getMimeType('pdf')).toBe('application/pdf');
    expect(getMimeType('docx')).toContain('wordprocessingml');
    expect(getMimeType('pptx')).toContain('presentationml');
    expect(getMimeType('handover')).toBe('application/zip');
  });
});

describe('getFormatLabel', () => {
  it('returns correct labels', () => {
    expect(getFormatLabel('xlsx')).toContain('Excel');
    expect(getFormatLabel('pdf')).toContain('PDF');
    expect(getFormatLabel('docx')).toContain('Word');
    expect(getFormatLabel('pptx')).toContain('PowerPoint');
    expect(getFormatLabel('handover')).toContain('Handover');
  });
});

describe('exportAs', () => {
  const exportData: ExportData = {
    data: {},
    accountName: 'test',
    domain: 'classic',
    timestamp: new Date().toISOString(),
  };
  const options: ExportOptions = {
    format: 'pdf',
    accountName: 'test',
    domain: 'classic',
  };

  it('calls PDF generator for pdf format', async () => {
    const mockBlob = new Blob(['pdf']);
    vi.doMock('./pdf', () => ({ generatePDF: vi.fn().mockResolvedValue(mockBlob) }));
    const result = await exportAs('pdf', exportData, { ...options, format: 'pdf' });
    expect(result).toBe(mockBlob);
    vi.doUnmock('./pdf');
  });

  it('throws for xlsx format', async () => {
    await expect(exportAs('xlsx', exportData, { ...options, format: 'xlsx' }))
      .rejects.toThrow('XLSX export should use the existing server-side export path');
  });

  it('throws for handover without xlsxGenerator', async () => {
    await expect(exportAs('handover', exportData, { ...options, format: 'handover' }))
      .rejects.toThrow('XLSX generator function is required');
  });
});
