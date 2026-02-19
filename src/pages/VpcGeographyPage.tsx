import React from 'react';
import { Button } from '@carbon/react';
import { DataCollection } from '@carbon/icons-react';
import { useVpcDataCollection } from '@/hooks/useVpcDataCollection';
import { useVpcData } from '@/contexts/VpcDataContext';
import { useVpcGeographyData } from '@/hooks/useVpcGeographyData';

const VpcGeographyPage: React.FC = () => {
  const { startVpcCollection, isVpcCollecting } = useVpcDataCollection();
  const { vpcCollectedData } = useVpcData();
  const regionData = useVpcGeographyData();

  const hasData = Object.keys(vpcCollectedData).length > 0;

  return (
    <main style={{ width: '100%', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>VPC Geography</h2>
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
            Collect VPC data to view resources by region.
          </p>
        </div>
      )}

      {hasData && (
        <div>
          {/* Region summary cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {regionData.map((rd) => (
              <div key={rd.region} style={{
                padding: '1rem',
                background: 'var(--cds-layer-01)',
                border: '1px solid var(--cds-border-subtle)',
              }}>
                <h4 style={{ marginBottom: '0.5rem' }}>{rd.region}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Instances</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{rd.instanceCount}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>VPCs</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{rd.vpcCount}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Subnets</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{rd.subnetCount}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Volumes</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{rd.volumeCount}</p>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.5rem' }}>
                  {rd.totalResources} total resources
                </p>
              </div>
            ))}
          </div>

          {regionData.length === 0 && (
            <p style={{ color: 'var(--cds-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              No VPC resources found across any region.
            </p>
          )}
        </div>
      )}
    </main>
  );
};

export default VpcGeographyPage;
