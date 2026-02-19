import { Paragraph, TextRun, HeadingLevel } from 'docx';
import type { ComplexityScore } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak, BLUE, DARK } from '../utils/styles';
import { aiNarrativeSection } from '../utils/aiSections';

export function buildExecutiveSummary(
  score: ComplexityScore,
  aiNarrative?: string,
): Paragraph[] {
  const elements: Paragraph[] = [
    pageBreak(),
    heading('Executive Summary'),
    body(
      `This report provides an assessment of the IBM Cloud Classic infrastructure environment ` +
        `and its readiness for migration to IBM Cloud VPC.`,
    ),
    spacer(),
  ];

  // Overall readiness
  elements.push(
    heading('Overall Readiness Score', HeadingLevel.HEADING_2),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${score.overall}/100`,
          bold: true,
          color: BLUE,
          size: 36,
        }),
        new TextRun({
          text: `  (${score.category} complexity)`,
          color: DARK,
          size: 24,
        }),
      ],
    }),
    spacer(),
  );

  // Dimension breakdown
  elements.push(heading('Dimension Breakdown', HeadingLevel.HEADING_2));

  const dims = score.dimensions;
  const dimEntries: [string, { score: number; label: string; findings: string[] }][] = [
    ['Compute', dims.compute],
    ['Network', dims.network],
    ['Storage', dims.storage],
    ['Security', dims.security],
    ['Features', dims.features],
  ];

  for (const [name, dim] of dimEntries) {
    elements.push(
      bullet(`${name}: ${dim.score}/100 (${dim.label})`),
    );
  }

  elements.push(spacer());

  // Key findings
  elements.push(heading('Key Findings', HeadingLevel.HEADING_2));

  for (const [name, dim] of dimEntries) {
    if (dim.findings.length > 0) {
      elements.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({
              text: `${name}:`,
              bold: true,
              size: 22,
              color: DARK,
            }),
          ],
        }),
      );
      for (const finding of dim.findings) {
        elements.push(bullet(finding));
      }
    }
  }

  // AI narrative
  if (aiNarrative) {
    elements.push(spacer(), ...aiNarrativeSection(aiNarrative));
  }

  return elements;
}
