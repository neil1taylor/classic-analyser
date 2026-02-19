import React from 'react';
import CostDashboard from '@/components/costs/CostDashboard';
import AICostInsights from '@/components/costs/AICostInsights';
import { useMigration } from '@/contexts/MigrationContext';

const CostsPage: React.FC = () => {
  const { analysisResult } = useMigration();

  return (
    <main style={{ width: '100%' }}>
      <CostDashboard />
      {analysisResult?.costAnalysis && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <AICostInsights costData={analysisResult.costAnalysis} />
        </div>
      )}
    </main>
  );
};

export default CostsPage;
