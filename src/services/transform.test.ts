import { describe, it, expect } from 'vitest';
import { mapResourceKey, transformItems } from './transform';

describe('mapResourceKey', () => {
  it('maps virtualGuests to virtualServers', () => {
    expect(mapResourceKey('virtualGuests')).toBe('virtualServers');
  });

  it('maps hardware to bareMetal', () => {
    expect(mapResourceKey('hardware')).toBe('bareMetal');
  });

  it('maps domains to dnsDomains', () => {
    expect(mapResourceKey('domains')).toBe('dnsDomains');
  });

  it('returns the key unchanged if no mapping exists', () => {
    expect(mapResourceKey('unknownResource')).toBe('unknownResource');
  });

  it('maps all known server keys', () => {
    const expectedMappings: Record<string, string> = {
      virtualGuests: 'virtualServers',
      hardware: 'bareMetal',
      vlans: 'vlans',
      subnets: 'subnets',
      gateways: 'gateways',
      firewalls: 'firewalls',
      securityGroups: 'securityGroups',
      securityGroupRules: 'securityGroupRules',
      loadBalancers: 'loadBalancers',
      blockStorage: 'blockStorage',
      fileStorage: 'fileStorage',
      objectStorage: 'objectStorage',
      sslCertificates: 'sslCertificates',
      sshKeys: 'sshKeys',
      domains: 'dnsDomains',
      dnsRecords: 'dnsRecords',
      imageTemplates: 'imageTemplates',
      placementGroups: 'placementGroups',
      reservedCapacity: 'reservedCapacity',
      dedicatedHosts: 'dedicatedHosts',
      vpnTunnels: 'vpnTunnels',
      billingItems: 'billingItems',
      users: 'users',
      eventLog: 'eventLog',
      relationships: 'relationships',
    };

    for (const [input, expected] of Object.entries(expectedMappings)) {
      expect(mapResourceKey(input)).toBe(expected);
    }
  });
});

describe('transformItems', () => {
  it('transforms virtual server items', () => {
    const raw = [{
      id: 1,
      hostname: 'web1',
      domain: 'test.com',
      fullyQualifiedDomainName: 'web1.test.com',
      primaryIpAddress: '10.0.0.1',
      primaryBackendIpAddress: '10.0.0.2',
      maxCpu: 4,
      maxMemory: 4096,
      status: { name: 'Active' },
      datacenter: { name: 'dal13' },
      operatingSystem: { softwareDescription: { name: 'Ubuntu', version: '22.04' } },
    }];

    const result = transformItems('virtualServers', raw) as Record<string, unknown>[];
    expect(result).toHaveLength(1);
    expect(result[0].hostname).toBe('web1');
    expect(result[0].fqdn).toBe('web1.test.com');
    expect(result[0].primaryIp).toBe('10.0.0.1');
    expect(result[0].datacenter).toBe('dal13');
    expect(result[0].os).toBe('Ubuntu 22.04');
  });

  it('transforms bare metal items', () => {
    const raw = [{
      id: 2,
      hostname: 'bm1',
      domain: 'test.com',
      fullyQualifiedDomainName: 'bm1.test.com',
      manufacturerSerialNumber: 'SN123',
      datacenter: { name: 'wdc04' },
    }];

    const result = transformItems('bareMetal', raw) as Record<string, unknown>[];
    expect(result[0].serialNumber).toBe('SN123');
    expect(result[0].datacenter).toBe('wdc04');
  });

  it('transforms VLAN items with nested router', () => {
    const raw = [{
      id: 3,
      vlanNumber: 500,
      name: 'prod',
      networkSpace: 'PRIVATE',
      primaryRouter: { hostname: 'bcr01.dal13', datacenter: { name: 'dal13' } },
    }];

    const result = transformItems('vlans', raw) as Record<string, unknown>[];
    expect(result[0].primaryRouter).toBe('bcr01.dal13');
    expect(result[0].datacenter).toBe('dal13');
  });

  it('returns items unchanged for unknown resource key', () => {
    const items = [{ foo: 'bar' }];
    const result = transformItems('unknownType', items);
    expect(result).toBe(items);
  });

  it('returns items unchanged for passthrough types (dnsRecords)', () => {
    const items = [{ id: 1, host: 'www', type: 'A' }];
    const result = transformItems('dnsRecords', items);
    expect(result[0]).toEqual(items[0]);
  });

  it('handles null nested values gracefully', () => {
    const raw = [{
      id: 1,
      hostname: 'test',
      status: null,
      datacenter: null,
      operatingSystem: null,
    }];

    const result = transformItems('virtualServers', raw) as Record<string, unknown>[];
    expect(result[0].datacenter).toBeNull();
    expect(result[0].os).toBe('');
  });
});
