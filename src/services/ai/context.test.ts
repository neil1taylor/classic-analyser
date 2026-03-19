import { describe, it, expect } from 'vitest';
import { buildInfrastructureSummary } from './context';

describe('buildInfrastructureSummary', () => {
  it('returns totalResources count across all domains', () => {
    const classic = { virtualServers: [{ id: 1 }, { id: 2 }], vlans: [{ id: 3 }] };
    const vpc = { instances: [{ id: 'a' }] };
    const summary = buildInfrastructureSummary(classic, vpc);
    expect(summary.totalResources).toBe(4);
  });

  it('includes classic domain summary when provided', () => {
    const classic = { virtualServers: [{ id: 1 }] };
    const summary = buildInfrastructureSummary(classic);
    expect(summary.classic).toBeDefined();
    const classicSummary = summary.classic as Record<string, unknown>;
    expect(classicSummary.domain).toBe('classic');
    expect(classicSummary.totalResources).toBe(1);
  });

  it('includes vpc domain summary when provided', () => {
    const vpc = { instances: [{ id: 'a' }, { id: 'b' }] };
    const summary = buildInfrastructureSummary(undefined, vpc);
    expect(summary.vpc).toBeDefined();
    expect(summary.classic).toBeUndefined();
  });

  it('includes powervs domain summary when provided', () => {
    const pvs = { pvsInstances: [{ id: 'p1' }] };
    const summary = buildInfrastructureSummary(undefined, undefined, pvs);
    expect(summary.powerVs).toBeDefined();
    const pvsSummary = summary.powerVs as Record<string, unknown>;
    expect(pvsSummary.domain).toBe('powervs');
  });

  it('categorizes resources correctly', () => {
    const classic = {
      virtualServers: [{ id: 1 }],
      vlans: [{ id: 2 }, { id: 3 }],
      blockStorage: [{ id: 4 }],
    };
    const summary = buildInfrastructureSummary(classic);
    const classicSummary = summary.classic as Record<string, unknown>;
    const categories = classicSummary.categories as Record<string, number>;
    expect(categories.compute).toBe(1);
    expect(categories.network).toBe(2);
    expect(categories.storage).toBe(1);
  });

  it('extracts location distribution', () => {
    const vpc = {
      instances: [
        { id: 'a', _region: 'us-south' },
        { id: 'b', _region: 'us-south' },
        { id: 'c', _region: 'eu-de' },
      ],
    };
    const summary = buildInfrastructureSummary(undefined, vpc);
    const vpcSummary = summary.vpc as Record<string, unknown>;
    const locations = vpcSummary.locationDistribution as Record<string, number>;
    expect(locations['us-south']).toBe(2);
    expect(locations['eu-de']).toBe(1);
  });

  it('does not include sensitive data like IPs or keys', () => {
    const classic = {
      virtualServers: [
        { id: 1, primaryIpAddress: '10.0.0.1', apiKey: 'secret123' },
      ],
    };
    const summary = buildInfrastructureSummary(classic);
    const json = JSON.stringify(summary);
    expect(json).not.toContain('10.0.0.1');
    expect(json).not.toContain('secret123');
  });

  it('returns empty summary with zero total when no data provided', () => {
    const summary = buildInfrastructureSummary();
    expect(summary.totalResources).toBe(0);
    expect(summary.classic).toBeUndefined();
    expect(summary.vpc).toBeUndefined();
    expect(summary.powerVs).toBeUndefined();
  });
});
