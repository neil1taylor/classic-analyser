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

  const handleClear = () => {
    clearData();
    navigate('/');
  };

  return (
    <ActionableNotification
      kind="info"
      title="Imported data"
      subtitle={`Viewing imported data from '${importFilename}'${timestamp ? ` — ${timestamp}` : ''}`}
      lowContrast
      hideCloseButton
      actionButtonLabel="Clear & Return"
      onActionButtonClick={handleClear}
      style={{ marginBottom: '1rem' }}
    />
  );
};

export default ImportBanner;
