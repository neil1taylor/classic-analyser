import { useCallback, useState } from 'react';
import type { MigrationAnalysisOutput } from '@/types/migration';
import type { AIReportSectionType } from '@/types/ai';
import type { ReportConfig } from '@/services/report/docx/types';
import { buildMigrationReport, getReportBranding } from '@/services/report/docx/index';
import { isAIConfigured } from '@/services/ai/aiProxyClient';
import { fetchReportNarrative } from '@/services/ai/reportApi';
import { buildInsightsInput, buildCostInput } from '@/services/ai/contextBuilders';
import { generateMigrationXlsx, generateMigrationPptx } from '@/services/migration/export';
import { generateAssessmentTemplate } from '@/services/export/assessment';

const AI_SECTIONS: AIReportSectionType[] = [
  'executive_summary',
  'environment_overview',
  'migration_readiness',
  'compute_assessment',
  'network_assessment',
  'storage_assessment',
  'security_assessment',
  'cost_analysis',
  'recommendations',
];

export function useMigrationExport() {
  const [exporting, setExporting] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);
  const [exportingAssessment, setExportingAssessment] = useState(false);

  const exportDocx = useCallback(async (
    analysisResult: MigrationAnalysisOutput,
    collectedData?: Record<string, unknown[]>,
    options?: { clientName?: string; includeAI?: boolean },
  ) => {
    setExporting(true);
    try {
      const branding = getReportBranding();
      if (options?.clientName) {
        branding.clientName = options.clientName;
      }

      let aiNarratives: Record<string, string> | undefined;
      if (options?.includeAI && await isAIConfigured()) {
        aiNarratives = {};
        const dataForSections: Record<string, Record<string, unknown>> = {
          executive_summary: buildInsightsInput(analysisResult) as Record<string, unknown>,
          environment_overview: {
            resourceCounts: collectedData
              ? Object.fromEntries(
                  Object.entries(collectedData).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
                )
              : {},
          },
          migration_readiness: {
            overall: analysisResult.complexityScore.overall,
            category: analysisResult.complexityScore.category,
            dimensions: analysisResult.complexityScore.dimensions,
          },
          compute_assessment: {
            totalInstances: analysisResult.computeAssessment.totalInstances,
            summary: analysisResult.computeAssessment.summary,
            score: analysisResult.computeAssessment.score,
          },
          network_assessment: {
            complexity: analysisResult.networkAssessment.complexity,
            score: analysisResult.networkAssessment.score,
            totalVlans: analysisResult.networkAssessment.vlanAnalysis.totalVlans,
          },
          storage_assessment: {
            blockVolumes: analysisResult.storageAssessment.blockStorage.totalVolumes,
            fileVolumes: analysisResult.storageAssessment.fileStorage.totalVolumes,
            score: analysisResult.storageAssessment.score,
          },
          security_assessment: {
            securityGroups: analysisResult.securityAssessment.securityGroups.existingGroups,
            score: analysisResult.securityAssessment.score,
          },
          cost_analysis: buildCostInput(analysisResult.costAnalysis) as Record<string, unknown>,
          recommendations: {
            computeRecs: analysisResult.computeAssessment.recommendations.length,
            networkRecs: analysisResult.networkAssessment.recommendations.length,
            storageRecs: analysisResult.storageAssessment.recommendations.length,
            securityRecs: analysisResult.securityAssessment.recommendations.length,
          },
        };

        for (const section of AI_SECTIONS) {
          try {
            const data = dataForSections[section] || {};
            const narrative = await fetchReportNarrative(section, data);
            aiNarratives[section] = narrative;
          } catch {
            // AI failures are non-blocking
          }
        }
      }

      const config: ReportConfig = {
        branding,
        includeAI: !!aiNarratives && Object.keys(aiNarratives).length > 0,
        aiNarratives,
      };

      await buildMigrationReport(analysisResult, collectedData || {}, config);
    } finally {
      setExporting(false);
    }
  }, []);

  const exportXlsx = useCallback(async (
    analysisResult: MigrationAnalysisOutput,
    options?: { accountName?: string },
  ) => {
    setExportingXlsx(true);
    try {
      const blob = await generateMigrationXlsx(analysisResult, {
        accountName: options?.accountName,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      const name = options?.accountName
        ? options.accountName.replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'migration';
      a.href = url;
      a.download = `${name}_migration_assessment_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingXlsx(false);
    }
  }, []);

  const exportPptx = useCallback(async (
    analysisResult: MigrationAnalysisOutput,
    options?: { accountName?: string },
  ) => {
    setExportingPptx(true);
    try {
      const blob = await generateMigrationPptx(analysisResult, {
        accountName: options?.accountName,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      const name = options?.accountName
        ? options.accountName.replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'migration';
      a.href = url;
      a.download = `${name}_migration_assessment_${date}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingPptx(false);
    }
  }, []);

  const exportAssessment = useCallback(async (
    analysisResult: MigrationAnalysisOutput,
    collectedData?: Record<string, unknown[]>,
    options?: { accountName?: string; accountInfo?: Record<string, unknown> },
  ) => {
    setExportingAssessment(true);
    try {
      const blob = await generateAssessmentTemplate(
        analysisResult,
        collectedData || {},
        options?.accountInfo,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      const name = options?.accountName
        ? options.accountName.replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'assessment';
      a.href = url;
      a.download = `${name}_assessment_template_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingAssessment(false);
    }
  }, []);

  return { exportDocx, exportXlsx, exportPptx, exportAssessment, exporting, exportingXlsx, exportingPptx, exportingAssessment };
}
