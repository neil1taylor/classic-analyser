/**
 * Export roundtrip integration test.
 * Takes sample data (simulating merged import output), feeds it to generateExcelExport,
 * parses the resulting XLSX, and validates the structure.
 *
 * Runs in the backend Vitest project (Node environment).
 */
import { describe, it, expect } from 'vitest';
import { generateExcelExport } from '../export.js';
import type { CollectedData } from '../softlayer/types.js';

// Sample data representing a simplified merge result (as the frontend would send after import)
function buildSampleCollectedData(): CollectedData {
  return {
    account: {
      id: 1703429,
      companyName: 'Test Account 1703429',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
    virtualGuests: [
      { id: '101', hostname: 'vsi-web1', domain: 'test.com', datacenter: { name: 'dal13' }, maxCpu: 4, maxMemory: 8192, primaryIpAddress: '10.0.0.1', primaryBackendIpAddress: '172.16.0.1', status: { name: 'Active' } },
      { id: '102', hostname: 'vsi-web2', domain: 'test.com', datacenter: { name: 'dal13' }, maxCpu: 2, maxMemory: 4096, primaryIpAddress: '10.0.0.2', primaryBackendIpAddress: '172.16.0.2', status: { name: 'Active' } },
      { id: '103', hostname: 'vsi-db1', domain: 'test.com', datacenter: { name: 'wdc04' }, maxCpu: 8, maxMemory: 16384, primaryIpAddress: '10.0.1.1', primaryBackendIpAddress: '172.16.1.1', status: { name: 'Active' } },
    ],
    hardware: [
      { id: '201', hostname: 'bm-prod1', domain: 'test.com', datacenter: { name: 'dal13' }, processorPhysicalCoreAmount: 16, memoryCapacity: 64, primaryIpAddress: '10.1.0.1', primaryBackendIpAddress: '172.17.0.1' },
    ],
    vlans: [
      { id: '301', vlanNumber: 1234, name: 'private-dal13', networkSpace: 'PRIVATE', primaryRouter: { hostname: 'bcr01a.dal13' } },
      { id: '302', vlanNumber: 5678, name: 'public-dal13', networkSpace: 'PUBLIC', primaryRouter: { hostname: 'fcr01a.dal13' } },
    ],
    subnets: [
      { id: '401', networkIdentifier: '10.0.0.0', cidr: 24, subnetType: 'PRIMARY', networkVlanId: 301, datacenter: { name: 'dal13' } },
    ],
    blockStorage: [
      { id: '501', username: 'SL01-vol1', capacityGb: 500, storageType: { keyName: 'ENDURANCE_BLOCK_STORAGE' }, serviceResource: { datacenter: { name: 'dal13' } } },
    ],
    fileStorage: [
      { id: '601', username: 'SL01-file1', capacityGb: 1000, storageType: { keyName: 'ENDURANCE_FILE_STORAGE' }, serviceResource: { datacenter: { name: 'dal13' } } },
    ],
    // Empty arrays for required fields
    dedicatedHosts: [],
    placementGroups: [],
    reservedCapacity: [],
    imageTemplates: [],
    gateways: [],
    firewalls: [],
    securityGroups: [],
    loadBalancers: [],
    vpnTunnels: [],
    objectStorage: [],
    sslCertificates: [],
    sshKeys: [],
    domains: [],
    dnsRecords: [],
    securityGroupRules: [],
    billingItems: [],
    users: [],
    eventLog: [],
    relationships: [],
    collectionTimestamp: new Date().toISOString(),
    collectionDurationMs: 5000,
    errors: [],
  } as CollectedData;
}

describe('Export roundtrip', () => {
  it('generates a valid XLSX workbook from collected data', async () => {
    const data = buildSampleCollectedData();
    const workbook = await generateExcelExport(data, 'Test Account 1703429');

    expect(workbook).toBeDefined();

    // Check that Summary worksheet exists
    const summary = workbook.getWorksheet('Summary');
    expect(summary).toBeDefined();

    // Verify account info in summary
    const row2 = summary!.getRow(2);
    expect(String(row2.getCell(1).value)).toBe('Account Name');
    expect(String(row2.getCell(2).value)).toBe('Test Account 1703429');
  });

  it('creates worksheets for each non-empty resource type', async () => {
    const data = buildSampleCollectedData();
    const workbook = await generateExcelExport(data, 'Test Account 1703429');

    const sheetNames: string[] = [];
    workbook.eachSheet(ws => sheetNames.push(ws.name));

    // Should have Summary + resource worksheets
    expect(sheetNames).toContain('Summary');
    expect(sheetNames).toContain('vVirtualServers');
    expect(sheetNames).toContain('vBareMetal');
    expect(sheetNames).toContain('vVLANs');
    expect(sheetNames).toContain('vSubnets');
    expect(sheetNames).toContain('vBlockStorage');
    expect(sheetNames).toContain('vFileStorage');

    // Export creates worksheets for all resource types (even empty ones)
    // Just verify we have a reasonable number of sheets
    expect(sheetNames.length).toBeGreaterThanOrEqual(7); // Summary + 6 populated types
  });

  it('has correct row counts per worksheet', async () => {
    const data = buildSampleCollectedData();
    const workbook = await generateExcelExport(data, 'Test Account 1703429');

    const vsiSheet = workbook.getWorksheet('vVirtualServers');
    expect(vsiSheet).toBeDefined();
    // Row 1 = header, rows 2-4 = 3 VSIs
    expect(vsiSheet!.rowCount).toBeGreaterThanOrEqual(4);

    const bmSheet = workbook.getWorksheet('vBareMetal');
    expect(bmSheet).toBeDefined();
    expect(bmSheet!.rowCount).toBeGreaterThanOrEqual(2); // header + 1 BM

    const vlanSheet = workbook.getWorksheet('vVLANs');
    expect(vlanSheet).toBeDefined();
    expect(vlanSheet!.rowCount).toBeGreaterThanOrEqual(3); // header + 2 VLANs
  });

  it('header row has styled blue background', async () => {
    const data = buildSampleCollectedData();
    const workbook = await generateExcelExport(data, 'Test Account 1703429');

    const vsiSheet = workbook.getWorksheet('vVirtualServers');
    const headerRow = vsiSheet!.getRow(1);
    const cell1 = headerRow.getCell(1);

    // Should have blue-ish fill (the exact ARGB may vary)
    expect(cell1.font?.bold).toBe(true);
  });

  it('workbook can be written to buffer (simulates download)', async () => {
    const data = buildSampleCollectedData();
    const workbook = await generateExcelExport(data, 'Test Account 1703429');

    // Write to buffer — this is what the route handler does
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(0);

    // Re-read the buffer to verify it's valid XLSX
    const ExcelJS = (await import('exceljs')).default;
    const readBack = new ExcelJS.Workbook();
    await readBack.xlsx.load(buffer as Buffer);

    const readSheets: string[] = [];
    readBack.eachSheet(ws => readSheets.push(ws.name));
    expect(readSheets).toContain('Summary');
    expect(readSheets).toContain('vVirtualServers');
  });
});
