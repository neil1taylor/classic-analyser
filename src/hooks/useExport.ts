import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { exportData } from '@/services/api';
import { exportAs, getFileExtension } from '@/services/export';
import type { ExportFormat } from '@/services/export';
import { createLogger } from '@/utils/logger';

const log = createLogger('Export');

interface UseExportReturn {
  exportAll: (format?: ExportFormat) => Promise<void>;
  exportTable: (resourceKey: string, data: unknown[], format?: ExportFormat) => Promise<void>;
  exportSelected: (resourceKey: string, selectedRows: unknown[], format?: ExportFormat) => Promise<void>;
  isExporting: boolean;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function useExport(): UseExportReturn {
  const { accountInfo } = useAuth();
  const { collectedData } = useData();
  const [isExporting, setIsExporting] = useState(false);

  const accountName = accountInfo?.companyName || 'export';
  const sanitizedName = accountName.replace(/[^a-zA-Z0-9_-]/g, '_');

  const exportAll = useCallback(async (format: ExportFormat = 'xlsx') => {
    log.info('Exporting all data, format:', format);
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === 'xlsx') {
        const blob = await exportData(collectedData, accountName);
        const filename = `${sanitizedName}_classic_export_${timestamp}.xlsx`;
        triggerDownload(blob, filename);
      } else {
        const ext = getFileExtension(format);
        const blob = await exportAs(
          format,
          { data: collectedData, accountName, domain: 'classic', timestamp },
          { format, accountName, domain: 'classic' },
          format === 'handover' ? (data, name) => exportData(data, name) : undefined,
        );
        triggerDownload(blob, `${sanitizedName}_classic_export_${timestamp}.${ext}`);
      }

      log.info('Export download triggered');
    } finally {
      setIsExporting(false);
    }
  }, [collectedData, accountName, sanitizedName]);

  const exportTable = useCallback(async (resourceKey: string, data: unknown[], format: ExportFormat = 'xlsx') => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const payload: Record<string, unknown[]> = { [resourceKey]: data };

      if (format === 'xlsx') {
        const blob = await exportData(payload, accountName);
        triggerDownload(blob, `${sanitizedName}_${resourceKey}_${timestamp}.xlsx`);
      } else {
        const ext = getFileExtension(format);
        const blob = await exportAs(
          format,
          { data: payload, accountName, domain: 'classic', timestamp },
          { format, accountName, domain: 'classic' },
          format === 'handover' ? (d, n) => exportData(d, n) : undefined,
        );
        triggerDownload(blob, `${sanitizedName}_${resourceKey}_${timestamp}.${ext}`);
      }
    } finally {
      setIsExporting(false);
    }
  }, [accountName, sanitizedName]);

  const exportSelected = useCallback(async (resourceKey: string, selectedRows: unknown[], format: ExportFormat = 'xlsx') => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const payload: Record<string, unknown[]> = { [resourceKey]: selectedRows };

      if (format === 'xlsx') {
        const blob = await exportData(payload, accountName);
        triggerDownload(blob, `${sanitizedName}_${resourceKey}_selected_${timestamp}.xlsx`);
      } else {
        const ext = getFileExtension(format);
        const blob = await exportAs(
          format,
          { data: payload, accountName, domain: 'classic', timestamp },
          { format, accountName, domain: 'classic' },
          format === 'handover' ? (d, n) => exportData(d, n) : undefined,
        );
        triggerDownload(blob, `${sanitizedName}_${resourceKey}_selected_${timestamp}.${ext}`);
      }
    } finally {
      setIsExporting(false);
    }
  }, [accountName, sanitizedName]);

  return { exportAll, exportTable, exportSelected, isExporting };
}
