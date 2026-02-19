import type { MigrationAnalysisOutput, CostAnalysis } from '@/types/migration';

/**
 * Sanitize data before sending to AI — strip hostnames, IPs, and identifying info.
 * Only aggregated/statistical data is sent.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Strip IP addresses
    const ipStripped = value.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
    // Strip hostnames that look like FQDNs
    return ipStripped.replace(/\b[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9.]*\b/g, '[HOST]');
  }
  return value;
}

export function buildInsightsInput(result: MigrationAnalysisOutput): object {
  return {
    overallScore: result.complexityScore.overall,
    category: result.complexityScore.category,
    dimensions: Object.fromEntries(
      Object.entries(result.complexityScore.dimensions).map(([k, v]) => [
        k,
        { score: v.score, label: v.label, findingCount: v.findings.length },
      ]),
    ),
    compute: {
      totalInstances: result.computeAssessment.totalInstances,
      summary: result.computeAssessment.summary,
      score: result.computeAssessment.score,
      recommendationCount: result.computeAssessment.recommendations.length,
    },
    network: {
      totalVlans: result.networkAssessment.vlanAnalysis.totalVlans,
      totalFirewalls: result.networkAssessment.firewallAnalysis.totalFirewalls,
      totalGateways: result.networkAssessment.gatewayAnalysis.gatewaysFound,
      complexity: result.networkAssessment.complexity,
      score: result.networkAssessment.score,
    },
    storage: {
      blockVolumes: result.storageAssessment.blockStorage.totalVolumes,
      blockCapacityGB: result.storageAssessment.blockStorage.totalCapacityGB,
      fileVolumes: result.storageAssessment.fileStorage.totalVolumes,
      fileCapacityGB: result.storageAssessment.fileStorage.totalCapacityGB,
      score: result.storageAssessment.score,
    },
    security: {
      securityGroups: result.securityAssessment.securityGroups.existingGroups,
      certificates: result.securityAssessment.certificates.total,
      sshKeys: result.securityAssessment.sshKeys.total,
      score: result.securityAssessment.score,
    },
    featureGaps: {
      total: result.featureGaps.length,
      detected: result.featureGaps.filter((g) => g.detected).length,
      critical: result.featureGaps.filter((g) => g.detected && g.severity === 'critical').length,
      high: result.featureGaps.filter((g) => g.detected && g.severity === 'high').length,
    },
    cost: {
      classicMonthly: result.costAnalysis.classicMonthlyCost,
      vpcMonthly: result.costAnalysis.vpcMonthlyCost,
      percentageChange: result.costAnalysis.percentageChange,
      threeYearSavings: result.costAnalysis.threeYearSavings,
    },
    waveCount: result.migrationWaves.length,
  };
}

export function buildChatContext(
  collectedData: Record<string, unknown[]>,
  analysisResult?: MigrationAnalysisOutput | null,
): object {
  const resourceCounts: Record<string, number> = {};
  for (const [key, items] of Object.entries(collectedData)) {
    if (Array.isArray(items)) {
      resourceCounts[key] = items.length;
    }
  }

  const context: Record<string, unknown> = { resourceCounts };

  if (analysisResult) {
    context.migrationScore = analysisResult.complexityScore.overall;
    context.migrationCategory = analysisResult.complexityScore.category;
    context.computeSummary = analysisResult.computeAssessment.summary;
    context.networkComplexity = analysisResult.networkAssessment.complexity;
  }

  return context;
}

export function buildCostInput(costAnalysis: CostAnalysis): object {
  return {
    classicMonthly: costAnalysis.classicMonthlyCost,
    vpcMonthly: costAnalysis.vpcMonthlyCost,
    monthlyDifference: costAnalysis.monthlyDifference,
    percentageChange: costAnalysis.percentageChange,
    breakEvenMonths: costAnalysis.breakEvenMonths,
    threeYearSavings: costAnalysis.threeYearSavings,
    byCategory: costAnalysis.costByCategory,
  };
}

export function buildReportNarrativeInput(
  sectionType: string,
  data: Record<string, unknown>,
): object {
  // Deep sanitize: remove PII from all string values
  const sanitized = JSON.parse(JSON.stringify(data), (_key, value) => sanitizeValue(value));
  return { sectionType, data: sanitized };
}
