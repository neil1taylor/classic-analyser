import { describe, it, expect } from 'vitest';
import { getResourceType, getResourcesByCategory, RESOURCE_TYPES, CATEGORIES } from './resources';

describe('getResourceType', () => {
  it('returns resource type for valid key', () => {
    const result = getResourceType('virtualServers');
    expect(result).toBeDefined();
    expect(result!.key).toBe('virtualServers');
    expect(result!.label).toBe('Virtual Servers');
    expect(result!.category).toBe('Compute');
  });

  it('returns undefined for unknown key', () => {
    expect(getResourceType('nonexistent')).toBeUndefined();
  });

  it('returns resource with columns array', () => {
    const result = getResourceType('vlans');
    expect(result).toBeDefined();
    expect(result!.columns.length).toBeGreaterThan(0);
    expect(result!.columns[0]).toHaveProperty('field');
    expect(result!.columns[0]).toHaveProperty('header');
    expect(result!.columns[0]).toHaveProperty('dataType');
  });

  it('finds all expected resource types', () => {
    const expectedKeys = [
      'virtualServers', 'bareMetal', 'vlans', 'subnets', 'gateways',
      'firewalls', 'securityGroups', 'loadBalancers', 'blockStorage',
      'fileStorage', 'objectStorage', 'sslCertificates', 'sshKeys',
      'dnsDomains', 'dnsRecords', 'billingItems', 'users', 'eventLog',
    ];

    for (const key of expectedKeys) {
      expect(getResourceType(key)).toBeDefined();
    }
  });
});

describe('getResourcesByCategory', () => {
  it('returns Compute resources', () => {
    const result = getResourcesByCategory('Compute');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.category === 'Compute')).toBe(true);
  });

  it('returns Network resources', () => {
    const result = getResourcesByCategory('Network');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.category === 'Network')).toBe(true);
  });

  it('returns Storage resources', () => {
    const result = getResourcesByCategory('Storage');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns Security resources', () => {
    const result = getResourcesByCategory('Security');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns DNS resources', () => {
    const result = getResourcesByCategory('DNS');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for unknown category', () => {
    const result = getResourcesByCategory('Nonexistent' as 'Compute');
    expect(result).toEqual([]);
  });
});

describe('RESOURCE_TYPES', () => {
  it('has worksheetName for each type', () => {
    for (const rt of RESOURCE_TYPES) {
      expect(rt.worksheetName).toBeTruthy();
      expect(rt.worksheetName.startsWith('v')).toBe(true);
    }
  });

  it('has unique keys', () => {
    const keys = RESOURCE_TYPES.map((rt) => rt.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has unique worksheet names', () => {
    const names = RESOURCE_TYPES.map((rt) => rt.worksheetName);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('CATEGORIES', () => {
  it('contains all expected categories', () => {
    expect(CATEGORIES).toContain('Compute');
    expect(CATEGORIES).toContain('Network');
    expect(CATEGORIES).toContain('Storage');
    expect(CATEGORIES).toContain('Security');
    expect(CATEGORIES).toContain('DNS');
    expect(CATEGORIES).toContain('Other');
  });
});
