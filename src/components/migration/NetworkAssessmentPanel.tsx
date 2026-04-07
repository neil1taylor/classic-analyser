import React from 'react';
import {
  Tag,
  Tile,
  Tooltip,
} from '@carbon/react';
import type { NetworkAssessment, CheckResult } from '@/types/migration';
import RemediationChecklist from './RemediationChecklist';
import MigrationTable from './MigrationTable';
import type { MigrationColumnDef, ColumnGroup } from './MigrationTable';

interface Props {
  assessment: NetworkAssessment;
  prereqChecks?: CheckResult[];
}

const subnetColumnGroups: ColumnGroup[] = [
  { id: 'classic', label: 'Classic Network', className: 'migration-table__group--classic' },
  { id: 'vpc', label: 'VPC Network', className: 'migration-table__group--vpc' },
];

const subnetColumns: MigrationColumnDef[] = [
  { key: 'classicVlanName', header: 'Classic VLAN', group: 'classic' },
  { key: 'classicVlanNumber', header: 'VLAN #', group: 'classic', headerTooltip: 'Virtual LAN identifier number' },
  { key: 'networkSpace', header: 'Space', group: 'classic', headerTooltip: 'Network address space (public or private)' },
  { key: 'datacenter', header: 'DC', group: 'classic', headerTooltip: 'Datacenter where this VLAN is located' },
  { key: 'vpcSubnetName', header: 'VPC Subnet', group: 'vpc' },
  { key: 'vpcZone', header: 'VPC Zone', group: 'vpc' },
];

const NetworkAssessmentPanel: React.FC<Props> = ({ assessment, prereqChecks }) => {
  const { vlanAnalysis, gatewayAnalysis, firewallAnalysis, loadBalancerAnalysis, vpnAnalysis, bandwidthAnalysis } = assessment;

  const subnetRows = vlanAnalysis.recommendedVPCSubnets.map((s, i) => ({
    id: String(i),
    ...s,
    classicVlanNumber: String(s.classicVlanNumber),
  }));

  return (
    <div className="network-assessment-panel">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Tooltip label="Virtual LANs — layer-2 network segments" align="bottom">
          <Tag type="outline">{vlanAnalysis.totalVlans} VLANs</Tag>
        </Tooltip>
        <Tooltip label="Network gateways providing routing and firewall services" align="bottom">
          <Tag type="outline">{gatewayAnalysis.gatewaysFound} Gateways</Tag>
        </Tooltip>
        <Tooltip label="Hardware and software firewalls protecting network segments" align="bottom">
          <Tag type="outline">{firewallAnalysis.totalFirewalls} Firewalls</Tag>
        </Tooltip>
        <Tooltip label="Classic load balancers distributing traffic across servers" align="bottom">
          <Tag type="outline">{loadBalancerAnalysis.totalLBs} Load Balancers</Tag>
        </Tooltip>
        <Tooltip label="IPsec VPN tunnels for encrypted site-to-site connectivity" align="bottom">
          <Tag type="outline">{vpnAnalysis.totalTunnels} VPN Tunnels</Tag>
        </Tooltip>
        <Tooltip label="Overall network migration complexity based on topology analysis" align="bottom">
          <Tag type={assessment.complexity === 'low' ? 'green' : assessment.complexity === 'medium' ? 'blue' : 'red'}>
            {assessment.complexity} complexity
          </Tag>
        </Tooltip>
      </div>

      {assessment.recommendations.length > 0 && (
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
          {assessment.recommendations.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {subnetRows.length > 0 && (
        <MigrationTable
          title="VLAN to VPC Subnet Mapping"
          columns={subnetColumns}
          columnGroups={subnetColumnGroups}
          rows={subnetRows}
          emptyMessage="No subnet mappings found."
        />
      )}

      {/* Gateway summary */}
      {gatewayAnalysis.gatewaysFound > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Gateway Assessment
          </h5>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {gatewayAnalysis.assessments.map((gw) => (
              <Tile key={gw.id} style={{ padding: '0.75rem', minWidth: '200px' }}>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{gw.name}</div>
                <Tag type={gw.canUseNativeVPC ? 'green' : 'warm-gray'} size="sm">
                  {gw.canUseNativeVPC ? 'Native VPC' : 'Appliance Required'}
                </Tag>
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', marginTop: '0.25rem' }}>
                  {gw.recommendation}
                </div>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {/* Firewall summary */}
      {firewallAnalysis.totalFirewalls > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Firewall Rule Translation
          </h5>
          <div style={{ fontSize: '0.875rem' }}>
            <span>{firewallAnalysis.totalRules} total rules: </span>
            <Tooltip label="Rules that can be automatically converted to VPC security group rules" align="bottom">
              <Tag type="green" size="sm">{firewallAnalysis.autoTranslatable} auto-translatable</Tag>
            </Tooltip>{' '}
            <Tooltip label="Rules requiring manual review for VPC equivalents" align="bottom">
              <Tag type="warm-gray" size="sm">{firewallAnalysis.manualReview} manual review</Tag>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Load balancer mapping */}
      {loadBalancerAnalysis.totalLBs > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Load Balancer Mapping
          </h5>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {loadBalancerAnalysis.mappings.map((lb) => (
              <Tile key={lb.classicId} style={{ padding: '0.75rem', minWidth: '200px' }}>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{lb.classicName}</div>
                <Tag type={lb.vpcType === 'network' ? 'teal' : 'blue'} size="sm">
                  VPC {lb.vpcType === 'network' ? 'Network' : 'Application'} LB
                </Tag>
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', marginTop: '0.25rem' }}>
                  {lb.classicType}
                </div>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {/* Bandwidth assessment */}
      {bandwidthAnalysis?.dataAvailable && (
        <div style={{ marginTop: '1.5rem' }}>
          <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Bandwidth Assessment
          </h5>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            <span>Public egress (3-month avg): </span>
            <Tooltip label="Bare metal egress is free on Classic (up to 20 TB/month) but billed per GB on VPC" align="bottom">
              <Tag type={bandwidthAnalysis.bmEgressGb > 0 ? 'red' : 'green'} size="sm">
                {Math.round(bandwidthAnalysis.bmEgressGb)} GB BM
              </Tag>
            </Tooltip>{' '}
            <Tooltip label="VSI egress has the same 250 GB/month free allowance on both Classic and VPC" align="bottom">
              <Tag type="green" size="sm">
                {Math.round(bandwidthAnalysis.vsiEgressGb)} GB VSI
              </Tag>
            </Tooltip>
          </div>
          {bandwidthAnalysis.bmEgressGb > 0 && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginBottom: '0.5rem' }}>
              Estimated new VPC cost for BM egress: ~${bandwidthAnalysis.estimatedVpcBmEgressCostMonthly.toLocaleString()}/month
              (Classic includes up to 20 TB/month free)
            </div>
          )}
          {bandwidthAnalysis.poolCount > 0 && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
              {bandwidthAnalysis.poolCount} bandwidth pool(s) in use — VPC has no explicit pooling equivalent
            </div>
          )}
        </div>
      )}

      {prereqChecks && prereqChecks.length > 0 && (
        <RemediationChecklist checks={prereqChecks} title="Pre-Requisite Checks" />
      )}
    </div>
  );
};

export default NetworkAssessmentPanel;
