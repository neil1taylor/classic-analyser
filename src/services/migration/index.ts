import type { MigrationPreferences, MigrationAnalysisOutput, VPCPricingData, VPCProfile } from '@/types/migration';
import type { AccountInfo } from '@/types/resources';
import { analyzeCompute } from './computeAnalysis';
import { analyzeNetwork } from './networkAnalysis';
import { analyzeStorage } from './storageAnalysis';
import { analyzeSecurity } from './securityAnalysis';
import { analyzeFeatureGaps } from './featureGapAnalysis';
import { buildDependencyGraph } from './dependencyMapping';
import { calculateComplexityScore } from './complexityScoring';
import { analyzeCosts } from './costComparison';
import { planWaves } from './wavePlanning';
import { runAllPreReqChecks } from './checks';

export function runMigrationAnalysis(
  collectedData: Record<string, unknown[]>,
  preferences: MigrationPreferences,
  pricedProfiles?: VPCProfile[],
  pricing?: VPCPricingData | null,
  pricedBareMetalProfiles?: VPCProfile[],
  accountInfo?: AccountInfo,
): MigrationAnalysisOutput {
  const computeAssessment = analyzeCompute(collectedData, preferences, pricedProfiles, pricedBareMetalProfiles);
  const networkAssessment = analyzeNetwork(collectedData, preferences);
  const storageAssessment = analyzeStorage(collectedData, preferences);
  const securityAssessment = analyzeSecurity(collectedData, preferences);
  const featureGaps = analyzeFeatureGaps(collectedData, preferences);
  const dependencyGraph = buildDependencyGraph(collectedData);
  const complexityScore = calculateComplexityScore(
    computeAssessment,
    networkAssessment,
    storageAssessment,
    securityAssessment,
    featureGaps,
  );
  const costAnalysis = analyzeCosts(computeAssessment, storageAssessment, networkAssessment, preferences, pricing);
  const migrationWaves = planWaves(computeAssessment, networkAssessment, storageAssessment, securityAssessment);
  const prereqChecks = runAllPreReqChecks(collectedData, accountInfo);

  return {
    timestamp: new Date().toISOString(),
    preferences,
    computeAssessment,
    networkAssessment,
    storageAssessment,
    securityAssessment,
    featureGaps,
    dependencyGraph,
    complexityScore,
    costAnalysis,
    migrationWaves,
    prereqChecks,
  };
}
