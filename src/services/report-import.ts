import type { ImportResult } from '@/services/import';
import type { ReportFileType, ReportFileSet, ReportParserResult } from './report-parsers/types';
import {
  parseWarningsCsv,
  parseGatewayCsv,
  parseNasCsv,
  parseSecurityGroupsCsv,
  parseWarningsHtml,
  parseOverviewHtml,
  parseSummaryHtml,
  parseInventoryHtml,
  parseDrawio,
  parseReportJson,
  parseAssessmentXlsx,
  parseDeviceInventoryXlsx,
  parseConsolidatedXlsx,
  mergeReportData,
} from './report-parsers';
import { createLogger } from '@/utils/logger';

const log = createLogger('ReportImport');

/**
 * File suffix patterns for classification.
 * Order matters: more specific patterns first.
 */
const FILE_PATTERNS: { suffix: RegExp; type: ReportFileType }[] = [
  { suffix: /_gw\.csv$/i, type: 'gateway_csv' },
  { suffix: /_nas\.csv$/i, type: 'nas_csv' },
  { suffix: /_securitygroups\.csv$/i, type: 'securitygroups_csv' },
  { suffix: /\.csv$/i, type: 'warnings_csv' },
  { suffix: /_overview\.html?$/i, type: 'overview_html' },
  { suffix: /_summary\.html?$/i, type: 'summary_html' },
  { suffix: /_inventory\.html?$/i, type: 'inventory_html' },
  { suffix: /\.html?$/i, type: 'warnings_html' },
  { suffix: /\.drawio$/i, type: 'drawio' },
  { suffix: /\.json$/i, type: 'json' },
  { suffix: /_assessment\.xlsx$/i, type: 'assessment_xlsx' },
  { suffix: /_deviceinventory\.xlsx$/i, type: 'deviceinventory_xlsx' },
  { suffix: /_consolidated\.xlsx$/i, type: 'consolidated_xlsx' },
];

/**
 * Classify selected files into a ReportFileSet.
 * Detects the account ID from the common numeric prefix in filenames.
 */
export function classifyReportFiles(files: FileList): ReportFileSet {
  const fileMap = new Map<ReportFileType, File>();
  const accountIds = new Set<string>();

  for (const file of files) {
    const name = file.name;

    // Extract account ID (leading numeric prefix)
    const idMatch = name.match(/^(\d+)/);
    if (idMatch) {
      accountIds.add(idMatch[1]);
    }

    // Classify by suffix
    for (const pattern of FILE_PATTERNS) {
      if (pattern.suffix.test(name)) {
        fileMap.set(pattern.type, file);
        break;
      }
    }
  }

  if (fileMap.size === 0) {
    throw new Error('No recognized report files found. Expected CSV, HTML, .drawio, .json, or .xlsx files.');
  }

  // Use the most common account ID (or first one found)
  const accountId = accountIds.size > 0 ? [...accountIds][0] : 'unknown';

  if (accountIds.size > 1) {
    log.warn(`Multiple account IDs detected in filenames: ${[...accountIds].join(', ')}. Using ${accountId}.`);
  }

  log.info(`Classified ${fileMap.size} files for account ${accountId}: ${[...fileMap.keys()].join(', ')}`);

  return { accountId, files: fileMap };
}

/**
 * Text-based parser dispatch table (sync parsers that take text input).
 * Order determines merge priority (later = higher priority).
 */
const TEXT_PARSER_DISPATCH: {
  type: ReportFileType;
  parse: (text: string) => ReportParserResult;
}[] = [
  { type: 'overview_html', parse: parseOverviewHtml },
  { type: 'summary_html', parse: parseSummaryHtml },
  { type: 'warnings_csv', parse: parseWarningsCsv },
  { type: 'warnings_html', parse: parseWarningsHtml },
  { type: 'securitygroups_csv', parse: parseSecurityGroupsCsv },
  { type: 'nas_csv', parse: parseNasCsv },
  { type: 'gateway_csv', parse: parseGatewayCsv },
  { type: 'drawio', parse: parseDrawio },
  { type: 'inventory_html', parse: parseInventoryHtml },
  { type: 'json', parse: parseReportJson },
];

/**
 * File-based parser dispatch table (async parsers that take File input).
 * These run after text parsers so they have higher merge priority.
 */
const FILE_PARSER_DISPATCH: {
  type: ReportFileType;
  parse: (file: File) => Promise<ReportParserResult>;
}[] = [
  { type: 'assessment_xlsx', parse: parseAssessmentXlsx },
  { type: 'deviceinventory_xlsx', parse: parseDeviceInventoryXlsx },
  { type: 'consolidated_xlsx', parse: parseConsolidatedXlsx },
];

/**
 * Parse all report files and merge into a single ImportResult.
 */
export async function parseReportFiles(fileSet: ReportFileSet): Promise<ImportResult> {
  const startTime = performance.now();
  const results: ReportParserResult[] = [];

  // Read text-based files in parallel
  const fileTexts = new Map<ReportFileType, string>();
  const readPromises: Promise<void>[] = [];

  for (const [type, file] of fileSet.files) {
    // Skip file-based parsers — they read the File directly
    const isFileBased = FILE_PARSER_DISPATCH.some(d => d.type === type);
    if (isFileBased) continue;

    readPromises.push(
      file.text().then(text => {
        fileTexts.set(type, text);
      })
    );
  }

  await Promise.all(readPromises);

  // Run text-based parsers in priority order
  for (const { type, parse } of TEXT_PARSER_DISPATCH) {
    const text = fileTexts.get(type);
    if (!text) continue;

    try {
      log.info(`Parsing ${type}...`);
      const result = parse(text);
      results.push(result);
    } catch (err) {
      log.error(`Failed to parse ${type}:`, err);
    }
  }

  // Run file-based parsers (async, higher priority)
  for (const { type, parse } of FILE_PARSER_DISPATCH) {
    const file = fileSet.files.get(type);
    if (!file) continue;

    try {
      log.info(`Parsing ${type}...`);
      const result = await parse(file);
      results.push(result);
    } catch (err) {
      log.error(`Failed to parse ${type}:`, err);
    }
  }

  if (results.length === 0) {
    throw new Error('No data could be parsed from the selected files.');
  }

  const filenames = [...fileSet.files.values()].map(f => f.name);
  const merged = mergeReportData(results, filenames.join(', '));

  const elapsed = Math.round(performance.now() - startTime);
  log.info(`Report import completed in ${elapsed}ms`);

  return merged;
}
