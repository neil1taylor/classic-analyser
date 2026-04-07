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

/**
 * Deduplicate block storage SEVC/SEL pairs.
 *
 * IMS NAS exports list each block storage volume twice:
 *   - SEVC (NAS_CONTAINER): the backend storage container — has datacenter, no K8s notes
 *     Name format: {prefix}SEVC{accountId}_{seq} ...
 *   - SEL  (ISCSI):         the iSCSI LUN exposed to the host — datacenter is "unknown", has K8s PVC notes
 *     Name format: {prefix}SEL{accountId}-{seq} ...
 *
 * The prefix varies by storage platform (e.g., IBM02, DSW02).
 * Both share the same suffix number (SEVC uses underscore, SEL uses hyphen),
 * capacity, IOPS, and storage aggregate name. They have different IDs.
 *
 * This function merges each pair into a single record: keeps the SEL (ISCSI)
 * as the primary (richer metadata with K8s notes) and backfills the datacenter
 * from its matching SEVC record.
 *
 * Non-paired items (standalone ISCSI or NAS_CONTAINER) are kept as-is.
 */
export function deduplicateBlockStorage(
  items: Record<string, unknown>[]
): Record<string, unknown>[] {
  // Extract the suffix number from SEVC/SEL hostnames
  // Prefixes vary: IBM02, DSW02, etc. — match any alphanumeric prefix before SEVC/SEL
  // SEVC: {prefix}SEVC{acct}_{num} ... → acct, num
  // SEL:  {prefix}SEL{acct}-{num} ...  → acct, num
  const sevcPattern = /^\w+SEVC(\d+)[_](\d+)\s/i;
  const selPattern = /^\w+SEL(\d+)-(\d+)\s/i;

  // Index SEVC items by "accountId_seq" key
  const sevcByKey = new Map<string, Record<string, unknown>>();
  const selItems: { item: Record<string, unknown>; key: string | null }[] = [];
  const otherItems: Record<string, unknown>[] = [];

  for (const item of items) {
    const hostname = String(item.hostname ?? '');
    const nasType = String(item.nasType ?? '').toUpperCase();

    const sevcMatch = hostname.match(sevcPattern);
    const selMatch = hostname.match(selPattern);

    if (nasType === 'NAS_CONTAINER' && sevcMatch) {
      const key = `${sevcMatch[1]}_${sevcMatch[2]}`;
      sevcByKey.set(key, item);
    } else if (nasType === 'ISCSI' && selMatch) {
      const key = `${selMatch[1]}_${selMatch[2]}`;
      selItems.push({ item, key });
    } else {
      // Non-matching items (different naming convention or type) pass through
      otherItems.push(item);
    }
  }

  // If no SEVC/SEL pattern detected, return original items unchanged
  if (sevcByKey.size === 0 && selItems.length === 0) {
    return items;
  }

  const result: Record<string, unknown>[] = [...otherItems];
  const matchedSevcKeys = new Set<string>();

  for (const { item, key } of selItems) {
    if (key && sevcByKey.has(key)) {
      const sevc = sevcByKey.get(key)!;
      matchedSevcKeys.add(key);

      // Backfill datacenter from SEVC if SEL has "unknown" or empty
      const selDc = String(item.datacenter ?? '').toLowerCase();
      if (!selDc || selDc === 'unknown') {
        const sevcDc = sevc.datacenter;
        if (sevcDc && String(sevcDc).toLowerCase() !== 'unknown') {
          item.datacenter = sevcDc;
        }
      }

      result.push(item);
    } else {
      // Unmatched SEL — keep as-is
      result.push(item);
    }
  }

  // Keep any unmatched SEVC items (no corresponding SEL)
  for (const [key, item] of sevcByKey) {
    if (!matchedSevcKeys.has(key)) {
      result.push(item);
    }
  }

  return result;
}
