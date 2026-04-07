import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { InlineNotification } from '@carbon/react';
import { getResourceType } from '@/types/resources';
import { useData } from '@/contexts/DataContext';
import { useUI } from '@/contexts/UIContext';
import AppDataTable from '@/components/tables/DataTable';
import { getImportMethod, getImportWarning } from '@/data/importWarnings';

const ResourcePage: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const { collectedData, dataSource, importFilename } = useData();
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
  const importMethod = dataSource === 'imported' ? getImportMethod(importFilename) : null;
  const importWarning = getImportWarning(importMethod, type);

  // K8s storage warning for block/file storage tables
  const isStorageTable = type === 'blockStorage' || type === 'fileStorage';
  const kubeCount = isStorageTable
    ? data.filter(item => item._isKubeStorage === true).length
    : 0;

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
      {importWarning && (
        <InlineNotification
          kind="info"
          title="Import data note"
          subtitle={importWarning}
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem', maxWidth: 'none' }}
        />
      )}
      {kubeCount > 0 && (
        <InlineNotification
          kind="warning"
          title="Kubernetes storage detected"
          subtitle={`${kubeCount} volume(s) in this table are consumed by IKS/ROKS clusters. These volumes will migrate with the Kubernetes cluster and are excluded from the migration assessment. Enable the "K8s Storage" column to identify them.`}
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem', maxWidth: 'none' }}
        />
      )}
      <AppDataTable
        resourceKey={type}
        columns={resourceType.columns}
        data={data}
      />
    </main>
  );
};

export default ResourcePage;
