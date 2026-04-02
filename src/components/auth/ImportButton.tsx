import React, { useRef, useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { DocumentImport } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useVpcData } from '@/contexts/VpcDataContext';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { usePlatformData } from '@/contexts/PlatformDataContext';
import { useAuth, type InfrastructureDomain } from '@/contexts/AuthContext';
import { parseImportedXlsx } from '@/services/import';
import { VPC_RESOURCE_TYPES } from '@/types/vpc-resources';
import { POWERVS_RESOURCE_TYPES } from '@/types/powervs-resources';
import { PLATFORM_RESOURCE_TYPES } from '@/types/platform-resources';
import { createLogger } from '@/utils/logger';

const log = createLogger('Import');

const vpcKeys = new Set(VPC_RESOURCE_TYPES.map(rt => rt.key));
const powerVsKeys = new Set(POWERVS_RESOURCE_TYPES.map(rt => rt.key));
const platformKeys = new Set(PLATFORM_RESOURCE_TYPES.map(rt => rt.key));

const ImportButton: React.FC = () => {
  const navigate = useNavigate();
  const { importData } = useData();
  const { setVpcResourceData, setVpcStatus } = useVpcData();
  const { setPvsResourceData, setPvsStatus } = usePowerVsData();
  const { setPlatformResourceData, setPlatformStatus } = usePlatformData();
  const { setImportedAccountInfo } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsImporting(true);

    try {
      log.info('User selected file for import:', file.name);
      const result = await parseImportedXlsx(file);

      // Split data between classic, VPC, PowerVS, and Platform contexts
      const classicData: Record<string, unknown[]> = {};
      const vpcData: Record<string, unknown[]> = {};
      const powerVsData: Record<string, unknown[]> = {};
      const platformData: Record<string, unknown[]> = {};
      for (const [key, items] of Object.entries(result.data)) {
        if (vpcKeys.has(key)) {
          vpcData[key] = items;
        } else if (powerVsKeys.has(key)) {
          powerVsData[key] = items;
        } else if (platformKeys.has(key)) {
          platformData[key] = items;
        } else {
          classicData[key] = items;
        }
      }

      // Import classic data
      importData(classicData, file.name);

      // Import VPC data
      for (const [key, items] of Object.entries(vpcData)) {
        setVpcResourceData(key, items);
      }
      if (Object.keys(vpcData).length > 0) {
        setVpcStatus('complete');
      }

      // Import PowerVS data
      for (const [key, items] of Object.entries(powerVsData)) {
        setPvsResourceData(key, items);
      }
      if (Object.keys(powerVsData).length > 0) {
        setPvsStatus('complete');
      }

      // Import Platform data
      for (const [key, items] of Object.entries(platformData)) {
        setPlatformResourceData(key, items);
      }
      if (Object.keys(platformData).length > 0) {
        setPlatformStatus('complete');
      }

      // Determine which domains have data
      const hasClassic = Object.values(classicData).some(items => items.length > 0);
      const hasVpc = Object.values(vpcData).some(items => items.length > 0);
      const hasPowerVs = Object.values(powerVsData).some(items => items.length > 0);
      const hasPlatform = Object.values(platformData).some(items => items.length > 0);

      if (result.accountInfo) {
        const mode: InfrastructureDomain[] = [];
        if (hasClassic) mode.push('classic');
        if (hasVpc) mode.push('vpc');
        if (hasPowerVs) mode.push('powervs');
        if (hasPlatform) mode.push('platform');
        if (mode.length === 0) mode.push('classic');
        setImportedAccountInfo(result.accountInfo, mode);
      }

      log.info('Import successful, navigating to dashboard');
      // Navigate to the first domain that has data
      if (hasClassic) {
        navigate('/dashboard');
      } else if (hasVpc) {
        navigate('/vpc/dashboard');
      } else if (hasPowerVs) {
        navigate('/powervs/dashboard');
      } else if (hasPlatform) {
        navigate('/platform/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import file';
      log.error('Import failed:', message);
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
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button
        kind="tertiary"
        renderIcon={DocumentImport}
        onClick={handleClick}
        disabled={isImporting}
        size="md"
      >
        {isImporting ? 'Importing...' : 'Import XLSX'}
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

export default ImportButton;
