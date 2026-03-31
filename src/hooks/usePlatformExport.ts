import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformData } from '@/contexts/PlatformDataContext';
import { exportPlatformData } from '@/services/platform-api';
import { exportAs, getFileExtension } from '@/services/export';
import type { ExportFormat } from '@/services/export';
import { createLogger } from '@/utils/logger';

const log = createLogger('Platform-Export');

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

interface UsePlatformExportReturn {
  exportPlatformAll: (format?: ExportFormat) => Promise<void>;
  isPlatformExporting: boolean;
}

export function usePlatformExport(): UsePlatformExportReturn {
  const { accountInfo } = useAuth();
  const { platformCollectedData } = usePlatformData();
  const [isPlatformExporting, setIsPlatformExporting] = useState(false);

  const accountName = accountInfo?.companyName || 'Platform';
  const sanitizedName = accountName.replace(/[^a-zA-Z0-9_-]/g, '_');

  const exportPlatformAll = useCallback(async (format: ExportFormat = 'xlsx') => {
    log.info('Exporting all Platform Services data, format:', format);
    setIsPlatformExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === 'xlsx') {
        const blob = await exportPlatformData(platformCollectedData, accountName);
        const filename = `${sanitizedName}_platform_export_${timestamp}.xlsx`;
        triggerDownload(blob, filename);
      } else {
        const ext = getFileExtension(format);
        const blob = await exportAs(
          format,
          { data: platformCollectedData, accountName, domain: 'platform', timestamp },
          { format, accountName, domain: 'platform' },
          format === 'handover' ? (data, name) => exportPlatformData(data, name) : undefined,
        );
        triggerDownload(blob, `${sanitizedName}_platform_export_${timestamp}.${ext}`);
      }

      log.info('Platform Services export download triggered');
    } finally {
      setIsPlatformExporting(false);
    }
  }, [platformCollectedData, accountName, sanitizedName]);

  return { exportPlatformAll, isPlatformExporting };
}
