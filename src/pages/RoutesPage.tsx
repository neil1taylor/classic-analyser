import React from 'react';
import KnownSubnetsTable from '@/components/topology/KnownSubnetsTable';
import { useData } from '@/contexts/DataContext';
import { useVpcData } from '@/contexts/VpcDataContext';

const RoutesPage: React.FC = () => {
  const { collectedData } = useData();
  const { vpcCollectedData } = useVpcData();

  const hasClassicData = Object.keys(collectedData).length > 0;
  const hasVpcData = Object.keys(vpcCollectedData).length > 0;
  const hasData = hasClassicData || hasVpcData;

  if (!hasData) {
    return (
      <main style={{ width: '100%', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Routes</h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          background: 'var(--cds-layer-01)',
          border: '1px solid var(--cds-border-subtle)',
          borderRadius: 4,
        }}>
          <p style={{ color: 'var(--cds-text-secondary)' }}>
            Collect Classic or VPC data to view known routes and subnets.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ width: '100%', padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Routes</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
        All subnets known to or reachable from this account, including VPC subnets, Classic subnets,
        and prefixes advertised via Transit Gateway, Direct Link, and VPN connections.
      </p>
      <KnownSubnetsTable />
    </main>
  );
};

export default RoutesPage;
