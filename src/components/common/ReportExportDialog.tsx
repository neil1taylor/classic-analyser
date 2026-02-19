import React, { useState } from 'react';
import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TextInput,
  Toggle,
  Tooltip,
  Loading,
  Button,
} from '@carbon/react';
import { useAI } from '@/contexts/AIContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onExport: (options: ReportExportOptions) => void;
  exporting: boolean;
  hasMigrationData: boolean;
}

export interface ReportExportOptions {
  clientName: string;
  includeAI: boolean;
}

const ReportExportDialog: React.FC<Props> = ({
  open,
  onClose,
  onExport,
  exporting,
  hasMigrationData,
}) => {
  const { isAvailable, isConfigured } = useAI();
  const [clientName, setClientName] = useState(
    () => localStorage.getItem('report_client_name') || '',
  );
  const [includeAI, setIncludeAI] = useState(false);

  const handleSubmit = () => {
    onExport({ clientName, includeAI });
  };

  return (
    <ComposedModal open={open} onClose={onClose} size="sm">
      <ModalHeader title="Generate Report" />
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
            {hasMigrationData
              ? 'Generate a unified report with inventory details and migration assessment.'
              : 'Generate an infrastructure inventory report.'}
          </p>

          <TextInput
            id="report-client-name"
            labelText="Client Name (optional)"
            placeholder="Organization name for cover page"
            value={clientName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value)}
          />

          {isConfigured && (
            <Tooltip label="Add AI-generated prose summaries to each report section. Requires AI features to be enabled in Settings." align="bottom">
              <div>
                <Toggle
                  id="report-include-ai"
                  labelText="Include AI Narratives"
                  toggled={includeAI}
                  onToggle={(checked: boolean) => setIncludeAI(checked)}
                  labelA="Off"
                  labelB="On"
                  disabled={!isAvailable}
                />
              </div>
            </Tooltip>
          )}

          {exporting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Loading withOverlay={false} small />
              <span style={{ fontSize: '0.875rem' }}>
                Generating report{includeAI ? ' with AI narratives' : ''}...
              </span>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={handleSubmit} disabled={exporting}>
          {exporting ? 'Generating...' : 'Generate Report'}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default ReportExportDialog;
