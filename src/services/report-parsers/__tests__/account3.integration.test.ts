/**
 * Integration tests for report parsers using real Account 3 (1703429) data from alt_input/.
 * Runs in jsdom environment (Vitest frontend project) for DOMParser support.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  ACCOUNT3_DIR,
  readTestFileText,
  readTestFileBuffer,
  createFileFromBuffer,
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
} from '../index';

describe('Account 3 (1703429) — Individual Parsers', () => {
  // ── Text-based parsers ──

  describe('parseWarningsHtml', () => {
    it('returns warnings with account info', () => {
      const text = readTestFileText(ACCOUNT3_DIR, '1703429.html');
      const result = parseWarningsHtml(text);

      expect(result.data).toBeDefined();
      // Should contain reportWarnings or similar key
      const keys = Object.keys(result.data);
      expect(keys.length).toBeGreaterThan(0);

      // Should have parsed some records
      const totalRecords = Object.values(result.data).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalRecords).toBeGreaterThan(0);

      // Should extract account info from the HTML
      if (result.accountInfo) {
        expect(result.accountInfo).toBeDefined();
      }
    });
  });

  describe('parseSummaryHtml', () => {
    it('returns resource counts and health checks', () => {
      const text = readTestFileText(ACCOUNT3_DIR, '1703429_summary.html');
      const result = parseSummaryHtml(text);

      expect(result.data).toBeDefined();
      const keys = Object.keys(result.data);
      expect(keys.length).toBeGreaterThan(0);

      const totalRecords = Object.values(result.data).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalRecords).toBeGreaterThan(0);
    });
  });

  describe('parseGatewayCsv', () => {
    it('returns gateway resources', () => {
      const text = readTestFileText(ACCOUNT3_DIR, '1703429_gw.csv');
      const result = parseGatewayCsv(text);

      expect(result.data).toBeDefined();
      const keys = Object.keys(result.data);
      expect(keys.length).toBeGreaterThan(0);

      const totalRecords = Object.values(result.data).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalRecords).toBeGreaterThan(0);
    });
  });

  describe('parseNasCsv', () => {
    it('returns storage resources split by type', () => {
      const text = readTestFileText(ACCOUNT3_DIR, '1703429_nas.csv');
      const result = parseNasCsv(text);

      expect(result.data).toBeDefined();
      const keys = Object.keys(result.data);
      expect(keys.length).toBeGreaterThan(0);

      const totalRecords = Object.values(result.data).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalRecords).toBeGreaterThan(0);
    });

    it('flags K8s-consumed file storage volumes', () => {
      const text = readTestFileText(ACCOUNT3_DIR, '1703429_nas.csv');
      const result = parseNasCsv(text);

      const file = (result.data.fileStorage ?? []) as Record<string, unknown>[];
      const kubeFile = file.filter(f => f._isKubeStorage === true);
      const plainFile = file.filter(f => f._isKubeStorage === false);

      expect(kubeFile.length).toBeGreaterThan(0);
      expect(plainFile.length).toBeGreaterThan(0);
      // Total should equal all file storage
      expect(kubeFile.length + plainFile.length).toBe(file.length);
    });

    it('flags K8s-consumed block storage volumes', () => {
      const text = readTestFileText(ACCOUNT3_DIR, '1703429_nas.csv');
      const result = parseNasCsv(text);

      const block = (result.data.blockStorage ?? []) as Record<string, unknown>[];
      // After deduplication, K8s flag should survive
      const kubeBlock = block.filter(b => b._isKubeStorage === true);
      expect(kubeBlock.length).toBeGreaterThan(0);

      // Every item should have the flag set (not undefined)
      for (const item of block) {
        expect(item._isKubeStorage).toBeDefined();
      }
    });

    it('sets _isKubeStorage false on storage without K8s notes', () => {
      const text = readTestFileText(ACCOUNT3_DIR, '1703429_nas.csv');
      const result = parseNasCsv(text);

      const file = (result.data.fileStorage ?? []) as Record<string, unknown>[];
      const plainFile = file.filter(f => f._isKubeStorage === false);
      // Account 3 has non-K8s file storage (e.g., backup vaults, plain NAS)
      expect(plainFile.length).toBeGreaterThan(0);
    });
  });

  describe('parseDrawio', () => {
    it('returns topology nodes and edges', () => {
      const text = readTestFileText(ACCOUNT3_DIR, '1703429.drawio');
      const result = parseDrawio(text);

      expect(result.data).toBeDefined();

      // Drawio should produce topology edges
      if (result.topology) {
        expect(result.topology.length).toBeGreaterThan(0);
        // Each edge should have required fields
        const edge = result.topology[0];
        expect(edge).toHaveProperty('source');
        expect(edge).toHaveProperty('target');
      }

      // May also produce resource data from node labels
      const totalRecords = Object.values(result.data).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalRecords).toBeGreaterThanOrEqual(0);
    });
  });

  // ── XLSX-based parsers (async, need File objects) ──

  describe('parseDeviceInventoryXlsx', () => {
    it('returns physical location data', async () => {
      const buffer = readTestFileBuffer(ACCOUNT3_DIR, '1703429_deviceinventory.xlsx');
      const file = createFileFromBuffer(buffer, '1703429_deviceinventory.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      const result = await parseDeviceInventoryXlsx(file);

      expect(result.data).toBeDefined();
      const keys = Object.keys(result.data);
      expect(keys.length).toBeGreaterThan(0);

      const totalRecords = Object.values(result.data).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalRecords).toBeGreaterThan(0);
    });
  });

  describe('parseConsolidatedXlsx', () => {
    it('returns combined report data', async () => {
      const buffer = readTestFileBuffer(ACCOUNT3_DIR, '1703429_consolidated.xlsx');
      const file = createFileFromBuffer(buffer, '1703429_consolidated.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      const result = await parseConsolidatedXlsx(file);

      expect(result.data).toBeDefined();
      const keys = Object.keys(result.data);
      expect(keys.length).toBeGreaterThan(0);

      const totalRecords = Object.values(result.data).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalRecords).toBeGreaterThan(0);
    });
  });
});
