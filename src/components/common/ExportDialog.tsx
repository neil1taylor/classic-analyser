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
  Select,
  SelectItem,
} from '@carbon/react';
import type { ExportFormat } from '@/services/export';

export type ExportScope = 'all' | 'currentTable' | 'selectedRows';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (scope: ExportScope, filteredOnly: boolean, format: ExportFormat) => Promise<void>;
  hasSelectedRows: boolean;
  hasCurrentTable: boolean;
  isExporting: boolean;
}

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string; description: string }> = [
  { value: 'xlsx', label: 'Excel Workbook (.xlsx)', description: 'Full data with one worksheet per resource type' },
  { value: 'pdf', label: 'PDF Document (.pdf)', description: 'Formatted tables in a printable document' },
  { value: 'docx', label: 'Word Document (.docx)', description: 'Editable report with resource tables' },
  { value: 'pptx', label: 'PowerPoint (.pptx)', description: 'Presentation with summary and data slides' },
  { value: 'handover', label: 'Handover Package (.zip)', description: 'ZIP bundle with XLSX data and metadata' },
];

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
  const [format, setFormat] = useState<ExportFormat>('xlsx');

  const blurAndClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  const handleExport = async () => {
    await onExport(scope, filteredOnly, format);
    blurAndClose();
  };

  const selectedFormat = FORMAT_OPTIONS.find((f) => f.value === format);

  return (
    <ComposedModal open={open} onClose={blurAndClose} size="sm">
      <ModalHeader title="Export Data" />
      <ModalBody>
        <div style={{ marginBottom: '1.5rem' }}>
          <Select
            id="export-format"
            labelText="Export format"
            value={format}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormat(e.target.value as ExportFormat)
            }
          >
            {FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} text={opt.label} />
            ))}
          </Select>
          {selectedFormat && (
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--cds-text-helper)',
                marginTop: '0.25rem',
              }}
            >
              {selectedFormat.description}
            </p>
          )}
        </div>
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
