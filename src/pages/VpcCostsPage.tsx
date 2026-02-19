import React from 'react';
import { Button } from '@carbon/react';
import { DataCollection } from '@carbon/icons-react';
import { useVpcDataCollection } from '@/hooks/useVpcDataCollection';
import { useVpcData } from '@/contexts/VpcDataContext';
import { useVpcCostData } from '@/hooks/useVpcCostData';

const VpcCostsPage: React.FC = () => {
  const { startVpcCollection, isVpcCollecting } = useVpcDataCollection();
  const { vpcCollectedData } = useVpcData();
  const costData = useVpcCostData();

  const hasData = Object.keys(vpcCollectedData).length > 0;

  return (
    <main style={{ width: '100%', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>VPC Cost Analysis</h2>
        <Button
          kind="primary"
          size="sm"
          renderIcon={DataCollection}
          onClick={() => startVpcCollection()}
          disabled={isVpcCollecting}
        >
          {isVpcCollecting ? 'Collecting...' : 'Collect VPC Data'}
        </Button>
      </div>

      {!hasData && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          background: 'var(--cds-layer-01)',
          border: '1px solid var(--cds-border-subtle)',
        }}>
          <p style={{ color: 'var(--cds-text-secondary)' }}>
            Collect VPC data to view cost analysis. Note: VPC does not expose per-resource billing
            via the VPC API. This page shows resource inventory by region.
          </p>
        </div>
      )}

      {hasData && (
        <div>
          {/* Summary cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              padding: '1rem',
              background: 'var(--cds-layer-01)',
              border: '1px solid var(--cds-border-subtle)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Instances</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{costData.totalInstances}</p>
            </div>
            <div style={{
              padding: '1rem',
              background: 'var(--cds-layer-01)',
              border: '1px solid var(--cds-border-subtle)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Block Volumes</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{costData.totalVolumes}</p>
            </div>
            <div style={{
              padding: '1rem',
              background: 'var(--cds-layer-01)',
              border: '1px solid var(--cds-border-subtle)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Total Volume Capacity</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{costData.totalVolumeCapacityGb.toLocaleString()} GB</p>
            </div>
          </div>

          {/* By region */}
          <div style={{
            padding: '1rem',
            background: 'var(--cds-layer-01)',
            border: '1px solid var(--cds-border-subtle)',
          }}>
            <h4 style={{ marginBottom: '1rem' }}>Resource Inventory by Region</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--cds-border-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.875rem' }}>Region</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.875rem' }}>Instances</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.875rem' }}>Volumes</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(costData.byRegion)
                  .sort((a, b) => (b[1].instances + b[1].volumes) - (a[1].instances + a[1].volumes))
                  .map(([region, counts]) => (
                    <tr key={region} style={{ borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>{region}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.875rem', textAlign: 'right' }}>{counts.instances}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.875rem', textAlign: 'right' }}>{counts.volumes}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
};

export default VpcCostsPage;
