import React from 'react';
import { Modal, Loading } from '@carbon/react';

interface Props {
  open: boolean;
  onClose: () => void;
  onExportDocx: () => void;
  exporting: boolean;
}

const MigrationExportDialog: React.FC<Props> = ({ open, onClose, onExportDocx, exporting }) => {
  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Export Migration Report"
      primaryButtonText={exporting ? 'Exporting...' : 'Export DOCX'}
      secondaryButtonText="Cancel"
      onRequestSubmit={onExportDocx}
      primaryButtonDisabled={exporting}
      size="sm"
    >
      <div style={{ padding: '1rem 0' }}>
        {exporting ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Loading withOverlay={false} small />
            <span>Generating report...</span>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '1rem' }}>
              Export the VPC Migration Readiness Report as a Microsoft Word document (.docx).
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-helper)' }}>
              The report includes an executive summary, readiness scores, assessment details for all
              resource types, feature gap analysis, cost comparison, and migration wave plan.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};

export default MigrationExportDialog;
