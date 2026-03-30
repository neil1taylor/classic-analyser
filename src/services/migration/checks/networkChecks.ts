import type { CheckResult, PreRequisiteCheck, AffectedResource } from '@/types/migration';
import { evaluateCheck, unknownCheck } from './checkUtils';
import { mapDatacenterToVPC } from '../data/datacenterMapping';

const VRF_ENABLEMENT: PreRequisiteCheck = {
  id: 'net-vrf-enablement',
  name: 'VRF Enablement (Manual Verification)',
  category: 'network',
  description: 'Virtual Routing and Forwarding (VRF) must be enabled on the account for private network connectivity between Classic and VPC via Transit Gateway. This is the most critical pre-requisite for Classic-to-VPC migration. VRF status cannot be determined from SoftLayer API data — manual verification required.',
  docsUrl: 'https://cloud.ibm.com/docs/account?topic=account-vrf-service-endpoint',
  remediationSteps: [
    'Verify VRF status in the IBM Cloud console under Account > Account settings.',
    'If VRF is not enabled, contact IBM Cloud Support to initiate VRF migration.',
    'Enable service endpoints after VRF is active.',
    'Note: VRF migration may cause a brief private network interruption for existing Classic resources.',
    'VRF is required for Transit Gateway connectivity between Classic and VPC.',
  ],
};

const FIREWALL_RULE_COUNT: PreRequisiteCheck = {
  id: 'net-firewall-rules',
  name: 'Firewall Rule Count',
  category: 'network',
  description: 'VPC security groups and network ACLs have rule count limits. Firewalls with more than 25 rules may need to be split or reorganized.',
  threshold: '25 rules per firewall',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-security-groups',
  remediationSteps: [
    'Review firewall rules and remove redundant or obsolete entries.',
    'Consolidate rules using CIDR aggregation where possible.',
    'Consider splitting complex rule sets across multiple VPC security groups.',
  ],
};

const SG_RULE_COUNT: PreRequisiteCheck = {
  id: 'net-sg-rules',
  name: 'Security Group Rule Count',
  category: 'network',
  description: 'VPC security groups support a maximum of 25 rules per group. Classic security groups exceeding this limit need restructuring.',
  threshold: '25 rules per security group',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-security-groups',
  remediationSteps: [
    'Review and consolidate security group rules.',
    'Split large security groups into multiple smaller groups.',
    'Use CIDR aggregation to reduce rule count.',
  ],
};

const LB_TYPE: PreRequisiteCheck = {
  id: 'net-lb-type',
  name: 'Load Balancer Type',
  category: 'network',
  description: 'Classic load balancers need to be mapped to VPC Application Load Balancer (ALB) or Network Load Balancer (NLB).',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-load-balancers',
  remediationSteps: [
    'Map Classic local load balancers to VPC Application Load Balancer.',
    'Map Classic Citrix NetScaler to VPC Network Load Balancer or third-party appliance.',
    'Recreate health checks and backend pools in the VPC load balancer.',
  ],
};

const GATEWAY_APPLIANCE: PreRequisiteCheck = {
  id: 'net-gateway-appliance',
  name: 'Gateway Appliance',
  category: 'network',
  description: 'Network gateway appliances (Juniper vSRX, FortiGate, etc.) require equivalent virtual appliance deployment in VPC.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-networking-for-vpc',
  remediationSteps: [
    'Evaluate if VPC native routing and security groups can replace the gateway.',
    'If an appliance is required, deploy the VPC marketplace equivalent.',
    'Migrate gateway configuration (NAT, VPN, firewall rules) to the new appliance.',
  ],
};

const VLAN_DC_MAPPING: PreRequisiteCheck = {
  id: 'net-vlan-dc-mapping',
  name: 'VLAN Subnet Mapping',
  category: 'network',
  description: 'VLANs in Classic datacenters without a corresponding VPC region require migration to a different region.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-creating-a-vpc-in-a-different-region',
  remediationSteps: [
    'Identify the nearest VPC region for unmapped datacenters.',
    'Plan subnet CIDR allocation in the target VPC region.',
    'Update DNS and application configurations for the new region.',
  ],
};

const PUBLIC_IP: PreRequisiteCheck = {
  id: 'net-public-ip',
  name: 'Public IP Address',
  category: 'network',
  description: 'VSIs or Bare Metal servers with public IP addresses cannot be directly migrated to VPC. Public subnets do not exist in VPC — use floating IPs or load balancers instead.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-fip-about',
  remediationSteps: [
    'Provision a VPC floating IP for instances that require public access.',
    'Use a VPC load balancer for public-facing workloads.',
    'Update DNS records to point to the new floating IP or load balancer.',
    'Remove the Classic public IP assignment before migration.',
  ],
};

const VPC_RESERVED_IP: PreRequisiteCheck = {
  id: 'net-vpc-reserved-ip',
  name: 'VPC Reserved IP Conflict',
  category: 'network',
  description: 'VPC reserves 5 addresses per subnet (network, gateway, DNS, future use, broadcast). Resources with private IPs on these addresses will need new IP assignments after migration.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-networking-for-vpc',
  remediationSteps: [
    'Identify resources using reserved addresses and plan IP reassignment.',
    'Update application configurations to use the new private IP.',
    'Ensure DNS records and service discovery reflect the IP change.',
  ],
};

const IPV6_USAGE: PreRequisiteCheck = {
  id: 'net-ipv6-usage',
  name: 'IPv6 Address Usage',
  category: 'network',
  description: 'VPC does not currently support IPv6 addressing. Subnets, servers, gateways, or load balancers using IPv6 will need to transition to IPv4-only in VPC. Note: IPv6 addresses were often assigned by default on Classic infrastructure (especially gateways) and may not be actively used — manual verification is recommended. This check may produce false positives.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-networking-for-vpc',
  remediationSteps: [
    'Verify whether IPv6 is actively used by applications on each flagged resource.',
    'Plan IPv4-only networking in VPC for all migrated workloads.',
    'If IPv6 is required, consider a reverse proxy or gateway that provides IPv6 frontend with IPv4 backend.',
    'Update DNS AAAA records as part of migration planning.',
  ],
};

const VRRP_HA_PATTERN: PreRequisiteCheck = {
  id: 'net-vrrp-ha',
  name: 'VRRP High Availability Pattern',
  category: 'network',
  description: 'Virtual Router Redundancy Protocol (VRRP) is used in Classic for high availability patterns with floating virtual IPs. VPC does not support VRRP — equivalent HA must be achieved using VPC load balancers, floating IPs with failover, or application-level health checking. This includes multi-attach storage patterns that may depend on VRRP for failover. Cannot be determined from SoftLayer API data.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-load-balancers',
  remediationSteps: [
    'Identify servers using VRRP by checking keepalived or VRRP configuration on each host.',
    'Plan to replace VRRP with VPC Application Load Balancer or Network Load Balancer.',
    'For active/passive failover, consider VPC floating IP reassignment via API automation.',
    'Test HA failover behavior in VPC before production cutover.',
  ],
};

const ACL_RULE_ESTIMATE: PreRequisiteCheck = {
  id: 'net-acl-rule-estimate',
  name: 'Estimated VPC Network ACL Rule Count',
  category: 'network',
  description: 'Classic firewall rules translate to VPC Network ACL (NACL) rules during migration. VPC NACLs support a maximum of 25 inbound and 25 outbound rules per ACL. Firewalls exceeding this need rule consolidation or subnet splitting.',
  threshold: '25 inbound + 25 outbound rules per ACL',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-using-acls',
  remediationSteps: [
    'Review Classic firewall rules and identify which translate to ACL vs. security group rules.',
    'Consolidate rules using CIDR aggregation to reduce rule count.',
    'Split workloads across multiple subnets if a single ACL would exceed 25 rules per direction.',
    'Use VPC security groups for instance-level rules — ACLs for subnet-level policy only.',
  ],
};

/** Convert a dotted-quad IP string to a 32-bit numeric value. */
function ipToLong(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  return parts.reduce((acc, octet) => (acc << 8) + (Number(octet) & 0xff), 0) >>> 0;
}

/** Return the 5 VPC-reserved addresses for a given subnet (network, gateway, DNS, future, broadcast). */
function getReservedIPs(networkIdentifier: string, cidr: number): Map<number, string> {
  const network = ipToLong(networkIdentifier);
  const hostBits = 32 - cidr;
  const broadcast = (network + ((1 << hostBits) >>> 0) - 1) >>> 0;
  const reserved = new Map<number, string>();
  reserved.set(network, 'network address');
  reserved.set((network + 1) >>> 0, 'VPC gateway address');
  reserved.set((network + 2) >>> 0, 'VPC DNS resolver address');
  reserved.set((network + 3) >>> 0, 'VPC future-use address');
  reserved.set(broadcast, 'broadcast address');
  return reserved;
}

export function runNetworkChecks(collectedData: Record<string, unknown[]>): CheckResult[] {
  const results: CheckResult[] = [];
  const firewalls = (collectedData['firewalls'] ?? []) as Record<string, unknown>[];
  const sgs = (collectedData['securityGroups'] ?? []) as Record<string, unknown>[];
  const lbs = (collectedData['loadBalancers'] ?? []) as Record<string, unknown>[];
  const gateways = (collectedData['gateways'] ?? []) as Record<string, unknown>[];
  const vlans = (collectedData['vlans'] ?? []) as Record<string, unknown>[];
  const virtualServers = (collectedData['virtualServers'] ?? []) as Record<string, unknown>[];
  const bareMetal = (collectedData['bareMetal'] ?? []) as Record<string, unknown>[];
  const subnets = (collectedData['subnets'] ?? []) as Record<string, unknown>[];

  // Firewall rule count > 25
  const fwAffected: AffectedResource[] = [];
  for (const fw of firewalls) {
    const rules = fw['rules'] ?? fw['firewallRules'];
    const ruleCount = Array.isArray(rules) ? rules.length : 0;
    if (ruleCount > 25) {
      fwAffected.push({
        id: toNum(fw['id']),
        hostname: toStr(fw['name']) || toStr(fw['fullyQualifiedDomainName']) || `Firewall ${toNum(fw['id'])}`,
        detail: `${ruleCount} rules`,
      });
    }
  }
  results.push(evaluateCheck(FIREWALL_RULE_COUNT, 'warning', firewalls.length, fwAffected));

  // Estimated ACL rule count from firewall translation
  const aclAffected: AffectedResource[] = [];
  for (const fw of firewalls) {
    const rules = fw['rules'] ?? fw['firewallRules'];
    if (!Array.isArray(rules)) continue;
    let inbound = 0;
    let outbound = 0;
    for (const rule of rules as Record<string, unknown>[]) {
      const direction = toStr(rule['direction']) || toStr(rule['action']) || '';
      if (/out|egress/i.test(direction)) outbound++;
      else inbound++; // default to inbound if direction unknown
    }
    if (inbound > 25 || outbound > 25) {
      aclAffected.push({
        id: toNum(fw['id']),
        hostname: toStr(fw['name']) || toStr(fw['fullyQualifiedDomainName']) || `Firewall ${toNum(fw['id'])}`,
        detail: `Estimated ACL rules: ${inbound} inbound, ${outbound} outbound (max 25 each)`,
      });
    }
  }
  results.push(evaluateCheck(ACL_RULE_ESTIMATE, 'warning', firewalls.length, aclAffected));

  // Security group rule count > 25
  const sgAffected: AffectedResource[] = [];
  for (const sg of sgs) {
    const rules = sg['rules'] ?? sg['securityGroupRules'] ?? [];
    const ruleCount = Array.isArray(rules) ? rules.length : 0;
    if (ruleCount > 25) {
      sgAffected.push({
        id: toNum(sg['id']),
        hostname: toStr(sg['name']) || `SG ${toNum(sg['id'])}`,
        detail: `${ruleCount} rules`,
      });
    }
  }
  results.push(evaluateCheck(SG_RULE_COUNT, 'warning', sgs.length, sgAffected));

  // Load balancer type mapping (info — lists all)
  const lbAffected: AffectedResource[] = [];
  for (const lb of lbs) {
    const lbType = toStr(lb['type']) || toStr(lb['loadBalancerType']) || 'local';
    const vpcType = lbType.toLowerCase().includes('netscaler') ? 'Network LB' : 'Application LB';
    lbAffected.push({
      id: toNum(lb['id']),
      hostname: toStr(lb['name']) || toStr(lb['ipAddress']) || `LB ${toNum(lb['id'])}`,
      detail: `Classic ${lbType} → VPC ${vpcType}`,
    });
  }
  results.push(evaluateCheck(LB_TYPE, 'info', lbs.length, lbAffected));

  // Gateway appliances requiring migration
  const gwAffected: AffectedResource[] = [];
  for (const gw of gateways) {
    const members = gw['members'] ?? gw['insideVlans'];
    const hasMember = Array.isArray(members) && members.length > 0;
    if (hasMember) {
      gwAffected.push({
        id: toNum(gw['id']),
        hostname: toStr(gw['name']) || `Gateway ${toNum(gw['id'])}`,
        detail: 'Requires appliance migration',
      });
    }
  }
  results.push(evaluateCheck(GATEWAY_APPLIANCE, 'warning', gateways.length, gwAffected));

  // VLANs in DCs without VPC region
  const vlanAffected: AffectedResource[] = [];
  for (const vlan of vlans) {
    const dc = toStr(vlan['primaryRouter.datacenter.name'])
      || toStr((vlan['primaryRouter'] as Record<string, unknown>)?.['datacenter'] as unknown)
      || toStr(vlan['datacenter'])
      || '';
    if (dc) {
      const mapping = mapDatacenterToVPC(dc);
      if (!mapping || !mapping.available) {
        vlanAffected.push({
          id: toNum(vlan['id']) || toNum(vlan['vlanNumber']),
          hostname: toStr(vlan['name']) || `VLAN ${toNum(vlan['vlanNumber'])}`,
          detail: `DC: ${dc} — no VPC region`,
        });
      }
    }
  }
  results.push(evaluateCheck(VLAN_DC_MAPPING, 'info', vlans.length, vlanAffected));

  // Public IP address detection (blocker)
  const allServers = [...virtualServers, ...bareMetal];
  const pubIpAffected: AffectedResource[] = [];
  for (const server of allServers) {
    if (server['privateNetworkOnly'] === true) continue;
    const publicIp = toStr(server['primaryIp'] as unknown)
      || toStr((server['primaryIpAddress'] as unknown));
    if (publicIp) {
      pubIpAffected.push({
        id: toNum(server['id']),
        hostname: toStr(server['hostname'] as unknown)
          || toStr(server['fullyQualifiedDomainName'] as unknown)
          || `Server ${toNum(server['id'])}`,
        detail: `Public IP: ${publicIp}`,
      });
    }
  }
  results.push(evaluateCheck(PUBLIC_IP, 'blocker', allServers.length, pubIpAffected));

  // VPC reserved IP conflict (warning)
  const reservedIpAffected: AffectedResource[] = [];
  // Build a list of subnet reserved-IP maps
  const subnetReserved: { networkLong: number; mask: number; reserved: Map<number, string> }[] = [];
  for (const subnet of subnets) {
    const netId = toStr(subnet['networkIdentifier'] as unknown);
    const cidr = toNum(subnet['cidr']);
    if (netId && cidr > 0 && cidr <= 32) {
      const networkLong = ipToLong(netId);
      const mask = cidr === 32 ? 0xffffffff : ((0xffffffff << (32 - cidr)) >>> 0);
      subnetReserved.push({ networkLong, mask, reserved: getReservedIPs(netId, cidr) });
    }
  }
  for (const server of allServers) {
    const privateIp = toStr(server['backendIp'] as unknown)
      || toStr(server['primaryBackendIpAddress'] as unknown);
    if (!privateIp) continue;
    const ipLong = ipToLong(privateIp);
    if (ipLong === 0) continue;
    // Find the matching subnet
    for (const sn of subnetReserved) {
      if ((ipLong & sn.mask) >>> 0 === sn.networkLong) {
        const role = sn.reserved.get(ipLong);
        if (role) {
          reservedIpAffected.push({
            id: toNum(server['id']),
            hostname: toStr(server['hostname'] as unknown)
              || toStr(server['fullyQualifiedDomainName'] as unknown)
              || `Server ${toNum(server['id'])}`,
            detail: `${privateIp} conflicts with ${role}`,
          });
        }
        break;
      }
    }
  }
  results.push(evaluateCheck(VPC_RESERVED_IP, 'warning', allServers.length, reservedIpAffected));

  // IPv6 subnet detection
  const ipv6Affected: AffectedResource[] = [];
  for (const subnet of subnets) {
    const netId = toStr(subnet['networkIdentifier'] as unknown);
    const subType = toStr(subnet['subnetType'] as unknown) || toStr(subnet['addressSpace'] as unknown);
    if (netId.includes(':') || /ipv6/i.test(subType)) {
      const cidr = toNum(subnet['cidr']);
      ipv6Affected.push({
        id: toNum(subnet['id']),
        hostname: netId || `Subnet ${toNum(subnet['id'])}`,
        detail: `IPv6 subnet: ${netId}${cidr ? `/${cidr}` : ''} (type: ${subType || 'unknown'})`,
      });
    }
  }
  results.push(evaluateCheck(IPV6_USAGE, 'warning', subnets.length, ipv6Affected));

  // VRRP HA pattern — unknown (not determinable from API)
  results.push(unknownCheck(VRRP_HA_PATTERN, allServers.length));

  // VRF enablement — unknown (not determinable from API, always flag for manual check)
  results.push(unknownCheck(VRF_ENABLEMENT, allServers.length));

  return results;
}

function toNum(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function toStr(val: unknown): string {
  return typeof val === 'string' ? val : '';
}
