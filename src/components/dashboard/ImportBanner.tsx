import React from 'react';
import { ActionableNotification, InlineNotification } from '@carbon/react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';

function isVersionBelow(version: string, minVersion: string): boolean {
  const parts = version.split('.').map(Number);
  const minParts = minVersion.split('.').map(Number);
  for (let i = 0; i < Math.max(parts.length, minParts.length); i++) {
    const a = parts[i] ?? 0;
    const b = minParts[i] ?? 0;
    if (a < b) return true;
    if (a > b) return false;
  }
  return false;
}

const ImportBanner: React.FC = () => {
  const navigate = useNavigate();
  const { dataSource, importFilename, importTimestamp, clearData } = useData();
  const { accountInfo } = useAuth();

  if (dataSource !== 'imported') return null;

  const timestamp = importTimestamp
    ? importTimestamp.toLocaleString()
    : '';

  // IMS report/MDL imports don't include billing data
  const isReportImport = importFilename?.startsWith('report:') || importFilename?.startsWith('mdl:');
  const costNote = isReportImport
    ? ' Cost data is not available — IMS reports do not include billing information.'
    : '';

  const handleClear = () => {
    clearData();
    navigate('/');
  };

  const showVersionWarning = accountInfo?.reporterVersion
    && isVersionBelow(accountInfo.reporterVersion, '4.5.0');

  return (
    <>
      <ActionableNotification
        kind="info"
        title="Imported data"
        subtitle={`Viewing imported data from '${importFilename}'${timestamp ? ` — ${timestamp}` : ''}.${costNote}`}
        lowContrast
        hideCloseButton
        actionButtonLabel="Clear & Return"
        onActionButtonClick={handleClear}
        style={{ marginBottom: '1rem' }}
      />
      {showVersionWarning && (
        <InlineNotification
          kind="warning"
          title="Outdated IMS Reporter"
          subtitle={`IMS Reporter version ${accountInfo.reporterVersion} is below the recommended minimum 4.5.0. Some data may be incomplete or missing.`}
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}
    </>
  );
};

export default ImportBanner;
