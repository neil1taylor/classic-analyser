import { Paragraph, HeadingLevel } from 'docx';
import type { MigrationAnalysisOutput } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak } from '../utils/styles';
import { aiNarrativeSection } from '../utils/aiSections';

export function buildRecommendations(
  result: MigrationAnalysisOutput,
  aiNarrative?: string,
): Paragraph[] {
  const elements: Paragraph[] = [
    pageBreak(),
    heading('Recommendations'),
    body(
      'The following recommendations are aggregated from all assessment areas to guide the migration.',
    ),
    spacer(),
  ];

  const sections: { title: string; recs: string[] }[] = [
    { title: 'Compute', recs: result.computeAssessment.recommendations },
    { title: 'Network', recs: result.networkAssessment.recommendations },
    { title: 'Storage', recs: result.storageAssessment.recommendations },
    { title: 'Security', recs: result.securityAssessment.recommendations },
  ];

  for (const section of sections) {
    if (section.recs.length === 0) continue;

    elements.push(heading(`${section.title} Recommendations`, HeadingLevel.HEADING_2));
    for (const rec of section.recs) {
      elements.push(bullet(rec));
    }
    elements.push(spacer());
  }

  // Check if there are no recommendations at all
  const totalRecs = sections.reduce((sum, s) => sum + s.recs.length, 0);
  if (totalRecs === 0) {
    elements.push(body('No specific recommendations were generated for this environment.'));
    elements.push(spacer());
  }

  if (aiNarrative) {
    elements.push(...aiNarrativeSection(aiNarrative));
  }

  return elements;
}
