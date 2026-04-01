import React, { useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { DataCollection, DocumentExport } from '@carbon/icons-react';
import AccountInfo from '@/components/dashboard/AccountInfo';
import ResourceCard from '@/components/dashboard/ResourceCard';
import ExportDialog from '@/components/common/ExportDialog';
import { usePlatformDataCollection } from '@/hooks/usePlatformDataCollection';
import { usePlatformExport } from '@/hooks/usePlatformExport';
import { usePlatformData } from '@/contexts/PlatformDataContext';
import { usePlatformDashboardMetrics } from '@/hooks/usePlatformDashboardMetrics';
import { SectionErrorBoundary } from '@/components/common/SectionErrorBoundary';
import type { ExportScope } from '@/components/common/ExportDialog';
import type { ExportFormat } from '@/services/export';

const PlatformDashboard: React.FC = () => {
  const { startPlatformCollection, cancelPlatformCollection, isPlatformCollecting } = usePlatformDataCollection();
  const { exportPlatformAll, isPlatformExporting } = usePlatformExport();
  const { platformCollectedData, platformCollectionStatus, platformErrors, platformCollectionDuration, platformProgress } = usePlatformData();
  const {
    totalInstances,
    serviceTypeDist,
    categoryDist,
    locationDist,
  } = usePlatformDashboardMetrics();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const hasData = Object.keys(platformCollectedData).length > 0;

  const handleExport = async (_scope: ExportScope, _filteredOnly: boolean, format: ExportFormat = 'xlsx') => {
    await exportPlatformAll(format);
  };

  const lastCollectionTime = platformCollectionStatus === 'complete' && platformCollectionDuration
    ? new Date().toLocaleString()
    : null;

  // Format duration
  const durationStr = platformCollectionDuration
    ? `${(platformCollectionDuration / 1000).toFixed(1)}s`
    : null;

  return (
    <div style={{ padding: '1.5rem' }}>
      <AccountInfo />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
        Platform Services Summary
      </h2>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          kind="primary"
          renderIcon={DataCollection}
          onClick={() => startPlatformCollection()}
          disabled={isPlatformCollecting}
        >
          {isPlatformCollecting ? 'Collecting...' : 'Collect Platform Services'}
        </Button>
        {isPlatformCollecting && (
          <Button kind="ghost" size="sm" onClick={cancelPlatformCollection}>
            Cancel
          </Button>
        )}
        <Button
          kind="secondary"
          renderIcon={DocumentExport}
          onClick={() => setExportDialogOpen(true)}
          disabled={!hasData || isPlatformExporting}
        >
          Export
        </Button>
      </div>

      {isPlatformCollecting && platformProgress.total > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
            Collecting {platformProgress.currentResource}... ({platformProgress.completed}/{platformProgress.total})
          </p>
        </div>
      )}

      {lastCollectionTime && (
        <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '1rem' }}>
          Last collected: {lastCollectionTime}{durationStr ? ` (${durationStr})` : ''}
        </p>
      )}

      {platformErrors.length > 0 && platformCollectionStatus !== 'collecting' && (
        <div style={{ marginBottom: '1rem' }}>
          {platformErrors.map((err, idx) => (
            <InlineNotification
              key={idx}
              kind="warning"
              title={err.resourceType}
              subtitle={err.message}
              lowContrast
              hideCloseButton
              style={{ marginBottom: '0.5rem' }}
            />
          ))}
        </div>
      )}

      {hasData && (
        <SectionErrorBoundary name="Platform Metrics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <ResourceCard resourceKey="serviceInstances" label="Service Instances" category="Platform Services" count={totalInstances} linkPrefix="/platform" />
            {categoryDist.slice(0, 6).map((cat) => (
              <ResourceCard key={cat.name} resourceKey="serviceInstances" label={cat.name} category={cat.name} count={cat.count} linkPrefix="/platform" />
            ))}
          </div>

          {serviceTypeDist.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Services by Type</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem' }}>
                {serviceTypeDist.slice(0, 15).map((svc) => (
                  <div key={svc.name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.75rem', background: 'var(--cds-layer-01)', borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '0.875rem' }}>{svc.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-secondary)' }}>{svc.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {locationDist.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>By Location</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                {locationDist.slice(0, 10).map((loc) => (
                  <div key={loc.name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.75rem', background: 'var(--cds-layer-01)', borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '0.875rem' }}>{loc.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-secondary)' }}>{loc.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionErrorBoundary>
      )}

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
        isExporting={isPlatformExporting}
        domain="platform"
      />
    </div>
  );
};

export default PlatformDashboard;
