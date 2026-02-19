import type { ComplexityScore, ComplexityCategory, DimensionScore, ComputeAssessment, NetworkAssessment, StorageAssessment, SecurityAssessment, FeatureGap } from '@/types/migration';

function categorize(score: number): ComplexityCategory {
  if (score >= 76) return 'Very High';
  if (score >= 51) return 'High';
  if (score >= 26) return 'Medium';
  return 'Low';
}

function dimensionLabel(score: number): string {
  if (score >= 80) return 'Ready';
  if (score >= 60) return 'Mostly Ready';
  if (score >= 40) return 'Needs Work';
  return 'Significant Work';
}

export function calculateComplexityScore(
  compute: ComputeAssessment,
  network: NetworkAssessment,
  storage: StorageAssessment,
  security: SecurityAssessment,
  featureGaps: FeatureGap[],
): ComplexityScore {
  // Compute dimension
  const computeFindings: string[] = [];
  if (compute.summary.blocked > 0) computeFindings.push(`${compute.summary.blocked} blocked instance(s)`);
  if (compute.summary.needsWork > 0) computeFindings.push(`${compute.summary.needsWork} instance(s) need work`);
  if (compute.summary.readyToMigrate > 0) computeFindings.push(`${compute.summary.readyToMigrate} ready to migrate`);

  const computeDim: DimensionScore = {
    score: compute.score,
    label: dimensionLabel(compute.score),
    findings: computeFindings,
  };

  // Network dimension
  const networkFindings: string[] = [];
  if (network.gatewayAnalysis.requiresAppliance > 0) networkFindings.push(`${network.gatewayAnalysis.requiresAppliance} gateway(s) need appliances`);
  if (network.firewallAnalysis.manualReview > 0) networkFindings.push(`${network.firewallAnalysis.manualReview} firewall rule(s) need manual review`);
  networkFindings.push(`${network.vlanAnalysis.totalVlans} VLAN(s) to map to VPC subnets`);

  const networkDim: DimensionScore = {
    score: network.score,
    label: dimensionLabel(network.score),
    findings: networkFindings,
  };

  // Storage dimension
  const storageFindings: string[] = [];
  storageFindings.push(`${storage.blockStorage.totalVolumes} block + ${storage.fileStorage.totalVolumes} file storage volume(s)`);
  const totalGB = storage.blockStorage.totalCapacityGB + storage.fileStorage.totalCapacityGB;
  storageFindings.push(`${(totalGB / 1024).toFixed(1)} TB total data`);

  const storageDim: DimensionScore = {
    score: storage.score,
    label: dimensionLabel(storage.score),
    findings: storageFindings,
  };

  // Security dimension
  const securityFindings: string[] = [];
  if (security.certificates.expired > 0) securityFindings.push(`${security.certificates.expired} expired certificate(s)`);
  securityFindings.push(`${security.securityGroups.existingGroups} security group(s) to migrate`);
  securityFindings.push(`${security.sshKeys.total} SSH key(s) to import`);

  const securityDim: DimensionScore = {
    score: security.score,
    label: dimensionLabel(security.score),
    findings: securityFindings,
  };

  // Feature gaps dimension
  const detectedGaps = featureGaps.filter((g) => g.detected);
  const criticalGaps = detectedGaps.filter((g) => g.severity === 'critical' || g.severity === 'high');
  let featureScore = 100;
  featureScore -= criticalGaps.length * 15;
  featureScore -= detectedGaps.filter((g) => g.severity === 'medium').length * 8;
  featureScore -= detectedGaps.filter((g) => g.severity === 'low').length * 3;
  featureScore = Math.max(0, Math.min(100, featureScore));

  const featureFindings: string[] = [];
  if (detectedGaps.length > 0) featureFindings.push(`${detectedGaps.length} feature gap(s) detected`);
  if (criticalGaps.length > 0) featureFindings.push(`${criticalGaps.length} high/critical severity gap(s)`);

  const featureDim: DimensionScore = {
    score: featureScore,
    label: dimensionLabel(featureScore),
    findings: featureFindings,
  };

  // Overall: weighted average (compute=30%, network=25%, storage=15%, security=15%, features=15%)
  const overall = Math.round(
    computeDim.score * 0.30 +
    networkDim.score * 0.25 +
    storageDim.score * 0.15 +
    securityDim.score * 0.15 +
    featureDim.score * 0.15
  );

  // Complexity is inverse of readiness: 100-overall gives complexity 0-100
  const complexityValue = 100 - overall;

  return {
    overall, // This is readiness (100 = ready, 0 = not ready)
    category: categorize(complexityValue),
    dimensions: {
      compute: computeDim,
      network: networkDim,
      storage: storageDim,
      security: securityDim,
      features: featureDim,
    },
  };
}
