import { Paragraph, TextRun, HeadingLevel, PageBreak } from 'docx';
import { nextSectionNumber } from './sectionCounter';

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

// ── Section numbering toggle ────────────────────────────────────────────
let sectionNumberingEnabled = false;

export function setSectionNumbering(enabled: boolean): void {
  sectionNumberingEnabled = enabled;
}

// ── Font ────────────────────────────────────────────────────────────────
export const FONT_FAMILY = 'IBM Plex Sans';

// ── Paragraph helpers ───────────────────────────────────────────────────

export function heading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1,
): Paragraph {
  const prefix = sectionNumberingEnabled && level === HeadingLevel.HEADING_1
    ? `§${nextSectionNumber()} `
    : '';

  const isH1 = level === HeadingLevel.HEADING_1;
  const isH2 = level === HeadingLevel.HEADING_2;

  return new Paragraph({
    heading: level,
    keepNext: true,
    spacing: {
      before: isH1 ? 400 : isH2 ? 300 : 200,
      after: isH1 ? 200 : isH2 ? 150 : 100,
    },
    children: [
      new TextRun({
        text: `${prefix}${text}`,
        bold: true,
        color: isH1 ? BLUE : GRAY,
        size: isH1 ? 32 : isH2 ? 26 : 22,
        font: FONT_FAMILY,
      }),
    ],
  });
}

export function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        size: 22,
        color: DARK,
        font: FONT_FAMILY,
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
        font: FONT_FAMILY,
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
