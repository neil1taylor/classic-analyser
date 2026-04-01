import type { CheckResult, PreRequisiteCheck, AffectedResource } from '@/types/migration';
import { evaluateCheck } from './checkUtils';

const BLOCK_VOLUME_SIZE: PreRequisiteCheck = {
  id: 'storage-block-size',
  name: 'Block Volume Size (32 TB max)',
  category: 'storage',
  description: 'VPC Gen 1 profiles support up to 16 TB; Gen 2 sdp profile supports up to 32 TB (32768 GB). Volumes exceeding 16 TB require the sdp profile. Volumes exceeding 32 TB cannot be directly migrated.',
  threshold: '32768 GB (sdp) / 16384 GB (Gen 1)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles',
  remediationSteps: [
    'Volumes 16–32 TB: use the Gen 2 sdp profile (check regional availability).',
    'Volumes >32 TB: split the volume data across multiple VPC block storage volumes.',
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
  description: 'VPC Gen 1 profiles support up to 48,000 IOPS. Gen 2 sdp profile supports up to 64,000 IOPS. Volumes exceeding 48K IOPS require the sdp profile.',
  threshold: '64,000 IOPS (sdp) / 48,000 IOPS (Gen 1)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles',
  remediationSteps: [
    'Evaluate actual IOPS utilization — provisioned IOPS often exceed usage.',
    'Volumes ≤48K IOPS: use VPC Gen 1 custom IOPS or tiered profiles.',
    'Volumes 48–64K IOPS: use the Gen 2 sdp profile (check regional availability).',
    'Consider distributing IO across multiple volumes with striping.',
  ],
};

const SDP_REQUIRED: PreRequisiteCheck = {
  id: 'storage-sdp-required',
  name: 'Gen 2 SDP Profile Required',
  category: 'storage',
  description: 'Volumes that exceed Gen 1 limits (>16 TB capacity or >48K IOPS) require the Gen 2 sdp profile. The sdp profile is not available in all regions and does not support consistency group snapshots or boot volumes.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles',
  remediationSteps: [
    'Verify sdp profile is available in your target VPC region.',
    'Plan individual snapshot strategy (consistency groups not supported with sdp).',
    'For volumes needing consistency group snapshots, split or resize to fit Gen 1 limits.',
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

const STORAGE_UTILIZATION: PreRequisiteCheck = {
  id: 'storage-utilization',
  name: 'Storage Utilization (Right-Sizing)',
  category: 'storage',
  description: 'Compares actual storage usage (bytesUsed) to provisioned capacity to identify over-provisioned or near-capacity volumes. Right-sizing storage on VPC can reduce costs for over-provisioned volumes and prevent capacity issues for nearly-full volumes.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles',
  remediationSteps: [
    'For over-provisioned volumes (<25% used): provision a smaller VPC volume to save costs.',
    'For near-capacity volumes (>90% used): provision a larger VPC volume or plan data cleanup.',
    'Review actual IO patterns to choose the right VPC storage tier.',
  ],
};

const MULTI_ATTACH_STORAGE: PreRequisiteCheck = {
  id: 'storage-multi-attach',
  name: 'Multi-Attach Block Storage',
  category: 'storage',
  description: 'Block storage (iSCSI) volumes authorized for multiple hosts or subnets. VPC block storage does not support multi-attach for VSIs (multi-attach for Bare Metal is planned for Q4 2026). Recommendation is NFS file shares on VPC for shared storage. Note: authorization does not confirm active mount — this check may produce false positives as volumes may be authorized but not mounted on all hosts.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-about',
  remediationSteps: [
    'Verify which hosts are actively mounting each flagged volume.',
    'For shared storage needs, consider VPC file shares (NFS) which support multi-mount.',
    'For Bare Metal workloads, evaluate the VPC multi-attach capability (planned Q4 2026).',
    'Redesign application architecture to use individual volumes per host where possible.',
  ],
};

export function runStorageChecks(collectedData: Record<string, unknown[]>): CheckResult[] {
  const results: CheckResult[] = [];
  const blocks = (collectedData['blockStorage'] ?? []) as Record<string, unknown>[];
  const files = (collectedData['fileStorage'] ?? []) as Record<string, unknown>[];
  const vsis = (collectedData['virtualServers'] ?? []) as Record<string, unknown>[];

  // Block volume size > 32768 GB (absolute blocker)
  const blockSizeAffected: AffectedResource[] = [];
  for (const vol of blocks) {
    const cap = toNum(vol['capacityGb']) || toNum(vol['capacity']);
    if (cap > 32768) {
      blockSizeAffected.push({
        id: toNum(vol['id']),
        hostname: toStr(vol['username']) || `Block ${toNum(vol['id'])}`,
        detail: `${cap} GB — exceeds sdp 32 TB max`,
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

  // IOPS > 64000 (exceeds even sdp max)
  const iopsAffected: AffectedResource[] = [];
  for (const vol of blocks) {
    const iops = toNum(vol['provisionedIops']) || toNum(vol['iops']);
    if (iops > 64000) {
      iopsAffected.push({
        id: toNum(vol['id']),
        hostname: toStr(vol['username']) || `Block ${toNum(vol['id'])}`,
        detail: `${iops} IOPS — exceeds sdp 64K max`,
      });
    }
  }
  results.push(evaluateCheck(IOPS_COMPAT, 'warning', blocks.length, iopsAffected));

  // Volumes requiring sdp (>16 TB or >48K IOPS but within sdp limits)
  const sdpRequiredAffected: AffectedResource[] = [];
  for (const vol of blocks) {
    const cap = toNum(vol['capacityGb']) || toNum(vol['capacity']);
    const iops = toNum(vol['provisionedIops']) || toNum(vol['iops']);
    const needsSdp = (cap > 16384 && cap <= 32768) || (iops > 48000 && iops <= 64000);
    if (needsSdp) {
      const reasons: string[] = [];
      if (cap > 16384) reasons.push(`${cap} GB (>16 TB Gen 1 max)`);
      if (iops > 48000) reasons.push(`${iops} IOPS (>48K Gen 1 max)`);
      sdpRequiredAffected.push({
        id: toNum(vol['id']),
        hostname: toStr(vol['username']) || `Block ${toNum(vol['id'])}`,
        detail: `Requires sdp: ${reasons.join(', ')}`,
      });
    }
  }
  results.push(evaluateCheck(SDP_REQUIRED, 'warning', blocks.length, sdpRequiredAffected));

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

  // Multi-attach: block storage authorized to multiple hosts or subnets
  const multiAttachAffected: AffectedResource[] = [];
  for (const vol of blocks) {
    const guests = toStr(vol['allowedVirtualGuests']);
    const hardware = toStr(vol['allowedHardware']);
    const subnets = toStr(vol['allowedSubnets']);
    const guestCount = guests ? guests.split(',').map(s => s.trim()).filter(Boolean).length : 0;
    const hwCount = hardware ? hardware.split(',').map(s => s.trim()).filter(Boolean).length : 0;
    const subnetCount = subnets ? subnets.split(',').map(s => s.trim()).filter(Boolean).length : 0;
    const totalHosts = guestCount + hwCount;
    if (totalHosts > 1 || subnetCount > 1) {
      const parts: string[] = [];
      if (guestCount > 0) parts.push(`${guestCount} VSI(s)`);
      if (hwCount > 0) parts.push(`${hwCount} BM(s)`);
      if (subnetCount > 0) parts.push(`${subnetCount} subnet(s)`);
      multiAttachAffected.push({
        id: toNum(vol['id']),
        hostname: toStr(vol['username']) || `Block ${toNum(vol['id'])}`,
        detail: `Authorized for ${parts.join(', ')}`,
      });
    }
  }
  results.push(evaluateCheck(MULTI_ATTACH_STORAGE, 'warning', blocks.length, multiAttachAffected));

  // Storage utilization — right-sizing for VPC
  const allVolumes = [...blocks, ...files];
  const utilizationAffected: AffectedResource[] = [];
  for (const vol of allVolumes) {
    const cap = toNum(vol['capacityGb']) || toNum(vol['capacity']);
    const bytesUsed = toNum(vol['bytesUsed']);
    if (cap > 0 && bytesUsed > 0) {
      const capBytes = cap * 1024 * 1024 * 1024;
      const pct = (bytesUsed / capBytes) * 100;
      if (pct < 25) {
        utilizationAffected.push({
          id: toNum(vol['id']),
          hostname: toStr(vol['username']) || `Volume ${toNum(vol['id'])}`,
          detail: `${pct.toFixed(1)}% used (${formatBytes(bytesUsed)} of ${cap} GB) — over-provisioned, consider smaller VPC volume`,
        });
      } else if (pct > 90) {
        utilizationAffected.push({
          id: toNum(vol['id']),
          hostname: toStr(vol['username']) || `Volume ${toNum(vol['id'])}`,
          detail: `${pct.toFixed(1)}% used (${formatBytes(bytesUsed)} of ${cap} GB) — near capacity, consider larger VPC volume`,
        });
      }
    }
  }
  results.push(evaluateCheck(STORAGE_UTILIZATION, 'info', allVolumes.filter(v => toNum(v['bytesUsed']) > 0).length, utilizationAffected));

  return results;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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
