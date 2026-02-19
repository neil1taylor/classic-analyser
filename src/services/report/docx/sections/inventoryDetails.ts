import { Paragraph, Table, HeadingLevel } from 'docx';
import { RESOURCE_TYPES } from '@/types/resources';
import { heading, body, spacer, pageBreak } from '../utils/styles';
import { createStyledTable } from '../utils/tables';
import { tableCaption } from '../utils/captions';

export function buildInventoryDetails(
  collectedData: Record<string, unknown[]>,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Inventory Details'),
    body('Detailed resource listings for each discovered resource type.'),
    spacer(),
  ];

  for (const rt of RESOURCE_TYPES) {
    const data = collectedData[rt.key] as Record<string, unknown>[] | undefined;
    if (!data || data.length === 0) continue;

    // Get first 6 default-visible columns
    const visibleCols = rt.columns.filter((c) => c.defaultVisible).slice(0, 6);
    if (visibleCols.length === 0) continue;

    elements.push(heading(rt.label, HeadingLevel.HEADING_2));
    elements.push(body(`${data.length} ${rt.label.toLowerCase()} found.`));
    elements.push(tableCaption(rt.label));

    const headers = visibleCols.map((c) => c.header);
    const rows = data.map((item) =>
      visibleCols.map((col) => {
        const val = item[col.field];
        if (val === null || val === undefined) return '';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (typeof val === 'number') {
          if (col.dataType === 'currency') {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(val);
          }
          return String(val);
        }
        if (val instanceof Date) return val.toLocaleDateString();
        if (Array.isArray(val)) return val.join(', ');
        return String(val);
      }),
    );

    elements.push(createStyledTable(headers, rows));
    elements.push(spacer());
  }

  return elements;
}
