import { Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';

// ── Brand colours ───────────────────────────────────────────────────────
export const BLUE = '0F62FE';
export const PURPLE = '8A3FFC';
export const GREEN = '24A148';
export const ORANGE = 'FF832B';
export const RED = 'DA1E28';
export const DARK = '161616';
export const GRAY = '525252';
export const MEDIUM_GRAY = 'E0E0E0';
export const LIGHT_BG = 'F4F4F4';
export const WHITE = 'FFFFFF';

// ── Paragraph helpers ───────────────────────────────────────────────────

export function heading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1,
): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: DARK,
        size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22,
      }),
    ],
  });
}

export function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 120 },
    children: [
      new TextRun({
        text,
        size: 22,
        color: DARK,
      }),
    ],
  });
}

export function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [
      new TextRun({
        text,
        size: 22,
        color: DARK,
      }),
    ],
  });
}

export function spacer(): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    children: [],
  });
}

export function pageBreak(): Paragraph {
  return new Paragraph({
    children: [new PageBreak()],
  });
}
