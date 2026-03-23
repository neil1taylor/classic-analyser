import React, { useRef, useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { DataBase } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useVpcData } from '@/contexts/VpcDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { parseReportJson } from '@/services/report-parsers';
import { mergeReportData } from '@/services/report-parsers';
import { VPC_RESOURCE_TYPES } from '@/types/vpc-resources';
import { createLogger } from '@/utils/logger';

const log = createLogger('ImportMDL');

const vpcKeys = new Set(VPC_RESOURCE_TYPES.map(rt => rt.key));

const ImportMdlButton: React.FC = () => {
  const navigate = useNavigate();
  const { importData } = useData();
  const { setVpcResourceData, setVpcStatus } = useVpcData();
  const { setImportedAccountInfo } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState('');

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsImporting(true);

    try {
      log.info(`Uploading .mdl file: ${file.name} (${(file.size / 1024 / 1024).toFixed(0)} MB)`);
      setStatus('Uploading...');

      // Upload to server for Python conversion
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/convert/mdl', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || `Server returned ${response.status}`);
      }

      setStatus('Converting...');
      const jsonText = await response.text();

      setStatus('Loading data...');
      const parsed = parseReportJson(jsonText);
      const result = mergeReportData([parsed], file.name);

      // Split data between classic and VPC contexts
      const classicData: Record<string, unknown[]> = {};
      const vpcData: Record<string, unknown[]> = {};
      for (const [key, items] of Object.entries(result.data)) {
        if (key.startsWith('_')) continue;
        if (vpcKeys.has(key)) {
          vpcData[key] = items;
        } else {
          classicData[key] = items;
        }
      }

      importData(classicData, `mdl:${file.name}`);

      for (const [key, items] of Object.entries(vpcData)) {
        setVpcResourceData(key, items);
      }
      if (Object.keys(vpcData).length > 0) {
        setVpcStatus('complete');
      }

      const hasClassic = Object.values(classicData).some(items => items.length > 0);
      const hasVpc = Object.values(vpcData).some(items => items.length > 0);

      if (result.accountInfo) {
        const mode: ('classic' | 'vpc')[] = [];
        if (hasClassic) mode.push('classic');
        if (hasVpc) mode.push('vpc');
        if (mode.length === 0) mode.push('classic');
        setImportedAccountInfo(result.accountInfo, mode);
      }

      log.info('MDL import successful, navigating to dashboard');
      navigate(hasVpc && !hasClassic ? '/vpc/dashboard' : '/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import MDL file';
      log.error('MDL import failed:', message);
      setError(message);
    } finally {
      setIsImporting(false);
      setStatus('');
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
        accept=".mdl"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button
        kind="tertiary"
        renderIcon={DataBase}
        onClick={handleClick}
        disabled={isImporting}
        size="md"
      >
        {isImporting ? status || 'Importing...' : 'Import MDL'}
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

export default ImportMdlButton;
