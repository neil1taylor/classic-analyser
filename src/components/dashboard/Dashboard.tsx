import React, { useState } from 'react';
import { Button, InlineNotification, Toggle, Tooltip } from '@carbon/react';
import { DataCollection, DocumentExport } from '@carbon/icons-react';
import AccountInfo from '@/components/dashboard/AccountInfo';
import ResourceCard from '@/components/dashboard/ResourceCard';
import DistributionCharts from '@/components/dashboard/DistributionCharts';
import ProgressIndicator from '@/components/common/ProgressIndicator';
import ExportDialog from '@/components/common/ExportDialog';
import ImportBanner from '@/components/dashboard/ImportBanner';
import { useDataCollection } from '@/hooks/useDataCollection';
import { useExport } from '@/hooks/useExport';
import { useData } from '@/contexts/DataContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { RESOURCE_TYPES } from '@/types/resources';
import type { ExportScope } from '@/components/common/ExportDialog';
import type { ExportFormat } from '@/services/export';

const Dashboard: React.FC = () => {
  const { startCollection, cancelCollection, isCollecting } = useDataCollection();
  const { exportAll, isExporting } = useExport();
  const { collectedData, collectionStatus, errors, collectionDuration, dataSource } = useData();
  const { resourceMetrics, osDist, dcDist, cpuDist, totalServers, vmwareOverlap } = useDashboardMetrics();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [includeBilling, setIncludeBilling] = useState(false);

  const hasData = Object.keys(collectedData).length > 0;

  const handleExport = async (_scope: ExportScope, _filteredOnly: boolean, format: ExportFormat = 'xlsx') => {
    await exportAll(format);
  };

  const lastCollectionTime = collectionStatus === 'complete' && collectionDuration
    ? new Date().toLocaleString()
    : null;

  return (
    <div style={{ padding: '1.5rem' }}>
      <ImportBanner />
      <AccountInfo />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {dataSource !== 'imported' && (
          <>
            <Button
              kind="primary"
              renderIcon={DataCollection}
              onClick={() => startCollection({ skipBilling: !includeBilling })}
              disabled={isCollecting}
            >
              {isCollecting ? 'Collecting...' : 'Collect Data'}
            </Button>
            <Tooltip label="Include billing items in data collection. Adds monthly/hourly cost data but increases collection time." align="bottom">
              <div>
                <Toggle
                  id="include-billing"
                  size="sm"
                  labelA="Billing off"
                  labelB="Billing on"
                  toggled={includeBilling}
                  onToggle={(toggled: boolean) => setIncludeBilling(toggled)}
                  disabled={isCollecting}
                />
              </div>
            </Tooltip>
          </>
        )}
        <Button
          kind="secondary"
          renderIcon={DocumentExport}
          onClick={() => setExportDialogOpen(true)}
          disabled={!hasData || isExporting}
        >
          Export All
        </Button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <ProgressIndicator onCancel={cancelCollection} />
      </div>

      {lastCollectionTime && (
        <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '1rem' }}>
          Last collected: {lastCollectionTime}
        </p>
      )}

      {errors.length > 0 && collectionStatus !== 'collecting' && (
        <div style={{ marginBottom: '1rem' }}>
          {errors.map((err, idx) => (
            <InlineNotification
              key={idx}
              kind="warning"
              title={err.resource}
              subtitle={err.message}
              lowContrast
              hideCloseButton={false}
              style={{ marginBottom: '0.5rem' }}
            />
          ))}
        </div>
      )}

      {hasData && (
        <DistributionCharts
          osDist={osDist}
          dcDist={dcDist}
          cpuDist={cpuDist}
          totalServers={totalServers}
        />
      )}

      {hasData && (vmwareOverlap.esxiHosts > 0 || vmwareOverlap.vmwareVlans > 0 || vmwareOverlap.vmwareStorage > 0) && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          background: 'var(--cds-layer-01)',
          border: '1px solid var(--cds-border-subtle)',
        }}>
          <h5 style={{ marginBottom: '0.5rem' }}>VMware / Classic Overlap</h5>
          <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
            {vmwareOverlap.esxiHosts > 0 && `${vmwareOverlap.esxiHosts} ESXi hosts`}
            {vmwareOverlap.esxiHosts > 0 && (vmwareOverlap.vmwareVlans > 0 || vmwareOverlap.vmwareStorage > 0) && ' | '}
            {vmwareOverlap.vmwareVlans > 0 && `${vmwareOverlap.vmwareVlans} VMware VLANs`}
            {vmwareOverlap.vmwareVlans > 0 && vmwareOverlap.vmwareStorage > 0 && ' | '}
            {vmwareOverlap.vmwareStorage > 0 && `${vmwareOverlap.vmwareStorage} VMware storage volumes`}
          </p>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {RESOURCE_TYPES.map((rt) => {
          const items = collectedData[rt.key];
          const count = items ? items.length : null;
          const metrics = resourceMetrics[rt.key];
          return (
            <ResourceCard
              key={rt.key}
              resourceKey={rt.key}
              label={rt.label}
              category={rt.category}
              count={count}
              loading={collectionStatus === 'collecting'}
              dcCount={metrics?.dcCount}
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
        isExporting={isExporting}
      />
    </div>
  );
};

export default Dashboard;
