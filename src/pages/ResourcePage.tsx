import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getResourceType } from '@/types/resources';
import { useData } from '@/contexts/DataContext';
import { useUI } from '@/contexts/UIContext';
import AppDataTable from '@/components/tables/DataTable';

const ResourcePage: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const { collectedData } = useData();
  const { setActiveResourceType } = useUI();

  useEffect(() => {
    setActiveResourceType(type || null);
    return () => setActiveResourceType(null);
  }, [type, setActiveResourceType]);

  if (!type) {
    return <Navigate to="/dashboard" replace />;
  }

  const resourceType = getResourceType(type);
  if (!resourceType) {
    return (
      <main style={{ padding: '2rem' }}>
        <h2>Resource type not found</h2>
        <p>The resource type &ldquo;{type}&rdquo; does not exist.</p>
      </main>
    );
  }

  const data = (collectedData[type] || []) as Record<string, unknown>[];

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

export default ResourcePage;
