import { describe, it, expect } from 'vitest';
import { generateExcelExport } from './export.js';
import type { CollectedData } from './softlayer/types.js';

function makeEmptyCollectedData(): CollectedData {
  return {
    account: { id: 1, companyName: 'TestCo', email: 'a@b.com', firstName: 'A', lastName: 'B' },
    collectionTimestamp: '2024-01-01T00:00:00Z',
    collectionDurationMs: 5000,
    virtualGuests: [],
    hardware: [],
    vlans: [],
    subnets: [],
    gateways: [],
    firewalls: [],
    securityGroups: [],
    securityGroupRules: [],
    loadBalancers: [],
    blockStorage: [],
    fileStorage: [],
    objectStorage: [],
    sslCertificates: [],
    sshKeys: [],
    domains: [],
    dnsRecords: [],
    imageTemplates: [],
    placementGroups: [],
    reservedCapacity: [],
    dedicatedHosts: [],
    vpnTunnels: [],
    billingItems: [],
    users: [],
    eventLog: [],
    relationships: [],
    errors: [],
  };
}

describe('generateExcelExport', () => {
  it('creates a workbook with expected worksheets', async () => {
    const data = makeEmptyCollectedData();
    const workbook = await generateExcelExport(data, 'TestCo');

    const names = workbook.worksheets.map((ws) => ws.name);
    expect(names).toContain('Summary');
    expect(names).toContain('vVirtualServers');
    expect(names).toContain('vBareMetal');
    expect(names).toContain('vVLANs');
    expect(names).toContain('vSubnets');
    expect(names).toContain('vRelationships');
  });

  it('worksheet names follow v-prefix convention', async () => {
    const data = makeEmptyCollectedData();
    const workbook = await generateExcelExport(data, 'TestCo');

    const names = workbook.worksheets.map((ws) => ws.name);
    // All names except Summary should start with 'v'
    const nonSummary = names.filter((n) => n !== 'Summary');
    expect(nonSummary.every((n) => n.startsWith('v'))).toBe(true);
  });

  it('includes account info in the summary sheet', async () => {
    const data = makeEmptyCollectedData();
    const workbook = await generateExcelExport(data, 'TestCo');

    const summary = workbook.getWorksheet('Summary');
    expect(summary).toBeDefined();
    // Row 1 is header, Row 2 is first data row (Account Name)
    const accountNameCell = summary!.getCell('B2').value;
    expect(accountNameCell).toBe('TestCo');
  });

  it('populates data rows correctly', async () => {
    const data = makeEmptyCollectedData();
    data.virtualGuests = [
      {
        id: 1,
        hostname: 'web1',
        domain: 'test.com',
        fullyQualifiedDomainName: 'web1.test.com',
        primaryIpAddress: '10.0.0.1',
        primaryBackendIpAddress: '10.0.0.2',
        maxCpu: 4,
        maxMemory: 4096,
        datacenter: { name: 'dal13' },
      } as Record<string, unknown>,
    ];

    const workbook = await generateExcelExport(data, 'TestCo');
    const ws = workbook.getWorksheet('vVirtualServers');
    expect(ws).toBeDefined();
    // Row 1 = header, Row 2 = first data
    const idCell = ws!.getCell('A2').value;
    expect(idCell).toBe(1);
  });

  it('handles empty arrays gracefully', async () => {
    const data = makeEmptyCollectedData();
    const workbook = await generateExcelExport(data, 'EmptyAccount');

    // Should still create all worksheets even with no data
    expect(workbook.worksheets.length).toBeGreaterThan(10);
  });
});
