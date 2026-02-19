import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { exportData } from '@/services/api';
import { createLogger } from '@/utils/logger';

const log = createLogger('Export');

interface UseExportReturn {
  exportAll: () => Promise<void>;
  exportTable: (resourceKey: string, data: unknown[]) => Promise<void>;
  exportSelected: (resourceKey: string, selectedRows: unknown[]) => Promise<void>;
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

  const exportAll = useCallback(async () => {
    log.info('Exporting all data');
    setIsExporting(true);
    try {
      const blob = await exportData(collectedData, accountName);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${sanitizedName}_classic_export_${timestamp}.xlsx`;
      triggerDownload(blob, filename);
      log.info('Export download triggered:', filename);
    } finally {
      setIsExporting(false);
    }
  }, [collectedData, accountName, sanitizedName]);

  const exportTable = useCallback(async (resourceKey: string, data: unknown[]) => {
    setIsExporting(true);
    try {
      const payload: Record<string, unknown[]> = { [resourceKey]: data };
      const blob = await exportData(payload, accountName);
      const timestamp = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `${sanitizedName}_${resourceKey}_${timestamp}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  }, [accountName, sanitizedName]);

  const exportSelected = useCallback(async (resourceKey: string, selectedRows: unknown[]) => {
    setIsExporting(true);
    try {
      const payload: Record<string, unknown[]> = { [resourceKey]: selectedRows };
      const blob = await exportData(payload, accountName);
      const timestamp = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `${sanitizedName}_${resourceKey}_selected_${timestamp}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  }, [accountName, sanitizedName]);

  return { exportAll, exportTable, exportSelected, isExporting };
}
