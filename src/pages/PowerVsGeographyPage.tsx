import React from 'react';
import { Button } from '@carbon/react';
import { DataCollection } from '@carbon/icons-react';
import { usePowerVsDataCollection } from '@/hooks/usePowerVsDataCollection';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { usePowerVsGeographyData } from '@/hooks/usePowerVsGeographyData';

const PowerVsGeographyPage: React.FC = () => {
  const { startPvsCollection, isPvsCollecting } = usePowerVsDataCollection();
  const { pvsCollectedData } = usePowerVsData();
  const zoneData = usePowerVsGeographyData();

  const hasData = Object.keys(pvsCollectedData).length > 0;

  return (
    <main style={{ width: '100%', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>PowerVS Geography</h2>
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
            Collect PowerVS data to view resources by zone and workspace.
          </p>
        </div>
      )}

      {hasData && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {zoneData.map((zd) => (
              <div key={zd.zone} style={{
                padding: '1rem',
                background: 'var(--cds-layer-01)',
                border: '1px solid var(--cds-border-subtle)',
              }}>
                <h4 style={{ marginBottom: '0.5rem' }}>{zd.zone}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Instances</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{zd.instanceCount}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Workspaces</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{zd.workspaceCount}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Networks</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{zd.networkCount}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Volumes</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{zd.volumeCount}</p>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.5rem' }}>
                  {zd.totalResources} total resources
                </p>
              </div>
            ))}
          </div>

          {zoneData.length === 0 && (
            <p style={{ color: 'var(--cds-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              No PowerVS resources found across any zone.
            </p>
          )}
        </div>
      )}
    </main>
  );
};

export default PowerVsGeographyPage;
