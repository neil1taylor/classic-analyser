import React, { useRef, useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { DocumentImport } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { parseImportedXlsx } from '@/services/import';
import { createLogger } from '@/utils/logger';

const log = createLogger('Import');

const ImportButton: React.FC = () => {
  const navigate = useNavigate();
  const { importData } = useData();
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
      importData(result.data, file.name);
      if (result.accountInfo) {
        setImportedAccountInfo(result.accountInfo);
      }
      log.info('Import successful, navigating to dashboard');
      navigate('/dashboard');
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
