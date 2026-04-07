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
  description: 'VPC Network ACLs support up to 200 rules per ACL. Classic firewalls with more than 200 rules need rule consolidation or splitting across multiple ACLs/subnets.',
  threshold: '200 rules per ACL',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-using-acls',
  remediationSteps: [
    'Review firewall rules and remove redundant or obsolete entries.',
    'Consolidate rules using CIDR aggregation where possible.',
    'Consider splitting complex rule sets across multiple VPC ACLs or subnets.',
    'Use VPC security groups (250 rules each) for instance-level rules — ACLs for subnet-level policy.',
  ],
};

const SG_RULE_COUNT: PreRequisiteCheck = {
  id: 'net-sg-rules',
  name: 'Security Group Rule Count',
  category: 'network',
  description: 'VPC security groups support a maximum of 250 rules per group. Classic security groups exceeding this limit need restructuring.',
  threshold: '250 rules per security group',
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

const GATEWAY_VPN_ONLY: PreRequisiteCheck = {
  id: 'net-gateway-vpn-only',
  name: 'Gateway Providing VPN Services Only',
  category: 'network',
  description:
    'Gateway appliances with no routed VLANs (all inside VLANs in bypass mode) are likely providing VPN or firewall services only. These can typically be replaced with VPC VPN Gateway rather than a full NFV appliance.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-vpn-overview',
  remediationSteps: [
    'Confirm the gateway is used solely for VPN termination or stateful firewall.',
    'If VPN-only, plan migration to VPC VPN Gateway (site-to-site or client-to-site).',
    'Migrate VPN configuration (IKE policies, tunnels, PSKs) to the VPC VPN Gateway.',
    'If firewall rules are also present, map them to VPC security groups and NACLs.',
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
  description: 'Classic firewall rules translate to VPC Network ACL (NACL) rules during migration. VPC NACLs support a maximum of 200 rules per ACL (combined inbound and outbound). Firewalls exceeding this need rule consolidation or subnet splitting.',
  threshold: '200 rules per ACL (combined inbound + outbound)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-using-acls',
  remediationSteps: [
    'Review Classic firewall rules and identify which translate to ACL vs. security group rules.',
    'Consolidate rules using CIDR aggregation to reduce rule count.',
    'Split workloads across multiple subnets if a single ACL would exceed 200 rules.',
    'Use VPC security groups (250 rules each) for instance-level rules — ACLs for subnet-level policy only.',
  ],
};

// ── Account/Region Quota Checks ─────────────────────────────────────────

const BANDWIDTH_EGRESS_RISK: PreRequisiteCheck = {
  id: 'net-bandwidth-egress-risk',
  name: 'Bandwidth Egress Cost Risk',
  category: 'network',
  description:
    'Classic Bare Metal servers include up to 20 TB/month free public egress (NA/EU). VPC Bare Metal has no equivalent free allowance — all public egress is billed per GB. VSIs have the same 250 GB/month free allowance on both platforms, but high-egress VSIs are flagged for awareness.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-pricing-for-vpc',
  remediationSteps: [
    'Review public egress patterns for each bare metal server.',
    'Evaluate whether workloads can use private connectivity (VPE, private endpoints) to reduce public egress.',
    'Factor bandwidth cost into the VPC migration cost estimate — BM egress at ~$0.09/GB (NA).',
    'Consider VPC Network Load Balancer or CDN for high-egress workloads.',
  ],
};

const BANDWIDTH_POOL: PreRequisiteCheck = {
  id: 'net-bandwidth-pool',
  name: 'Bandwidth Pool',
  category: 'network',
  description:
    'Classic bandwidth pools allow devices to share their aggregate bandwidth allotments, reducing overage risk. VPC does not have explicit bandwidth pooling — bandwidth is aggregated at the account level instead. Review pool utilisation to assess the impact of this change.',
  docsUrl: 'https://cloud.ibm.com/docs/bandwidth-metering?topic=bandwidth-metering-bp-create',
  remediationSteps: [
    'Review pool utilisation — identify devices that depend on pooled bandwidth from underutilised devices.',
    'VPC uses account-level bandwidth aggregation; explicit pool management is not available.',
    'Factor any potential overage costs into the migration cost estimate.',
  ],
};

const QUOTA_VPCS_PER_REGION: PreRequisiteCheck = {
  id: 'quota-vpcs-per-region',
  name: 'VPC Quota per Region (10)',
  category: 'network',
  description: 'VPC accounts have a default quota of 10 VPCs per region. If Classic VLANs in a region imply multiple VPCs are needed, the default quota may be exceeded. Quotas can be increased by contacting IBM Cloud Support.',
  threshold: '10 VPCs per region (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request a VPC quota increase via IBM Cloud Support before migration.',
    'Consolidate Classic VLANs into fewer VPCs where network segmentation allows.',
    'Use VPC subnets and security groups for isolation instead of separate VPCs.',
  ],
};

const QUOTA_SUBNETS_PER_VPC: PreRequisiteCheck = {
  id: 'quota-subnets-per-vpc',
  name: 'VPC Subnet Quota (100 per VPC)',
  category: 'network',
  description: 'VPC accounts have a default quota of 100 subnets per VPC. Classic environments with many subnets per datacenter region may exceed this quota.',
  threshold: '100 subnets per VPC (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request a subnet quota increase via IBM Cloud Support if needed.',
    'Consolidate Classic subnets into larger CIDR blocks in VPC.',
    'Distribute subnets across multiple VPCs if consolidation is not possible.',
  ],
};

const QUOTA_SGS_PER_VPC: PreRequisiteCheck = {
  id: 'quota-sgs-per-vpc',
  name: 'Security Group Quota per VPC (100)',
  category: 'network',
  description: 'VPC accounts have a default quota of 100 security groups per VPC. Classic environments with many security groups may exceed this quota.',
  threshold: '100 security groups per VPC (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request a security group quota increase via IBM Cloud Support if needed.',
    'Consolidate security groups with similar rules.',
    'Use shared security groups for common rule sets.',
  ],
};

const QUOTA_ACLS_PER_VPC: PreRequisiteCheck = {
  id: 'quota-acls-per-vpc',
  name: 'Network ACL Quota per VPC (100)',
  category: 'network',
  description: 'VPC accounts have a default quota of 100 network ACLs per VPC. Classic firewalls translate to VPC ACLs during migration.',
  threshold: '100 ACLs per VPC (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request an ACL quota increase via IBM Cloud Support if needed.',
    'Consolidate firewall rules into fewer ACLs.',
    'Use VPC security groups for instance-level rules, ACLs for subnet-level policy.',
  ],
};

const QUOTA_FLOATING_IPS_PER_ZONE: PreRequisiteCheck = {
  id: 'quota-floating-ips-per-zone',
  name: 'Floating IP Quota per Zone (40)',
  category: 'network',
  description: 'VPC accounts have a default quota of 40 floating IP addresses per zone. Classic servers with public IPs will each need a floating IP in VPC.',
  threshold: '40 floating IPs per zone (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request a floating IP quota increase via IBM Cloud Support before migration.',
    'Use VPC load balancers instead of individual floating IPs where possible.',
    'Reduce public-facing instances by consolidating behind reverse proxies.',
  ],
};

const QUOTA_VPN_GATEWAYS_PER_REGION: PreRequisiteCheck = {
  id: 'quota-vpn-gateways-per-region',
  name: 'VPN Gateway Quota per Region (9)',
  category: 'network',
  description: 'VPC accounts have a default quota of 9 VPN gateways per region (3 per zone). Classic IPsec VPN tunnels migrating to VPC may exceed this quota.',
  threshold: '9 VPN gateways per region (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request a VPN gateway quota increase via IBM Cloud Support if needed.',
    'Consolidate VPN tunnels using fewer gateways with multiple connections.',
    'Each VPN gateway supports up to 10 connections.',
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

  // Firewall rule count > 200 (VPC ACL limit)
  const fwAffected: AffectedResource[] = [];
  for (const fw of firewalls) {
    const rules = fw['rules'] ?? fw['firewallRules'];
    const ruleCount = Array.isArray(rules) ? rules.length : 0;
    if (ruleCount > 200) {
      fwAffected.push({
        id: toNum(fw['id']),
        hostname: toStr(fw['name']) || toStr(fw['fullyQualifiedDomainName']) || `Firewall ${toNum(fw['id'])}`,
        detail: `${ruleCount} rules (VPC ACL limit: 200)`,
      });
    }
  }
  results.push(evaluateCheck(FIREWALL_RULE_COUNT, 'warning', firewalls.length, fwAffected));

  // Estimated ACL rule count from firewall translation (200 rules per ACL combined)
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
    const totalRules = inbound + outbound;
    if (totalRules > 200) {
      aclAffected.push({
        id: toNum(fw['id']),
        hostname: toStr(fw['name']) || toStr(fw['fullyQualifiedDomainName']) || `Firewall ${toNum(fw['id'])}`,
        detail: `Estimated ACL rules: ${totalRules} total (${inbound} inbound, ${outbound} outbound) — VPC limit: 200 per ACL`,
      });
    }
  }
  results.push(evaluateCheck(ACL_RULE_ESTIMATE, 'warning', firewalls.length, aclAffected));

  // Security group rule count > 250
  const sgAffected: AffectedResource[] = [];
  for (const sg of sgs) {
    const rules = sg['rules'] ?? sg['securityGroupRules'] ?? [];
    const ruleCount = Array.isArray(rules) ? rules.length : 0;
    if (ruleCount > 250) {
      sgAffected.push({
        id: toNum(sg['id']),
        hostname: toStr(sg['name']) || `SG ${toNum(sg['id'])}`,
        detail: `${ruleCount} rules (VPC limit: 250)`,
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

  // Gateway appliances with no routed VLANs — likely VPN-only
  const vpnOnlyAffected: AffectedResource[] = [];
  for (const gw of gateways) {
    const insideVlans = (gw['insideVlans'] ?? []) as Record<string, unknown>[];
    if (insideVlans.length === 0) continue;
    const allBypassed = insideVlans.every((v) => v['bypassFlag'] === true);
    if (allBypassed) {
      vpnOnlyAffected.push({
        id: toNum(gw['id']),
        hostname: toStr(gw['name']) || `Gateway ${toNum(gw['id'])}`,
        detail: `All ${insideVlans.length} inside VLAN(s) in bypass — likely VPN/firewall only`,
      });
    }
  }
  results.push(evaluateCheck(GATEWAY_VPN_ONLY, 'info', gateways.length, vpnOnlyAffected));

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

  // ── Bandwidth Egress Risk ─────────────────────────────────────────
  const bwAffected: AffectedResource[] = [];
  for (const bm of bareMetal) {
    const egressGb = toNum(bm['publicBandwidthAvgOutGb']);
    if (egressGb > 0) {
      const estCost = Math.round(egressGb * 0.09);
      bwAffected.push({
        id: toNum(bm['id']),
        hostname: toStr(bm['hostname'] as unknown) || toStr(bm['fullyQualifiedDomainName'] as unknown) || `BM ${toNum(bm['id'])}`,
        detail: `BM: ${egressGb} GB/month avg public egress — est. ~$${estCost}/month on VPC (free on Classic)`,
      });
    }
  }
  for (const vsi of virtualServers) {
    const egressGb = toNum(vsi['publicBandwidthAvgOutGb']);
    if (egressGb > 250) {
      bwAffected.push({
        id: toNum(vsi['id']),
        hostname: toStr(vsi['hostname'] as unknown) || toStr(vsi['fullyQualifiedDomainName'] as unknown) || `VSI ${toNum(vsi['id'])}`,
        detail: `VSI: ${egressGb} GB/month avg public egress (exceeds 250 GB free allowance)`,
      });
    }
  }
  const bwTotalChecked = bareMetal.filter(d => toNum(d['publicBandwidthAvgOutGb']) > 0).length
    + virtualServers.filter(d => toNum(d['publicBandwidthAvgOutGb']) > 0).length;
  results.push(evaluateCheck(BANDWIDTH_EGRESS_RISK, 'warning', bwTotalChecked, bwAffected));

  // ── Bandwidth Pool ──────────────────────────────────────────────────
  const poolRecords = (collectedData['bandwidthPooling'] ?? []) as Record<string, unknown>[];
  const poolMap = new Map<string | number, { name: string; deviceCount: number; allocatedGb: number; usageGb: number }>();
  for (const rec of poolRecords) {
    const pid = rec['poolId'];
    if (pid === undefined) continue;
    const key = String(pid);
    const existing = poolMap.get(key);
    if (existing) {
      existing.deviceCount++;
    } else {
      poolMap.set(key, {
        name: toStr(rec['poolName'] as unknown) || `Pool ${key}`,
        deviceCount: 1,
        allocatedGb: toNum(rec['totalAllocatedGb']),
        usageGb: toNum(rec['billingCycleUsageGb']),
      });
    }
  }
  const poolAffected: AffectedResource[] = [];
  for (const [pid, pool] of poolMap) {
    poolAffected.push({
      id: pid,
      hostname: pool.name,
      detail: `${pool.name}: ${pool.deviceCount} device(s), ${pool.allocatedGb} GB allocated, ${pool.usageGb} GB used — no VPC equivalent`,
    });
  }
  results.push(evaluateCheck(BANDWIDTH_POOL, 'info', poolRecords.length, poolAffected));

  // ── Account/Region Quota Checks ────────────────────────────────────

  const ipsecVpns = (collectedData['ipsecVpn'] ?? []) as Record<string, unknown>[];

  // VPCs per region — estimate from distinct VLANs per region (quota: 10)
  // Each VLAN could map to a separate VPC depending on network design
  const vlansByRegion = new Map<string, number>();
  for (const vlan of vlans) {
    const dc = toStr(vlan['primaryRouter.datacenter.name'])
      || toStr((vlan['primaryRouter'] as Record<string, unknown>)?.['datacenter'] as unknown)
      || toStr(vlan['datacenter'])
      || '';
    if (dc) {
      const mapping = mapDatacenterToVPC(dc);
      const region = mapping?.vpcRegion ?? 'unknown';
      vlansByRegion.set(region, (vlansByRegion.get(region) ?? 0) + 1);
    }
  }
  const vpcsAffected: AffectedResource[] = [];
  for (const [region, count] of vlansByRegion) {
    if (count > 10) {
      vpcsAffected.push({
        id: region,
        hostname: region,
        detail: `${count} VLANs → may need >10 VPCs (quota: 10)`,
      });
    }
  }
  results.push(evaluateCheck(QUOTA_VPCS_PER_REGION, 'warning', vlans.length, vpcsAffected));

  // Subnets per VPC region (quota: 100 per VPC)
  const subnetsByRegion = new Map<string, number>();
  for (const subnet of subnets) {
    const dc = toStr(subnet['datacenter.name'] as unknown)
      || toStr(subnet['datacenter'] as unknown)
      || '';
    if (dc) {
      const mapping = mapDatacenterToVPC(dc);
      const region = mapping?.vpcRegion ?? 'unknown';
      subnetsByRegion.set(region, (subnetsByRegion.get(region) ?? 0) + 1);
    }
  }
  const subnetsAffected: AffectedResource[] = [];
  for (const [region, count] of subnetsByRegion) {
    if (count > 100) {
      subnetsAffected.push({
        id: region,
        hostname: region,
        detail: `${count} subnets (quota: 100 per VPC)`,
      });
    }
  }
  results.push(evaluateCheck(QUOTA_SUBNETS_PER_VPC, 'warning', subnets.length, subnetsAffected));

  // Security groups per VPC (quota: 100)
  const sgQuotaAffected: AffectedResource[] = [];
  if (sgs.length > 100) {
    sgQuotaAffected.push({
      id: 'account',
      hostname: 'Account total',
      detail: `${sgs.length} security groups (quota: 100 per VPC)`,
    });
  }
  results.push(evaluateCheck(QUOTA_SGS_PER_VPC, 'warning', sgs.length, sgQuotaAffected));

  // ACLs per VPC (quota: 100)
  const aclQuotaAffected: AffectedResource[] = [];
  if (firewalls.length > 100) {
    aclQuotaAffected.push({
      id: 'account',
      hostname: 'Account total',
      detail: `${firewalls.length} firewalls → ACLs (quota: 100 per VPC)`,
    });
  }
  results.push(evaluateCheck(QUOTA_ACLS_PER_VPC, 'info', firewalls.length, aclQuotaAffected));

  // Floating IPs per zone (quota: 40)
  const publicIpsByZone = new Map<string, number>();
  for (const server of allServers) {
    if (server['privateNetworkOnly'] === true) continue;
    const publicIp = toStr(server['primaryIp'] as unknown)
      || toStr(server['primaryIpAddress'] as unknown);
    if (!publicIp) continue;
    const dc = toStr((server as Record<string, unknown>)['datacenter.name'] as unknown)
      || toStr((server as Record<string, unknown>)['datacenter'] as unknown)
      || '';
    if (dc) {
      const mapping = mapDatacenterToVPC(dc);
      // Map to first zone in the region as a conservative estimate
      const zone = mapping?.vpcZones?.[0] ?? 'unknown';
      publicIpsByZone.set(zone, (publicIpsByZone.get(zone) ?? 0) + 1);
    }
  }
  const fipAffected: AffectedResource[] = [];
  for (const [zone, count] of publicIpsByZone) {
    if (count > 40) {
      fipAffected.push({
        id: zone,
        hostname: zone,
        detail: `${count} public IPs → floating IPs (quota: 40 per zone)`,
      });
    }
  }
  results.push(evaluateCheck(QUOTA_FLOATING_IPS_PER_ZONE, 'warning', allServers.length, fipAffected));

  // VPN gateways per region (quota: 9)
  const vpnsByRegion = new Map<string, number>();
  for (const vpn of ipsecVpns) {
    const dc = toStr(vpn['datacenter'] as unknown) || toStr(vpn['datacenter.name'] as unknown) || '';
    if (dc) {
      const mapping = mapDatacenterToVPC(dc);
      const region = mapping?.vpcRegion ?? 'unknown';
      vpnsByRegion.set(region, (vpnsByRegion.get(region) ?? 0) + 1);
    }
  }
  const vpnAffected: AffectedResource[] = [];
  for (const [region, count] of vpnsByRegion) {
    if (count > 9) {
      vpnAffected.push({
        id: region,
        hostname: region,
        detail: `${count} VPN tunnels → gateways (quota: 9 per region)`,
      });
    }
  }
  results.push(evaluateCheck(QUOTA_VPN_GATEWAYS_PER_REGION, 'warning', ipsecVpns.length, vpnAffected));

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
