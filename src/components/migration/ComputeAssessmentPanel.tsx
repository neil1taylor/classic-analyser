import React from 'react';
import { Tag, Tooltip, Link } from '@carbon/react';
import { Information } from '@carbon/icons-react';
import { Link as RouterLink } from 'react-router-dom';
import type { ComputeAssessment, CheckResult } from '@/types/migration';
import RemediationChecklist from './RemediationChecklist';
import MigrationTable from './MigrationTable';
import type { MigrationColumnDef, ColumnGroup } from './MigrationTable';

interface Props {
  assessment: ComputeAssessment;
  prereqChecks?: CheckResult[];
}

const APPROACH_LABELS: Record<string, string> = {
  'lift-and-shift': 'Lift & Shift',
  'rebuild': 'Rebuild',
  're-platform': 'Re-platform',
  're-architect': 'Re-architect',
};

function statusTag(status: string): React.ReactNode {
  switch (status) {
    case 'ready': return <Tag type="green" size="sm">Ready</Tag>;
    case 'needs-work': return <Tag type="blue" size="sm">Needs Work</Tag>;
    case 'blocked': return <Tag type="red" size="sm">Blocked</Tag>;
    default: return <Tag type="gray" size="sm">{status}</Tag>;
  }
}

const vsiColumnGroups: ColumnGroup[] = [
  { id: 'classic', label: 'Classic Infrastructure', className: 'migration-table__group--classic' },
  { id: 'vpc', label: 'VPC Target', className: 'migration-table__group--vpc' },
];

const vsiColumns: MigrationColumnDef[] = [
  { key: 'hostname', header: 'Hostname', group: 'classic' },
  { key: 'datacenter', header: 'DC', group: 'classic', headerTooltip: 'Classic infrastructure datacenter location' },
  { key: 'specs', header: 'Classic Specs', group: 'classic' },
  { key: 'os', header: 'OS', group: 'classic', headerTooltip: 'Operating system of the virtual server' },
  { key: 'fee', header: 'Classic Monthly', group: 'classic' },
  { key: 'profile', header: 'VPC Profile', group: 'vpc' },
  { key: 'vpcFee', header: 'VPC Monthly', group: 'vpc' },
  { key: 'approach', header: 'Approach', group: 'vpc', headerTooltip: 'Recommended migration approach: Lift-and-Shift, Rebuild, Re-platform, or Re-architect' },
  { key: 'status', header: 'Status', group: 'vpc', render: (val) => statusTag(val as string) },
];

const bmColumnGroups: ColumnGroup[] = [
  { id: 'classic', label: 'Classic Infrastructure', className: 'migration-table__group--classic' },
  { id: 'migration', label: 'Migration', className: 'migration-table__group--migration' },
];

const bmColumns: MigrationColumnDef[] = [
  { key: 'hostname', header: 'Hostname', group: 'classic' },
  { key: 'datacenter', header: 'DC', group: 'classic', headerTooltip: 'Classic infrastructure datacenter location' },
  { key: 'specs', header: 'Classic Specs', group: 'classic' },
  { key: 'fee', header: 'Classic Monthly', group: 'classic' },
  { key: 'path', header: 'Migration Path', group: 'migration' },
  { key: 'approach', header: 'Approach', group: 'migration', headerTooltip: 'Recommended migration approach: Lift-and-Shift, Rebuild, Re-platform, or Re-architect' },
  { key: 'status', header: 'Status', group: 'migration', render: (val) => statusTag(val as string) },
];

const ComputeAssessmentPanel: React.FC<Props> = ({ assessment, prereqChecks }) => {
  const vsiRows = assessment.vsiMigrations.map((v) => ({
    id: String(v.id),
    hostname: v.hostname || `VSI ${v.id}`,
    datacenter: v.datacenter,
    specs: `${v.cpu} vCPU / ${Math.round(v.memoryMB / 1024)} GB`,
    os: v.os || 'Unknown',
    profile: v.recommendedProfile?.name ?? 'N/A',
    fee: v.noBillingItem ? 'No billing item' : `$${v.currentFee.toFixed(2)}${v.isEstimatedCost ? ' (est.)' : ''}`,
    vpcFee: v.recommendedProfile ? `$${v.recommendedProfile.estimatedCost.toFixed(2)}` : 'N/A',
    approach: APPROACH_LABELS[v.migrationApproach ?? ''] ?? 'Unknown',
    status: v.status,
  }));

  const bmRows = assessment.bareMetalMigrations.map((b) => ({
    id: String(b.id),
    hostname: b.hostname || `BM ${b.id}`,
    datacenter: b.datacenter,
    specs: `${b.cores} cores / ${b.memoryGB} GB`,
    fee: `$${b.currentFee.toFixed(2)}`,
    path: b.migrationPath === 'powervs' ? 'PowerVS (Oracle)' : b.migrationPath === 'powervs-sap' ? 'PowerVS (SAP)' : b.migrationPath.replace(/-/g, ' '),
    approach: APPROACH_LABELS[b.migrationApproach ?? ''] ?? 'Unknown',
    status: b.status,
  }));

  return (
    <div className="compute-assessment-panel">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Tooltip label="Servers that can migrate to VPC with no blockers" align="bottom">
          <Tag type="green">{assessment.summary.readyToMigrate} Ready</Tag>
        </Tooltip>
        <Tooltip label="Servers requiring remediation before migration" align="bottom">
          <Tag type="blue">{assessment.summary.needsWork} Needs Work</Tag>
        </Tooltip>
        <Tooltip label="Servers with issues that prevent VPC migration" align="bottom">
          <Tag type="red">{assessment.summary.blocked} Blocked</Tag>
        </Tooltip>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Link as={RouterLink} to="/migration/vsi-profile-guide" renderIcon={Information} size="sm">
          VSI Profile Selection Guide
        </Link>
      </div>

      {assessment.recommendations.length > 0 && (
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
          {assessment.recommendations.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {vsiRows.length > 0 && (
        <MigrationTable
          title={`Virtual Servers (${vsiRows.length})`}
          columns={vsiColumns}
          columnGroups={vsiColumnGroups}
          rows={vsiRows}
          emptyMessage="No virtual servers found."
        />
      )}

      {bmRows.length > 0 && (
        <MigrationTable
          title={`Bare Metal Servers (${bmRows.length})`}
          columns={bmColumns}
          columnGroups={bmColumnGroups}
          rows={bmRows}
          emptyMessage="No bare metal servers found."
        />
      )}

      {vsiRows.length === 0 && bmRows.length === 0 && (
        <p style={{ color: 'var(--cds-text-helper)' }}>No compute instances found.</p>
      )}

      {prereqChecks && prereqChecks.length > 0 && (
        <RemediationChecklist checks={prereqChecks} title="Pre-Requisite Checks" />
      )}
    </div>
  );
};

export default ComputeAssessmentPanel;
