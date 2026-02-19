import type { CheckResult, PreRequisiteCheck, AffectedResource } from '@/types/migration';
import { evaluateCheck } from './checkUtils';

const BLOCK_VOLUME_SIZE: PreRequisiteCheck = {
  id: 'storage-block-size',
  name: 'Block Volume Size (16 TB max)',
  category: 'storage',
  description: 'VPC block storage volumes have a maximum capacity of 16 TB (16384 GB). Larger Classic volumes cannot be directly migrated.',
  threshold: '16384 GB',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles',
  remediationSteps: [
    'Split the volume data across multiple VPC block storage volumes.',
    'Archive infrequently accessed data to IBM Cloud Object Storage.',
    'Use application-level data migration to redistribute data.',
  ],
};

const FILE_VOLUME_SIZE: PreRequisiteCheck = {
  id: 'storage-file-size',
  name: 'File Volume Size (32 TB max)',
  category: 'storage',
  description: 'VPC file shares have a maximum capacity of 32 TB (32768 GB). Larger Classic file volumes need special handling.',
  threshold: '32768 GB',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-file-storage-profiles',
  remediationSteps: [
    'Split large file shares into multiple VPC file shares.',
    'Archive data that does not need file-level access to Object Storage.',
  ],
};

const IOPS_COMPAT: PreRequisiteCheck = {
  id: 'storage-iops-compat',
  name: 'IOPS Compatibility',
  category: 'storage',
  description: 'VPC block storage supports up to 48,000 IOPS with custom profiles. Volumes configured with higher IOPS may see reduced performance.',
  threshold: '48,000 IOPS',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles',
  remediationSteps: [
    'Evaluate actual IOPS utilization — provisioned IOPS often exceed usage.',
    'Use VPC custom IOPS profiles for up to 48,000 IOPS.',
    'Consider distributing IO across multiple volumes with striping.',
  ],
};

const SNAPSHOT_CONFIG: PreRequisiteCheck = {
  id: 'storage-snapshot-config',
  name: 'Snapshot Configuration',
  category: 'storage',
  description: 'Volumes with snapshot schedules will need snapshot policies recreated in VPC.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-snapshots-vpc-about',
  remediationSteps: [
    'Document existing snapshot schedules before migration.',
    'Create VPC snapshot policies to match Classic snapshot schedules.',
    'Verify retention policies are configured in VPC.',
  ],
};

const REPLICATION_PARTNERS: PreRequisiteCheck = {
  id: 'storage-replication',
  name: 'Replication Partners',
  category: 'storage',
  description: 'Volumes with replication configured will need replication set up in VPC using cross-region or cross-zone replication.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-replication',
  remediationSteps: [
    'Document existing replication pairs and RPO requirements.',
    'Configure VPC block storage replication after volume migration.',
    'Test failover procedures in the VPC environment.',
  ],
};

const VOLUME_ATTACHMENT_COUNT: PreRequisiteCheck = {
  id: 'storage-attachment-count',
  name: 'Volume Attachment Count',
  category: 'storage',
  description: 'VPC instances support a maximum of 12 attached data volumes. VSIs with more attached volumes need consolidation.',
  threshold: '12 volumes per VSI',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-attaching-block-storage',
  remediationSteps: [
    'Consolidate data across fewer, larger volumes.',
    'Move infrequently accessed data to Object Storage.',
    'Detach unused or legacy volumes before migration.',
  ],
};

export function runStorageChecks(collectedData: Record<string, unknown[]>): CheckResult[] {
  const results: CheckResult[] = [];
  const blocks = (collectedData['blockStorage'] ?? []) as Record<string, unknown>[];
  const files = (collectedData['fileStorage'] ?? []) as Record<string, unknown>[];
  const vsis = (collectedData['virtualServers'] ?? []) as Record<string, unknown>[];

  // Block volume size > 16384 GB
  const blockSizeAffected: AffectedResource[] = [];
  for (const vol of blocks) {
    const cap = toNum(vol['capacityGb']) || toNum(vol['capacity']);
    if (cap > 16384) {
      blockSizeAffected.push({
        id: toNum(vol['id']),
        hostname: toStr(vol['username']) || `Block ${toNum(vol['id'])}`,
        detail: `${cap} GB`,
      });
    }
  }
  results.push(evaluateCheck(BLOCK_VOLUME_SIZE, 'blocker', blocks.length, blockSizeAffected));

  // File volume size > 32768 GB
  const fileSizeAffected: AffectedResource[] = [];
  for (const vol of files) {
    const cap = toNum(vol['capacityGb']) || toNum(vol['capacity']);
    if (cap > 32768) {
      fileSizeAffected.push({
        id: toNum(vol['id']),
        hostname: toStr(vol['username']) || `File ${toNum(vol['id'])}`,
        detail: `${cap} GB`,
      });
    }
  }
  results.push(evaluateCheck(FILE_VOLUME_SIZE, 'blocker', files.length, fileSizeAffected));

  // IOPS > 48000
  const iopsAffected: AffectedResource[] = [];
  for (const vol of blocks) {
    const iops = toNum(vol['provisionedIops']) || toNum(vol['iops']);
    if (iops > 48000) {
      iopsAffected.push({
        id: toNum(vol['id']),
        hostname: toStr(vol['username']) || `Block ${toNum(vol['id'])}`,
        detail: `${iops} IOPS`,
      });
    }
  }
  results.push(evaluateCheck(IOPS_COMPAT, 'warning', blocks.length, iopsAffected));

  // Snapshot schedules
  const snapshotAffected: AffectedResource[] = [];
  for (const vol of blocks) {
    const schedules = vol['schedules'] ?? vol['snapshotSchedules'];
    if (Array.isArray(schedules) && schedules.length > 0) {
      snapshotAffected.push({
        id: toNum(vol['id']),
        hostname: toStr(vol['username']) || `Block ${toNum(vol['id'])}`,
        detail: `${schedules.length} snapshot schedule(s)`,
      });
    }
  }
  results.push(evaluateCheck(SNAPSHOT_CONFIG, 'info', blocks.length, snapshotAffected));

  // Replication
  const replAffected: AffectedResource[] = [];
  for (const vol of blocks) {
    const partners = vol['replicationPartners'] ?? vol['replicationPartnerCount'];
    const hasRepl = Array.isArray(partners) ? partners.length > 0 : toNum(partners as unknown) > 0;
    if (hasRepl) {
      replAffected.push({
        id: toNum(vol['id']),
        hostname: toStr(vol['username']) || `Block ${toNum(vol['id'])}`,
        detail: 'Has replication configured',
      });
    }
  }
  results.push(evaluateCheck(REPLICATION_PARTNERS, 'info', blocks.length, replAffected));

  // Volume attachment count > 12
  const attachAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    const blockDevices = (vsi['blockDevices'] ?? []) as unknown[];
    const dataCount = Math.max(0, blockDevices.length - 1);
    if (dataCount > 12) {
      attachAffected.push({
        id: toNum(vsi['id'] as unknown),
        hostname: toStr(vsi['hostname'] as unknown) || `VSI ${toNum(vsi['id'] as unknown)}`,
        detail: `${dataCount} attached volumes`,
      });
    }
  }
  results.push(evaluateCheck(VOLUME_ATTACHMENT_COUNT, 'info', vsis.length, attachAffected));

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
