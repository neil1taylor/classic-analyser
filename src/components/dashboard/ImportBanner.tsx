import React from 'react';
import { ActionableNotification } from '@carbon/react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';

const ImportBanner: React.FC = () => {
  const navigate = useNavigate();
  const { dataSource, importFilename, importTimestamp, clearData } = useData();

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

  return (
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
  );
};

export default ImportBanner;
