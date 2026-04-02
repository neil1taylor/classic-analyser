import React, { useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { DocumentExport, CodeReference } from '@carbon/icons-react';
import { useMigrationAnalysis } from '@/hooks/useMigrationAnalysis';
import { useMigrationExport } from '@/hooks/useMigrationExport';
import { useTerraformExport } from '@/hooks/useTerraformExport';
import { useMigration } from '@/contexts/MigrationContext';
import { useData } from '@/contexts/DataContext';
import ReportExportDialog from '@/components/common/ReportExportDialog';
import type { ReportExportOptions } from '@/components/common/ReportExportDialog';
import MigrationPreferencesPanel from './MigrationPreferencesPanel';
import ReadinessScoreCard from './ReadinessScoreCard';
import ComputeAssessmentPanel from './ComputeAssessmentPanel';
import NetworkAssessmentPanel from './NetworkAssessmentPanel';
import StorageAssessmentPanel from './StorageAssessmentPanel';
import SecurityAssessmentPanel from './SecurityAssessmentPanel';
import FeatureGapPanel from './FeatureGapPanel';
import CostComparisonPanel from './CostComparisonPanel';
import MigrationWavesPanel from './MigrationWavesPanel';
import DependencyGraphPanel from './DependencyGraphPanel';
import VPCPricingPanel from './VPCPricingPanel';
import AIInsightsPanel from './AIInsightsPanel';
import '@/styles/migration.scss';

const TAB_LABELS = [
  'Compute',
  'Network',
  'Storage',
  'Security',
  'Feature Gaps',
  'Costs',
  'Migration Waves',
  'Dependencies',
  'VPC Pricing',
] as const;

const MigrationDashboard: React.FC = () => {
  const {
    analysisResult,
    status,
    error,
    hasData,
    preferences,
    setPreferences,
    runAnalysis,
  } = useMigrationAnalysis();

  const { pricing } = useMigration();
  const { collectedData } = useData();
  const { exportDocx, exportXlsx, exportPptx, exporting, exportingXlsx, exportingPptx } = useMigrationExport();
  const { exportTerraform, exporting: terraformExporting } = useTerraformExport();
  const [exportOpen, setExportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleExport = async (options: ReportExportOptions) => {
    if (!analysisResult) return;
    if (options.format === 'xlsx') {
      await exportXlsx(analysisResult, { accountName: options.clientName });
    } else if (options.format === 'pptx') {
      await exportPptx(analysisResult, { accountName: options.clientName });
    } else {
      await exportDocx(analysisResult, collectedData, {
        clientName: options.clientName,
        includeAI: options.includeAI,
      });
    }
    setExportOpen(false);
  };

  const renderTabPanel = () => {
    // VPC Pricing tab is always available (pricing loads independently)
    if (activeTab === 8) {
      return pricing ? <VPCPricingPanel pricing={pricing} /> : <div>Loading pricing data...</div>;
    }
    if (!analysisResult) return null;
    switch (activeTab) {
      case 0: return <ComputeAssessmentPanel assessment={analysisResult.computeAssessment} prereqChecks={analysisResult.prereqChecks?.compute} />;
      case 1: return <NetworkAssessmentPanel assessment={analysisResult.networkAssessment} prereqChecks={analysisResult.prereqChecks?.network} />;
      case 2: return <StorageAssessmentPanel assessment={analysisResult.storageAssessment} prereqChecks={analysisResult.prereqChecks?.storage} />;
      case 3: return <SecurityAssessmentPanel assessment={analysisResult.securityAssessment} prereqChecks={analysisResult.prereqChecks?.security} />;
      case 4: return <FeatureGapPanel featureGaps={analysisResult.featureGaps} />;
      case 5: return <CostComparisonPanel costAnalysis={analysisResult.costAnalysis} />;
      case 6: return <MigrationWavesPanel waves={analysisResult.migrationWaves} />;
      case 7: return <DependencyGraphPanel graph={analysisResult.dependencyGraph} />;
      default: return null;
    }
  };

  return (
    <div className="migration-dashboard" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>VPC Migration Analysis</h3>
        {analysisResult && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={CodeReference}
              onClick={() => exportTerraform(analysisResult, collectedData)}
              disabled={terraformExporting}
            >
              {terraformExporting ? 'Generating...' : 'Download Terraform'}
            </Button>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={DocumentExport}
              onClick={() => setExportOpen(true)}
            >
              Export Report
            </Button>
          </div>
        )}
      </div>

      {/* Preferences */}
      <MigrationPreferencesPanel
        preferences={preferences}
        onPreferencesChange={setPreferences}
        onRunAnalysis={runAnalysis}
        isRunning={status === 'running'}
        hasData={hasData}
      />

      {/* Error */}
      {error && (
        <InlineNotification
          kind="error"
          title="Analysis Error"
          subtitle={error}
          style={{ marginTop: '1rem' }}
        />
      )}

      {/* Results */}
      {analysisResult && (
        <div style={{ marginTop: '2rem' }}>
          {/* Readiness Score */}
          <ReadinessScoreCard score={analysisResult.complexityScore} />

          {/* AI Insights */}
          <AIInsightsPanel analysisResult={analysisResult} />
        </div>
      )}

      {/* Assessment tabs — always visible so VPC Pricing is accessible without running analysis */}
      <div style={{ marginTop: '2rem' }}>
        <div className="migration-tabs" role="tablist" aria-label="Migration assessment tabs">
          {TAB_LABELS.map((label, i) => (
            <button
              key={label}
              role="tab"
              aria-selected={activeTab === i}
              className={`migration-tabs__tab${activeTab === i ? ' migration-tabs__tab--selected' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="migration-tabs__panel" role="tabpanel">
          {activeTab === 8 ? (
            renderTabPanel()
          ) : analysisResult ? (
            renderTabPanel()
          ) : (
            <div style={{ padding: '2rem', color: 'var(--cds-text-helper)', textAlign: 'center' }}>
              Run an analysis to view this tab.
            </div>
          )}
        </div>
      </div>

      {/* Export dialog */}
      <ReportExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        exporting={exporting || exportingXlsx || exportingPptx}
        hasMigrationData={!!analysisResult}
      />
    </div>
  );
};

export default MigrationDashboard;
