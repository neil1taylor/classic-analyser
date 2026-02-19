import { Paragraph, TextRun, AlignmentType } from 'docx';
import { GRAY } from './styles';

let tableCounter = 0;
let figureCounter = 0;

/** Reset counters — call once at the start of each report build. */
export function resetCaptionCounters(): void {
  tableCounter = 0;
  figureCounter = 0;
}

/** Return a "Table N: description" caption paragraph. */
export function tableCaption(description: string): Paragraph {
  tableCounter++;
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 80, after: 60 },
    children: [
      new TextRun({
        text: `Table ${tableCounter}: `,
        bold: true,
        italics: true,
        size: 18,
        color: GRAY,
      }),
      new TextRun({
        text: description,
        italics: true,
        size: 18,
        color: GRAY,
      }),
    ],
  });
}

/** Return a "Figure N: description" caption paragraph. */
export function figureCaption(description: string): Paragraph {
  figureCounter++;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 100 },
    children: [
      new TextRun({
        text: `Figure ${figureCounter}: `,
        bold: true,
        italics: true,
        size: 18,
        color: GRAY,
      }),
      new TextRun({
        text: description,
        italics: true,
        size: 18,
        color: GRAY,
      }),
    ],
  });
}
