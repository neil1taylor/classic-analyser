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

const VSI_WINDOWS_CLOUDBASE_INIT: PreRequisiteCheck = {
  id: 'vsi-windows-cloudbase-init',
  name: 'Windows Cloudbase-Init & VirtIO Drivers',
  category: 'compute',
  description: 'Windows servers migrating to VPC require Cloudbase-Init (not cloud-init) and VirtIO drivers. Without these, the VPC instance cannot initialize networking or metadata services. Cannot be verified from API data.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images#about-cloud-init',
  remediationSteps: [
    'Install Cloudbase-Init on the Windows server (https://cloudbase.it/cloudbase-init/).',
    'Install VirtIO drivers (Red Hat virtio-win package).',
    'Configure Cloudbase-Init for ConfigDrive and HTTP metadata services.',
    'Set serial port COM1 for Cloudbase-Init logging.',
    'Run Sysprep with Cloudbase-Init before creating the image template.',
    'Test the custom image on a VPC instance before production migration.',
  ],
};

const VSI_BOOT_MODE_UEFI: PreRequisiteCheck = {
  id: 'vsi-boot-mode-uefi',
  name: 'Boot Mode (UEFI Required for Gen3 Profiles)',
  category: 'compute',
  description: 'Gen3 VPC profiles (bx3, cx3, mx3, etc.) require UEFI boot mode. Classic instances using BIOS/MBR will fail to boot on Gen3 profiles. Boot mode cannot be determined from Classic API data.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-migrate-vsi-to-vpc',
  remediationSteps: [
    'Verify the Classic instance boots via UEFI/GPT (not BIOS/MBR).',
    'If BIOS/MBR: convert the boot disk to GPT and configure UEFI boot before creating the image template.',
    'Alternative: use a Gen2 profile (bx2, cx2, mx2) which supports both BIOS and UEFI boot modes.',
    'See https://fullvalence.com/2025/11/10/from-vmware-to-ibm-cloud-vpc-vsi-part-3-migrating-virtual-machines/',
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

const BM_HYPERVISOR: PreRequisiteCheck = {
  id: 'bm-hypervisor',
  name: 'Hypervisor Detected (VMware / XenServer / Hyper-V)',
  category: 'compute',
  description: 'Bare metal servers running a hypervisor (VMware vSphere/ESXi, Citrix XenServer, or Microsoft Hyper-V). The hosted VMs must be individually migrated to VPC VSIs or OpenShift Virtualization. Detection is based on the reported OS string and server notes/tags.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-migrate-from-classic',
  remediationSteps: [
    'Inventory all guest VMs running on the hypervisor host.',
    'Export guest VM disk images for import as VPC custom images.',
    'Plan to migrate each guest VM individually to a VPC VSI.',
    'Consider OpenShift Virtualization for workloads requiring a hypervisor layer.',
    'For VMware environments, evaluate IBM Cloud for VMware Solutions for like-for-like migration.',
  ],
};

const OS_32BIT: PreRequisiteCheck = {
  id: 'os-32bit',
  name: '32-bit Operating System',
  category: 'compute',
  description: 'Servers running 32-bit operating systems cannot be migrated to VPC. VPC only supports 64-bit OS images. For bare metal servers, OS detection relies on the reported OS string which may not reflect the actual guest OS.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images',
  remediationSteps: [
    'Upgrade the workload to a 64-bit operating system before migration.',
    'For legacy applications that require 32-bit, consider running them under Hyper-V or OpenShift Virtualization on VPC.',
    'Create a VPC custom image from the upgraded 64-bit OS.',
  ],
};

const OS_UNSUPPORTED: PreRequisiteCheck = {
  id: 'os-unsupported',
  name: 'Unsupported Operating System',
  category: 'compute',
  description: 'Servers running operating systems that cannot run on IBM Cloud VPC. Windows 2003/2008 lack VirtIO drivers required by VPC — VMs will not boot. Other OSes (Solaris, AIX, HP-UX, FreeBSD) are not x86-compatible or have no VPC support path.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images',
  remediationSteps: [
    'Windows 2003: No VirtIO drivers exist — upgrade to Windows Server 2019/2022 or re-platform the application.',
    'Windows 2008/R2: VirtIO drivers dropped from virtio-win 0.1.215+. IBM Cloud VPC requires virtio-win 1.9.24+ which has no 2008 drivers. Upgrade to Windows Server 2019/2022.',
    'RHEL 6/CentOS 5-6: Upgrade to RHEL 8/9 or Rocky Linux 8/9.',
    'Solaris/AIX/HP-UX/FreeBSD: Re-platform to a supported Linux distribution, or use PowerVS for AIX workloads.',
  ],
};

const OS_EOL: PreRequisiteCheck = {
  id: 'os-eol',
  name: 'End-of-Life Operating System',
  category: 'compute',
  description: 'Servers running end-of-life OS versions should be upgraded before or during migration. EOL operating systems may still be available on VPC as BYOL custom images but pose security risks.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images',
  remediationSteps: [
    'Upgrade to a supported OS version before migration.',
    'For CentOS 7, consider migrating to RHEL 8/9, AlmaLinux 8/9, or Rocky Linux 8/9.',
    'For RHEL 7, upgrade to RHEL 8 or 9.',
    'For BYOL operating systems (RHEL 7, Windows 2012), create a custom image for VPC import.',
    'Test application compatibility with the target OS version.',
  ],
};

const BM_SINGLE_SOCKET_HIGH_CLOCK: PreRequisiteCheck = {
  id: 'bm-single-socket-high-clock',
  name: 'Single-Socket High Clock Speed Processor',
  category: 'compute',
  description: 'Bare metal servers with single-socket, high clock speed processors (e.g., Xeon E-2174G / CoffeeLake at 3.8 GHz) have no equivalent VPC Bare Metal profile. VPC Bare Metal uses dual-socket Cascade Lake / Sapphire Rapids configurations. Cannot be determined from SoftLayer API data — processor model and clock speed are not collected.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-bare-metal-servers-profile',
  remediationSteps: [
    'Check the server order details or billing for processor model information.',
    'Look for Xeon E-21xx series or similar single-socket configurations.',
    'Evaluate if the workload can run on VPC dual-socket profiles with comparable aggregate performance.',
    'Consider VPC VSIs for workloads that do not require bare metal.',
  ],
};

const IKS_ROKS_DETECTED: PreRequisiteCheck = {
  id: 'server-iks-roks-detected',
  name: 'Possible IKS/ROKS Worker Node',
  category: 'compute',
  description: 'Servers with "kube" in the hostname are likely IBM Kubernetes Service (IKS) or Red Hat OpenShift on IBM Cloud (ROKS) worker nodes. These should not be migrated individually — the entire cluster must be recreated in VPC using VPC-based IKS/ROKS clusters.',
  docsUrl: 'https://cloud.ibm.com/docs/containers?topic=containers-vpc-migrate',
  remediationSteps: [
    'Confirm the server is an IKS/ROKS worker node via ibmcloud ks cluster ls or the IBM Cloud console.',
    'Create a new IKS or ROKS cluster on VPC infrastructure.',
    'Migrate workloads using Kubernetes-native tools (kubectl, Helm, Velero).',
    'Do not attempt to migrate worker nodes as individual servers.',
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

const SOFTWARE_ADDON_DETECTED: PreRequisiteCheck = {
  id: 'compute-software-addon',
  name: 'Software Add-on Detected',
  category: 'compute',
  description: 'Classic software add-ons (cPanel, Plesk, antivirus, monitoring agents, R1Soft backup, etc.) provisioned through IBM Cloud are not available on VPC. These must be self-installed and licensed on VPC instances.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images',
  remediationSteps: [
    'Verify whether each add-on is still required for the migrated workload.',
    'Plan to install and self-license software add-ons on VPC instances.',
    'For cPanel/Plesk: purchase licenses directly from the vendor.',
    'For monitoring: use IBM Cloud Monitoring or install agents manually.',
    'For backup: use IBM Cloud Backup for VPC or third-party solutions.',
  ],
};

const GPU_DETECTED: PreRequisiteCheck = {
  id: 'compute-gpu-detected',
  name: 'GPU Workload Detected',
  category: 'compute',
  description: 'Classic GPU instances use different GPU hardware than VPC. VPC offers GPU profiles (gx2, gx3d with NVIDIA A100/L40S) but Classic GPU types (K80, P100, V100) are different. GPU driver compatibility must be verified.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-profiles#gpu',
  remediationSteps: [
    'Review VPC GPU profile options (gx2, gx3d families).',
    'Validate GPU driver and CUDA version compatibility.',
    'Test workload performance on VPC GPU profiles before migration.',
    'Consider IBM Power Virtual Server for specialized GPU workloads.',
  ],
};

const RESERVED_CAPACITY_ACTIVE: PreRequisiteCheck = {
  id: 'compute-reserved-capacity',
  name: 'Active Reserved Capacity',
  category: 'compute',
  description: 'Active reserved capacity commitments (1-year or 3-year terms) have cost and contractual implications for migration. Migrating VSIs before reservation expiry may result in wasted commitment costs.',
  docsUrl: 'https://cloud.ibm.com/docs/virtual-servers?topic=virtual-servers-about-reserved-virtual-servers',
  remediationSteps: [
    'Review reservation terms and expiry dates before migrating associated VSIs.',
    'Plan migration timeline around reservation expiry to avoid wasted costs.',
    'Contact IBM Cloud Support about early termination options if needed.',
    'Consider running Classic reserved instances alongside VPC during transition.',
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

// ── Account/Region Quota Checks ─────────────────────────────────────────

const QUOTA_VCPU_PER_REGION: PreRequisiteCheck = {
  id: 'quota-vcpu-per-region',
  name: 'VPC vCPU Quota per Region (200)',
  category: 'compute',
  description: 'VPC accounts have a default quota of 200 vCPUs per region. Migrating all Classic VSIs to a single VPC region may exceed this quota. Quotas can be increased by contacting IBM Cloud Support.',
  threshold: '200 vCPUs per region (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request a vCPU quota increase via IBM Cloud Support before migration.',
    'Distribute workloads across multiple VPC regions to stay within default quotas.',
    'Phase migration in waves to manage quota consumption.',
  ],
};

const QUOTA_MEMORY_PER_REGION: PreRequisiteCheck = {
  id: 'quota-memory-per-region',
  name: 'VPC Memory Quota per Region (5,600 GB)',
  category: 'compute',
  description: 'VPC accounts have a default quota of 5,600 GB RAM per region. Migrating all Classic VSIs to a single VPC region may exceed this quota. Quotas can be increased by contacting IBM Cloud Support.',
  threshold: '5,600 GB per region (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request a memory quota increase via IBM Cloud Support before migration.',
    'Distribute workloads across multiple VPC regions.',
    'Right-size memory allocations during migration to reduce total demand.',
  ],
};

const QUOTA_BM_PER_ACCOUNT: PreRequisiteCheck = {
  id: 'quota-bm-per-account',
  name: 'VPC Bare Metal Quota per Account (25)',
  category: 'compute',
  description: 'VPC accounts have a default quota of 25 bare metal servers per account. Migrating all Classic bare metal servers may exceed this quota. Quotas can be increased by contacting IBM Cloud Support.',
  threshold: '25 bare metal servers per account (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request a bare metal quota increase via IBM Cloud Support before migration.',
    'Evaluate if some bare metal workloads can run on VPC VSIs instead.',
    'Phase bare metal migrations to manage quota consumption.',
  ],
};

const QUOTA_PLACEMENT_GROUPS: PreRequisiteCheck = {
  id: 'quota-placement-groups',
  name: 'VPC Placement Group Quota per Region (100)',
  category: 'compute',
  description: 'VPC accounts have a default quota of 100 placement groups per region. Classic placement groups exceeding this quota need consolidation.',
  threshold: '100 placement groups per region (default quota)',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-quotas',
  remediationSteps: [
    'Request a placement group quota increase via IBM Cloud Support if needed.',
    'Consolidate placement groups where possible.',
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
    const rawBlocks1 = vsi['blockDevices'];
    const blocks = (Array.isArray(rawBlocks1) ? rawBlocks1 : []) as Record<string, unknown>[];
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
    const rawBlocks2 = vsi['blockDevices'];
    const blocks2 = (Array.isArray(rawBlocks2) ? rawBlocks2 : []) as Record<string, unknown>[];
    const dataCount = Math.max(0, blocks2.length - 1);
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
    const rawBlocks3 = vsi['blockDevices'];
    const blocks3 = (Array.isArray(rawBlocks3) ? rawBlocks3 : []) as Record<string, unknown>[];
    const hasLarge = blocks3.some((b) => {
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

  // Windows-specific Cloudbase-Init + VirtIO (conditional — only when Windows servers present)
  const windowsVsis = vsis.filter((vsi) => {
    const osDesc = str(vsi, 'operatingSystem.softwareDescription.longDescription')
      || str(vsi, 'softwareDescription')
      || str(vsi, 'operatingSystemReferenceCode')
      || str(vsi, 'os')
      || '';
    return /windows/i.test(osDesc);
  });
  if (windowsVsis.length > 0) {
    results.push(unknownCheck(VSI_WINDOWS_CLOUDBASE_INIT, windowsVsis.length));
  }

  // UEFI boot mode — Gen3 profiles require UEFI; cannot determine boot mode from API
  results.push(unknownCheck(VSI_BOOT_MODE_UEFI, vsiCount));

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

  // Hypervisor detection (VMware, XenServer, Hyper-V)
  const hypervisorAffected: AffectedResource[] = [];
  const hypervisorPattern = /vmware|vsphere|esxi|xenserver|xen\s*server|citrix\s*hypervisor|hyper[\s-]?v/i;
  for (const bm of bms) {
    const osDesc = str(bm, 'operatingSystem.softwareDescription.longDescription')
      || str(bm, 'softwareDescription')
      || str(bm, 'operatingSystemReferenceCode')
      || str(bm, 'os')
      || '';
    const notes = str(bm, 'notes') || '';
    const tags = str(bm, 'tagReferences') || '';
    const combined = `${osDesc} ${notes} ${tags}`;
    if (hypervisorPattern.test(combined)) {
      const type = /vmware|vsphere|esxi/i.test(combined) ? 'VMware'
        : /xenserver|xen\s*server|citrix/i.test(combined) ? 'XenServer'
        : 'Hyper-V';
      hypervisorAffected.push({
        id: num(bm, 'id'),
        hostname: str(bm, 'hostname') || `BM ${num(bm, 'id')}`,
        detail: `${type} — OS: ${osDesc || 'detected via notes/tags'}`,
      });
    }
  }
  results.push(evaluateCheck(BM_HYPERVISOR, 'blocker', bmCount, hypervisorAffected));

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

  // Single-socket high clock speed — unknown (not determinable from API)
  results.push(unknownCheck(BM_SINGLE_SOCKET_HIGH_CLOCK, bmCount));

  // 32-bit OS detection (blocker) — checks both VSIs and BMs
  const allServers = [...vsis, ...bms];
  const is32BitPattern = /\b32[\s-]?bit\b|i[36]86(?!_64)\b|\bx86\b(?![\s_-]*64)/i;
  const os32bitAffected: AffectedResource[] = [];
  for (const server of allServers) {
    const osDesc = str(server, 'operatingSystem.softwareDescription.longDescription')
      || str(server, 'softwareDescription')
      || str(server, 'operatingSystemReferenceCode')
      || str(server, 'os')
      || '';
    if (osDesc && is32BitPattern.test(osDesc)) {
      os32bitAffected.push({
        id: num(server, 'id'),
        hostname: str(server, 'hostname') || str(server, 'fullyQualifiedDomainName') || `Server ${num(server, 'id')}`,
        detail: `OS: ${osDesc}`,
      });
    }
  }
  results.push(evaluateCheck(OS_32BIT, 'blocker', allServers.length, os32bitAffected));

  // Unsupported OS detection (blocker) — OSes with no VPC path (no VirtIO drivers, no image)
  const unsupportedAffected: AffectedResource[] = [];
  for (const server of allServers) {
    const osDesc = str(server, 'operatingSystem.softwareDescription.longDescription')
      || str(server, 'softwareDescription')
      || str(server, 'operatingSystemReferenceCode')
      || str(server, 'os')
      || '';
    if (osDesc) {
      const match = matchOS(osDesc);
      if (match && match.imageType === 'none') {
        unsupportedAffected.push({
          id: num(server, 'id'),
          hostname: str(server, 'hostname') || str(server, 'fullyQualifiedDomainName') || `Server ${num(server, 'id')}`,
          detail: `${match.classicOS}: ${match.notes}`,
        });
      }
    }
  }
  results.push(evaluateCheck(OS_UNSUPPORTED, 'blocker', allServers.length, unsupportedAffected));

  // End-of-life OS detection (warning) — EOL but still available on VPC (e.g. BYOL)
  // Excludes OSes already caught by the unsupported check above
  const eolFallbackPattern = /centos\s*[567]\b|red\s*hat.*[56]\b|rhel\s*[56]\b|windows.*(2003|2008|2008\s*r2)\b|debian\s*[89]\b|ubuntu\s*(14|16|18)\b|sles?\s*(11|12)\b|suse.*(11|12)\b/i;
  const eolAffected: AffectedResource[] = [];
  for (const server of allServers) {
    const osDesc = str(server, 'operatingSystem.softwareDescription.longDescription')
      || str(server, 'softwareDescription')
      || str(server, 'operatingSystemReferenceCode')
      || str(server, 'os')
      || '';
    if (!osDesc) continue;
    const match = matchOS(osDesc);
    if (match) {
      // Skip if already caught by unsupported check (imageType === 'none')
      if (match.imageType === 'none') continue;
      // Flag if the OS has an EOL date in the past
      if (match.eolDate && new Date(match.eolDate) < new Date()) {
        eolAffected.push({
          id: num(server, 'id'),
          hostname: str(server, 'hostname') || str(server, 'fullyQualifiedDomainName') || `Server ${num(server, 'id')}`,
          detail: `${match.classicOS} (EOL ${match.eolDate}): ${match.notes}`,
        });
      }
    } else if (eolFallbackPattern.test(osDesc)) {
      // Fallback for OS strings not in the compatibility table
      eolAffected.push({
        id: num(server, 'id'),
        hostname: str(server, 'hostname') || str(server, 'fullyQualifiedDomainName') || `Server ${num(server, 'id')}`,
        detail: `OS: ${osDesc}`,
      });
    }
  }
  results.push(evaluateCheck(OS_EOL, 'warning', allServers.length, eolAffected));

  // IKS/ROKS worker node detection — hostname contains "kube"
  const kubeAffected: AffectedResource[] = [];
  for (const server of allServers) {
    const hostname = str(server, 'hostname') || str(server, 'fullyQualifiedDomainName') || '';
    if (/kube/i.test(hostname)) {
      kubeAffected.push({
        id: num(server, 'id'),
        hostname: hostname || `Server ${num(server, 'id')}`,
        detail: 'Hostname contains "kube" — likely IKS/ROKS worker node',
      });
    }
  }
  results.push(evaluateCheck(IKS_ROKS_DETECTED, 'warning', allServers.length, kubeAffected));

  // Software add-on detection — scan billing items for non-OS software
  const billingItems = (collectedData['billingItems'] ?? []) as Record<string, unknown>[];
  const addonPattern = /cpanel|plesk|anti[\s_-]?virus|monitoring[\s_-]?agent|r1soft|control[\s_-]?panel|cdp|evault|backup[\s_-]?agent|citrix|veeam/i;
  const addonCatPattern = /^(cpanel|plesk_billing|anti_virus|monitoring_agent|software_license|control_panel|cdp|evault)$/i;
  const softwareAffected: AffectedResource[] = [];
  for (const item of billingItems) {
    const catCode = str(item, 'categoryCode');
    const desc = str(item, 'description');
    if (addonCatPattern.test(catCode) || addonPattern.test(desc)) {
      softwareAffected.push({
        id: num(item, 'id') || num(item, 'parentId'),
        hostname: desc || catCode || `Billing item ${num(item, 'id')}`,
        detail: `Category: ${catCode || 'unknown'} — ${desc || 'no description'}`,
      });
    }
  }
  results.push(evaluateCheck(SOFTWARE_ADDON_DETECTED, 'warning', billingItems.length, softwareAffected));

  // GPU detection — scan billing items for GPU category codes or descriptions
  const gpuPattern = /\bgpu\b|\btesla\b|\bnvidia\b|\bcuda\b|graphic/i;
  const gpuCatPattern = /^gpu/i;
  const gpuAffected: AffectedResource[] = [];
  for (const item of billingItems) {
    const catCode = str(item, 'categoryCode');
    const desc = str(item, 'description');
    if (gpuCatPattern.test(catCode) || gpuPattern.test(desc)) {
      gpuAffected.push({
        id: num(item, 'id') || num(item, 'parentId'),
        hostname: desc || catCode || `Billing item ${num(item, 'id')}`,
        detail: `Category: ${catCode || 'unknown'} — ${desc || 'no description'}`,
      });
    }
  }
  results.push(evaluateCheck(GPU_DETECTED, 'warning', billingItems.length, gpuAffected));

  // Reserved Capacity — active reservations have cost/contractual implications
  const reserved = (collectedData['reservedCapacity'] ?? []) as Record<string, unknown>[];
  const reservedAffected: AffectedResource[] = [];
  for (const rc of reserved) {
    const name = str(rc, 'name') || str(rc, 'description') || `Reservation ${num(rc, 'id')}`;
    const instances = num(rc, 'instanceCount') || num(rc, 'instancesCount') || 0;
    const router = str(rc, 'backendRouter.hostname') || str(rc, 'backendRouter') || '';
    const detail = [
      instances > 0 ? `${instances} instance(s)` : '',
      router ? `router: ${router}` : '',
    ].filter(Boolean).join(', ');
    reservedAffected.push({
      id: num(rc, 'id'),
      hostname: name,
      detail: detail || 'Active reservation',
    });
  }
  results.push(evaluateCheck(RESERVED_CAPACITY_ACTIVE, 'warning', reserved.length, reservedAffected));

  // ── Account/Region Quota Checks ────────────────────────────────────

  // Aggregate vCPU per target VPC region (quota: 200)
  const vcpuByRegion = new Map<string, number>();
  for (const vsi of vsis) {
    const dc = str(vsi, 'datacenter.name') || str(vsi, 'datacenter') || '';
    const mapping = dc ? mapDatacenterToVPC(dc) : null;
    const region = mapping?.vpcRegion ?? 'unknown';
    const cpu = num(vsi, 'maxCpu') || num(vsi, 'startCpus') || 0;
    vcpuByRegion.set(region, (vcpuByRegion.get(region) ?? 0) + cpu);
  }
  const vcpuQuotaAffected: AffectedResource[] = [];
  for (const [region, total] of vcpuByRegion) {
    if (total > 200) {
      vcpuQuotaAffected.push({
        id: region,
        hostname: region,
        detail: `${total} vCPUs (quota: 200)`,
      });
    }
  }
  results.push(evaluateCheck(QUOTA_VCPU_PER_REGION, 'warning', vsis.length, vcpuQuotaAffected));

  // Aggregate memory per target VPC region (quota: 5600 GB)
  const memByRegion = new Map<string, number>();
  for (const vsi of vsis) {
    const dc = str(vsi, 'datacenter.name') || str(vsi, 'datacenter') || '';
    const mapping = dc ? mapDatacenterToVPC(dc) : null;
    const region = mapping?.vpcRegion ?? 'unknown';
    const memMB = num(vsi, 'maxMemory') || num(vsi, 'maxMemoryCount') || 0;
    memByRegion.set(region, (memByRegion.get(region) ?? 0) + memMB);
  }
  const memQuotaAffected: AffectedResource[] = [];
  for (const [region, totalMB] of memByRegion) {
    const totalGB = Math.round(totalMB / 1024);
    if (totalGB > 5600) {
      memQuotaAffected.push({
        id: region,
        hostname: region,
        detail: `${totalGB} GB memory (quota: 5,600 GB)`,
      });
    }
  }
  results.push(evaluateCheck(QUOTA_MEMORY_PER_REGION, 'warning', vsis.length, memQuotaAffected));

  // Bare metal count per account (quota: 25)
  const bmQuotaAffected: AffectedResource[] = [];
  if (bms.length > 25) {
    bmQuotaAffected.push({
      id: 'account',
      hostname: 'Account total',
      detail: `${bms.length} bare metal servers (quota: 25)`,
    });
  }
  results.push(evaluateCheck(QUOTA_BM_PER_ACCOUNT, 'warning', bms.length, bmQuotaAffected));

  // Placement groups per region (quota: 100)
  const placementGroups = (collectedData['placementGroups'] ?? []) as Record<string, unknown>[];
  const pgByRegion = new Map<string, number>();
  for (const pg of placementGroups) {
    const dc = str(pg, 'datacenter') || str(pg, 'backendRouter.datacenter.name') || '';
    const mapping = dc ? mapDatacenterToVPC(dc) : null;
    const region = mapping?.vpcRegion ?? 'unknown';
    pgByRegion.set(region, (pgByRegion.get(region) ?? 0) + 1);
  }
  const pgQuotaAffected: AffectedResource[] = [];
  for (const [region, count] of pgByRegion) {
    if (count > 100) {
      pgQuotaAffected.push({
        id: region,
        hostname: region,
        detail: `${count} placement groups (quota: 100)`,
      });
    }
  }
  results.push(evaluateCheck(QUOTA_PLACEMENT_GROUPS, 'info', placementGroups.length, pgQuotaAffected));

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
