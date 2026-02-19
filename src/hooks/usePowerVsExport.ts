import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { exportPowerVsData } from '@/services/powervs-api';
import { createLogger } from '@/utils/logger';

const log = createLogger('PowerVS-Export');

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

interface UsePowerVsExportReturn {
  exportPvsAll: () => Promise<void>;
  isPvsExporting: boolean;
}

export function usePowerVsExport(): UsePowerVsExportReturn {
  const { accountInfo } = useAuth();
  const { pvsCollectedData } = usePowerVsData();
  const [isPvsExporting, setIsPvsExporting] = useState(false);

  const accountName = accountInfo?.companyName || 'PowerVS';
  const sanitizedName = accountName.replace(/[^a-zA-Z0-9_-]/g, '_');

  const exportPvsAll = useCallback(async () => {
    log.info('Exporting all PowerVS data');
    setIsPvsExporting(true);
    try {
      const blob = await exportPowerVsData(pvsCollectedData, accountName);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${sanitizedName}_powervs_export_${timestamp}.xlsx`;
      triggerDownload(blob, filename);
      log.info('PowerVS export download triggered:', filename);
    } finally {
      setIsPvsExporting(false);
    }
  }, [pvsCollectedData, accountName, sanitizedName]);

  return { exportPvsAll, isPvsExporting };
}
