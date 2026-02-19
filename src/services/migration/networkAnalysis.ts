import type {
  NetworkAssessment,
  SubnetRecommendation,
  FirewallTranslation,
  GatewayAssessment,
  LoadBalancerMapping,
  VPNAssessment,
  MigrationPreferences,
  NetworkComplexity,
} from '@/types/migration';
import { mapDatacenterToVPC, getVPCZone } from './data/datacenterMapping';

function num(item: unknown, key: string): number {
  return Number((item as Record<string, unknown>)[key] ?? 0);
}
function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

function planSubnets(vlans: unknown[], preferences: MigrationPreferences): SubnetRecommendation[] {
  return vlans.map((vlan) => {
    const vlanNumber = num(vlan, 'vlanNumber');
    const vlanName = str(vlan, 'name') || `vlan-${vlanNumber}`;
    const networkSpace = str(vlan, 'networkSpace').toLowerCase();
    const datacenter = str(vlan, 'datacenter');
    const zone = getVPCZone(datacenter) ?? preferences.targetRegion + '-1';
    const mapping = mapDatacenterToVPC(datacenter);
    const region = mapping?.vpcRegion ?? preferences.targetRegion;

    return {
      classicVlanId: num(vlan, 'id'),
      classicVlanNumber: vlanNumber,
      classicVlanName: vlanName,
      networkSpace: networkSpace === 'public' ? 'public' : 'private',
      datacenter,
      vpcSubnetCIDR: '10.240.0.0/24', // Placeholder — real sizing would depend on IP usage
      vpcSubnetName: `${vlanName}-${region}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      vpcZone: zone,
    };
  });
}

function assessGateways(gateways: unknown[]): GatewayAssessment[] {
  return gateways.map((gw) => {
    const memberCount = num(gw, 'memberCount');
    const insideVlanCount = num(gw, 'insideVlanCount');
    const notes: string[] = [];

    // Simple heuristic: if few VLANs and members, native VPC routing suffices
    const isSimple = insideVlanCount <= 4 && memberCount <= 2;
    if (isSimple) {
      notes.push('Basic routing needs can be met by VPC native routing + Security Groups + NACLs');
    } else {
      notes.push('Complex gateway configuration — consider third-party NFV appliance on VPC');
    }

    return {
      id: num(gw, 'id'),
      name: str(gw, 'name'),
      canUseNativeVPC: isSimple,
      requiresAppliance: !isSimple,
      recommendation: isSimple
        ? 'Use VPC Routes + Security Groups + NACLs'
        : 'Deploy vSRX or FortiGate appliance on VPC',
      notes,
    };
  });
}

function translateFirewalls(firewalls: unknown[]): FirewallTranslation[] {
  return firewalls.map((fw) => {
    const ruleCount = num(fw, 'ruleCount');
    // Heuristic: most permit rules translate directly; deny rules need NACLs
    const autoTranslatable = Math.ceil(ruleCount * 0.8);
    const manualReview = ruleCount - autoTranslatable;
    const notes: string[] = [];

    if (manualReview > 0) {
      notes.push(`${manualReview} rule(s) require manual review (likely deny rules needing NACLs)`);
    }

    return {
      classicId: num(fw, 'id'),
      classicType: str(fw, 'firewallType'),
      vlanNumber: num(fw, 'vlanNumber'),
      ruleCount,
      autoTranslatable,
      manualReview,
      notes,
    };
  });
}

function assessLoadBalancers(lbs: unknown[]): LoadBalancerMapping[] {
  return lbs.map((lb) => {
    const lbType = str(lb, 'loadBalancerType').toLowerCase();
    const vpcType: 'application' | 'network' = lbType.includes('network') ? 'network' : 'application';
    return {
      classicId: num(lb, 'id'),
      classicName: str(lb, 'name'),
      classicType: str(lb, 'loadBalancerType'),
      vpcType,
      notes: [`Migrate to VPC ${vpcType === 'application' ? 'Application' : 'Network'} Load Balancer`],
    };
  });
}

function assessVPNs(tunnels: unknown[]): VPNAssessment[] {
  return tunnels.map((vpn) => ({
    id: num(vpn, 'id'),
    name: str(vpn, 'name'),
    canMigrateToVPCVPN: true,
    notes: ['Migrate to VPC VPN Gateway — recreate tunnel configuration'],
  }));
}

export function analyzeNetwork(
  collectedData: Record<string, unknown[]>,
  preferences: MigrationPreferences,
): NetworkAssessment {
  const vlans = collectedData['vlans'] ?? [];
  const gateways = collectedData['gateways'] ?? [];
  const firewalls = collectedData['firewalls'] ?? [];
  const loadBalancers = collectedData['loadBalancers'] ?? [];
  const vpnTunnels = collectedData['vpnTunnels'] ?? [];

  const publicVlans = vlans.filter((v) => str(v, 'networkSpace').toUpperCase() === 'PUBLIC');
  const privateVlans = vlans.filter((v) => str(v, 'networkSpace').toUpperCase() !== 'PUBLIC');

  const subnetRecs = planSubnets(vlans, preferences);
  const gatewayAssessments = assessGateways(gateways);
  const firewallTranslations = translateFirewalls(firewalls);
  const lbMappings = assessLoadBalancers(loadBalancers);
  const vpnAssessments = assessVPNs(vpnTunnels);

  const totalRules = firewallTranslations.reduce((sum, ft) => sum + ft.ruleCount, 0);
  const autoTranslatable = firewallTranslations.reduce((sum, ft) => sum + ft.autoTranslatable, 0);
  const manualReview = firewallTranslations.reduce((sum, ft) => sum + ft.manualReview, 0);

  // Complexity
  const gwRequiringAppliance = gatewayAssessments.filter((g) => g.requiresAppliance).length;
  let complexity: NetworkComplexity = 'low';
  if (gwRequiringAppliance > 0 || manualReview > 10) complexity = 'high';
  else if (vlans.length > 10 || totalRules > 20) complexity = 'medium';
  if (gwRequiringAppliance > 2 || manualReview > 30) complexity = 'very-high';

  // Score (100 = easy, 0 = very hard)
  const factors: number[] = [];
  if (vlans.length > 0) factors.push(vlans.length <= 10 ? 90 : vlans.length <= 20 ? 70 : 50);
  if (gateways.length > 0) factors.push(gwRequiringAppliance === 0 ? 90 : 40);
  if (firewalls.length > 0) factors.push(manualReview === 0 ? 95 : totalRules > 0 ? Math.round((autoTranslatable / totalRules) * 100) : 90);
  if (vpnTunnels.length > 0) factors.push(80);
  if (loadBalancers.length > 0) factors.push(85);
  const score = factors.length > 0 ? Math.round(factors.reduce((a, b) => a + b, 0) / factors.length) : 100;

  const recommendations: string[] = [];
  if (gwRequiringAppliance > 0) recommendations.push(`${gwRequiringAppliance} gateway(s) require third-party appliances on VPC`);
  if (manualReview > 0) recommendations.push(`${manualReview} firewall rule(s) require manual review for VPC translation`);
  if (vlans.length > 10) recommendations.push('Consider consolidating VLANs into fewer VPC subnets');
  if (vpnTunnels.length > 0) recommendations.push('Recreate IPsec VPN tunnels using VPC VPN Gateway');

  return {
    vlanAnalysis: {
      totalVlans: vlans.length,
      publicVlans: publicVlans.length,
      privateVlans: privateVlans.length,
      recommendedVPCSubnets: subnetRecs,
    },
    gatewayAnalysis: {
      gatewaysFound: gateways.length,
      canUseNativeVPC: gatewayAssessments.filter((g) => g.canUseNativeVPC).length,
      requiresAppliance: gwRequiringAppliance,
      assessments: gatewayAssessments,
    },
    firewallAnalysis: {
      totalFirewalls: firewalls.length,
      totalRules,
      autoTranslatable,
      manualReview,
      translations: firewallTranslations,
    },
    loadBalancerAnalysis: {
      totalLBs: loadBalancers.length,
      mappings: lbMappings,
    },
    vpnAnalysis: {
      totalTunnels: vpnTunnels.length,
      canMigrate: vpnAssessments.filter((v) => v.canMigrateToVPCVPN).length,
      assessments: vpnAssessments,
    },
    score,
    complexity,
    recommendations,
  };
}
