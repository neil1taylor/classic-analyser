import { describe, it, expect } from 'vitest';
import { getResourceTypesForDomain, getDomainLabel, buildSummaryRows, formatCellValue } from './utils';
import type { ExportData } from './types';

describe('getResourceTypesForDomain', () => {
  it('returns classic resource types', () => {
    const types = getResourceTypesForDomain('classic');
    expect(types.length).toBeGreaterThan(0);
    expect(types[0]).toHaveProperty('key');
    expect(types[0]).toHaveProperty('label');
    expect(types[0]).toHaveProperty('category');
  });

  it('returns vpc resource types', () => {
    const types = getResourceTypesForDomain('vpc');
    expect(types.length).toBeGreaterThan(0);
  });

  it('returns powervs resource types', () => {
    const types = getResourceTypesForDomain('powervs');
    expect(types.length).toBeGreaterThan(0);
  });
});

describe('getDomainLabel', () => {
  it('returns correct labels', () => {
    expect(getDomainLabel('classic')).toBe('Classic Infrastructure');
    expect(getDomainLabel('vpc')).toBe('VPC Infrastructure');
    expect(getDomainLabel('powervs')).toBe('PowerVS Infrastructure');
  });
});

describe('buildSummaryRows', () => {
  it('builds rows for resources with data', () => {
    const exportData: ExportData = {
      data: { virtualServers: [{ id: 1 }, { id: 2 }], vlans: [{ id: 3 }] },
      accountName: 'test',
      domain: 'classic',
      timestamp: new Date().toISOString(),
    };
    const rows = buildSummaryRows(exportData);
    const vsRow = rows.find(r => r.key === 'virtualServers');
    expect(vsRow).toBeDefined();
    expect(vsRow!.count).toBe(2);
  });

  it('excludes empty resources', () => {
    const exportData: ExportData = {
      data: { virtualServers: [], vlans: [{ id: 1 }] },
      accountName: 'test',
      domain: 'classic',
      timestamp: new Date().toISOString(),
    };
    const rows = buildSummaryRows(exportData);
    expect(rows.find(r => r.key === 'virtualServers')).toBeUndefined();
  });

  it('returns empty array when no data', () => {
    const exportData: ExportData = {
      data: {},
      accountName: 'test',
      domain: 'classic',
      timestamp: new Date().toISOString(),
    };
    const rows = buildSummaryRows(exportData);
    expect(rows).toEqual([]);
  });
});

describe('formatCellValue', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatCellValue(null, 'string')).toBe('');
    expect(formatCellValue(undefined, 'string')).toBe('');
  });

  it('formats booleans', () => {
    expect(formatCellValue(true, 'boolean')).toBe('Yes');
    expect(formatCellValue(false, 'boolean')).toBe('No');
  });

  it('formats currency', () => {
    expect(formatCellValue(123.456, 'currency')).toBe('$123.46');
    expect(formatCellValue('not a number', 'currency')).toBe('not a number');
  });

  it('formats bytes', () => {
    expect(formatCellValue(1073741824, 'bytes')).toBe('1.0 GB');
    expect(formatCellValue(1048576, 'bytes')).toBe('1.0 MB');
    expect(formatCellValue(1024, 'bytes')).toBe('1.0 KB');
    expect(formatCellValue(512, 'bytes')).toBe('512 B');
  });

  it('formats arrays', () => {
    expect(formatCellValue(['a', 'b', 'c'], 'array')).toBe('a, b, c');
  });

  it('formats dates', () => {
    const result = formatCellValue('2024-01-15T00:00:00Z', 'date');
    expect(result).toContain('2024');
  });

  it('falls back to String() for unknown types', () => {
    expect(formatCellValue(42, 'unknown')).toBe('42');
  });
});
