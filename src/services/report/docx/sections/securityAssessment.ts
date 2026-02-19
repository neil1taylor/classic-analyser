import { Paragraph, Table, HeadingLevel } from 'docx';
import type { SecurityAssessment } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak } from '../utils/styles';
import { aiNarrativeSection } from '../utils/aiSections';

export function buildSecurityAssessment(
  assessment: SecurityAssessment,
  aiNarrative?: string,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Security Assessment'),
    body(`Security readiness score: ${assessment.score}/100`),
    spacer(),
  ];

  // Security Groups
  elements.push(heading('Security Groups', HeadingLevel.HEADING_2));
  elements.push(
    body(`Existing groups: ${assessment.securityGroups.existingGroups}`),
    body(`Existing rules: ${assessment.securityGroups.existingRules}`),
    body(`VPC groups needed: ${assessment.securityGroups.vpcGroupsNeeded}`),
  );
  for (const note of assessment.securityGroups.notes) {
    elements.push(bullet(note));
  }
  elements.push(spacer());

  // Certificates
  elements.push(heading('SSL Certificates', HeadingLevel.HEADING_2));
  elements.push(
    body(`Total certificates: ${assessment.certificates.total}`),
    body(`Expiring soon: ${assessment.certificates.expiringSoon}`),
    body(`Expired: ${assessment.certificates.expired}`),
  );
  for (const note of assessment.certificates.notes) {
    elements.push(bullet(note));
  }
  elements.push(spacer());

  // SSH Keys
  elements.push(heading('SSH Keys', HeadingLevel.HEADING_2));
  elements.push(body(`Total SSH keys: ${assessment.sshKeys.total}`));
  for (const note of assessment.sshKeys.notes) {
    elements.push(bullet(note));
  }
  elements.push(spacer());

  // Recommendations
  if (assessment.recommendations.length > 0) {
    elements.push(heading('Security Recommendations', HeadingLevel.HEADING_2));
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
