import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { generateTerraformZip } from '@/services/terraform';
import type {
  ClassicSecurityGroupRule,
  ClassicSubnetRecommendation,
  ClassicServerRecord,
  ClassicRelationshipEntry,
} from '@/services/terraform/types';
import type { MigrationAnalysisOutput } from '@/types/migration';

export function useTerraformExport() {
  const [exporting, setExporting] = useState(false);

  const exportTerraform = useCallback(
    async (
      analysisResult: MigrationAnalysisOutput,
      collectedData: Record<string, unknown[]>,
    ) => {
      setExporting(true);
      try {
        const region = analysisResult.preferences.targetRegion || 'us-south';

        const subnetRecommendations =
          (analysisResult.networkAssessment?.vlanAnalysis?.recommendedVPCSubnets as ClassicSubnetRecommendation[]) ?? [];

        const securityGroupRules =
          (collectedData['securityGroupRules'] as ClassicSecurityGroupRule[]) ?? [];

        const relationships =
          (collectedData['relationships'] as ClassicRelationshipEntry[]) ?? [];

        const virtualServers =
          (collectedData['virtualServers'] as ClassicServerRecord[]) ?? [];

        const bareMetal =
          (collectedData['bareMetal'] as ClassicServerRecord[]) ?? [];

        const blob = await generateTerraformZip({
          region,
          subnetRecommendations,
          securityGroupRules,
          relationships,
          virtualServers,
          bareMetal,
        });

        saveAs(blob, 'terraform-vpc-migration.zip');
      } finally {
        setExporting(false);
      }
    },
    [],
  );

  return { exportTerraform, exporting };
}
