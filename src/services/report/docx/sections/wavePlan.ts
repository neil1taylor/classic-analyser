import { Paragraph, TextRun, HeadingLevel } from 'docx';
import type { MigrationWave } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak, BLUE, DARK } from '../utils/styles';

export function buildWavePlan(waves: MigrationWave[]): Paragraph[] {
  const elements: Paragraph[] = [
    pageBreak(),
    heading('Migration Wave Plan'),
    body(
      `The migration is organized into ${waves.length} wave${waves.length !== 1 ? 's' : ''} ` +
        'to minimize risk and maintain business continuity.',
    ),
    spacer(),
  ];

  for (const wave of waves) {
    elements.push(
      heading(`Wave ${wave.waveNumber}: ${wave.name}`, HeadingLevel.HEADING_2),
      body(wave.description),
    );

    // Duration
    elements.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: 'Estimated Duration: ', bold: true, size: 22, color: DARK }),
          new TextRun({ text: wave.estimatedDuration, size: 22, color: DARK }),
        ],
      }),
    );

    // Resources
    if (wave.resources.length > 0) {
      elements.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({
              text: `Resources (${wave.resources.length}):`,
              bold: true,
              size: 22,
              color: DARK,
            }),
          ],
        }),
      );
      for (const res of wave.resources) {
        elements.push(bullet(`${res.type}: ${res.name} (${res.datacenter})`));
      }
    }

    // Prerequisites
    if (wave.prerequisites.length > 0) {
      elements.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: 'Prerequisites:', bold: true, size: 22, color: DARK }),
          ],
        }),
      );
      for (const prereq of wave.prerequisites) {
        elements.push(bullet(prereq));
      }
    }

    // Validation Steps
    if (wave.validationSteps.length > 0) {
      elements.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: 'Validation Steps:', bold: true, size: 22, color: DARK }),
          ],
        }),
      );
      for (const step of wave.validationSteps) {
        elements.push(bullet(step));
      }
    }

    // Rollback Plan
    elements.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({ text: 'Rollback Plan: ', bold: true, size: 22, color: DARK }),
          new TextRun({ text: wave.rollbackPlan, size: 22, color: DARK }),
        ],
      }),
    );

    elements.push(spacer());
  }

  return elements;
}
