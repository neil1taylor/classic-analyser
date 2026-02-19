import React from 'react';
import { Tag, Tile, Tooltip } from '@carbon/react';
import type { SecurityAssessment, CheckResult } from '@/types/migration';
import RemediationChecklist from './RemediationChecklist';

interface Props {
  assessment: SecurityAssessment;
  prereqChecks?: CheckResult[];
}

const SecurityAssessmentPanel: React.FC<Props> = ({ assessment, prereqChecks }) => {
  return (
    <div className="security-assessment-panel">
      {assessment.recommendations.length > 0 && (
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
          {assessment.recommendations.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Security Groups */}
        <Tile style={{ padding: '1rem' }}>
          <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Security Groups</h5>
          <Tooltip label="Number of Classic security groups to migrate" align="bottom">
            <div style={{ fontSize: '1.5rem', fontWeight: 300 }}>{assessment.securityGroups.existingGroups}</div>
          </Tooltip>
          <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>
            <Tooltip label="Total firewall rules requiring translation to VPC security group rules" align="bottom">
              <span>{assessment.securityGroups.existingRules} rules total</span>
            </Tooltip>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <Tooltip label="Estimated number of VPC security groups required" align="bottom">
              <Tag type="outline" size="sm">{assessment.securityGroups.vpcGroupsNeeded} VPC groups needed</Tag>
            </Tooltip>
          </div>
          {assessment.securityGroups.notes.map((n, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', marginTop: '0.25rem' }}>{n}</div>
          ))}
        </Tile>

        {/* Certificates */}
        <Tile style={{ padding: '1rem' }}>
          <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>SSL Certificates</h5>
          <Tooltip label="Total SSL/TLS certificates to migrate or replace" align="bottom">
            <div style={{ fontSize: '1.5rem', fontWeight: 300 }}>{assessment.certificates.total}</div>
          </Tooltip>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {assessment.certificates.expired > 0 && (
              <Tooltip label="Certificates past their expiry date" align="bottom">
                <Tag type="red" size="sm">{assessment.certificates.expired} expired</Tag>
              </Tooltip>
            )}
            {assessment.certificates.expiringSoon > 0 && (
              <Tooltip label="Certificates expiring within 90 days" align="bottom">
                <Tag type="warm-gray" size="sm">{assessment.certificates.expiringSoon} expiring soon</Tag>
              </Tooltip>
            )}
            {assessment.certificates.expired === 0 && assessment.certificates.expiringSoon === 0 && assessment.certificates.total > 0 && (
              <Tag type="green" size="sm">All valid</Tag>
            )}
          </div>
          {assessment.certificates.notes.map((n, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', marginTop: '0.25rem' }}>{n}</div>
          ))}
        </Tile>

        {/* SSH Keys */}
        <Tile style={{ padding: '1rem' }}>
          <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>SSH Keys</h5>
          <Tooltip label="Total SSH keys — these import directly to VPC" align="bottom">
            <div style={{ fontSize: '1.5rem', fontWeight: 300 }}>{assessment.sshKeys.total}</div>
          </Tooltip>
          <div style={{ marginTop: '0.5rem' }}>
            <Tag type="green" size="sm">Direct import to VPC</Tag>
          </div>
          {assessment.sshKeys.notes.map((n, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', marginTop: '0.25rem' }}>{n}</div>
          ))}
        </Tile>
      </div>

      {prereqChecks && prereqChecks.length > 0 && (
        <RemediationChecklist checks={prereqChecks} title="Pre-Requisite Checks" />
      )}
    </div>
  );
};

export default SecurityAssessmentPanel;
