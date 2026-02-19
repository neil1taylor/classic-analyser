import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVpcData } from '@/contexts/VpcDataContext';
import { exportVpcData } from '@/services/vpc-api';
import { createLogger } from '@/utils/logger';

const log = createLogger('VPC-Export');

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

interface UseVpcExportReturn {
  exportVpcAll: () => Promise<void>;
  isVpcExporting: boolean;
}

export function useVpcExport(): UseVpcExportReturn {
  const { accountInfo } = useAuth();
  const { vpcCollectedData } = useVpcData();
  const [isVpcExporting, setIsVpcExporting] = useState(false);

  const accountName = accountInfo?.companyName || 'VPC';
  const sanitizedName = accountName.replace(/[^a-zA-Z0-9_-]/g, '_');

  const exportVpcAll = useCallback(async () => {
    log.info('Exporting all VPC data');
    setIsVpcExporting(true);
    try {
      const blob = await exportVpcData(vpcCollectedData, accountName);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${sanitizedName}_vpc_export_${timestamp}.xlsx`;
      triggerDownload(blob, filename);
      log.info('VPC export download triggered:', filename);
    } finally {
      setIsVpcExporting(false);
    }
  }, [vpcCollectedData, accountName, sanitizedName]);

  return { exportVpcAll, isVpcExporting };
}
