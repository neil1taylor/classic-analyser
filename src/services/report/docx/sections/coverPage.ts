import { Paragraph, TextRun, AlignmentType } from 'docx';
import type { ReportBranding } from '../types';
import { BLUE, DARK, GRAY } from '../utils/styles';

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
    // Top spacer
    new Paragraph({ spacing: { before: 2400 }, children: [] }),

    // IBM Cloud branding line
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'IBM Cloud',
          bold: true,
          color: BLUE,
          size: 28,
        }),
      ],
    }),

    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          color: DARK,
          size: 48,
        }),
      ],
    }),

    // Subtitle
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: subtitle,
          color: GRAY,
          size: 28,
        }),
      ],
    }),

    // Horizontal rule (thin line)
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: '________________________________________',
          color: BLUE,
          size: 20,
        }),
      ],
    }),

    // Client name
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Prepared for: ${branding.clientName}`,
          color: DARK,
          size: 24,
        }),
      ],
    }),

    // Author
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Prepared by: ${branding.authorName}`,
          color: GRAY,
          size: 22,
        }),
      ],
    }),

    // Company
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: branding.companyName,
          color: GRAY,
          size: 22,
        }),
      ],
    }),

    // Date
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: dateStr,
          color: GRAY,
          size: 22,
        }),
      ],
    }),

    // Confidentiality
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'CONFIDENTIAL',
          bold: true,
          color: GRAY,
          size: 18,
        }),
      ],
    }),
  ];
}
