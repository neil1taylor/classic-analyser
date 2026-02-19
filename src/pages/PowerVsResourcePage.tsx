import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getPowerVsResourceType } from '@/types/powervs-resources';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { useUI } from '@/contexts/UIContext';
import AppDataTable from '@/components/tables/DataTable';

const PowerVsResourcePage: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const { pvsCollectedData } = usePowerVsData();
  const { setActiveResourceType } = useUI();

  useEffect(() => {
    setActiveResourceType(type || null);
    return () => setActiveResourceType(null);
  }, [type, setActiveResourceType]);

  if (!type) {
    return <Navigate to="/powervs/dashboard" replace />;
  }

  const resourceType = getPowerVsResourceType(type);
  if (!resourceType) {
    return (
      <main style={{ padding: '2rem' }}>
        <h2>PowerVS resource type not found</h2>
        <p>The PowerVS resource type &ldquo;{type}&rdquo; does not exist.</p>
      </main>
    );
  }

  const data = (pvsCollectedData[type] || []) as Record<string, unknown>[];

  return (
    <main style={{ padding: '1.5rem', width: '100%' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          {resourceType.label}
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', margin: '0.25rem 0 0' }}>
          {resourceType.category} &middot; {data.length.toLocaleString()} items
        </p>
      </div>
      <AppDataTable
        resourceKey={type}
        columns={resourceType.columns}
        data={data}
      />
    </main>
  );
};

export default PowerVsResourcePage;
