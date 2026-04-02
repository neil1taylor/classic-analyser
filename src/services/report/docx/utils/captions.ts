import { Paragraph, TextRun, AlignmentType } from 'docx';
import { BLUE, FONT_FAMILY } from './styles';

let tableCounter = 0;
let figureCounter = 0;

/** Reset counters — call once at the start of each report build. */
export function resetCaptionCounters(): void {
  tableCounter = 0;
  figureCounter = 0;
}

/** Return a "Table N: description" caption paragraph (centered, below table). */
export function tableCaption(description: string): Paragraph {
  tableCounter++;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 300 },
    children: [
      new TextRun({
        text: `Table ${tableCounter}: `,
        bold: true,
        size: 20,
        color: BLUE,
        font: FONT_FAMILY,
      }),
      new TextRun({
        text: description,
        bold: true,
        size: 20,
        font: FONT_FAMILY,
      }),
    ],
  });
}

/** Return a "Figure N: description" caption paragraph (centered, below figure). */
export function figureCaption(description: string): Paragraph {
  figureCounter++;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 300 },
    children: [
      new TextRun({
        text: `Figure ${figureCounter}: `,
        bold: true,
        size: 20,
        color: BLUE,
        font: FONT_FAMILY,
      }),
      new TextRun({
        text: description,
        bold: true,
        size: 20,
        font: FONT_FAMILY,
      }),
    ],
  });
}
