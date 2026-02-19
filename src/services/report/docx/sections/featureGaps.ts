import { Paragraph, Table, HeadingLevel } from 'docx';
import type { FeatureGap } from '@/types/migration';
import { heading, body, spacer, pageBreak } from '../utils/styles';
import { createStyledTable } from '../utils/tables';

export function buildFeatureGaps(gaps: FeatureGap[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Feature Gap Analysis'),
    body(
      'The following features available in Classic infrastructure may have limited or no equivalent in VPC.',
    ),
    spacer(),
  ];

  if (gaps.length === 0) {
    elements.push(body('No significant feature gaps were detected.'));
    return elements;
  }

  // Filter to detected gaps
  const detectedGaps = gaps.filter((g) => g.detected);
  const undetectedGaps = gaps.filter((g) => !g.detected);

  if (detectedGaps.length > 0) {
    elements.push(heading('Detected Feature Gaps', HeadingLevel.HEADING_2));

    const headers = ['Feature', 'Severity', 'Affected Resources', 'Workaround', 'Notes'];
    const rows = detectedGaps.map((gap) => [
      gap.feature,
      gap.severity.toUpperCase(),
      String(gap.affectedResources),
      gap.workaround,
      gap.notes,
    ]);

    elements.push(createStyledTable(headers, rows));
    elements.push(spacer());
  }

  if (undetectedGaps.length > 0) {
    elements.push(heading('Additional Potential Gaps', HeadingLevel.HEADING_2));
    elements.push(
      body(
        `${undetectedGaps.length} additional feature gaps were assessed but not detected in this environment.`,
      ),
    );

    const headers = ['Feature', 'Severity', 'Workaround'];
    const rows = undetectedGaps.map((gap) => [
      gap.feature,
      gap.severity.toUpperCase(),
      gap.workaround,
    ]);

    elements.push(createStyledTable(headers, rows));
    elements.push(spacer());
  }

  return elements;
}
