import { Paragraph, Table, HeadingLevel } from 'docx';
import type { ComputeAssessment } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak } from '../utils/styles';
import { createStyledTable } from '../utils/tables';
import { aiNarrativeSection } from '../utils/aiSections';

export function buildComputeAssessment(
  assessment: ComputeAssessment,
  aiNarrative?: string,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Compute Assessment'),
    body(`Total compute instances: ${assessment.totalInstances}`),
    body(
      `Ready to migrate: ${assessment.summary.readyToMigrate} | ` +
        `Needs work: ${assessment.summary.needsWork} | ` +
        `Blocked: ${assessment.summary.blocked}`,
    ),
    body(`Compute readiness score: ${assessment.score}/100`),
    spacer(),
  ];

  // VSI Migration Table
  if (assessment.vsiMigrations.length > 0) {
    elements.push(heading('Virtual Server Migrations', HeadingLevel.HEADING_2));
    elements.push(body(`${assessment.vsiMigrations.length} virtual servers assessed.`));

    const vsiHeaders = ['Hostname', 'Datacenter', 'CPU', 'Memory', 'Status', 'Recommended Profile'];
    const vsiRows = assessment.vsiMigrations.map((vsi) => [
      vsi.hostname,
      vsi.datacenter,
      String(vsi.cpu),
      `${vsi.memoryMB} MB`,
      vsi.status,
      vsi.recommendedProfile?.name || 'N/A',
    ]);

    elements.push(createStyledTable(vsiHeaders, vsiRows));
    elements.push(spacer());
  }

  // Bare Metal Migration Table
  if (assessment.bareMetalMigrations.length > 0) {
    elements.push(heading('Bare Metal Migrations', HeadingLevel.HEADING_2));
    elements.push(body(`${assessment.bareMetalMigrations.length} bare metal servers assessed.`));

    const bmHeaders = ['Hostname', 'Datacenter', 'Cores', 'Memory', 'Status', 'Migration Path'];
    const bmRows = assessment.bareMetalMigrations.map((bm) => [
      bm.hostname,
      bm.datacenter,
      String(bm.cores),
      `${bm.memoryGB} GB`,
      bm.status,
      bm.migrationPath,
    ]);

    elements.push(createStyledTable(bmHeaders, bmRows));
    elements.push(spacer());
  }

  // Recommendations
  if (assessment.recommendations.length > 0) {
    elements.push(heading('Compute Recommendations', HeadingLevel.HEADING_2));
    for (const rec of assessment.recommendations) {
      elements.push(bullet(rec));
    }
    elements.push(spacer());
  }

  if (aiNarrative) {
    elements.push(...aiNarrativeSection(aiNarrative));
  }

  return elements;
}
