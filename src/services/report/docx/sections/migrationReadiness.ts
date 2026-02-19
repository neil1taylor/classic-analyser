import { Paragraph, TextRun, HeadingLevel } from 'docx';
import type { ComplexityScore } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak, BLUE, DARK } from '../utils/styles';
import { aiNarrativeSection } from '../utils/aiSections';
import { buildPieChartImage } from '../utils/charts';
import { figureCaption } from '../utils/captions';

export async function buildMigrationReadiness(
  score: ComplexityScore,
  aiNarrative?: string,
): Promise<Paragraph[]> {
  const elements: Paragraph[] = [
    pageBreak(),
    heading('Migration Readiness Assessment'),
    body(
      `Overall readiness score: ${score.overall}/100 — categorized as ${score.category} complexity.`,
    ),
    spacer(),
  ];

  // Readiness pie chart showing dimension scores
  const dims = score.dimensions;
  const dimEntries: [string, { score: number; label: string; findings: string[] }][] = [
    ['Compute', dims.compute],
    ['Network', dims.network],
    ['Storage', dims.storage],
    ['Security', dims.security],
    ['Features', dims.features],
  ];

  const slices = dimEntries.map(([name, dim]) => ({
    label: `${name} (${dim.score})`,
    value: dim.score,
  }));

  try {
    const chart = await buildPieChartImage('Readiness by Dimension', slices);
    elements.push(chart);
    elements.push(figureCaption('Migration readiness score distribution by dimension'));
  } catch {
    // Chart rendering failed — continue without it
  }

  elements.push(spacer());

  for (const [name, dim] of dimEntries) {
    elements.push(
      heading(`${name} Readiness`, HeadingLevel.HEADING_2),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `Score: ${dim.score}/100`,
            bold: true,
            color: BLUE,
            size: 24,
          }),
          new TextRun({
            text: `  (${dim.label})`,
            color: DARK,
            size: 22,
          }),
        ],
      }),
    );

    if (dim.findings.length > 0) {
      elements.push(
        body('Findings:'),
      );
      for (const finding of dim.findings) {
        elements.push(bullet(finding));
      }
    } else {
      elements.push(body('No significant findings.'));
    }

    elements.push(spacer());
  }

  if (aiNarrative) {
    elements.push(...aiNarrativeSection(aiNarrative));
  }

  return elements;
}
