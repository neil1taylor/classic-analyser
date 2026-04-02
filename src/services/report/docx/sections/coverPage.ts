import { Paragraph, TextRun, AlignmentType, PageBreak } from 'docx';
import type { ReportBranding } from '../types';
import { BLUE, GRAY, FONT_FAMILY } from '../utils/styles';

export function buildCoverPage(
  title: string,
  subtitle: string,
  branding: ReportBranding,
): Paragraph[] {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return [
    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 480 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          color: BLUE,
          size: 56,
          font: FONT_FAMILY,
        }),
      ],
    }),

    // Subtitle
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 960 },
      children: [
        new TextRun({
          text: subtitle,
          color: GRAY,
          size: 26,
          font: FONT_FAMILY,
        }),
      ],
    }),

    // Client name
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 240 },
      children: [
        new TextRun({
          text: `Prepared for: ${branding.clientName}`,
          size: 22,
          font: FONT_FAMILY,
        }),
      ],
    }),

    // Author
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Prepared by: ${branding.authorName}`,
          size: 22,
          font: FONT_FAMILY,
        }),
      ],
    }),

    // Company
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: branding.companyName,
          size: 22,
          font: FONT_FAMILY,
        }),
      ],
    }),

    // Date
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480 },
      children: [
        new TextRun({
          text: dateStr,
          size: 22,
          color: GRAY,
          font: FONT_FAMILY,
        }),
      ],
    }),

    // Page break after cover
    new Paragraph({ children: [new PageBreak()] }),
  ];
}
