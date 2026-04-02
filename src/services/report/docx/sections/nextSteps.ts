import { Paragraph, Table, HeadingLevel } from 'docx';
import type { MigrationAnalysisOutput } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak } from '../utils/styles';

export function buildNextSteps(
  analysis: MigrationAnalysisOutput,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Next Steps'),
    body(
      'The following actions are recommended to move forward with the Classic to VPC migration.',
    ),
    spacer(),
  ];

  // Phase 1: Planning
  elements.push(heading('Phase 1: Planning & Preparation', HeadingLevel.HEADING_2));
  elements.push(bullet('Review this assessment report with technical and business stakeholders'));
  elements.push(bullet('Prioritize and assign remediation tasks from the Remediation Plan'));
  elements.push(bullet('Validate VPC profile sizing recommendations with application owners'));
  elements.push(bullet('Establish migration success criteria and rollback procedures'));

  if (analysis.costAnalysis.percentageChange > 10) {
    elements.push(bullet('Evaluate reserved capacity pricing to optimize VPC costs'));
  }
  elements.push(spacer());

  // Phase 2: Pilot
  elements.push(heading('Phase 2: Pilot Migration', HeadingLevel.HEADING_2));
  if (analysis.migrationWaves.length > 0) {
    const wave1 = analysis.migrationWaves[0];
    elements.push(
      body(
        `Execute Wave 1 ("${wave1.name}") as a pilot migration with ${wave1.resources.length} resource(s).`,
      ),
    );
  }
  elements.push(bullet('Provision target VPC infrastructure (VPC, subnets, security groups)'));
  elements.push(bullet('Migrate pilot workloads and validate application functionality'));
  elements.push(bullet('Measure performance against Classic baseline'));
  elements.push(bullet('Document lessons learned for subsequent waves'));
  elements.push(spacer());

  // Phase 3: Execution
  elements.push(heading('Phase 3: Migration Execution', HeadingLevel.HEADING_2));
  elements.push(
    body(
      `Execute remaining ${Math.max(0, analysis.migrationWaves.length - 1)} migration wave(s) following the wave plan.`,
    ),
  );
  elements.push(bullet('Follow wave dependency ordering to avoid service disruption'));
  elements.push(bullet('Execute rollback plan if validation fails for any wave'));
  elements.push(bullet('Update DNS, load balancers, and monitoring after each wave'));
  elements.push(spacer());

  // Phase 4: Optimization
  elements.push(heading('Phase 4: Post-Migration Optimization', HeadingLevel.HEADING_2));
  elements.push(bullet('Right-size VPC instances based on actual utilization data'));
  elements.push(bullet('Decommission Classic infrastructure after validation period'));
  elements.push(bullet('Implement VPC-native security features (flow logs, network ACLs)'));
  elements.push(bullet('Set up monitoring and alerting for the VPC environment'));
  elements.push(bullet('Review and optimize costs after 30/60/90 days'));
  elements.push(spacer());

  return elements;
}
