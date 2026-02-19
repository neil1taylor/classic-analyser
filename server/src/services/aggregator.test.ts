import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';

// Create a stable mock client instance that persists across tests
const stableMockClient = {
  request: vi.fn().mockResolvedValue({
    id: 1, companyName: 'Test', email: 'a@b.com', firstName: 'A', lastName: 'B',
  }),
  requestAllPages: vi.fn().mockResolvedValue([]),
  onPageProgress: undefined as unknown,
};

vi.mock('./softlayer/client.js', () => ({
  SoftLayerClient: vi.fn().mockImplementation(function () {
    return stableMockClient;
  }),
}));

vi.mock('./softlayer/compute.js', () => ({
  getVirtualGuests: vi.fn().mockResolvedValue([]),
  getVirtualGuestsShallow: vi.fn().mockResolvedValue([]),
  getHardware: vi.fn().mockResolvedValue([]),
  getHardwareShallow: vi.fn().mockResolvedValue([]),
  getDedicatedHosts: vi.fn().mockResolvedValue([]),
  getPlacementGroups: vi.fn().mockResolvedValue([]),
  getReservedCapacityGroups: vi.fn().mockResolvedValue([]),
  getBlockDeviceTemplateGroups: vi.fn().mockResolvedValue([]),
  getBlockDeviceTemplateGroupsShallow: vi.fn().mockResolvedValue([]),
}));

vi.mock('./softlayer/network.js', () => ({
  getNetworkVlans: vi.fn().mockResolvedValue([]),
  getNetworkVlansShallow: vi.fn().mockResolvedValue([]),
  getSubnets: vi.fn().mockResolvedValue([]),
  getSubnetsShallow: vi.fn().mockResolvedValue([]),
  getNetworkGateways: vi.fn().mockResolvedValue([]),
  getNetworkGatewaysShallow: vi.fn().mockResolvedValue([]),
  getNetworkVlanFirewalls: vi.fn().mockResolvedValue([]),
  getNetworkVlanFirewallsShallow: vi.fn().mockResolvedValue([]),
  getSecurityGroups: vi.fn().mockResolvedValue([]),
  getSecurityGroupsShallow: vi.fn().mockResolvedValue([]),
  getAdcLoadBalancers: vi.fn().mockResolvedValue([]),
  getAdcLoadBalancersShallow: vi.fn().mockResolvedValue([]),
  getNetworkTunnelContexts: vi.fn().mockResolvedValue([]),
  flattenSecurityGroupRules: vi.fn().mockReturnValue([]),
}));

vi.mock('./softlayer/storage.js', () => ({
  getIscsiNetworkStorage: vi.fn().mockResolvedValue([]),
  getIscsiNetworkStorageShallow: vi.fn().mockResolvedValue([]),
  getNasNetworkStorage: vi.fn().mockResolvedValue([]),
  getNasNetworkStorageShallow: vi.fn().mockResolvedValue([]),
  getHubNetworkStorage: vi.fn().mockResolvedValue([]),
}));

vi.mock('./softlayer/security.js', () => ({
  getSecurityCertificates: vi.fn().mockResolvedValue([]),
  getSshKeys: vi.fn().mockResolvedValue([]),
}));

vi.mock('./softlayer/dns.js', () => ({
  getDomains: vi.fn().mockResolvedValue([]),
  getDomainsShallow: vi.fn().mockResolvedValue([]),
  flattenDNSRecords: vi.fn().mockReturnValue([]),
}));

vi.mock('./softlayer/account.js', () => ({
  getUsers: vi.fn().mockResolvedValue([]),
  getAllBillingItems: vi.fn().mockResolvedValue([]),
  getEventLog: vi.fn().mockResolvedValue([]),
}));

vi.mock('./relationships.js', () => ({
  buildRelationships: vi.fn().mockReturnValue([]),
}));

import { collectAllData } from './aggregator.js';

describe('collectAllData', () => {
  let written: string[];
  let mockRes: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    written = [];
    mockRes = {
      write: vi.fn((data: string) => { written.push(data); }),
      end: vi.fn(),
    };
    stableMockClient.request.mockResolvedValue({
      id: 1, companyName: 'Test', email: 'a@b.com', firstName: 'A', lastName: 'B',
    });
    stableMockClient.requestAllPages.mockResolvedValue([]);
  });

  it('sends SSE progress events during collection', async () => {
    await collectAllData('test-key', mockRes as unknown as Response);

    expect(mockRes.write).toHaveBeenCalled();
    const progressEvents = written.filter((w) => w.includes('event: progress'));
    expect(progressEvents.length).toBeGreaterThan(0);
  });

  it('sends complete event at end', async () => {
    await collectAllData('test-key', mockRes as unknown as Response);

    const completeEvents = written.filter((w) => w.includes('event: complete'));
    expect(completeEvents.length).toBe(1);
  });

  it('respects abort signal', async () => {
    const abortSignal = { aborted: true };
    await collectAllData('test-key', mockRes as unknown as Response, abortSignal);

    const completeEvents = written.filter((w) => w.includes('event: complete'));
    expect(completeEvents.length).toBe(0);
  });

  it('sends data events for resources', async () => {
    await collectAllData('test-key', mockRes as unknown as Response);

    const dataEvents = written.filter((w) => w.includes('event: data'));
    expect(dataEvents.length).toBeGreaterThan(0);
  });

  it('uses two-phase collection (shallow + deep)', async () => {
    await collectAllData('test-key', mockRes as unknown as Response);

    const dataLines = written
      .filter((w) => w.startsWith('data:'))
      .map((w) => {
        try { return JSON.parse(w.replace('data: ', '')); } catch { return null; }
      })
      .filter(Boolean);

    const phases = dataLines.map((d) => d.phase).filter(Boolean);
    const uniquePhases = [...new Set(phases)];
    expect(uniquePhases).toContain('Shallow Scan');
    expect(uniquePhases).toContain('Deep Scan');
  });
});
