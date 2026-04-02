import { Paragraph, Table, HeadingLevel } from 'docx';
import type { MigrationAnalysisOutput, CheckResult } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak } from '../utils/styles';
import { createStyledTable } from '../utils/tables';
import { tableCaption } from '../utils/captions';

export function buildRemediationPlan(
  analysis: MigrationAnalysisOutput,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Remediation Plan'),
    body(
      'This section outlines the pre-migration tasks required to address blockers and warnings identified during the assessment. Tasks are prioritized by severity.',
    ),
    spacer(),
  ];

  // Collect all blocking and warning checks with affected resources
  const allChecks: CheckResult[] = [
    ...analysis.prereqChecks.compute,
    ...analysis.prereqChecks.storage,
    ...analysis.prereqChecks.network,
    ...analysis.prereqChecks.security,
  ];

  const actionable = allChecks.filter(
    (c) => (c.severity === 'blocker' || c.severity === 'warning') && c.affectedCount > 0,
  );

  if (actionable.length === 0) {
    elements.push(body('No remediation tasks are required. All pre-flight checks passed.'));
    return elements;
  }

  // Critical remediation (blockers)
  const blockers = actionable.filter((c) => c.severity === 'blocker');
  if (blockers.length > 0) {
    elements.push(heading('Critical Remediation (Must Fix)', HeadingLevel.HEADING_2));
    elements.push(
      body('These items must be resolved before any migration wave can proceed.'),
    );
    elements.push(tableCaption('Critical Remediation Tasks'));
    elements.push(
      createStyledTable(
        ['Task', 'Category', 'Affected', 'Remediation Steps'],
        blockers.map((c) => [
          c.check.name,
          c.check.category,
          String(c.affectedCount),
          c.check.remediationSteps.length > 0
            ? c.check.remediationSteps.join('; ')
            : 'See documentation',
        ]),
      ),
    );
    elements.push(spacer());
  }

  // Warning remediation
  const warnings = actionable.filter((c) => c.severity === 'warning');
  if (warnings.length > 0) {
    elements.push(heading('Recommended Remediation', HeadingLevel.HEADING_2));
    elements.push(
      body('These items should be addressed to ensure a smooth migration but are not mandatory.'),
    );
    elements.push(tableCaption('Recommended Remediation Tasks'));
    elements.push(
      createStyledTable(
        ['Task', 'Category', 'Affected', 'Remediation Steps'],
        warnings.map((c) => [
          c.check.name,
          c.check.category,
          String(c.affectedCount),
          c.check.remediationSteps.length > 0
            ? c.check.remediationSteps.join('; ')
            : 'See documentation',
        ]),
      ),
    );
    elements.push(spacer());
  }

  // OS upgrade tasks
  const needsUpgrade = analysis.computeAssessment.vsiMigrations.filter(
    (v) => !v.osCompatible && v.osUpgradeTarget,
  );
  if (needsUpgrade.length > 0) {
    elements.push(heading('OS Upgrade Tasks', HeadingLevel.HEADING_2));
    elements.push(
      body(
        `${needsUpgrade.length} instance(s) require an OS upgrade to be compatible with VPC stock images.`,
      ),
    );
    elements.push(tableCaption('Required OS Upgrades'));
    elements.push(
      createStyledTable(
        ['Hostname', 'Current OS', 'Upgrade Target'],
        needsUpgrade.slice(0, 50).map((v) => [
          v.hostname,
          v.os,
          v.osUpgradeTarget || 'N/A',
        ]),
      ),
    );
    if (needsUpgrade.length > 50) {
      elements.push(body(`... and ${needsUpgrade.length - 50} more. See XLSX export for full list.`));
    }
    elements.push(spacer());
  }

  // General pre-migration checklist
  elements.push(heading('Pre-Migration Checklist', HeadingLevel.HEADING_2));
  elements.push(bullet('Resolve all critical (blocker) remediation tasks'));
  elements.push(bullet('Complete OS upgrades for incompatible instances'));
  elements.push(bullet('Validate firewall rule translations'));
  elements.push(bullet('Verify storage IOPS profile mappings'));
  elements.push(bullet('Renew any expiring SSL certificates'));
  elements.push(bullet('Back up all data and configuration before migration'));
  elements.push(bullet('Test application connectivity in target VPC environment'));
  elements.push(bullet('Validate DNS and load balancer configurations'));
  elements.push(spacer());

  return elements;
}
