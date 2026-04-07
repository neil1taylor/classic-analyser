import { describe, it, expect } from 'vitest';
import { runComputeChecks } from '../checks/computeChecks';
import { runNetworkChecks } from '../checks/networkChecks';
import { runStorageChecks } from '../checks/storageChecks';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeVsi(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    hostname: 'test-vsi',
    maxCpu: 4,
    maxMemory: 8192, // 8 GB in MB
    'datacenter.name': 'dal10',
    datacenter: 'dal10',
    blockDevices: [{ capacity: 100 }],
    ...overrides,
  };
}

function makeBm(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    hostname: 'test-bm',
    processorPhysicalCoreAmount: 16,
    memoryCapacity: 256,
    'datacenter.name': 'dal10',
    datacenter: 'dal10',
    ...overrides,
  };
}

function makeVlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    vlanNumber: 100,
    name: 'test-vlan',
    datacenter: 'dal10',
    ...overrides,
  };
}

function makeSubnet(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    networkIdentifier: '10.0.0.0',
    cidr: 24,
    datacenter: 'dal10',
    ...overrides,
  };
}

function makeSg(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'test-sg',
    rules: [],
    ...overrides,
  };
}

function makeFirewall(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'test-fw',
    rules: [],
    ...overrides,
  };
}

function makeBlock(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    username: 'block-vol-1',
    capacityGb: 100,
    iops: 1000,
    datacenter: 'dal10',
    _isKubeStorage: false,
    ...overrides,
  };
}

function makeFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    username: 'file-vol-1',
    capacityGb: 50,
    datacenter: 'dal10',
    _isKubeStorage: false,
    ...overrides,
  };
}

function findCheck(results: { check: { id: string } }[], id: string) {
  return results.find(r => r.check.id === id);
}

// ── Corrected Threshold Tests ───────────────────────────────────────────

describe('Corrected thresholds', () => {
  describe('net-sg-rules (250 limit)', () => {
    it('passes when SG has 250 rules', () => {
      const rules = Array.from({ length: 250 }, (_, i) => ({ id: i }));
      const data = { securityGroups: [makeSg({ rules })] };
      const results = runNetworkChecks(data);
      const check = findCheck(results, 'net-sg-rules');
      expect(check).toBeDefined();
      expect(check!.severity).toBe('passed');
    });

    it('warns when SG has 251 rules', () => {
      const rules = Array.from({ length: 251 }, (_, i) => ({ id: i }));
      const data = { securityGroups: [makeSg({ rules })] };
      const results = runNetworkChecks(data);
      const check = findCheck(results, 'net-sg-rules');
      expect(check).toBeDefined();
      expect(check!.severity).toBe('warning');
      expect(check!.affectedCount).toBe(1);
    });

    it('passes when SG has 25 rules (previously would have warned)', () => {
      const rules = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const data = { securityGroups: [makeSg({ rules })] };
      const results = runNetworkChecks(data);
      const check = findCheck(results, 'net-sg-rules');
      expect(check!.severity).toBe('passed');
    });
  });

  describe('net-firewall-rules (200 limit)', () => {
    it('passes when firewall has 200 rules', () => {
      const rules = Array.from({ length: 200 }, (_, i) => ({ id: i }));
      const data = { firewalls: [makeFirewall({ rules })] };
      const results = runNetworkChecks(data);
      const check = findCheck(results, 'net-firewall-rules');
      expect(check!.severity).toBe('passed');
    });

    it('warns when firewall has 201 rules', () => {
      const rules = Array.from({ length: 201 }, (_, i) => ({ id: i }));
      const data = { firewalls: [makeFirewall({ rules })] };
      const results = runNetworkChecks(data);
      const check = findCheck(results, 'net-firewall-rules');
      expect(check!.severity).toBe('warning');
      expect(check!.affectedCount).toBe(1);
    });
  });

  describe('net-acl-rule-estimate (200 combined limit)', () => {
    it('passes when firewall has 200 total rules', () => {
      const rules = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        direction: i % 2 === 0 ? 'ingress' : 'egress',
      }));
      const data = { firewalls: [makeFirewall({ rules })] };
      const results = runNetworkChecks(data);
      const check = findCheck(results, 'net-acl-rule-estimate');
      expect(check!.severity).toBe('passed');
    });

    it('warns when firewall has 201 total rules', () => {
      const rules = Array.from({ length: 201 }, (_, i) => ({
        id: i,
        direction: i % 2 === 0 ? 'ingress' : 'egress',
      }));
      const data = { firewalls: [makeFirewall({ rules })] };
      const results = runNetworkChecks(data);
      const check = findCheck(results, 'net-acl-rule-estimate');
      expect(check!.severity).toBe('warning');
    });
  });
});

// ── Compute Quota Tests ─────────────────────────────────────────────────

describe('Compute quota checks', () => {
  describe('quota-vcpu-per-region', () => {
    it('passes when total vCPUs per region <= 200', () => {
      const vsis = Array.from({ length: 50 }, (_, i) =>
        makeVsi({ id: i, maxCpu: 4 }),
      ); // 50 * 4 = 200 vCPUs
      const results = runComputeChecks({ virtualServers: vsis });
      const check = findCheck(results, 'quota-vcpu-per-region');
      expect(check).toBeDefined();
      expect(check!.severity).toBe('passed');
    });

    it('warns when total vCPUs per region > 200', () => {
      const vsis = Array.from({ length: 51 }, (_, i) =>
        makeVsi({ id: i, maxCpu: 4 }),
      ); // 51 * 4 = 204 vCPUs
      const results = runComputeChecks({ virtualServers: vsis });
      const check = findCheck(results, 'quota-vcpu-per-region');
      expect(check!.severity).toBe('warning');
      expect(check!.affectedResources[0].detail).toContain('204');
    });
  });

  describe('quota-memory-per-region', () => {
    it('passes when total memory per region <= 5600 GB', () => {
      // 10 VSIs with 512 GB each = 5120 GB = 5242880 MB
      const vsis = Array.from({ length: 10 }, (_, i) =>
        makeVsi({ id: i, maxMemory: 524288 }),
      );
      const results = runComputeChecks({ virtualServers: vsis });
      const check = findCheck(results, 'quota-memory-per-region');
      expect(check!.severity).toBe('passed');
    });

    it('warns when total memory per region > 5600 GB', () => {
      // 12 VSIs with 512 GB each = 6144 GB = 6291456 MB
      const vsis = Array.from({ length: 12 }, (_, i) =>
        makeVsi({ id: i, maxMemory: 524288 }),
      );
      const results = runComputeChecks({ virtualServers: vsis });
      const check = findCheck(results, 'quota-memory-per-region');
      expect(check!.severity).toBe('warning');
    });
  });

  describe('quota-bm-per-account', () => {
    it('passes when BM count <= 25', () => {
      const bms = Array.from({ length: 25 }, (_, i) => makeBm({ id: i }));
      const results = runComputeChecks({ bareMetal: bms });
      const check = findCheck(results, 'quota-bm-per-account');
      expect(check!.severity).toBe('passed');
    });

    it('warns when BM count > 25', () => {
      const bms = Array.from({ length: 26 }, (_, i) => makeBm({ id: i }));
      const results = runComputeChecks({ bareMetal: bms });
      const check = findCheck(results, 'quota-bm-per-account');
      expect(check!.severity).toBe('warning');
      expect(check!.affectedResources[0].detail).toContain('26');
    });
  });

  describe('quota-placement-groups', () => {
    it('passes when placement groups per region <= 100', () => {
      const pgs = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        datacenter: 'dal10',
      }));
      const results = runComputeChecks({ placementGroups: pgs });
      const check = findCheck(results, 'quota-placement-groups');
      expect(check!.severity).toBe('passed');
    });

    it('flags when placement groups per region > 100', () => {
      const pgs = Array.from({ length: 101 }, (_, i) => ({
        id: i,
        datacenter: 'dal10',
      }));
      const results = runComputeChecks({ placementGroups: pgs });
      const check = findCheck(results, 'quota-placement-groups');
      expect(check!.severity).toBe('info');
    });
  });
});

// ── Network Quota Tests ─────────────────────────────────────────────────

describe('Network quota checks', () => {
  describe('quota-vpcs-per-region', () => {
    it('passes when VLANs per region <= 10', () => {
      const vlans = Array.from({ length: 10 }, (_, i) =>
        makeVlan({ id: i, datacenter: 'dal10' }),
      );
      const results = runNetworkChecks({ vlans });
      const check = findCheck(results, 'quota-vpcs-per-region');
      expect(check!.severity).toBe('passed');
    });

    it('warns when VLANs per region > 10', () => {
      const vlans = Array.from({ length: 11 }, (_, i) =>
        makeVlan({ id: i, datacenter: 'dal10' }),
      );
      const results = runNetworkChecks({ vlans });
      const check = findCheck(results, 'quota-vpcs-per-region');
      expect(check!.severity).toBe('warning');
    });
  });

  describe('quota-subnets-per-vpc', () => {
    it('passes when subnets per region <= 100', () => {
      const subnets = Array.from({ length: 100 }, (_, i) =>
        makeSubnet({ id: i, datacenter: 'dal10' }),
      );
      const results = runNetworkChecks({ subnets });
      const check = findCheck(results, 'quota-subnets-per-vpc');
      expect(check!.severity).toBe('passed');
    });

    it('warns when subnets per region > 100', () => {
      const subnets = Array.from({ length: 101 }, (_, i) =>
        makeSubnet({ id: i, datacenter: 'dal10' }),
      );
      const results = runNetworkChecks({ subnets });
      const check = findCheck(results, 'quota-subnets-per-vpc');
      expect(check!.severity).toBe('warning');
    });
  });

  describe('quota-sgs-per-vpc', () => {
    it('passes when SG count <= 100', () => {
      const sgs = Array.from({ length: 100 }, (_, i) => makeSg({ id: i }));
      const results = runNetworkChecks({ securityGroups: sgs });
      const check = findCheck(results, 'quota-sgs-per-vpc');
      expect(check!.severity).toBe('passed');
    });

    it('warns when SG count > 100', () => {
      const sgs = Array.from({ length: 101 }, (_, i) => makeSg({ id: i }));
      const results = runNetworkChecks({ securityGroups: sgs });
      const check = findCheck(results, 'quota-sgs-per-vpc');
      expect(check!.severity).toBe('warning');
    });
  });

  describe('quota-floating-ips-per-zone', () => {
    it('passes when public IPs per zone <= 40', () => {
      const servers = Array.from({ length: 40 }, (_, i) =>
        makeVsi({ id: i, primaryIpAddress: `1.2.3.${i}`, datacenter: 'dal10' }),
      );
      const results = runNetworkChecks({ virtualServers: servers });
      const check = findCheck(results, 'quota-floating-ips-per-zone');
      expect(check!.severity).toBe('passed');
    });

    it('warns when public IPs per zone > 40', () => {
      const servers = Array.from({ length: 41 }, (_, i) =>
        makeVsi({ id: i, primaryIpAddress: `1.2.3.${i}`, datacenter: 'dal10' }),
      );
      const results = runNetworkChecks({ virtualServers: servers });
      const check = findCheck(results, 'quota-floating-ips-per-zone');
      expect(check!.severity).toBe('warning');
    });
  });

  describe('quota-vpn-gateways-per-region', () => {
    it('passes when VPN tunnels per region <= 9', () => {
      const vpns = Array.from({ length: 9 }, (_, i) => ({
        id: i,
        datacenter: 'dal10',
      }));
      const results = runNetworkChecks({ ipsecVpn: vpns });
      const check = findCheck(results, 'quota-vpn-gateways-per-region');
      expect(check!.severity).toBe('passed');
    });

    it('warns when VPN tunnels per region > 9', () => {
      const vpns = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        datacenter: 'dal10',
      }));
      const results = runNetworkChecks({ ipsecVpn: vpns });
      const check = findCheck(results, 'quota-vpn-gateways-per-region');
      expect(check!.severity).toBe('warning');
    });
  });
});

// ── Storage Quota Tests ─────────────────────────────────────────────────

describe('Storage quota checks', () => {
  describe('quota-volumes-per-region', () => {
    it('passes when volumes per region <= 300', () => {
      const blocks = Array.from({ length: 300 }, (_, i) =>
        makeBlock({ id: i }),
      );
      const results = runStorageChecks({ blockStorage: blocks });
      const check = findCheck(results, 'quota-volumes-per-region');
      expect(check!.severity).toBe('passed');
    });

    it('warns when volumes per region > 300', () => {
      const blocks = Array.from({ length: 301 }, (_, i) =>
        makeBlock({ id: i }),
      );
      const results = runStorageChecks({ blockStorage: blocks });
      const check = findCheck(results, 'quota-volumes-per-region');
      expect(check!.severity).toBe('warning');
      expect(check!.affectedResources[0].detail).toContain('301');
    });
  });

  describe('quota-file-shares', () => {
    it('passes when file shares <= 300', () => {
      const files = Array.from({ length: 300 }, (_, i) =>
        makeFile({ id: i }),
      );
      const results = runStorageChecks({ fileStorage: files });
      const check = findCheck(results, 'quota-file-shares');
      expect(check!.severity).toBe('passed');
    });

    it('warns when file shares > 300', () => {
      const files = Array.from({ length: 301 }, (_, i) =>
        makeFile({ id: i }),
      );
      const results = runStorageChecks({ fileStorage: files });
      const check = findCheck(results, 'quota-file-shares');
      expect(check!.severity).toBe('warning');
      expect(check!.affectedResources[0].detail).toContain('301');
    });
  });
});
