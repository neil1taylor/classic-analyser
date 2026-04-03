/**
 * Simple CSV parser for browser use. Handles quoted fields containing commas.
 */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCsvLine(line));
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Convert a CSV rows array (first row = headers) into an array of objects.
 */
export function csvRowsToObjects(
  rows: string[][],
  fieldMap?: Record<string, string>
): Record<string, unknown>[] {
  if (rows.length < 2) return [];

  const headers = rows[0];
  const results: Record<string, unknown>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every(cell => !cell.trim())) continue;

    const obj: Record<string, unknown> = {};
    for (let j = 0; j < headers.length && j < row.length; j++) {
      const key = fieldMap?.[headers[j]] ?? headers[j];
      const val = row[j];
      // Try to parse numbers
      if (val !== '' && !isNaN(Number(val))) {
        obj[key] = Number(val);
      } else {
        obj[key] = val;
      }
    }
    results.push(obj);
  }

  return results;
}
