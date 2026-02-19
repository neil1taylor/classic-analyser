import React, { useState } from 'react';
import { Button } from '@carbon/react';
import { DocumentExport } from '@carbon/icons-react';
import Dashboard from '@/components/dashboard/Dashboard';
import ReportExportDialog from '@/components/common/ReportExportDialog';
import type { ReportExportOptions } from '@/components/common/ReportExportDialog';
import { useData } from '@/contexts/DataContext';
import { useMigration } from '@/contexts/MigrationContext';
import { useInventoryExport } from '@/hooks/useInventoryExport';
import { useMigrationExport } from '@/hooks/useMigrationExport';

const DashboardPage: React.FC = () => {
  const { collectedData } = useData();
  const { analysisResult } = useMigration();
  const { exportInventoryDocx, exporting: inventoryExporting } = useInventoryExport();
  const { exportDocx: exportMigrationDocx, exporting: migrationExporting } = useMigrationExport();
  const [exportOpen, setExportOpen] = useState(false);

  const hasData = Object.keys(collectedData).length > 0;
  const exporting = inventoryExporting || migrationExporting;

  const handleExport = async (options: ReportExportOptions) => {
    if (analysisResult) {
      await exportMigrationDocx(analysisResult, collectedData, {
        clientName: options.clientName,
        includeAI: options.includeAI,
      });
    } else {
      await exportInventoryDocx(collectedData, {
        clientName: options.clientName,
        includeAI: options.includeAI,
      });
    }
    setExportOpen(false);
  };

  return (
    <main style={{ width: '100%' }}>
      {hasData && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem 0' }}>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={DocumentExport}
            onClick={() => setExportOpen(true)}
          >
            Generate Report
          </Button>
        </div>
      )}
      <Dashboard />
      <ReportExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        exporting={exporting}
        hasMigrationData={!!analysisResult}
      />
    </main>
  );
};

export default DashboardPage;
