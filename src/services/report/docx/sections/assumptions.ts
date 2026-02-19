import { Paragraph, HeadingLevel } from 'docx';
import { heading, body, bullet, spacer, pageBreak } from '../utils/styles';

export function buildAssumptions(): Paragraph[] {
  return [
    pageBreak(),
    heading('Methodology & Assumptions'),
    body(
      'This assessment is based on data collected from the IBM Cloud Classic (SoftLayer) API ' +
        'and analyzed using rule-based migration logic. The following assumptions apply:',
    ),
    spacer(),

    heading('Data Collection', HeadingLevel.HEADING_2),
    bullet('Resource data was collected via the SoftLayer REST API at the time of the scan.'),
    bullet(
      'The scan captures a point-in-time snapshot; resources may have changed since collection.',
    ),
    bullet(
      'Some resource attributes (e.g., detailed billing, usage metrics) may not be available via the API.',
    ),
    spacer(),

    heading('Cost Estimates', HeadingLevel.HEADING_2),
    bullet(
      'VPC cost estimates are based on published IBM Cloud catalog pricing and may not reflect negotiated discounts.',
    ),
    bullet('Costs are estimated in USD and represent monthly recurring charges.'),
    bullet('Migration execution costs (labor, downtime) are not included in the estimates.'),
    bullet(
      'Break-even calculations assume consistent workload and no pricing changes over the period.',
    ),
    spacer(),

    heading('Migration Assessments', HeadingLevel.HEADING_2),
    bullet(
      'VPC profile recommendations are based on CPU and memory matching; actual performance may vary.',
    ),
    bullet(
      'OS compatibility is assessed against known VPC supported images; custom images may require additional validation.',
    ),
    bullet(
      'Network topology translation from VLANs to VPC subnets is a guideline; actual design should be reviewed by a network architect.',
    ),
    bullet(
      'Security group rule translation counts are estimates; complex rules may require manual review.',
    ),
    spacer(),

    heading('Limitations', HeadingLevel.HEADING_2),
    bullet(
      'Application-level dependencies, data migration effort, and testing requirements are not assessed.',
    ),
    bullet(
      'Performance benchmarking between Classic and VPC is not included.',
    ),
    bullet(
      'Third-party software licensing implications are not evaluated.',
    ),
    spacer(),
  ];
}
