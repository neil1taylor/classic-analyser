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

// ── net-bandwidth-egress-risk check ──────────────────────────────────────

describe('net-bandwidth-egress-risk check', () => {
  it('flags bare metal with any public egress as warning', () => {
    const bm = { id: 1, hostname: 'bm-1', publicBandwidthAvgOutGb: 500 };
    const results = runNetworkChecks(emptyCollectedData({ bareMetal: [bm] }));
    const check = findCheck(results, 'net-bandwidth-egress-risk');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('warning');
    expect(check!.affectedCount).toBe(1);
    expect(check!.affectedResources[0].detail).toContain('500');
  });

  it('flags bare metal with low egress (still a new cost on VPC)', () => {
    const bm = { id: 2, hostname: 'bm-2', publicBandwidthAvgOutGb: 10 };
    const results = runNetworkChecks(emptyCollectedData({ bareMetal: [bm] }));
    const check = findCheck(results, 'net-bandwidth-egress-risk');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('warning');
    expect(check!.affectedCount).toBe(1);
  });

  it('does not flag bare metal with zero egress', () => {
    const bm = { id: 3, hostname: 'bm-3', publicBandwidthAvgOutGb: 0 };
    const results = runNetworkChecks(emptyCollectedData({ bareMetal: [bm] }));
    const check = findCheck(results, 'net-bandwidth-egress-risk');

    expect(check).toBeDefined();
    expect(check!.affectedResources.find(r => r.id === 3)).toBeUndefined();
  });

  it('does not flag VSI with egress under 250 GB', () => {
    const vsi = { id: 4, hostname: 'vsi-1', publicBandwidthAvgOutGb: 100 };
    const results = runNetworkChecks(emptyCollectedData({ virtualServers: [vsi] }));
    const check = findCheck(results, 'net-bandwidth-egress-risk');

    expect(check).toBeDefined();
    expect(check!.affectedResources.find(r => r.id === 4)).toBeUndefined();
  });

  it('flags VSI with egress over 250 GB as info-level detail', () => {
    const vsi = { id: 5, hostname: 'vsi-2', publicBandwidthAvgOutGb: 800 };
    const results = runNetworkChecks(emptyCollectedData({ virtualServers: [vsi] }));
    const check = findCheck(results, 'net-bandwidth-egress-risk');

    expect(check).toBeDefined();
    expect(check!.affectedCount).toBeGreaterThanOrEqual(1);
    expect(check!.affectedResources[0].detail).toContain('800');
  });

  it('does not flag devices without bandwidth data', () => {
    const bm = { id: 6, hostname: 'bm-no-bw' };
    const vsi = { id: 7, hostname: 'vsi-no-bw' };
    const results = runNetworkChecks(emptyCollectedData({ bareMetal: [bm], virtualServers: [vsi] }));
    const check = findCheck(results, 'net-bandwidth-egress-risk');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('passed');
    expect(check!.affectedCount).toBe(0);
  });

  it('includes estimated monthly VPC cost for bare metal egress', () => {
    const bm = { id: 8, hostname: 'bm-heavy', publicBandwidthAvgOutGb: 5000 };
    const results = runNetworkChecks(emptyCollectedData({ bareMetal: [bm] }));
    const check = findCheck(results, 'net-bandwidth-egress-risk');

    expect(check).toBeDefined();
    expect(check!.affectedResources[0].detail).toContain('$');
  });
});

// ── net-bandwidth-pool check ────────────────────────────────────────────

describe('net-bandwidth-pool check', () => {
  it('flags when bandwidth pools exist', () => {
    const pool1 = { poolId: 100, poolName: 'NA Pool', totalAllocatedGb: 20000, billingCycleUsageGb: 5000, deviceId: 1 };
    const pool2 = { poolId: 100, poolName: 'NA Pool', totalAllocatedGb: 20000, billingCycleUsageGb: 5000, deviceId: 2 };
    const results = runNetworkChecks(emptyCollectedData({ bandwidthPooling: [pool1, pool2] }));
    const check = findCheck(results, 'net-bandwidth-pool');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('info');
    expect(check!.affectedCount).toBeGreaterThanOrEqual(1);
    expect(check!.affectedResources[0].detail).toContain('NA Pool');
  });

  it('passes when no bandwidth pools exist', () => {
    const results = runNetworkChecks(emptyCollectedData());
    const check = findCheck(results, 'net-bandwidth-pool');

    expect(check).toBeDefined();
    expect(check!.severity).toBe('passed');
    expect(check!.affectedCount).toBe(0);
  });

  it('groups multiple pool records by poolId', () => {
    const records = [
      { poolId: 100, poolName: 'Pool A', totalAllocatedGb: 10000, billingCycleUsageGb: 3000, deviceId: 1 },
      { poolId: 100, poolName: 'Pool A', totalAllocatedGb: 10000, billingCycleUsageGb: 3000, deviceId: 2 },
      { poolId: 200, poolName: 'Pool B', totalAllocatedGb: 5000, billingCycleUsageGb: 1000, deviceId: 3 },
    ];
    const results = runNetworkChecks(emptyCollectedData({ bandwidthPooling: records }));
    const check = findCheck(results, 'net-bandwidth-pool');

    expect(check).toBeDefined();
    expect(check!.affectedCount).toBe(2); // 2 distinct pools
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
