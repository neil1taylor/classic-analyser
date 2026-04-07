/**
 * Integration tests for the merger and full import pipeline using Account 3 (1703429) data.
 * Runs in jsdom environment (Vitest frontend project) for DOMParser support.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  ACCOUNT3_DIR,
  readTestFileText,
  readTestFileBuffer,
  createFileFromBuffer,
  createMockFileList,
} from '../../../../test/helpers/report-test-utils';

// Mock the logger (standard pattern)
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
  }),
}));

import {
  parseWarningsHtml,
  parseSummaryHtml,
  parseGatewayCsv,
  parseNasCsv,
  parseDrawio,
  parseDeviceInventoryXlsx,
  parseConsolidatedXlsx,
  mergeReportData,
} from '../index';
import type { ReportParserResult } from '../types';
import { classifyReportFiles, parseReportFiles } from '@/services/report-import';

// ── Helper: parse all Account 3 files ──

async function parseAllAccount3Files(): Promise<ReportParserResult[]> {
  const results: ReportParserResult[] = [];

  // Text-based parsers (in merge priority order from report-import.ts)
  results.push(parseSummaryHtml(readTestFileText(ACCOUNT3_DIR, '1703429_summary.html')));
  results.push(parseWarningsHtml(readTestFileText(ACCOUNT3_DIR, '1703429.html')));
  results.push(parseNasCsv(readTestFileText(ACCOUNT3_DIR, '1703429_nas.csv')));
  results.push(parseGatewayCsv(readTestFileText(ACCOUNT3_DIR, '1703429_gw.csv')));
  results.push(parseDrawio(readTestFileText(ACCOUNT3_DIR, '1703429.drawio')));

  // XLSX-based parsers (higher priority)
  const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const deviceInvFile = createFileFromBuffer(
    readTestFileBuffer(ACCOUNT3_DIR, '1703429_deviceinventory.xlsx'),
    '1703429_deviceinventory.xlsx', xlsxMime
  );
  results.push(await parseDeviceInventoryXlsx(deviceInvFile));

  const consolidatedFile = createFileFromBuffer(
    readTestFileBuffer(ACCOUNT3_DIR, '1703429_consolidated.xlsx'),
    '1703429_consolidated.xlsx', xlsxMime
  );
  results.push(await parseConsolidatedXlsx(consolidatedFile));

  return results;
}

describe('Account 3 (1703429) — Merger', () => {
  it('merges all parser results into a single dataset', async () => {
    const results = await parseAllAccount3Files();
    const filenames = [
      '1703429_summary.html', '1703429.html', '1703429_nas.csv',
      '1703429_gw.csv', '1703429.drawio',
      '1703429_deviceinventory.xlsx', '1703429_consolidated.xlsx',
    ].join(', ');

    const merged = mergeReportData(results, filenames);

    // Should have data
    expect(Object.keys(merged.data).length).toBeGreaterThan(0);
    expect(merged.worksheets.length).toBeGreaterThan(0);
    expect(merged.filename).toBe(filenames);

    // Row counts should match data arrays
    for (const key of merged.worksheets) {
      if (key === '_topology') continue;
      expect(merged.rowCounts[key]).toBe(merged.data[key].length);
    }

    // Total records should be substantial for a real account
    const totalRecords = Object.values(merged.rowCounts).reduce((a, b) => a + b, 0);
    expect(totalRecords).toBeGreaterThan(10);
  });

  it('deduplicates resources by id', async () => {
    const results = await parseAllAccount3Files();
    const merged = mergeReportData(results, 'test');

    // Check a resource type that appears in multiple sources (e.g., virtualServers)
    if (merged.data.virtualServers) {
      const ids = (merged.data.virtualServers as Record<string, unknown>[])
        .map(r => r.id)
        .filter(Boolean);
      const uniqueIds = new Set(ids);
      // No duplicate IDs after merge
      expect(ids.length).toBe(uniqueIds.size);
    }

    if (merged.data.bareMetal) {
      const ids = (merged.data.bareMetal as Record<string, unknown>[])
        .map(r => r.id)
        .filter(Boolean);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    }
  });

  it('includes topology data from drawio', async () => {
    const results = await parseAllAccount3Files();
    const merged = mergeReportData(results, 'test');

    // Topology is stored as _topology key
    if (merged.data._topology) {
      expect(merged.data._topology.length).toBeGreaterThan(0);
    }
  });

  it('produces consistent snapshot of resource counts', async () => {
    const results = await parseAllAccount3Files();
    const merged = mergeReportData(results, 'test');

    // Snapshot the resource counts for regression detection
    expect(merged.rowCounts).toMatchSnapshot();
  });
});

describe('Account 3 (1703429) — classifyReportFiles', () => {
  it('classifies Account 3 files correctly', () => {
    const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const files = [
      new File([''], '1703429.html', { type: 'text/html' }),
      new File([''], '1703429_summary.html', { type: 'text/html' }),
      new File([''], '1703429_gw.csv', { type: 'text/csv' }),
      new File([''], '1703429_nas.csv', { type: 'text/csv' }),
      new File([''], '1703429.drawio', { type: 'application/xml' }),
      new File([''], '1703429_deviceinventory.xlsx', { type: xlsxMime }),
      new File([''], '1703429_consolidated.xlsx', { type: xlsxMime }),
    ];

    const fileList = createMockFileList(files);
    const result = classifyReportFiles(fileList);

    expect(result.accountId).toBe('1703429');
    expect(result.files.size).toBe(7);
    expect(result.files.has('warnings_html')).toBe(true);
    expect(result.files.has('summary_html')).toBe(true);
    expect(result.files.has('gateway_csv')).toBe(true);
    expect(result.files.has('nas_csv')).toBe(true);
    expect(result.files.has('drawio')).toBe(true);
    expect(result.files.has('deviceinventory_xlsx')).toBe(true);
    expect(result.files.has('consolidated_xlsx')).toBe(true);
  });
});

describe('Account 3 (1703429) — Full Pipeline (parseReportFiles)', () => {
  it('runs the full classify → parse → merge pipeline', async () => {
    const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    // Build File objects with real content
    const files = [
      createFileFromBuffer(
        readTestFileBuffer(ACCOUNT3_DIR, '1703429.html'),
        '1703429.html', 'text/html'
      ),
      createFileFromBuffer(
        readTestFileBuffer(ACCOUNT3_DIR, '1703429_summary.html'),
        '1703429_summary.html', 'text/html'
      ),
      createFileFromBuffer(
        readTestFileBuffer(ACCOUNT3_DIR, '1703429_gw.csv'),
        '1703429_gw.csv', 'text/csv'
      ),
      createFileFromBuffer(
        readTestFileBuffer(ACCOUNT3_DIR, '1703429_nas.csv'),
        '1703429_nas.csv', 'text/csv'
      ),
      createFileFromBuffer(
        readTestFileBuffer(ACCOUNT3_DIR, '1703429.drawio'),
        '1703429.drawio', 'application/xml'
      ),
      createFileFromBuffer(
        readTestFileBuffer(ACCOUNT3_DIR, '1703429_deviceinventory.xlsx'),
        '1703429_deviceinventory.xlsx', xlsxMime
      ),
      createFileFromBuffer(
        readTestFileBuffer(ACCOUNT3_DIR, '1703429_consolidated.xlsx'),
        '1703429_consolidated.xlsx', xlsxMime
      ),
    ];

    // Also need to polyfill text() for text-based files in jsdom
    for (const file of files) {
      if (typeof file.text !== 'function') {
        const content = readTestFileText(ACCOUNT3_DIR, file.name);
        file.text = () => Promise.resolve(content);
      }
    }

    const fileList = createMockFileList(files);
    const fileSet = classifyReportFiles(fileList);

    expect(fileSet.accountId).toBe('1703429');

    const result = await parseReportFiles(fileSet);

    expect(result.data).toBeDefined();
    expect(Object.keys(result.data).length).toBeGreaterThan(0);
    expect(result.worksheets.length).toBeGreaterThan(0);

    // Total records should be substantial
    const totalRecords = Object.values(result.rowCounts).reduce((a, b) => a + b, 0);
    expect(totalRecords).toBeGreaterThan(10);
  });
});
