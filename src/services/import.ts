import ExcelJS from 'exceljs';
import { RESOURCE_TYPES } from '@/types/resources';
import { VPC_RESOURCE_TYPES } from '@/types/vpc-resources';
import type { AccountInfo } from '@/types/resources';
import { createLogger } from '@/utils/logger';

const log = createLogger('Import');

export interface ImportResult {
  data: Record<string, unknown[]>;
  worksheets: string[];
  rowCounts: Record<string, number>;
  filename: string;
  accountInfo?: Partial<AccountInfo>;
}

/** Map worksheet name (lower-cased) → resource key */
function buildWorksheetMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const rt of RESOURCE_TYPES) {
    map.set(rt.worksheetName.toLowerCase(), rt.key);
  }
  for (const rt of VPC_RESOURCE_TYPES) {
    map.set(rt.worksheetName.toLowerCase(), rt.key);
  }
  return map;
}

/** Map worksheet name (lower-cased) → Map<header → { field, dataType }> */
function buildHeaderFieldMaps(): Map<string, Map<string, { field: string; dataType: string }>> {
  const result = new Map<string, Map<string, { field: string; dataType: string }>>();

  for (const rt of RESOURCE_TYPES) {
    const headerMap = new Map<string, { field: string; dataType: string }>();
    for (const col of rt.columns) {
      headerMap.set(col.header, { field: col.field, dataType: col.dataType });
    }
    result.set(rt.worksheetName.toLowerCase(), headerMap);
  }

  for (const rt of VPC_RESOURCE_TYPES) {
    const headerMap = new Map<string, { field: string; dataType: string }>();
    for (const col of rt.columns) {
      headerMap.set(col.header, { field: col.field, dataType: col.dataType });
    }
    result.set(rt.worksheetName.toLowerCase(), headerMap);
  }

  return result;
}

/** Coerce a cell value based on the column's declared data type */
function coerceValue(value: unknown, dataType: string): unknown {
  if (value === null || value === undefined || value === '') return value;

  switch (dataType) {
    case 'number':
    case 'currency': {
      if (typeof value === 'number') return value;
      const str = String(value).replace(/[,$%]/g, '').trim();
      const num = Number(str);
      return isNaN(num) ? value : num;
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value;
      const s = String(value).toLowerCase().trim();
      if (s === 'yes' || s === 'true' || s === '1') return true;
      if (s === 'no' || s === 'false' || s === '0') return false;
      return value;
    }
    default:
      return value;
  }
}

/** Parse account info from the Summary or VPC Summary worksheet */
function parseAccountInfo(worksheet: ExcelJS.Worksheet): Partial<AccountInfo> | undefined {
  const kvPairs = new Map<string, string>();

  worksheet.eachRow((row) => {
    const prop = String(row.getCell(1).value ?? '').trim();
    const val = String(row.getCell(2).value ?? '').trim();
    if (prop && val) {
      kvPairs.set(prop, val);
    }
  });

  const companyName = kvPairs.get('Account Name');
  const idStr = kvPairs.get('Account ID');
  const email = kvPairs.get('Account Email');
  const ownerStr = kvPairs.get('Account Owner');

  if (!companyName && !idStr && !email) return undefined;

  const info: Partial<AccountInfo> = {};
  if (companyName) info.companyName = companyName;
  if (idStr) {
    const parsed = Number(idStr);
    if (!isNaN(parsed)) info.id = parsed;
  }
  if (email) info.email = email;
  if (ownerStr) {
    const parts = ownerStr.split(' ');
    if (parts.length >= 2) {
      info.firstName = parts[0];
      info.lastName = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
      info.firstName = parts[0];
      info.lastName = '';
    }
  }

  return info;
}

export async function parseImportedXlsx(file: File): Promise<ImportResult> {
  log.info('Starting import of file:', file.name);
  log.time('import');

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheetMap = buildWorksheetMap();
  const headerFieldMaps = buildHeaderFieldMaps();
  const data: Record<string, unknown[]> = {};
  const worksheets: string[] = [];
  const rowCounts: Record<string, number> = {};
  let accountInfo: Partial<AccountInfo> | undefined;

  workbook.eachSheet((worksheet) => {
    const name = worksheet.name;
    const nameLower = name.toLowerCase();

    // Parse account info from Summary sheets
    if (nameLower === 'summary' || nameLower === 'vpc summary') {
      const info = parseAccountInfo(worksheet);
      if (info && !accountInfo) {
        accountInfo = info;
        log.info('Parsed account info from worksheet:', name);
      }
      return;
    }

    const resourceKey = worksheetMap.get(nameLower);

    if (!resourceKey) {
      log.debug('Skipping unrecognised worksheet:', name);
      return;
    }

    worksheets.push(name);

    // Read headers from row 1
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value ?? '');
    });

    // Build column mapping: colNumber → { key, dataType }
    const fieldMap = headerFieldMaps.get(nameLower);
    const colMapping: Array<{ key: string; dataType: string } | null> = [];
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (!header) {
        colMapping[i] = null;
        continue;
      }

      // Try to find a matching RESOURCE_TYPES/VPC_RESOURCE_TYPES column definition
      const mapped = fieldMap?.get(header);
      if (mapped) {
        colMapping[i] = { key: mapped.field, dataType: mapped.dataType };
      } else {
        // Fallback: use header as-is (backwards compatibility with old exports or extra columns)
        colMapping[i] = { key: header, dataType: 'string' };
      }
    }

    const rows: unknown[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const obj: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const mapping = colMapping[colNumber];
        if (mapping) {
          obj[mapping.key] = coerceValue(cell.value, mapping.dataType);
        }
      });
      rows.push(obj);
    });

    data[resourceKey] = rows;
    rowCounts[resourceKey] = rows.length;
    log.info(`Imported ${rows.length} rows from worksheet "${name}" → ${resourceKey}`);
  });

  if (worksheets.length === 0) {
    log.error('No recognised worksheets found in file');
    throw new Error(
      'No recognised worksheets found. Expected worksheet names like "vVirtualServers", "vVLANs", etc.'
    );
  }

  log.timeEnd('import');
  log.info(`Import complete: ${worksheets.length} worksheets, ${Object.values(rowCounts).reduce((a, b) => a + b, 0)} total rows`);

  return {
    data,
    worksheets,
    rowCounts,
    filename: file.name,
    accountInfo,
  };
}
