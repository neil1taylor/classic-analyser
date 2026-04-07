import React from 'react';
import { Tag, Tooltip } from '@carbon/react';
import type { StorageAssessment, CheckResult } from '@/types/migration';
import RemediationChecklist from './RemediationChecklist';
import MigrationTable from './MigrationTable';
import type { MigrationColumnDef, ColumnGroup } from './MigrationTable';

interface Props {
  assessment: StorageAssessment;
  prereqChecks?: CheckResult[];
}

const blockColumnGroups: ColumnGroup[] = [
  { id: 'classic', label: 'Classic Storage', className: 'migration-table__group--classic' },
  { id: 'vpc', label: 'VPC Storage', className: 'migration-table__group--vpc' },
];

const blockColumns: MigrationColumnDef[] = [
  { key: 'username', header: 'Volume', group: 'classic' },
  { key: 'capacityGB', header: 'Capacity (GB)', group: 'classic' },
  { key: 'iops', header: 'IOPS', group: 'classic', headerTooltip: 'Input/Output Operations Per Second — storage performance metric' },
  { key: 'tier', header: 'Classic Tier', group: 'classic' },
  { key: 'fee', header: 'Classic Monthly', group: 'classic' },
  { key: 'vpcProfile', header: 'VPC Profile', group: 'vpc' },
  { key: 'profileGen', header: 'Gen', group: 'vpc', headerTooltip: 'VPC storage profile generation. Gen 2 (sdp) offers higher IOPS/capacity but does not support consistency group snapshots and is not recommended for boot volumes (GPT detection issue).' },
  { key: 'strategy', header: 'Strategy', group: 'vpc', headerTooltip: 'Recommended migration strategy for this volume' },
];

const fileColumnGroups: ColumnGroup[] = [
  { id: 'classic', label: 'Classic Storage', className: 'migration-table__group--classic' },
  { id: 'vpc', label: 'VPC Storage', className: 'migration-table__group--vpc' },
];

const fileColumns: MigrationColumnDef[] = [
  { key: 'username', header: 'Volume', group: 'classic' },
  { key: 'capacityGB', header: 'Capacity (GB)', group: 'classic' },
  { key: 'fee', header: 'Classic Monthly', group: 'classic' },
  { key: 'vpcTarget', header: 'VPC Target', group: 'vpc', headerTooltip: 'VPC File Share with dp2 profile (NFS v4.1)' },
];

const StorageAssessmentPanel: React.FC<Props> = ({ assessment, prereqChecks }) => {
  const blockRows = assessment.blockStorage.volumeAssessments.map((v) => ({
    id: String(v.id),
    username: v.username || `Block ${v.id}`,
    capacityGB: String(v.capacityGB),
    iops: String(v.iops),
    tier: v.tier || 'N/A',
    vpcProfile: v.vpcProfile,
    profileGen: v.profileGeneration === 2 ? 'Gen 2 (sdp)' : 'Gen 1',
    strategy: v.strategy === 'snapshot' ? 'Snapshot' : 'Replication',
    fee: `$${v.currentFee.toFixed(2)}`,
  }));

  const fileRows = assessment.fileStorage.volumeAssessments.map((v) => ({
    id: String(v.id),
    username: v.username || `File ${v.id}`,
    capacityGB: String(v.capacityGB),
    fee: `$${v.currentFee.toFixed(2)}`,
    vpcTarget: 'File Share (dp2, NFS v4.1)',
  }));

  const totalGB = assessment.blockStorage.totalCapacityGB + assessment.fileStorage.totalCapacityGB;

  return (
    <div className="storage-assessment-panel">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Tooltip label="Classic block storage volumes (SAN-attached)" align="bottom">
          <Tag type="outline">{assessment.blockStorage.totalVolumes} Block Volumes</Tag>
        </Tooltip>
        <Tooltip label="Classic file storage volumes (NFS)" align="bottom">
          <Tag type="outline">{assessment.fileStorage.totalVolumes} File Volumes</Tag>
        </Tooltip>
        <Tooltip label="Classic object storage accounts (S3-compatible)" align="bottom">
          <Tag type="outline">{assessment.objectStorage.totalAccounts} Object Storage</Tag>
        </Tooltip>
        <Tooltip label="Total storage capacity across all volume types" align="bottom">
          <Tag type="outline">{(totalGB / 1024).toFixed(1)} TB Total</Tag>
        </Tooltip>
        {assessment.kubeStorage && assessment.kubeStorage.totalVolumes > 0 && (
          <Tooltip label="Storage consumed by IKS/ROKS clusters — excluded from migration assessment" align="bottom">
            <Tag type="purple">{assessment.kubeStorage.totalVolumes} K8s Volumes Excluded ({assessment.kubeStorage.totalCapacityGB} GB)</Tag>
          </Tooltip>
        )}
      </div>

      {assessment.recommendations.length > 0 && (
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
          {assessment.recommendations.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {blockRows.length > 0 && (
        <MigrationTable
          title={`Block Storage (${blockRows.length})`}
          columns={blockColumns}
          columnGroups={blockColumnGroups}
          rows={blockRows}
          emptyMessage="No block storage volumes found."
        />
      )}

      {fileRows.length > 0 && (
        <MigrationTable
          title={`File Storage (${fileRows.length})`}
          columns={fileColumns}
          columnGroups={fileColumnGroups}
          rows={fileRows}
          emptyMessage="No file storage volumes found."
        />
      )}

      {blockRows.length === 0 && fileRows.length === 0 && (
        <p style={{ color: 'var(--cds-text-helper)' }}>No storage volumes found.</p>
      )}

      {prereqChecks && prereqChecks.length > 0 && (
        <RemediationChecklist checks={prereqChecks} title="Pre-Requisite Checks" />
      )}
    </div>
  );
};

export default StorageAssessmentPanel;
