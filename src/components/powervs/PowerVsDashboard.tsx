import React, { useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { DataCollection, DocumentExport } from '@carbon/icons-react';
import AccountInfo from '@/components/dashboard/AccountInfo';
import ResourceCard from '@/components/dashboard/ResourceCard';
import ExportDialog from '@/components/common/ExportDialog';
import PowerVsProgressIndicator from '@/components/common/PowerVsProgressIndicator';
import { usePowerVsDataCollection } from '@/hooks/usePowerVsDataCollection';
import { usePowerVsExport } from '@/hooks/usePowerVsExport';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { usePowerVsDashboardMetrics } from '@/hooks/usePowerVsDashboardMetrics';
import { POWERVS_RESOURCE_TYPES } from '@/types/powervs-resources';
import { SectionErrorBoundary } from '@/components/common/SectionErrorBoundary';
import type { ExportScope } from '@/components/common/ExportDialog';
import type { ExportFormat } from '@/services/export';

const PowerVsDashboard: React.FC = () => {
  const { startPvsCollection, cancelPvsCollection, isPvsCollecting } = usePowerVsDataCollection();
  const { exportPvsAll, isPvsExporting } = usePowerVsExport();
  const { pvsCollectedData, pvsCollectionStatus, pvsErrors, pvsCollectionDuration } = usePowerVsData();
  const {
    totalInstances,
    totalProcessors,
    totalMemoryGB,
    totalStorageGB,
    zoneMetrics,
  } = usePowerVsDashboardMetrics();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const hasData = Object.keys(pvsCollectedData).length > 0;

  const handleExport = async (_scope: ExportScope, _filteredOnly: boolean, format: ExportFormat = 'xlsx') => {
    await exportPvsAll(format);
  };

  const lastCollectionTime = pvsCollectionStatus === 'complete' && pvsCollectionDuration
    ? new Date().toLocaleString()
    : null;

  return (
    <div style={{ padding: '1.5rem' }}>
      <AccountInfo />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
        PowerVS Infrastructure Summary
      </h2>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          kind="primary"
          renderIcon={DataCollection}
          onClick={() => startPvsCollection()}
          disabled={isPvsCollecting}
        >
          {isPvsCollecting ? 'Collecting...' : 'Collect PowerVS Data'}
        </Button>
        <Button
          kind="secondary"
          renderIcon={DocumentExport}
          onClick={() => setExportDialogOpen(true)}
          disabled={!hasData || isPvsExporting}
        >
          Export PowerVS
        </Button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <PowerVsProgressIndicator onCancel={cancelPvsCollection} />
      </div>

      {lastCollectionTime && (
        <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '1rem' }}>
          Last collected: {lastCollectionTime}
        </p>
      )}

      {pvsErrors.length > 0 && pvsCollectionStatus !== 'collecting' && (
        <div style={{ marginBottom: '1rem' }}>
          {pvsErrors.map((err, idx) => (
            <InlineNotification
              key={idx}
              kind="warning"
              title={err.resourceType}
              subtitle={err.message}
              lowContrast
              hideCloseButton={false}
              style={{ marginBottom: '0.5rem' }}
            />
          ))}
        </div>
      )}

      {/* Summary tiles */}
      {hasData && (
        <SectionErrorBoundary sectionName="PowerVS Summary">
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}>
          {totalInstances > 0 && (
            <div style={{
              background: 'var(--cds-layer)',
              border: '1px solid var(--cds-border-subtle)',
              borderLeft: '4px solid #6929c4',
              borderRadius: 4,
              padding: '1rem',
              minWidth: 160,
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: 4 }}>Total Processors</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 300, fontVariantNumeric: 'tabular-nums' }}>
                {totalProcessors.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>
                across {totalInstances} instances
              </div>
            </div>
          )}
          {totalMemoryGB > 0 && (
            <div style={{
              background: 'var(--cds-layer)',
              border: '1px solid var(--cds-border-subtle)',
              borderLeft: '4px solid #1192e8',
              borderRadius: 4,
              padding: '1rem',
              minWidth: 160,
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: 4 }}>Total Memory</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 300, fontVariantNumeric: 'tabular-nums' }}>
                {totalMemoryGB.toLocaleString()} GB
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>
                ~{totalInstances > 0 ? Math.round(totalMemoryGB / totalInstances) : 0} GB avg
              </div>
            </div>
          )}
          {totalStorageGB > 0 && (
            <div style={{
              background: 'var(--cds-layer)',
              border: '1px solid var(--cds-border-subtle)',
              borderLeft: '4px solid #005d5d',
              borderRadius: 4,
              padding: '1rem',
              minWidth: 160,
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: 4 }}>Total Storage</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 300, fontVariantNumeric: 'tabular-nums' }}>
                {totalStorageGB >= 1024
                  ? `${(totalStorageGB / 1024).toFixed(1)} TB`
                  : `${totalStorageGB.toLocaleString()} GB`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>PowerVS volumes</div>
            </div>
          )}
        </div>
        </SectionErrorBoundary>
      )}

      {/* Resource cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {POWERVS_RESOURCE_TYPES.map((rt) => {
          const items = pvsCollectedData[rt.key];
          const count = items ? items.length : null;
          const metrics = zoneMetrics[rt.key];
          return (
            <ResourceCard
              key={rt.key}
              resourceKey={rt.key}
              label={rt.label}
              category={rt.category}
              count={count}
              loading={pvsCollectionStatus === 'collecting'}
              linkPrefix="/powervs"
              dcCount={metrics?.zoneCount}
              subMetrics={metrics?.subMetrics}
            />
          );
        })}
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
        hasSelectedRows={false}
        hasCurrentTable={false}
        isExporting={isPvsExporting}
      />
    </div>
  );
};

export default PowerVsDashboard;
