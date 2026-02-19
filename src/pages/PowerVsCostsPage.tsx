import React from 'react';
import { Button } from '@carbon/react';
import { DataCollection } from '@carbon/icons-react';
import { usePowerVsDataCollection } from '@/hooks/usePowerVsDataCollection';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { usePowerVsCostData } from '@/hooks/usePowerVsCostData';

const PowerVsCostsPage: React.FC = () => {
  const { startPvsCollection, isPvsCollecting } = usePowerVsDataCollection();
  const { pvsCollectedData } = usePowerVsData();
  const costData = usePowerVsCostData();

  const hasData = Object.keys(pvsCollectedData).length > 0;

  return (
    <main style={{ width: '100%', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>PowerVS Resource Inventory</h2>
        <Button
          kind="primary"
          size="sm"
          renderIcon={DataCollection}
          onClick={() => startPvsCollection()}
          disabled={isPvsCollecting}
        >
          {isPvsCollecting ? 'Collecting...' : 'Collect PowerVS Data'}
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
            Collect PowerVS data to view resource inventory. Note: PowerVS does not expose per-resource billing
            via the Power Cloud API. This page shows resource inventory by zone.
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
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>PVM Instances</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{costData.totalInstances}</p>
            </div>
            <div style={{
              padding: '1rem',
              background: 'var(--cds-layer-01)',
              border: '1px solid var(--cds-border-subtle)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Volumes</p>
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
            <div style={{
              padding: '1rem',
              background: 'var(--cds-layer-01)',
              border: '1px solid var(--cds-border-subtle)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Total Processors</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                {costData.totalProcessors.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div style={{
              padding: '1rem',
              background: 'var(--cds-layer-01)',
              border: '1px solid var(--cds-border-subtle)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Total Memory</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{costData.totalMemoryGb.toLocaleString()} GB</p>
            </div>
          </div>

          {/* By zone */}
          <div style={{
            padding: '1rem',
            background: 'var(--cds-layer-01)',
            border: '1px solid var(--cds-border-subtle)',
          }}>
            <h4 style={{ marginBottom: '1rem' }}>Resource Inventory by Zone</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--cds-border-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.875rem' }}>Zone</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.875rem' }}>Instances</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.875rem' }}>Volumes</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.875rem' }}>Processors</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.875rem' }}>Memory (GB)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(costData.byZone)
                  .sort((a, b) => (b[1].instances + b[1].volumes) - (a[1].instances + a[1].volumes))
                  .map(([zone, counts]) => (
                    <tr key={zone} style={{ borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>{zone}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.875rem', textAlign: 'right' }}>{counts.instances}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.875rem', textAlign: 'right' }}>{counts.volumes}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.875rem', textAlign: 'right' }}>
                        {counts.processors.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.5rem', fontSize: '0.875rem', textAlign: 'right' }}>{counts.memoryGb.toLocaleString()}</td>
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

export default PowerVsCostsPage;
