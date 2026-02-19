import React, { useState } from 'react';
import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  RadioButtonGroup,
  RadioButton,
  Checkbox,
  Button,
  InlineLoading,
  Tooltip,
} from '@carbon/react';

export type ExportScope = 'all' | 'currentTable' | 'selectedRows';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (scope: ExportScope, filteredOnly: boolean) => Promise<void>;
  hasSelectedRows: boolean;
  hasCurrentTable: boolean;
  isExporting: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  onExport,
  hasSelectedRows,
  hasCurrentTable,
  isExporting,
}) => {
  const [scope, setScope] = useState<ExportScope>('all');
  const [filteredOnly, setFilteredOnly] = useState(false);

  const blurAndClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  const handleExport = async () => {
    await onExport(scope, filteredOnly);
    blurAndClose();
  };

  return (
    <ComposedModal open={open} onClose={blurAndClose} size="sm">
      <ModalHeader title="Export Data" />
      <ModalBody>
        <div style={{ marginBottom: '1.5rem' }}>
          <RadioButtonGroup
            legendText="Export scope"
            name="export-scope"
            valueSelected={scope}
            onChange={(value: string | number | undefined) => setScope(value as ExportScope)}
            orientation="vertical"
          >
            <RadioButton labelText="All collected data" value="all" id="scope-all" />
            <RadioButton
              labelText="Current table"
              value="currentTable"
              id="scope-current"
              disabled={!hasCurrentTable}
            />
            <RadioButton
              labelText="Selected rows"
              value="selectedRows"
              id="scope-selected"
              disabled={!hasSelectedRows}
            />
          </RadioButtonGroup>
        </div>
        <Tooltip label="When checked, only rows matching current table filters are exported" align="bottom">
          <span>
            <Checkbox
              id="filtered-only"
              labelText="Include filtered data only"
              checked={filteredOnly}
              onChange={(_event: React.ChangeEvent<HTMLInputElement>, { checked }: { checked: boolean }) => setFilteredOnly(checked)}
            />
          </span>
        </Tooltip>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={blurAndClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <InlineLoading description="Exporting..." />
          ) : (
            'Export'
          )}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default ExportDialog;
