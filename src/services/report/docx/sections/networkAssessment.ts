import { Paragraph, Table, HeadingLevel } from 'docx';
import type { NetworkAssessment } from '@/types/migration';
import { heading, body, bullet, spacer, pageBreak } from '../utils/styles';
import { createStyledTable } from '../utils/tables';
import { aiNarrativeSection } from '../utils/aiSections';

export function buildNetworkAssessment(
  assessment: NetworkAssessment,
  aiNarrative?: string,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Network Assessment'),
    body(`Network readiness score: ${assessment.score}/100 (${assessment.complexity} complexity)`),
    spacer(),
  ];

  // VLAN Analysis
  elements.push(heading('VLAN Analysis', HeadingLevel.HEADING_2));
  elements.push(
    body(
      `Total VLANs: ${assessment.vlanAnalysis.totalVlans} ` +
        `(${assessment.vlanAnalysis.publicVlans} public, ${assessment.vlanAnalysis.privateVlans} private)`,
    ),
  );

  if (assessment.vlanAnalysis.recommendedVPCSubnets.length > 0) {
    const vlanHeaders = ['Classic VLAN', 'Datacenter', 'Network Space', 'VPC Subnet CIDR', 'VPC Zone'];
    const vlanRows = assessment.vlanAnalysis.recommendedVPCSubnets.map((s) => [
      `${s.classicVlanNumber} (${s.classicVlanName || 'unnamed'})`,
      s.datacenter,
      s.networkSpace,
      s.vpcSubnetCIDR,
      s.vpcZone,
    ]);
    elements.push(createStyledTable(vlanHeaders, vlanRows));
  }
  elements.push(spacer());

  // Firewall Analysis
  elements.push(heading('Firewall Translation', HeadingLevel.HEADING_2));
  elements.push(
    body(
      `Total firewalls: ${assessment.firewallAnalysis.totalFirewalls}, ` +
        `Total rules: ${assessment.firewallAnalysis.totalRules}`,
    ),
    body(
      `Auto-translatable: ${assessment.firewallAnalysis.autoTranslatable}, ` +
        `Manual review needed: ${assessment.firewallAnalysis.manualReview}`,
    ),
  );

  if (assessment.firewallAnalysis.translations.length > 0) {
    const fwHeaders = ['Classic Type', 'VLAN', 'Rules', 'Auto-Translate', 'Manual Review'];
    const fwRows = assessment.firewallAnalysis.translations.map((fw) => [
      fw.classicType,
      String(fw.vlanNumber),
      String(fw.ruleCount),
      String(fw.autoTranslatable),
      String(fw.manualReview),
    ]);
    elements.push(createStyledTable(fwHeaders, fwRows));
  }
  elements.push(spacer());

  // Gateway Analysis
  if (assessment.gatewayAnalysis.gatewaysFound > 0) {
    elements.push(heading('Gateway Analysis', HeadingLevel.HEADING_2));
    elements.push(
      body(
        `Gateways found: ${assessment.gatewayAnalysis.gatewaysFound}. ` +
          `Native VPC: ${assessment.gatewayAnalysis.canUseNativeVPC}. ` +
          `Requires appliance: ${assessment.gatewayAnalysis.requiresAppliance}.`,
      ),
    );
    elements.push(spacer());
  }

  // Load Balancer Analysis
  if (assessment.loadBalancerAnalysis.totalLBs > 0) {
    elements.push(heading('Load Balancer Mapping', HeadingLevel.HEADING_2));
    elements.push(body(`Total load balancers: ${assessment.loadBalancerAnalysis.totalLBs}`));

    if (assessment.loadBalancerAnalysis.mappings.length > 0) {
      const lbHeaders = ['Name', 'Classic Type', 'VPC Type', 'Notes'];
      const lbRows = assessment.loadBalancerAnalysis.mappings.map((lb) => [
        lb.classicName,
        lb.classicType,
        lb.vpcType,
        lb.notes.join('; '),
      ]);
      elements.push(createStyledTable(lbHeaders, lbRows));
    }
    elements.push(spacer());
  }

  // VPN Analysis
  if (assessment.vpnAnalysis.totalTunnels > 0) {
    elements.push(heading('VPN Analysis', HeadingLevel.HEADING_2));
    elements.push(
      body(
        `Total VPN tunnels: ${assessment.vpnAnalysis.totalTunnels}. ` +
          `Can migrate: ${assessment.vpnAnalysis.canMigrate}.`,
      ),
    );
    elements.push(spacer());
  }

  // Recommendations
  if (assessment.recommendations.length > 0) {
    elements.push(heading('Network Recommendations', HeadingLevel.HEADING_2));
    for (const rec of assessment.recommendations) {
      elements.push(bullet(rec));
    }
    elements.push(spacer());
  }

  if (aiNarrative) {
    elements.push(...aiNarrativeSection(aiNarrative));
  }

  return elements;
}
