import { describe, it, expect } from 'vitest';
import { runNetworkChecks } from '../checks/networkChecks';
import { analyzeNetwork } from '../networkAnalysis';
import type { CheckResult } from '@/types/migration';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeGateway(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'test-gateway',
    members: [{ hardware: { id: 10, hostname: 'gw-member-1' } }],
    insideVlans: [],
    ...overrides,
  };
}

function makeInsideVlan(bypassFlag: boolean, vlanNumber = 100) {
  return {
    id: vlanNumber,
    bypassFlag,
    networkVlan: { id: vlanNumber, vlanNumber, name: `vlan-${vlanNumber}` },
  };
}

function emptyCollectedData(overrides: Record<string, unknown[]> = {}): Record<string, unknown[]> {
  return {
    firewalls: [],
    securityGroups: [],
    loadBalancers: [],
    gateways: [],
    vlans: [],
    virtualServers: [],
    bareMetal: [],
    subnets: [],
    ipsecVpn: [],
    ...overrides,
  };
}

function findCheck(results: CheckResult[], id: string): CheckResult | undefined {
  return results.find((r) => r.check.id === id);
}

// ── net-gateway-vpn-only check ───────────────────────────────────────────

describe('net-gateway-vpn-only check', () => {
  it('flags gateway where all insideVlans have bypassFlag=true', () => {
    const gw = makeGateway({
      insideVlans: [
        makeInsideVlan(true, 100),
        makeInsideVlan(true, 200),
        makeInsideVlan(true, 300),
      ],
    });
    const results = runNetworkChecks(emptyCollectedData({ gateways: [gw] }));
    const check = findCheck(results, 'net-gateway-vpn-only');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('info');
    expect(check!.affectedCount).toBe(1);
    expect(check!.affectedResources[0].detail).toContain('3');
    expect(check!.affectedResources[0].detail).toContain('bypass');
  });

  it('does not flag gateway with mixed bypass/routed VLANs', () => {
    const gw = makeGateway({
      insideVlans: [
        makeInsideVlan(true, 100),
        makeInsideVlan(false, 200),
      ],
    });
    const results = runNetworkChecks(emptyCollectedData({ gateways: [gw] }));
    const check = findCheck(results, 'net-gateway-vpn-only');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('passed');
    expect(check!.affectedCount).toBe(0);
  });

  it('does not flag gateway with no insideVlans', () => {
    const gw = makeGateway({ insideVlans: [] });
    const results = runNetworkChecks(emptyCollectedData({ gateways: [gw] }));
    const check = findCheck(results, 'net-gateway-vpn-only');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('passed');
    expect(check!.affectedCount).toBe(0);
  });

  it('does not flag gateway with all bypassFlag=false', () => {
    const gw = makeGateway({
      insideVlans: [
        makeInsideVlan(false, 100),
        makeInsideVlan(false, 200),
      ],
    });
    const results = runNetworkChecks(emptyCollectedData({ gateways: [gw] }));
    const check = findCheck(results, 'net-gateway-vpn-only');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('passed');
    expect(check!.affectedCount).toBe(0);
  });

  it('flags multiple VPN-only gateways independently', () => {
    const gw1 = makeGateway({
      id: 1,
      name: 'vpn-gw-1',
      insideVlans: [makeInsideVlan(true, 100)],
    });
    const gw2 = makeGateway({
      id: 2,
      name: 'vpn-gw-2',
      insideVlans: [makeInsideVlan(true, 200), makeInsideVlan(true, 300)],
    });
    const gw3 = makeGateway({
      id: 3,
      name: 'routing-gw',
      insideVlans: [makeInsideVlan(false, 400)],
    });
    const results = runNetworkChecks(emptyCollectedData({ gateways: [gw1, gw2, gw3] }));
    const check = findCheck(results, 'net-gateway-vpn-only');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('info');
    expect(check!.affectedCount).toBe(2);
    expect(check!.totalChecked).toBe(3);
  });
});

// ── assessGateways via analyzeNetwork ────────────────────────────────────

describe('assessGateways bypass-aware logic', () => {
  const defaultPrefs = {
    targetRegion: 'us-south',
    targetZones: ['us-south-1'],
    prioritizePerformance: false,
    minimizeCost: true,
  };

  it('marks all-bypass gateway as VPN-only with VPN Gateway recommendation', () => {
    const gw = makeGateway({
      memberCount: 2,
      insideVlanCount: 2,
      insideVlans: [makeInsideVlan(true, 100), makeInsideVlan(true, 200)],
    });
    const result = analyzeNetwork(emptyCollectedData({ gateways: [gw] }), defaultPrefs);
    const assessment = result.gatewayAnalysis.assessments[0];

    expect(assessment.isVpnOnly).toBe(true);
    expect(assessment.canUseNativeVPC).toBe(true);
    expect(assessment.requiresAppliance).toBe(false);
    expect(assessment.recommendation).toContain('VPN');
  });

  it('marks mixed-bypass gateway as non-VPN-only', () => {
    const gw = makeGateway({
      memberCount: 2,
      insideVlanCount: 3,
      insideVlans: [
        makeInsideVlan(true, 100),
        makeInsideVlan(false, 200),
        makeInsideVlan(false, 300),
      ],
    });
    const result = analyzeNetwork(emptyCollectedData({ gateways: [gw] }), defaultPrefs);
    const assessment = result.gatewayAnalysis.assessments[0];

    expect(assessment.isVpnOnly).toBe(false);
  });

  it('marks gateway with no insideVlans as non-VPN-only', () => {
    const gw = makeGateway({
      memberCount: 1,
      insideVlanCount: 0,
      insideVlans: [],
    });
    const result = analyzeNetwork(emptyCollectedData({ gateways: [gw] }), defaultPrefs);
    const assessment = result.gatewayAnalysis.assessments[0];

    expect(assessment.isVpnOnly).toBe(false);
  });
});
