import React, { useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { DataCollection, DocumentExport } from '@carbon/icons-react';
import AccountInfo from '@/components/dashboard/AccountInfo';
import ResourceCard from '@/components/dashboard/ResourceCard';
import ExportDialog from '@/components/common/ExportDialog';
import VpcProgressIndicator from '@/components/common/VpcProgressIndicator';
import VpcDistributionCharts from '@/components/vpc/VpcDistributionCharts';
import { SectionErrorBoundary } from '@/components/common/SectionErrorBoundary';
import { useVpcDataCollection } from '@/hooks/useVpcDataCollection';
import { useVpcExport } from '@/hooks/useVpcExport';
import { useVpcData } from '@/contexts/VpcDataContext';
import { useVpcDashboardMetrics } from '@/hooks/useVpcDashboardMetrics';
import { VPC_RESOURCE_TYPES } from '@/types/vpc-resources';
import type { ExportScope } from '@/components/common/ExportDialog';
import type { ExportFormat } from '@/services/export';

const VpcDashboard: React.FC = () => {
  const { startVpcCollection, cancelVpcCollection, isVpcCollecting } = useVpcDataCollection();
  const { exportVpcAll, isVpcExporting } = useVpcExport();
  const { vpcCollectedData, vpcCollectionStatus, vpcErrors, vpcCollectionDuration } = useVpcData();
  const {
    regionDist,
    vpcDist,
    profileDist,
    totalInstances,
    totalResources,
    regionMetrics,
  } = useVpcDashboardMetrics();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const hasData = Object.keys(vpcCollectedData).length > 0;

  const handleExport = async (_scope: ExportScope, _filteredOnly: boolean, format: ExportFormat = 'xlsx') => {
    await exportVpcAll(format);
  };

  const lastCollectionTime = vpcCollectionStatus === 'complete' && vpcCollectionDuration
    ? new Date().toLocaleString()
    : null;

  return (
    <div style={{ padding: '1.5rem' }}>
      <AccountInfo />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
        VPC Infrastructure Summary
      </h2>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          kind="primary"
          renderIcon={DataCollection}
          onClick={() => startVpcCollection()}
          disabled={isVpcCollecting}
        >
          {isVpcCollecting ? 'Collecting...' : 'Collect VPC Data'}
        </Button>
        <Button
          kind="secondary"
          renderIcon={DocumentExport}
          onClick={() => setExportDialogOpen(true)}
          disabled={!hasData || isVpcExporting}
        >
          Export VPC
        </Button>
      </div>

      {/* VPC Progress Indicator (stepper + bar) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <VpcProgressIndicator onCancel={cancelVpcCollection} />
      </div>

      {lastCollectionTime && (
        <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '1rem' }}>
          Last collected: {lastCollectionTime}
        </p>
      )}

      {vpcErrors.length > 0 && vpcCollectionStatus !== 'collecting' && (
        <div style={{ marginBottom: '1rem' }}>
          {vpcErrors.map((err, idx) => (
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

      {/* Distribution Charts (donuts + stacked bar + summary tiles) */}
      {hasData && (
        <SectionErrorBoundary sectionName="VPC Distribution Charts">
          <VpcDistributionCharts
            regionDist={regionDist}
            vpcDist={vpcDist}
            profileDist={profileDist}
            totalInstances={totalInstances}
            totalResources={totalResources}
          />
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
        {VPC_RESOURCE_TYPES.map((rt) => {
          const items = vpcCollectedData[rt.key];
          const count = items ? items.length : null;
          const metrics = regionMetrics[rt.key];
          return (
            <ResourceCard
              key={rt.key}
              resourceKey={rt.key}
              label={rt.label}
              category={rt.category}
              count={count}
              loading={vpcCollectionStatus === 'collecting'}
              linkPrefix="/vpc"
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
        isExporting={isVpcExporting}
      />
    </div>
  );
};

export default VpcDashboard;
