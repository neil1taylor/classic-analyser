import type { CheckResult, PreRequisiteCheck, AffectedResource } from '@/types/migration';
import { evaluateCheck, unknownCheck } from './checkUtils';
import { matchOS } from '../data/osCompatibility';
import { mapDatacenterToVPC } from '../data/datacenterMapping';

// ── VSI Check Definitions ───────────────────────────────────────────────

const VSI_BOOT_DISK: PreRequisiteCheck = {
  id: 'vsi-boot-disk-max',
  name: 'Boot Disk Maximum (250 GB)',
  category: 'compute',
  description: 'VPC instances support a maximum boot volume of 250 GB. VSIs with larger boot disks cannot be directly migrated.',
  threshold: '250 GB',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles',
  remediationSteps: [
    'Reduce the boot disk to 250 GB or less before migration.',
    'Move excess data to secondary data volumes.',
    'Alternatively, create a new VPC instance with a 250 GB boot volume and restore data from backup.',
  ],
};

const VSI_DATA_VOLUME_COUNT: PreRequisiteCheck = {
  id: 'vsi-data-volume-count',
  name: 'Data Volume Count Maximum (12)',
  category: 'compute',
  description: 'VPC instances support a maximum of 12 data volumes attached. VSIs exceeding this limit require consolidation.',
  threshold: '12 data volumes',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-attaching-block-storage',
  remediationSteps: [
    'Consolidate data across fewer, larger volumes before migration.',
    'Archive infrequently accessed data to IBM Cloud Object Storage.',
    'Detach unused volumes.',
  ],
};

const VSI_VCPU_MAX: PreRequisiteCheck = {
  id: 'vsi-vcpu-max',
  name: 'vCPU Maximum (200)',
  category: 'compute',
  description: 'The largest VPC profile (ux2d-200x5600) supports 200 vCPUs. Classic VSIs with more vCPUs cannot be mapped to a single VPC instance.',
  threshold: '200 vCPUs',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-profiles',
  remediationSteps: [
    'Redesign the workload to run across multiple smaller VPC instances.',
    'Consider using VPC Bare Metal if higher core counts are needed.',
    'Evaluate if the workload can be containerized and run on IBM Kubernetes Service.',
  ],
};

const VSI_MEMORY_MAX: PreRequisiteCheck = {
  id: 'vsi-memory-max',
  name: 'Memory Maximum (5,600 GiB)',
  category: 'compute',
  description: 'The largest VPC VSI profile (ux2d-200x5600) supports 5,600 GiB of memory. Classic VSIs exceeding this cannot be mapped.',
  threshold: '5,600 GiB (5734400 MB)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-profiles',
  remediationSteps: [
    'Consider VPC Bare Metal servers which support higher memory.',
    'Split the workload across multiple instances.',
    'Optimize application memory usage before migration.',
  ],
};

const VSI_OS_COMPAT: PreRequisiteCheck = {
  id: 'vsi-os-compat',
  name: 'OS Compatibility',
  category: 'compute',
  description: 'The operating system must have a corresponding VPC stock image or be importable as a custom image.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images',
  remediationSteps: [
    'Upgrade the OS to a VPC-supported version before migration.',
    'Create a custom image if your OS is not available as a stock image.',
    'Check the IBM VPC image catalog for the latest supported OS versions.',
  ],
};

const VSI_DC_AVAIL: PreRequisiteCheck = {
  id: 'vsi-dc-availability',
  name: 'Datacenter Availability',
  category: 'compute',
  description: 'The Classic datacenter must map to an available VPC region. Some Classic DCs have no corresponding VPC region.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-creating-a-vpc-in-a-different-region',
  remediationSteps: [
    'Plan to migrate workloads to the nearest available VPC region.',
    'Update application configurations for the new region endpoint.',
    'Test latency from the new region to dependent services.',
  ],
};

const VSI_DISK_SIZE: PreRequisiteCheck = {
  id: 'vsi-disk-size-2tb',
  name: 'Disk Size (2 TB per volume)',
  category: 'compute',
  description: 'VPC block storage volumes have a maximum size of 16 TB, but individual Classic volumes over 2 TB may require special handling.',
  threshold: '2000 GB',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles',
  remediationSteps: [
    'Split large volumes into smaller ones before migration.',
    'Use VPC block storage custom profiles for volumes up to 16 TB.',
    'Consider IBM Cloud Object Storage for archival data.',
  ],
};

const VSI_LOCAL_DISK: PreRequisiteCheck = {
  id: 'vsi-local-disk',
  name: 'Local Disk Usage',
  category: 'compute',
  description: 'Classic VSIs using local (ephemeral) disks need their data migrated to VPC block storage, which is network-attached only.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-about',
  remediationSteps: [
    'Back up all data from local disks before migration.',
    'Plan to use VPC block storage volumes instead of local disks.',
    'Evaluate performance requirements — VPC block storage uses network-attached IO.',
  ],
};

const VSI_PRIVATE_ONLY: PreRequisiteCheck = {
  id: 'vsi-private-only',
  name: 'Private Network Only',
  category: 'compute',
  description: 'VSIs configured for private-network-only access will need VPC networking configured with no public gateway or floating IP.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-networking-for-vpc',
  remediationSteps: [
    'In VPC, do not assign a floating IP or public gateway to replicate private-only access.',
    'Use VPC VPN or Transit Gateway for private connectivity.',
  ],
};

const VSI_CLOUD_INIT: PreRequisiteCheck = {
  id: 'vsi-cloud-init',
  name: 'Cloud-init / Cloudbase-init',
  category: 'compute',
  description: 'VPC instances require cloud-init (Linux) or cloudbase-init (Windows) for provisioning. Cannot be determined from API data.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images#about-cloud-init',
  remediationSteps: [
    'Ensure cloud-init is installed and enabled on Linux images.',
    'Ensure cloudbase-init is installed on Windows images.',
    'Test the image in VPC before production migration.',
  ],
};

const VSI_VIRTIO: PreRequisiteCheck = {
  id: 'vsi-virtio-drivers',
  name: 'Virtio Drivers',
  category: 'compute',
  description: 'VPC instances require virtio network and disk drivers. Cannot be determined from Classic API data.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images',
  remediationSteps: [
    'Verify virtio drivers are present in the OS image.',
    'Install virtio drivers if missing before creating a custom image.',
    'Most modern Linux distributions include virtio drivers by default.',
  ],
};

const VSI_DOWNTIME: PreRequisiteCheck = {
  id: 'vsi-downtime-planning',
  name: 'Migration Downtime Planning',
  category: 'compute',
  description: 'Migration from Classic to VPC requires planned downtime. Duration depends on data volume and migration method.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-migrate-from-classic',
  remediationSteps: [
    'Plan a maintenance window for each migration wave.',
    'Communicate downtime to stakeholders in advance.',
    'Prepare rollback procedures in case of migration failure.',
  ],
};

// ── Bare Metal Check Definitions ────────────────────────────────────────

const BM_GATEWAY_MEMBER: PreRequisiteCheck = {
  id: 'bm-gateway-member',
  name: 'Gateway Member',
  category: 'compute',
  description: 'Bare metal servers that are gateway members cannot be directly migrated. The gateway must be decommissioned or replaced first.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-networking-for-vpc',
  remediationSteps: [
    'Identify the gateway this server belongs to.',
    'Plan to replace the gateway function with VPC native routing or a virtual appliance.',
    'Remove the bare metal server from the gateway before migration.',
  ],
};

const BM_CORE_MAX: PreRequisiteCheck = {
  id: 'bm-core-max',
  name: 'Core Count Maximum (192)',
  category: 'compute',
  description: 'VPC Bare Metal supports up to 192 physical cores. Servers exceeding this cannot be migrated.',
  threshold: '192 cores',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-bare-metal-servers-profile',
  remediationSteps: [
    'Evaluate if the workload can be distributed across multiple servers.',
    'Consider IBM Power Virtual Servers for very high core count needs.',
  ],
};

const BM_MEMORY_MAX: PreRequisiteCheck = {
  id: 'bm-memory-max',
  name: 'Memory Maximum (768 GB)',
  category: 'compute',
  description: 'VPC Bare Metal supports up to 768 GB of memory. Servers exceeding this cannot be mapped.',
  threshold: '768 GB',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-bare-metal-servers-profile',
  remediationSteps: [
    'Evaluate if the workload can run with 768 GB or less.',
    'Consider splitting the workload across multiple bare metal servers.',
  ],
};

const BM_VSPHERE_OS: PreRequisiteCheck = {
  id: 'bm-vsphere-os',
  name: 'VMware vSphere / ESXi OS',
  category: 'compute',
  description: 'Bare metal servers running VMware vSphere/ESXi cannot be directly migrated to VPC. The hosted VMs must be individually migrated to VPC VSIs or OpenShift Virtualization.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-migrate-from-classic',
  remediationSteps: [
    'Inventory all VMs running on the vSphere host.',
    'Plan to migrate each VM individually to a VPC VSI or OpenShift Virtualization.',
    'Export VM disk images and import as VPC custom images where possible.',
    'Consider IBM Cloud for VMware Solutions if a like-for-like VMware environment is required.',
  ],
};

const BM_ORACLE_DETECTED: PreRequisiteCheck = {
  id: 'bm-oracle-detected',
  name: 'Potential Oracle Workload',
  category: 'compute',
  description: 'Server hardware matches IBM Oracle-certified bare metal configuration (No OS). Oracle workloads should migrate to IBM Power Virtual Server (PowerVS) running AIX rather than VPC bare metal.',
  docsUrl: 'https://cloud.ibm.com/docs/power-iaas?topic=power-iaas-use-case-oracle',
  remediationSteps: [
    'Confirm Oracle Database/applications are running on this server.',
    'Plan migration to IBM Power Virtual Server (PowerVS) on AIX.',
    'Review Oracle licensing — PowerVS supports BYOL with Oracle on POWER.',
    'See IBM Power Virtual Server Oracle deployment guide for architecture details.',
  ],
};

const BM_SAP_DETECTED: PreRequisiteCheck = {
  id: 'bm-sap-detected',
  name: 'Potential SAP Workload',
  category: 'compute',
  description: 'Server hardware matches IBM SAP-certified bare metal configuration with SAP-specific OS. SAP workloads require SAP-certified VPC Bare Metal profiles or IBM Power Virtual Server (PowerVS) for larger configurations.',
  docsUrl: 'https://cloud.ibm.com/docs/sap?topic=sap-hana-iaas-offerings-profiles-intel-bm',
  remediationSteps: [
    'Confirm SAP HANA or SAP NetWeaver applications are running on this server.',
    'For configurations ≤768 GB: migrate to SAP-certified VPC Bare Metal (bx2d-metal-96x384 or mx2d-metal-96x768).',
    'For configurations >768 GB: plan migration to IBM Power Virtual Server (PowerVS) — VPC does not have SAP-certified profiles above 768 GB.',
    'Review SAP licensing and support implications before migration.',
  ],
};

const BM_NIC_SPEED: PreRequisiteCheck = {
  id: 'bm-nic-speed',
  name: 'Network Speed Compatibility',
  category: 'compute',
  description: 'VPC Bare Metal supports up to 25 Gbps network interfaces. Servers with faster NICs may see reduced throughput.',
  threshold: '25 Gbps',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-bare-metal-servers-profile',
  remediationSteps: [
    'Evaluate bandwidth requirements and consider link aggregation in VPC.',
    'Test network performance after migration.',
  ],
};

// ── Runner ──────────────────────────────────────────────────────────────

export function runComputeChecks(collectedData: Record<string, unknown[]>): CheckResult[] {
  const results: CheckResult[] = [];
  const vsis = (collectedData['virtualServers'] ?? []) as Record<string, unknown>[];
  const bms = (collectedData['bareMetal'] ?? []) as Record<string, unknown>[];

  // VSI checks
  const vsiCount = vsis.length;

  // Boot Disk > 250 GB
  const bootDiskAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    const blocks = (vsi['blockDevices'] ?? []) as Record<string, unknown>[];
    if (blocks.length > 0) {
      const bootCap = num(blocks[0], 'diskImage.capacity') || num(blocks[0], 'capacity') || 0;
      if (bootCap > 250) {
        bootDiskAffected.push({
          id: num(vsi, 'id'),
          hostname: str(vsi, 'hostname') || str(vsi, 'fullyQualifiedDomainName') || `VSI ${num(vsi, 'id')}`,
          detail: `Boot disk: ${bootCap} GB`,
        });
      }
    }
  }
  results.push(evaluateCheck(VSI_BOOT_DISK, 'blocker', vsiCount, bootDiskAffected));

  // Data volume count > 12
  const dataVolAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    const blocks = (vsi['blockDevices'] ?? []) as Record<string, unknown>[];
    const dataCount = Math.max(0, blocks.length - 1);
    if (dataCount > 12) {
      dataVolAffected.push({
        id: num(vsi, 'id'),
        hostname: str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`,
        detail: `${dataCount} data volumes`,
      });
    }
  }
  results.push(evaluateCheck(VSI_DATA_VOLUME_COUNT, 'blocker', vsiCount, dataVolAffected));

  // vCPU > 64
  const vcpuAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    const cpu = num(vsi, 'maxCpu') || num(vsi, 'startCpus') || 0;
    if (cpu > 200) {
      vcpuAffected.push({
        id: num(vsi, 'id'),
        hostname: str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`,
        detail: `${cpu} vCPUs`,
      });
    }
  }
  results.push(evaluateCheck(VSI_VCPU_MAX, 'blocker', vsiCount, vcpuAffected));

  // Memory > 512 GB (524288 MB)
  const memAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    const mem = num(vsi, 'maxMemory') || num(vsi, 'maxMemoryCount') || 0;
    if (mem > 5734400) {
      memAffected.push({
        id: num(vsi, 'id'),
        hostname: str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`,
        detail: `${Math.round(mem / 1024)} GB memory`,
      });
    }
  }
  results.push(evaluateCheck(VSI_MEMORY_MAX, 'blocker', vsiCount, memAffected));

  // OS compatibility
  const osAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    const osDesc = str(vsi, 'operatingSystem.softwareDescription.longDescription')
      || str(vsi, 'softwareDescription')
      || str(vsi, 'operatingSystemReferenceCode')
      || '';
    if (osDesc) {
      const match = matchOS(osDesc);
      if (match && !match.vpcAvailable) {
        osAffected.push({
          id: num(vsi, 'id'),
          hostname: str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`,
          detail: `OS: ${osDesc}`,
        });
      }
    }
  }
  results.push(evaluateCheck(VSI_OS_COMPAT, 'blocker', vsiCount, osAffected));

  // Datacenter availability
  const dcAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    const dc = str(vsi, 'datacenter.name') || str(vsi, 'datacenter') || '';
    if (dc) {
      const mapping = mapDatacenterToVPC(dc);
      if (!mapping || !mapping.available) {
        dcAffected.push({
          id: num(vsi, 'id'),
          hostname: str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`,
          detail: `Datacenter: ${dc}`,
        });
      }
    }
  }
  results.push(evaluateCheck(VSI_DC_AVAIL, 'blocker', vsiCount, dcAffected));

  // Disk > 2 TB
  const diskSizeAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    const blocks = (vsi['blockDevices'] ?? []) as Record<string, unknown>[];
    const hasLarge = blocks.some((b) => {
      const cap = num(b, 'diskImage.capacity') || num(b, 'capacity') || 0;
      return cap > 2000;
    });
    if (hasLarge) {
      diskSizeAffected.push({
        id: num(vsi, 'id'),
        hostname: str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`,
        detail: 'Has volumes > 2 TB',
      });
    }
  }
  results.push(evaluateCheck(VSI_DISK_SIZE, 'warning', vsiCount, diskSizeAffected));

  // Local disk
  const localDiskAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    if (vsi['localDiskFlag'] === true) {
      localDiskAffected.push({
        id: num(vsi, 'id'),
        hostname: str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`,
        detail: 'Uses local (ephemeral) disk',
      });
    }
  }
  results.push(evaluateCheck(VSI_LOCAL_DISK, 'warning', vsiCount, localDiskAffected));

  // Private network only
  const privateAffected: AffectedResource[] = [];
  for (const vsi of vsis) {
    if (vsi['privateNetworkOnlyFlag'] === true) {
      privateAffected.push({
        id: num(vsi, 'id'),
        hostname: str(vsi, 'hostname') || `VSI ${num(vsi, 'id')}`,
        detail: 'Private network only',
      });
    }
  }
  results.push(evaluateCheck(VSI_PRIVATE_ONLY, 'info', vsiCount, privateAffected));

  // Unknown checks
  results.push(unknownCheck(VSI_CLOUD_INIT, vsiCount));
  results.push(unknownCheck(VSI_VIRTIO, vsiCount));
  results.push(unknownCheck(VSI_DOWNTIME, vsiCount));

  // Bare Metal checks
  const bmCount = bms.length;

  // Gateway member
  const gwAffected: AffectedResource[] = [];
  for (const bm of bms) {
    if (bm['networkGatewayMemberFlag'] === true) {
      gwAffected.push({
        id: num(bm, 'id'),
        hostname: str(bm, 'hostname') || `BM ${num(bm, 'id')}`,
        detail: 'Gateway member',
      });
    }
  }
  results.push(evaluateCheck(BM_GATEWAY_MEMBER, 'blocker', bmCount, gwAffected));

  // vSphere / VMware OS
  const vsphereAffected: AffectedResource[] = [];
  for (const bm of bms) {
    const osDesc = str(bm, 'operatingSystem.softwareDescription.longDescription')
      || str(bm, 'softwareDescription')
      || str(bm, 'operatingSystemReferenceCode')
      || str(bm, 'os')
      || '';
    if (/vmware|vsphere|esxi/i.test(osDesc)) {
      vsphereAffected.push({
        id: num(bm, 'id'),
        hostname: str(bm, 'hostname') || `BM ${num(bm, 'id')}`,
        detail: `OS: ${osDesc}`,
      });
    }
  }
  results.push(evaluateCheck(BM_VSPHERE_OS, 'blocker', bmCount, vsphereAffected));

  // Core count > 192
  const coreAffected: AffectedResource[] = [];
  for (const bm of bms) {
    const cores = num(bm, 'processorPhysicalCoreAmount') || num(bm, 'hardwareStatus.processorCount') || 0;
    if (cores > 192) {
      coreAffected.push({
        id: num(bm, 'id'),
        hostname: str(bm, 'hostname') || `BM ${num(bm, 'id')}`,
        detail: `${cores} cores`,
      });
    }
  }
  results.push(evaluateCheck(BM_CORE_MAX, 'blocker', bmCount, coreAffected));

  // Memory > 768 GB
  const bmMemAffected: AffectedResource[] = [];
  for (const bm of bms) {
    const memGB = num(bm, 'memoryCapacity') || num(bm, 'memory') || 0;
    if (memGB > 768) {
      bmMemAffected.push({
        id: num(bm, 'id'),
        hostname: str(bm, 'hostname') || `BM ${num(bm, 'id')}`,
        detail: `${memGB} GB memory`,
      });
    }
  }
  results.push(evaluateCheck(BM_MEMORY_MAX, 'blocker', bmCount, bmMemAffected));

  // NIC speed > 25 Gbps
  const nicAffected: AffectedResource[] = [];
  for (const bm of bms) {
    const speed = num(bm, 'networkSpeed') || num(bm, 'primaryNetworkComponent.speed') || 0;
    if (speed > 25000) {
      nicAffected.push({
        id: num(bm, 'id'),
        hostname: str(bm, 'hostname') || `BM ${num(bm, 'id')}`,
        detail: `${speed / 1000} Gbps NIC`,
      });
    }
  }
  results.push(evaluateCheck(BM_NIC_SPEED, 'warning', bmCount, nicAffected));

  // Oracle HCL hardware profile detection
  const oracleHclProfiles = [
    { cores: 4, memoryGB: 64 },
    { cores: 16, memoryGB: 384 },
    { cores: 48, memoryGB: 768 },
  ];
  const oracleAffected: AffectedResource[] = [];
  for (const bm of bms) {
    const cores = num(bm, 'processorPhysicalCoreAmount') || num(bm, 'hardwareStatus.processorCount') || num(bm, 'cores') || 0;
    const memGB = num(bm, 'memoryCapacity') || num(bm, 'memory') || 0;
    const osDesc = str(bm, 'operatingSystem.softwareDescription.longDescription')
      || str(bm, 'softwareDescription')
      || str(bm, 'operatingSystemReferenceCode')
      || str(bm, 'os')
      || '';
    const hostname = str(bm, 'hostname') || '';

    const profileMatch = oracleHclProfiles.some((p) => p.cores === cores && p.memoryGB === memGB);
    if (profileMatch) {
      const noOs = !osDesc || /no\s*os/i.test(osDesc);
      const oracleOs = /oracle.*linux|oei|oel/i.test(osDesc);
      const oracleHostname = /ora|oracle|orcl/i.test(hostname);
      if (noOs || oracleOs || oracleHostname) {
        oracleAffected.push({
          id: num(bm, 'id'),
          hostname: hostname || `BM ${num(bm, 'id')}`,
          detail: `${cores} cores / ${memGB} GB${osDesc ? ` — OS: ${osDesc}` : ' — No OS'}`,
        });
      }
    }
  }
  results.push(evaluateCheck(BM_ORACLE_DETECTED, 'warning', bmCount, oracleAffected));

  // SAP HANA-certified hardware profile detection
  const sapHanaProfiles = [
    { cores: 36, memoryGB: 192 },
    { cores: 36, memoryGB: 384 },
    { cores: 36, memoryGB: 768 },
    { cores: 32, memoryGB: 192 },
    { cores: 32, memoryGB: 384 },
    { cores: 40, memoryGB: 768 },
    { cores: 56, memoryGB: 1536 },
    { cores: 56, memoryGB: 3072 },
    { cores: 112, memoryGB: 3072 },
  ];
  const sapAffected: AffectedResource[] = [];
  for (const bm of bms) {
    const cores = num(bm, 'processorPhysicalCoreAmount') || num(bm, 'hardwareStatus.processorCount') || num(bm, 'cores') || 0;
    const memGB = num(bm, 'memoryCapacity') || num(bm, 'memory') || 0;
    const osDesc = str(bm, 'operatingSystem.softwareDescription.longDescription')
      || str(bm, 'softwareDescription')
      || str(bm, 'operatingSystemReferenceCode')
      || str(bm, 'os')
      || '';
    const hostname = str(bm, 'hostname') || '';

    const profileMatch = sapHanaProfiles.some((p) => p.cores === cores && p.memoryGB === memGB);
    if (profileMatch) {
      const sapOs = /sles.*sap|suse.*sap|rhel.*sap|red\s*hat.*sap/i.test(osDesc);
      const sapHostname = /\bsap\b|\bhana\b|\bs4hana\b|\bbw\b|\becc\b|\berp\b|\bnw\b/i.test(hostname);
      if (sapOs || sapHostname) {
        const target = memGB > 768 ? 'PowerVS' : 'SAP-certified VPC Bare Metal';
        sapAffected.push({
          id: num(bm, 'id'),
          hostname: hostname || `BM ${num(bm, 'id')}`,
          detail: `${cores} cores / ${memGB} GB — ${osDesc || 'SAP hostname match'} → ${target}`,
        });
      }
    }
  }
  results.push(evaluateCheck(BM_SAP_DETECTED, 'warning', bmCount, sapAffected));

  return results;
}

function num(obj: Record<string, unknown>, path: string): number {
  const val = getNestedValue(obj, path);
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function str(obj: Record<string, unknown>, path: string): string {
  const val = getNestedValue(obj, path);
  return typeof val === 'string' ? val : '';
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}
