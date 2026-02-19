import { describe, it, expect, vi } from 'vitest';

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

vi.mock('exceljs', () => {
  class MockWorksheet {
    name: string;
    private rows: { value: unknown }[][];

    constructor(name: string, rows: { value: unknown }[][]) {
      this.name = name;
      this.rows = rows;
    }

    getRow(rowNumber: number) {
      const row = this.rows[rowNumber - 1] || [];
      return {
        eachCell: (fn: (cell: { value: unknown }, colNumber: number) => void) => {
          row.forEach((cell, i) => fn(cell, i + 1));
        },
        getCell: (colNumber: number) => row[colNumber - 1] || { value: null },
      };
    }

    eachRow(fn: (row: ReturnType<MockWorksheet['getRow']>, rowNumber: number) => void) {
      this.rows.forEach((_, i) => fn(this.getRow(i + 1), i + 1));
    }
  }

  class MockWorkbook {
    private sheets: MockWorksheet[] = [];

    constructor() {
      this.sheets.push(
        new MockWorksheet('vVirtualServers', [
          [{ value: 'ID' }, { value: 'Hostname' }],
          [{ value: 1 }, { value: 'web1' }],
          [{ value: 2 }, { value: 'web2' }],
        ]),
        new MockWorksheet('vVLANs', [
          [{ value: 'ID' }, { value: 'VLAN Number' }],
          [{ value: 10 }, { value: 500 }],
        ]),
        new MockWorksheet('Summary', [
          [{ value: 'Property' }, { value: 'Value' }],
        ]),
      );
    }

    eachSheet(fn: (ws: MockWorksheet) => void) {
      this.sheets.forEach(fn);
    }

    get xlsx() {
      return {
        load: async () => {},
      };
    }
  }

  return {
    default: {
      Workbook: vi.fn().mockImplementation(() => new MockWorkbook()),
    },
  };
});

import { parseImportedXlsx } from './import';

describe('parseImportedXlsx', () => {
  function createMockFile(name: string): File {
    const file = new File(['dummy'], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    // Mock arrayBuffer since jsdom File doesn't always support it
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(0));
    return file;
  }

  it('parses worksheets and maps to resource keys', async () => {
    const file = createMockFile('export.xlsx');
    const result = await parseImportedXlsx(file);

    expect(result.filename).toBe('export.xlsx');
    expect(result.worksheets).toContain('vVirtualServers');
    expect(result.worksheets).toContain('vVLANs');
    expect(result.worksheets).not.toContain('Summary');
  });

  it('extracts row counts per resource', async () => {
    const file = createMockFile('export.xlsx');
    const result = await parseImportedXlsx(file);

    expect(result.rowCounts.virtualServers).toBe(2);
    expect(result.rowCounts.vlans).toBe(1);
  });

  it('maps worksheet data to correct resource keys', async () => {
    const file = createMockFile('export.xlsx');
    const result = await parseImportedXlsx(file);

    expect(result.data.virtualServers).toBeDefined();
    expect(result.data.virtualServers).toHaveLength(2);
    expect(result.data.vlans).toBeDefined();
    expect(result.data.vlans).toHaveLength(1);

    // Verify header→field mapping: 'ID' header maps to 'id' field, 'Hostname' maps to 'hostname'
    const vsi = result.data.virtualServers[0] as Record<string, unknown>;
    expect(vsi.id).toBe(1);
    expect(vsi.hostname).toBe('web1');

    // Verify VLAN header→field: 'VLAN Number' maps to 'vlanNumber'
    const vlan = result.data.vlans[0] as Record<string, unknown>;
    expect(vlan.id).toBe(10);
    expect(vlan.vlanNumber).toBe(500);
  });
});
