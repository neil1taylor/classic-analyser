import { Paragraph, Table, HeadingLevel } from 'docx';
import type { MigrationAnalysisOutput } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak } from '../utils/styles';
import { createStyledTable } from '../utils/tables';
import { tableCaption } from '../utils/captions';

interface Risk {
  factor: string;
  severity: string;
  impact: string;
  mitigation: string;
}

export function buildRiskAssessment(
  analysis: MigrationAnalysisOutput,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Risk Assessment'),
    body(
      'This section identifies key risks associated with the migration from Classic to VPC infrastructure and recommends mitigation strategies.',
    ),
    spacer(),
  ];

  const risks = deriveRisks(analysis);

  if (risks.length === 0) {
    elements.push(body('No significant migration risks were identified.'));
    return elements;
  }

  elements.push(tableCaption('Migration Risk Matrix'));
  elements.push(
    createStyledTable(
      ['Risk Factor', 'Severity', 'Impact', 'Mitigation'],
      risks.map((r) => [r.factor, r.severity, r.impact, r.mitigation]),
    ),
  );
  elements.push(spacer());

  // Risk summary
  const critical = risks.filter((r) => r.severity === 'CRITICAL').length;
  const high = risks.filter((r) => r.severity === 'HIGH').length;
  const medium = risks.filter((r) => r.severity === 'MEDIUM').length;

  elements.push(heading('Risk Summary', HeadingLevel.HEADING_2));
  if (critical > 0) elements.push(bullet(`${critical} critical risk(s) requiring immediate attention`));
  if (high > 0) elements.push(bullet(`${high} high risk(s) to address before migration`));
  if (medium > 0) elements.push(bullet(`${medium} medium risk(s) to monitor during migration`));
  elements.push(spacer());

  return elements;
}

function deriveRisks(a: MigrationAnalysisOutput): Risk[] {
  const risks: Risk[] = [];

  // Blocked instances
  if (a.computeAssessment.summary.blocked > 0) {
    risks.push({
      factor: 'Blocked Instances',
      severity: 'CRITICAL',
      impact: `${a.computeAssessment.summary.blocked} instance(s) cannot migrate in current state`,
      mitigation: 'Resolve pre-flight check blockers before migration; consider re-platform or re-architect approaches',
    });
  }

  // Feature gaps with critical severity
  const criticalGaps = a.featureGaps.filter((g) => g.detected && g.severity === 'critical');
  if (criticalGaps.length > 0) {
    risks.push({
      factor: 'Critical Feature Gaps',
      severity: 'CRITICAL',
      impact: `${criticalGaps.length} Classic feature(s) have no VPC equivalent`,
      mitigation: criticalGaps.map((g) => g.workaround).join('; '),
    });
  }

  // High complexity
  if (a.complexityScore.overall < 40) {
    risks.push({
      factor: 'High Migration Complexity',
      severity: 'HIGH',
      impact: `Overall readiness score of ${a.complexityScore.overall}/100 indicates significant migration effort`,
      mitigation: 'Consider phased migration with pilot wave; allocate additional testing time',
    });
  }

  // Network complexity
  if (a.networkAssessment.complexity === 'very-high' || a.networkAssessment.complexity === 'high') {
    risks.push({
      factor: 'Complex Network Topology',
      severity: 'HIGH',
      impact: `${a.networkAssessment.vlanAnalysis.totalVlans} VLANs, ${a.networkAssessment.firewallAnalysis.manualReview} firewall rules requiring manual review`,
      mitigation: 'Conduct network mapping workshop; validate firewall rule translations before cutover',
    });
  }

  // Cost increase
  if (a.costAnalysis.percentageChange > 20) {
    risks.push({
      factor: 'Significant Cost Increase',
      severity: 'HIGH',
      impact: `VPC costs ${a.costAnalysis.percentageChange.toFixed(1)}% higher than Classic (${formatCurrency(a.costAnalysis.monthlyDifference)}/mo)`,
      mitigation: 'Right-size VPC profiles; evaluate reserved capacity pricing; consider spot instances for non-critical workloads',
    });
  }

  // OS incompatibility
  const incompatible = a.computeAssessment.vsiMigrations.filter((v) => !v.osCompatible);
  if (incompatible.length > 0) {
    risks.push({
      factor: 'OS Compatibility',
      severity: 'MEDIUM',
      impact: `${incompatible.length} instance(s) running non-VPC-compatible OS`,
      mitigation: 'Upgrade OS versions or use BYOL images; test application compatibility before migration',
    });
  }

  // Storage migration
  if (a.storageAssessment.blockStorage.totalVolumes > 0) {
    risks.push({
      factor: 'Storage Data Migration',
      severity: 'MEDIUM',
      impact: `${a.storageAssessment.blockStorage.totalVolumes} block volumes (${a.storageAssessment.blockStorage.totalCapacityGB} GB) require data transfer`,
      mitigation: 'Plan data migration windows; validate IOPS profile mapping; test snapshot-based migration approach',
    });
  }

  // Expiring certificates
  if (a.securityAssessment.certificates.expiringSoon > 0) {
    risks.push({
      factor: 'Expiring SSL Certificates',
      severity: 'MEDIUM',
      impact: `${a.securityAssessment.certificates.expiringSoon} certificate(s) expiring soon`,
      mitigation: 'Renew certificates before migration; consider IBM Certificate Manager for VPC',
    });
  }

  return risks;
}

function formatCurrency(value: number): string {
  return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
