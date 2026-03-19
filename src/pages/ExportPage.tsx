import React, { useState } from 'react';
import {
  Button,
  Tile,
  InlineNotification,
} from '@carbon/react';
import {
  DocumentExport,
  DocumentPdf,
  DocumentWordProcessor,
  PresentationFile,
  Upload,
} from '@carbon/icons-react';
import { useExport } from '@/hooks/useExport';
import { useVpcExport } from '@/hooks/useVpcExport';
import { usePowerVsExport } from '@/hooks/usePowerVsExport';
import { useData } from '@/contexts/DataContext';
import { useVpcData } from '@/contexts/VpcDataContext';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { useUI } from '@/contexts/UIContext';

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number }>;
  domains: Array<'classic' | 'vpc' | 'powervs'>;
  format?: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'xlsx',
    label: 'Excel Workbook (XLSX)',
    description: 'One worksheet per resource type with all collected data.',
    icon: DocumentExport,
    domains: ['classic', 'vpc', 'powervs'],
    format: 'xlsx',
  },
  {
    id: 'pdf',
    label: 'PDF Report',
    description: 'Summary report with charts and resource overviews.',
    icon: DocumentPdf,
    domains: ['classic', 'vpc', 'powervs'],
    format: 'pdf',
  },
  {
    id: 'docx',
    label: 'Word Document (DOCX)',
    description: 'Editable report with branding, charts, and AI-enhanced narratives.',
    icon: DocumentWordProcessor,
    domains: ['classic', 'vpc', 'powervs'],
    format: 'docx',
  },
  {
    id: 'pptx',
    label: 'PowerPoint (PPTX)',
    description: 'Presentation slides with key metrics and distribution charts.',
    icon: PresentationFile,
    domains: ['classic', 'vpc', 'powervs'],
    format: 'pptx',
  },
];

const ExportPage: React.FC = () => {
  const { exportAll, isExporting } = useExport();
  const { exportVpcAll, isVpcExporting } = useVpcExport();
  const { exportPvsAll, isPvsExporting } = usePowerVsExport();
  const { collectedData } = useData();
  const { vpcCollectedData } = useVpcData();
  const { pvsCollectedData } = usePowerVsData();
  const { activeDomain } = useUI();
  const [error, setError] = useState<string | null>(null);

  const hasClassicData = Object.keys(collectedData).length > 0;
  const hasVpcData = Object.keys(vpcCollectedData).length > 0;
  const hasPvsData = Object.keys(pvsCollectedData).length > 0;

  const hasDataForDomain: Record<string, boolean> = {
    classic: hasClassicData,
    vpc: hasVpcData,
    powervs: hasPvsData,
  };

  const anyExporting = isExporting || isVpcExporting || isPvsExporting;

  const handleExport = async (format: string) => {
    setError(null);
    try {
      if (activeDomain === 'classic' && hasClassicData) {
        await exportAll(format as 'xlsx' | 'pdf' | 'docx' | 'pptx');
      } else if (activeDomain === 'vpc' && hasVpcData) {
        await exportVpcAll(format as 'xlsx' | 'pdf' | 'docx' | 'pptx');
      } else if (activeDomain === 'powervs' && hasPvsData) {
        await exportPvsAll(format as 'xlsx' | 'pdf' | 'docx' | 'pptx');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const hasData = hasDataForDomain[activeDomain] ?? false;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '64rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Export & Reports
      </h2>
      <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
        Export collected {activeDomain} infrastructure data in various formats.
      </p>

      {!hasData && (
        <InlineNotification
          kind="info"
          title="No data available"
          subtitle={`Collect ${activeDomain} data first from the dashboard before exporting.`}
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1.5rem' }}
        />
      )}

      {error && (
        <InlineNotification
          kind="error"
          title="Export failed"
          subtitle={error}
          lowContrast
          hideCloseButton={false}
          onClose={() => setError(null)}
          style={{ marginBottom: '1.5rem' }}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {EXPORT_OPTIONS.filter((opt) => opt.domains.includes(activeDomain as 'classic' | 'vpc' | 'powervs')).map((opt) => {
          const Icon = opt.icon;
          return (
            <Tile key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon size={20} />
                <h4 style={{ fontWeight: 600 }}>{opt.label}</h4>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', flex: 1 }}>
                {opt.description}
              </p>
              <Button
                kind="tertiary"
                size="sm"
                disabled={!hasData || anyExporting}
                onClick={() => opt.format && handleExport(opt.format)}
              >
                {anyExporting ? 'Exporting...' : 'Export'}
              </Button>
            </Tile>
          );
        })}
      </div>

      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Import Data
      </h3>
      <Tile style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Upload size={20} />
        <div>
          <h4 style={{ fontWeight: 600 }}>Import XLSX</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
            Load a previously exported workbook to view data without re-collecting.
            Use the import button on the login page.
          </p>
        </div>
      </Tile>
    </div>
  );
};

export default ExportPage;
