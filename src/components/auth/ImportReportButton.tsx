import React, { useRef, useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { ReportData } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useVpcData } from '@/contexts/VpcDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { classifyReportFiles, parseReportFiles } from '@/services/report-import';
import { VPC_RESOURCE_TYPES } from '@/types/vpc-resources';
import { createLogger } from '@/utils/logger';

const log = createLogger('ImportReport');

const vpcKeys = new Set(VPC_RESOURCE_TYPES.map(rt => rt.key));

const ImportReportButton: React.FC = () => {
  const navigate = useNavigate();
  const { importData } = useData();
  const { setVpcResourceData, setVpcStatus } = useVpcData();
  const { setImportedAccountInfo } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsImporting(true);

    try {
      log.info(`User selected ${files.length} report files`);

      // Classify and parse
      const fileSet = classifyReportFiles(files);
      const result = await parseReportFiles(fileSet);

      // Split data between classic and VPC contexts (same logic as ImportButton)
      const classicData: Record<string, unknown[]> = {};
      const vpcData: Record<string, unknown[]> = {};
      for (const [key, items] of Object.entries(result.data)) {
        if (key.startsWith('_')) continue; // Skip internal keys like _topology
        if (vpcKeys.has(key)) {
          vpcData[key] = items;
        } else {
          classicData[key] = items;
        }
      }

      // Import classic data
      importData(classicData, `report:${fileSet.accountId}`);

      // Import VPC data
      for (const [key, items] of Object.entries(vpcData)) {
        setVpcResourceData(key, items);
      }
      if (Object.keys(vpcData).length > 0) {
        setVpcStatus('complete');
      }

      // Determine which domains have data
      const hasClassic = Object.values(classicData).some(items => items.length > 0);
      const hasVpc = Object.values(vpcData).some(items => items.length > 0);

      if (result.accountInfo) {
        const mode: ('classic' | 'vpc')[] = [];
        if (hasClassic) mode.push('classic');
        if (hasVpc) mode.push('vpc');
        if (mode.length === 0) mode.push('classic');
        setImportedAccountInfo(result.accountInfo, mode);
      }

      log.info('Report import successful, navigating to dashboard');
      navigate(hasVpc && !hasClassic ? '/vpc/dashboard' : '/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import report files';
      log.error('Report import failed:', message);
      setError(message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.html,.htm,.drawio,.json,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button
        kind="tertiary"
        renderIcon={ReportData}
        onClick={handleClick}
        disabled={isImporting}
        size="md"
      >
        {isImporting ? 'Importing...' : 'Import IMS Reports'}
      </Button>
      {error && (
        <InlineNotification
          kind="error"
          title="Import failed"
          subtitle={error}
          lowContrast
          hideCloseButton={false}
          onClose={() => setError(null)}
          style={{ marginTop: '0.5rem' }}
        />
      )}
    </>
  );
};

export default ImportReportButton;
