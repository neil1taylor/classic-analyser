import { Paragraph, Table, HeadingLevel } from 'docx';
import type { StorageAssessment } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak } from '../utils/styles';
import { createStyledTable, fmt } from '../utils/tables';
import { aiNarrativeSection } from '../utils/aiSections';

export function buildStorageAssessment(
  assessment: StorageAssessment,
  aiNarrative?: string,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Storage Assessment'),
    body(`Storage readiness score: ${assessment.score}/100`),
    spacer(),
  ];

  // Block Storage
  elements.push(heading('Block Storage', HeadingLevel.HEADING_2));
  elements.push(
    body(
      `Total volumes: ${assessment.blockStorage.totalVolumes}, ` +
        `Total capacity: ${assessment.blockStorage.totalCapacityGB.toLocaleString()} GB`,
    ),
  );

  if (assessment.blockStorage.volumeAssessments.length > 0) {
    const bsHeaders = ['Username', 'Capacity (GB)', 'IOPS', 'VPC Profile', 'Strategy', 'Fee'];
    const bsRows = assessment.blockStorage.volumeAssessments.map((vol) => [
      vol.username,
      String(vol.capacityGB),
      String(vol.iops),
      vol.vpcProfile,
      vol.strategy,
      fmt(vol.currentFee),
    ]);
    elements.push(createStyledTable(bsHeaders, bsRows));
  }
  elements.push(spacer());

  // File Storage
  elements.push(heading('File Storage', HeadingLevel.HEADING_2));
  elements.push(
    body(
      `Total volumes: ${assessment.fileStorage.totalVolumes}, ` +
        `Total capacity: ${assessment.fileStorage.totalCapacityGB.toLocaleString()} GB`,
    ),
  );

  if (assessment.fileStorage.volumeAssessments.length > 0) {
    const fsHeaders = ['Username', 'Capacity (GB)', 'Fee', 'Notes'];
    const fsRows = assessment.fileStorage.volumeAssessments.map((vol) => [
      vol.username,
      String(vol.capacityGB),
      fmt(vol.currentFee),
      vol.notes.join('; '),
    ]);
    elements.push(createStyledTable(fsHeaders, fsRows));
  }
  elements.push(spacer());

  // Object Storage
  if (assessment.objectStorage.totalAccounts > 0) {
    elements.push(heading('Object Storage', HeadingLevel.HEADING_2));
    elements.push(
      body(`Total accounts: ${assessment.objectStorage.totalAccounts}`),
      body(
        `Migration required: ${assessment.objectStorage.migrationRequired ? 'Yes' : 'No'}`,
      ),
    );
    for (const note of assessment.objectStorage.notes) {
      elements.push(bullet(note));
    }
    elements.push(spacer());
  }

  // Recommendations
  if (assessment.recommendations.length > 0) {
    elements.push(heading('Storage Recommendations', HeadingLevel.HEADING_2));
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
