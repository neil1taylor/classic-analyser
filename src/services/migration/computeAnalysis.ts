import type { ComputeAssessment, VSIMigration, BareMetalMigration, VPCProfile, MigrationPreferences, MigrationStatus, MigrationApproach, ExecutionStep } from '@/types/migration';
import { VPC_PROFILES, VPC_BARE_METAL_PROFILES, isBurstableProfile, isGen3Profile, hasInstanceStorage } from './data/vpcProfiles';
import { matchOS } from './data/osCompatibility';
import { mapDatacenterToVPC } from './data/datacenterMapping';

let activeProfiles: VPCProfile[] = VPC_PROFILES;
let activeBareMetalProfiles: VPCProfile[] = VPC_BARE_METAL_PROFILES;

function field(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key];
}
function num(item: unknown, key: string): number {
  return Number(field(item, key) ?? 0);
}
function str(item: unknown, key: string): string {
  return String(field(item, key) ?? '');
}

// ── Burstable classification ────────────────────────────────────────────────
// Patterns that indicate a VM should NOT use burstable/flex profiles

const NETWORK_APPLIANCE_PATTERNS = [
  /firewall/i, /router/i, /loadbalancer/i, /load[-_]?balancer/i,
  /f5[-_]?/i, /bigip/i, /paloalto/i, /pan[-_]?/i, /checkpoint/i,
  /fortinet/i, /fortigate/i, /citrix[-_]?adc/i, /netscaler/i,
  /nginx[-_]?lb/i, /haproxy/i, /asa[-_]?/i, /vpn[-_]?/i,
  /proxy/i, /waf[-_]?/i, /ids[-_]?/i, /ips[-_]?/i,
];

const ENTERPRISE_APP_PATTERNS = [
  /oracle/i, /\bsap[-_]/i, /sql[-_]?server/i, /mssql/i, /db2/i,
  /websphere/i, /weblogic/i, /jboss/i, /exchange/i, /sharepoint/i,
  /dynamics/i, /scom/i, /sccm/i, /domain[-_]?controller/i,
  /active[-_]?directory/i, /dns[-_]?server/i, /dhcp[-_]?server/i,
];

interface BurstableClassification {
  isBurstableSuitable: boolean;
  reasons: string[];
}

function classifyForBurstable(hostname: string): BurstableClassification {
  const reasons: string[] = [];

  for (const pattern of NETWORK_APPLIANCE_PATTERNS) {
    if (pattern.test(hostname)) {
      reasons.push('Network appliance');
      break;
    }
  }

  for (const pattern of ENTERPRISE_APP_PATTERNS) {
    if (pattern.test(hostname)) {
      reasons.push('Enterprise app');
      break;
    }
  }

  return {
    isBurstableSuitable: reasons.length === 0,
    reasons,
  };
}

// ── Profile selection ───────────────────────────────────────────────────────

function mapToVPCProfile(cpu: number, memoryMB: number): { primary: VPCProfile | null; alternatives: VPCProfile[] } {
  const memoryGB = memoryMB / 1024;

  // Determine recommended family based on memory:cpu ratio
  const ratio = memoryGB / Math.max(cpu, 1);
  let preferredFamily: string;
  if (ratio <= 2.5) preferredFamily = 'compute';
  else if (ratio <= 5) preferredFamily = 'balanced';
  else if (ratio <= 10) preferredFamily = 'memory';
  else if (ratio <= 14) preferredFamily = 'very-high-memory';
  else preferredFamily = 'ultra-high-memory';

  // Filter to only standard (non-burstable) profiles that meet requirements
  const candidates = activeProfiles
    .filter((p) => !isBurstableProfile(p.name) && p.vcpu >= cpu && p.memory >= memoryGB)
    .sort((a, b) => {
      // 1. Prefer the recommended family
      const aFamilyMatch = a.family === preferredFamily ? 0 : 1;
      const bFamilyMatch = b.family === preferredFamily ? 0 : 1;
      if (aFamilyMatch !== bFamilyMatch) return aFamilyMatch - bFamilyMatch;

      // 2. Prefer gen3 profiles (Sapphire Rapids)
      const aGen3 = isGen3Profile(a.name) ? 0 : 1;
      const bGen3 = isGen3Profile(b.name) ? 0 : 1;
      if (aGen3 !== bGen3) return aGen3 - bGen3;

      // 3. When specs are equal, prefer non-instance-storage (d-suffix is ephemeral NVMe)
      const aHasIS = hasInstanceStorage(a.name) ? 1 : 0;
      const bHasIS = hasInstanceStorage(b.name) ? 1 : 0;
      if (aHasIS !== bHasIS) return aHasIS - bHasIS;

      // 4. Then by waste (closest fit)
      const aWaste = (a.vcpu - cpu) + (a.memory - memoryGB);
      const bWaste = (b.vcpu - cpu) + (b.memory - memoryGB);
      return aWaste - bWaste;
    });

  return {
    primary: candidates[0] ?? null,
    alternatives: candidates.slice(1, 3),
  };
}

function mapToBareMetalProfile(cores: number, memoryGB: number): VPCProfile | null {
  const ratio = memoryGB / Math.max(cores, 1);
  let preferredFamily: string;
  if (ratio <= 2.5) preferredFamily = 'compute';
  else if (ratio <= 5) preferredFamily = 'balanced';
  else preferredFamily = 'memory';

  const candidates = activeBareMetalProfiles
    .filter((p) => p.vcpu >= cores && p.memory >= memoryGB)
    .sort((a, b) => {
      const aFamilyMatch = a.family === preferredFamily ? 0 : 1;
      const bFamilyMatch = b.family === preferredFamily ? 0 : 1;
      if (aFamilyMatch !== bFamilyMatch) return aFamilyMatch - bFamilyMatch;

      // Prefer gen3 bare metal
      const aGen3 = isGen3Profile(a.name) ? 0 : 1;
      const bGen3 = isGen3Profile(b.name) ? 0 : 1;
      if (aGen3 !== bGen3) return aGen3 - bGen3;

      const aWaste = (a.vcpu - cores) + (a.memory - memoryGB);
      const bWaste = (b.vcpu - cores) + (b.memory - memoryGB);
      return aWaste - bWaste;
    });

  return candidates[0] ?? null;
}

// ── Migration Approach Classification ──────────────────────────────────────
// Decision tree based on IBM's classic-to-vpc migration docs:
// Re-architect → IKS/ROKS managed K8s
// Re-platform  → VMware/hypervisor hosts, Oracle/SAP workloads, complex blockers
// Rebuild      → EOL OS or OS requiring upgrade (IBM docs default recommendation)
// Lift-and-Shift → modern OS, no blockers, clean VPC profile match

const hypervisorRe = /vmware|vsphere|esxi|xenserver|xen\s*server|citrix\s*hypervisor|hyper[\s-]?v/i;
const kubeRe = /kube/i;

function classifyMigrationApproach(
  hostname: string,
  os: string,
  status: MigrationStatus,
  osCompatible: boolean,
  osUpgradeTarget?: string,
): MigrationApproach {
  // IKS/ROKS worker nodes → re-architect to VPC-based clusters
  if (kubeRe.test(hostname)) return 're-architect';

  // Hypervisor hosts → re-platform (individual VM extraction)
  if (hypervisorRe.test(os)) return 're-platform';

  // Multiple blockers or non-migratable → re-platform
  if (status === 'blocked' && !osUpgradeTarget) return 're-platform';

  // EOL OS or OS requiring upgrade → rebuild (IBM docs default recommendation)
  if (osUpgradeTarget || !osCompatible) return 'rebuild';

  // Modern OS, clean match → lift-and-shift
  return 'lift-and-shift';
}

function classifyBareMetalApproach(
  hostname: string,
  os: string,
  migrationPath: BareMetalMigration['migrationPath'],
): MigrationApproach {
  if (kubeRe.test(hostname)) return 're-architect';
  if (hypervisorRe.test(os)) return 're-platform';
  if (migrationPath === 'powervs' || migrationPath === 'powervs-sap') return 're-platform';
  if (migrationPath === 'not-migratable') return 're-platform';
  return 'rebuild'; // IBM docs recommend rebuild as default for bare metal
}

// ── Execution Step Templates per Migration Approach ─────────────────────
// Structured guidance aligned with IBM classic-to-vpc migration docs

const EXECUTION_STEP_TEMPLATES: Record<MigrationApproach, ExecutionStep[]> = {
  'lift-and-shift': [
    { order: 1, title: 'Pre-flight checks', description: 'Verify cloud-init (Linux) or Cloudbase-Init + VirtIO drivers (Windows) are installed and configured.', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images#about-cloud-init' },
    { order: 2, title: 'Create Classic image template', description: 'Create a standard image template from the running Classic VSI using the SoftLayer API or IBM Cloud CLI.', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-migrate-vsi-to-vpc' },
    { order: 3, title: 'Export image to Cloud Object Storage', description: 'Export the image template to a COS bucket in the target VPC region.', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-migrate-vsi-to-vpc' },
    { order: 4, title: 'Import image to VPC', description: 'Import the COS-hosted image as a VPC custom image using ibmcloud is image-create.', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-managing-images' },
    { order: 5, title: 'Provision VPC instance', description: 'Create a VPC instance from the custom image with the recommended profile, subnet, and security groups.', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-creating-virtual-servers' },
    { order: 6, title: 'Validate and cutover', description: 'Verify application functionality, update DNS records, and decommission the Classic instance.', docsUrl: 'https://cloud.ibm.com/docs/classic-to-vpc' },
    { order: 7, title: 'Alternative: RackWare CloudMotion', description: 'Use RackWare CloudMotion for automated live migration with minimal downtime.', tool: 'RackWare CloudMotion', docsUrl: 'https://www.rackwareinc.com/ibm' },
  ],
  'rebuild': [
    { order: 1, title: 'Provision fresh VPC instance', description: 'Create a new VPC instance with the latest OS stock image and recommended profile.', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-creating-virtual-servers' },
    { order: 2, title: 'Configure VPC networking', description: 'Set up security groups, subnets, floating IPs, and any required VPN connectivity.', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-networking-for-vpc' },
    { order: 3, title: 'Install application stack', description: 'Reinstall the application using automation tools (Ansible, Terraform, or scripts). Rebuild from source or deployment artifacts.', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-about-images' },
    { order: 4, title: 'Restore data from backup', description: 'Migrate data via Cloud Object Storage, block storage snapshots, or application-level replication.', docsUrl: 'https://cloud.ibm.com/docs/cloud-infrastructure?topic=cloud-infrastructure-data-migration-classic-to-vpc' },
    { order: 5, title: 'Validate and cutover', description: 'Test application functionality, update DNS records, and decommission the Classic instance.', docsUrl: 'https://cloud.ibm.com/docs/classic-to-vpc' },
  ],
  're-platform': [
    { order: 1, title: 'Inventory workloads on host', description: 'For hypervisor hosts: inventory all guest VMs running on the VMware/XenServer/Hyper-V host.', docsUrl: 'https://cloud.ibm.com/docs/cloud-infrastructure?topic=cloud-infrastructure-migrating-images-vmware-vpc-classic' },
    { order: 2, title: 'Export VM disk images', description: 'Export individual VM disk images (VMDK/VHD) from the hypervisor for import to VPC.', docsUrl: 'https://cloud.ibm.com/docs/cloud-infrastructure?topic=cloud-infrastructure-migrating-images-vmware-vpc-classic' },
    { order: 3, title: 'Import as VPC custom images', description: 'Convert and import VM images to VPC, or deploy on OpenShift Virtualization for complex workloads.', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-managing-images' },
    { order: 4, title: 'For Oracle/SAP: provision PowerVS', description: 'For Oracle or SAP workloads, provision IBM Power Virtual Server and migrate data to the new environment.', tool: 'IBM Power Virtual Server', docsUrl: 'https://cloud.ibm.com/docs/power-iaas?topic=power-iaas-use-case-oracle' },
    { order: 5, title: 'Validate and cutover', description: 'Verify all workloads are operational, update DNS and network routing, decommission Classic resources.', docsUrl: 'https://cloud.ibm.com/docs/classic-to-vpc' },
  ],
  're-architect': [
    { order: 1, title: 'Create VPC-based IKS/ROKS cluster', description: 'Provision a new IKS or ROKS cluster on VPC infrastructure in the target region.', docsUrl: 'https://cloud.ibm.com/docs/containers?topic=containers-vpc-migrate' },
    { order: 2, title: 'Backup workloads with Velero', description: 'Install Velero with Restic on the Classic cluster and back up namespaces, persistent volumes, and configurations.', tool: 'Velero', docsUrl: 'https://cloud.ibm.com/docs/containers?topic=containers-vpc-migrate' },
    { order: 3, title: 'Restore workloads to VPC cluster', description: 'Restore Velero backups to the new VPC-based cluster. Verify pod scheduling and persistent volume claims.', tool: 'Velero', docsUrl: 'https://cloud.ibm.com/docs/containers?topic=containers-vpc-migrate' },
    { order: 4, title: 'Update ingress and DNS', description: 'Reconfigure ingress controllers, load balancers, and DNS records for the VPC cluster endpoints.', docsUrl: 'https://cloud.ibm.com/docs/containers?topic=containers-vpc-migrate' },
    { order: 5, title: 'Validate and cutover', description: 'Run integration tests, verify monitoring and logging, then switch traffic to the VPC cluster.', docsUrl: 'https://cloud.ibm.com/docs/classic-to-vpc' },
  ],
};

function assessVSI(item: unknown, _preferences: MigrationPreferences): VSIMigration {
  const id = num(item, 'id');
  const hostname = str(item, 'hostname');
  const datacenter = str(item, 'datacenter');
  const cpu = num(item, 'maxCpu');
  const memoryMB = num(item, 'maxMemory');
  const os = str(item, 'os');
  const currentFee = num(item, 'recurringFee');
  const isEstimatedCost = Boolean(field(item, 'estimatedCost'));
  const noBillingItem = Boolean(field(item, 'noBillingItem'));
  const notes: string[] = [];

  // DC mapping
  const dcMapping = mapDatacenterToVPC(datacenter);
  if (!dcMapping) {
    notes.push(`Datacenter ${datacenter} not recognized`);
  } else if (!dcMapping.available) {
    notes.push(`Datacenter ${datacenter} has no VPC equivalent — region migration required`);
  }

  // OS assessment
  const osMatch = matchOS(os);
  const osCompatible = osMatch ? osMatch.vpcAvailable : true; // Unknown OS = assume compatible
  let osUpgradeTarget: string | undefined;
  if (osMatch && osMatch.upgradeRequired) {
    osUpgradeTarget = osMatch.upgradeTarget;
    notes.push(`OS upgrade required: ${os} → ${osMatch.upgradeTarget}`);
  }
  if (osMatch && !osMatch.vpcAvailable && !osMatch.upgradeRequired) {
    notes.push(`OS ${os}: ${osMatch.notes}`);
  }
  if (osMatch?.imageType === 'byol') {
    notes.push(`${osMatch.classicOS}: BYOL custom image only on VPC (no stock image)`);
  }

  // Profile mapping (gen3-preferred, d-suffix avoided)
  const { primary, alternatives } = mapToVPCProfile(cpu, memoryMB);
  if (!primary) {
    notes.push(`No VPC profile found for ${cpu} vCPU / ${Math.round(memoryMB / 1024)} GB — exceeds VPC limits`);
  } else if (primary.vcpu > cpu || primary.memory > (memoryMB / 1024)) {
    const memGB = Math.round(memoryMB / 1024);
    notes.push(`VPC minimum: ${primary.name} (${primary.vcpu} vCPU, ${primary.memory} GB) for Classic ${cpu} vCPU, ${memGB} GB`);
  }

  // Burstable classification (informational — no per-VM toggle in fleet assessment)
  const burstable = classifyForBurstable(hostname);
  if (!burstable.isBurstableSuitable) {
    notes.push(`Standard profile recommended — ${burstable.reasons.join(', ')} detected`);
  } else if (primary && !isBurstableProfile(primary.name)) {
    notes.push('Burstable (flex) profile may reduce cost for variable workloads');
  }

  // Determine status
  let status: MigrationStatus = 'ready';
  if (!primary) {
    status = 'blocked';
  } else if (!osCompatible || (dcMapping && !dcMapping.available)) {
    status = osMatch?.upgradeRequired ? 'needs-work' : 'blocked';
  } else if (notes.length > 0 && osMatch?.effort === 'moderate') {
    status = 'needs-work';
  }

  const migrationApproach = classifyMigrationApproach(hostname, os, status, osCompatible, osUpgradeTarget);
  const executionSteps = EXECUTION_STEP_TEMPLATES[migrationApproach];

  return {
    id,
    hostname,
    datacenter,
    cpu,
    memoryMB,
    os,
    currentFee,
    isEstimatedCost,
    noBillingItem,
    status,
    recommendedProfile: primary,
    alternativeProfiles: alternatives,
    osCompatible,
    osUpgradeTarget,
    migrationApproach,
    executionSteps,
    notes,
  };
}

// IBM Oracle-certified bare metal HCL profiles
const ORACLE_HCL_PROFILES = [
  { cores: 4, memoryGB: 64 },    // Intel Xeon E-2174G
  { cores: 16, memoryGB: 384 },  // Intel Xeon 6250
  { cores: 48, memoryGB: 768 },  // Intel Xeon 8260
];

// IBM SAP HANA-certified Classic bare metal profiles
const SAP_HANA_PROFILES = [
  { cores: 36, memoryGB: 192 },   // BI.S3.H2.192 — Intel Skylake SP
  { cores: 36, memoryGB: 384 },   // BI.S3.H2.384 — Intel Skylake SP
  { cores: 36, memoryGB: 768 },   // BI.S3.H2.768 — Intel Skylake SP
  { cores: 32, memoryGB: 192 },   // BI.S4.H2.192 — Intel Cascade Lake
  { cores: 32, memoryGB: 384 },   // BI.S4.H2.384 — Intel Cascade Lake
  { cores: 40, memoryGB: 768 },   // BI.S4.H2.768 — Intel Cascade Lake
  { cores: 56, memoryGB: 1536 },  // BI.S4.H2.1500 — Intel Cascade Lake
  { cores: 56, memoryGB: 3072 },  // BI.S4.H2.3000 — Intel Cascade Lake
  { cores: 112, memoryGB: 3072 }, // BI.S4.H4.3000 — Intel Cascade Lake (4-socket)
];

function isSapCandidate(cores: number, memoryGB: number, os: string, hostname: string): boolean {
  const profileMatch = SAP_HANA_PROFILES.some((p) => p.cores === cores && p.memoryGB === memoryGB);
  if (!profileMatch) return false;

  // Profile matches — require OS or hostname signal (unlike Oracle, common RAM sizes overlap with general-purpose BMs)
  const sapOs = /sles.*sap|suse.*sap|rhel.*sap|red\s*hat.*sap/i.test(os);
  const sapHostname = /sap|hana|s4hana|\/bw\/|\/ecc\/|\/erp\/|\/nw\//i.test(hostname)
    || /\bsap\b|\bhana\b|\bs4hana\b|\bbw\b|\becc\b|\berp\b|\bnw\b/i.test(hostname);

  return sapOs || sapHostname;
}

function isOracleCandidate(cores: number, memoryGB: number, os: string, hostname: string): boolean {
  const profileMatch = ORACLE_HCL_PROFILES.some((p) => p.cores === cores && p.memoryGB === memoryGB);
  if (!profileMatch) return false;

  // Profile matches — check OS signals
  const noOs = !os || /no\s*os/i.test(os);
  const oracleOs = /oracle.*linux|oei|oel/i.test(os);
  const oracleHostname = /ora|oracle|orcl/i.test(hostname);

  return noOs || oracleOs || oracleHostname;
}

function assessBareMetal(item: unknown, _preferences: MigrationPreferences): BareMetalMigration {
  const id = num(item, 'id');
  const hostname = str(item, 'hostname');
  const datacenter = str(item, 'datacenter');
  const cores = num(item, 'cores');
  const memoryGB = num(item, 'memory');
  const os = str(item, 'os');
  const currentFee = num(item, 'recurringFee');
  const isGatewayMember = Boolean(field(item, 'gatewayMember'));
  const isVSphere = /vmware|vsphere|esxi/i.test(os);
  const notes: string[] = [];

  let migrationPath: BareMetalMigration['migrationPath'] = 'vpc-bare-metal';
  let status: MigrationStatus = 'needs-work';

  if (isGatewayMember) {
    notes.push('Gateway member — requires gateway migration planning');
    migrationPath = 'not-migratable';
    status = 'blocked';
  } else if (isVSphere) {
    notes.push('VMware vSphere/ESXi host — VMs must be migrated individually to VPC VSIs or OpenShift Virtualization');
    migrationPath = 'not-migratable';
    status = 'blocked';
  } else if (isOracleCandidate(cores, memoryGB, os, hostname)) {
    notes.push('Potential Oracle workload — hardware matches IBM Oracle-certified bare metal configuration. Recommended migration target: IBM Power Virtual Server (PowerVS) running Oracle on AIX. See https://cloud.ibm.com/docs/power-iaas?topic=power-iaas-use-case-oracle');
    migrationPath = 'powervs';
    status = 'needs-work';
  } else if (isSapCandidate(cores, memoryGB, os, hostname)) {
    if (memoryGB > 768) {
      notes.push(`Potential SAP HANA workload (${memoryGB} GB) — exceeds VPC SAP-certified limits (768 GB max). Recommended migration target: IBM Power Virtual Server (PowerVS). See https://cloud.ibm.com/docs/sap?topic=sap-hana-iaas-offerings-profiles-intel-bm`);
      migrationPath = 'powervs-sap';
      status = 'needs-work';
    } else {
      notes.push(`Potential SAP workload — hardware matches IBM SAP-certified bare metal configuration. Migrate to SAP-certified VPC Bare Metal profile (bx2d-metal-96x384 or mx2d-metal-96x768). See https://cloud.ibm.com/docs/sap?topic=sap-hana-iaas-offerings-profiles-intel-bm`);
      migrationPath = 'vpc-bare-metal';
      status = 'needs-work';
    }
  } else if (cores <= 176 && memoryGB <= 880) {
    // Could be virtualised
    notes.push('Could potentially migrate to VPC VSI for cost savings');
    migrationPath = 'vpc-vsi';
    status = 'needs-work';
  } else if (cores > 192 || memoryGB > 768) {
    notes.push('Exceeds VPC Bare Metal limits — may require multiple instances');
    migrationPath = 'not-migratable';
    status = 'blocked';
  } else {
    notes.push('Migrate to VPC Bare Metal');
    status = 'needs-work';
  }

  const dcMapping = mapDatacenterToVPC(datacenter);
  if (dcMapping && !dcMapping.available) {
    notes.push(`Datacenter ${datacenter} has no VPC equivalent`);
    status = 'blocked';
  }

  // Map to a recommended VPC profile based on migration path
  let recommendedProfile: VPCProfile | null = null;
  if (migrationPath === 'vpc-bare-metal') {
    recommendedProfile = mapToBareMetalProfile(cores, memoryGB);
    if (recommendedProfile) {
      notes.push(`Recommended VPC Bare Metal profile: ${recommendedProfile.name} (${recommendedProfile.vcpu} vCPU, ${recommendedProfile.memory} GB)`);
    }
  } else if (migrationPath === 'vpc-vsi') {
    const memoryMB = memoryGB * 1024;
    const { primary } = mapToVPCProfile(cores, memoryMB);
    recommendedProfile = primary;
    if (recommendedProfile) {
      notes.push(`Recommended VPC VSI profile: ${recommendedProfile.name} (${recommendedProfile.vcpu} vCPU, ${recommendedProfile.memory} GB)`);
    }
  }

  const migrationApproach = classifyBareMetalApproach(hostname, os, migrationPath);
  const executionSteps = EXECUTION_STEP_TEMPLATES[migrationApproach];

  return { id, hostname, datacenter, cores, memoryGB, os, currentFee, status, migrationPath, recommendedProfile, migrationApproach, executionSteps, notes };
}

export function analyzeCompute(
  collectedData: Record<string, unknown[]>,
  preferences: MigrationPreferences,
  profiles?: VPCProfile[],
  bareMetalProfiles?: VPCProfile[],
): ComputeAssessment {
  activeProfiles = profiles ?? VPC_PROFILES;
  activeBareMetalProfiles = bareMetalProfiles ?? VPC_BARE_METAL_PROFILES;
  const vsis = collectedData['virtualServers'] ?? [];
  const bms = collectedData['bareMetal'] ?? [];

  const vsiMigrations = vsis.map((vsi) => assessVSI(vsi, preferences));
  const bareMetalMigrations = bms.map((bm) => assessBareMetal(bm, preferences));

  const allStatuses = [
    ...vsiMigrations.map((v) => v.status),
    ...bareMetalMigrations.map((b) => b.status),
  ];

  const readyToMigrate = allStatuses.filter((s) => s === 'ready').length;
  const needsWork = allStatuses.filter((s) => s === 'needs-work').length;
  const blocked = allStatuses.filter((s) => s === 'blocked').length;
  const total = allStatuses.length;

  // Score: 100 = all ready, 0 = all blocked
  const score = total > 0
    ? Math.round(((readyToMigrate * 100) + (needsWork * 50)) / total)
    : 100;

  const recommendations: string[] = [];
  if (blocked > 0) recommendations.push(`${blocked} instance(s) have migration blockers that need resolution`);
  if (vsiMigrations.some((v) => v.osUpgradeTarget)) {
    recommendations.push('Plan OS upgrades before migration for instances requiring newer versions');
  }
  if (bareMetalMigrations.some((b) => b.migrationPath === 'vpc-vsi')) {
    recommendations.push('Consider virtualising eligible bare metal servers to reduce VPC costs');
  }
  const oracleCount = bareMetalMigrations.filter((b) => b.migrationPath === 'powervs').length;
  if (oracleCount > 0) {
    recommendations.push(`${oracleCount} bare metal server(s) match Oracle-certified hardware profiles — migrate to IBM Power Virtual Server (PowerVS) for Oracle on AIX`);
  }
  const sapLargeCount = bareMetalMigrations.filter((b) => b.migrationPath === 'powervs-sap').length;
  const sapSmallCount = bareMetalMigrations.filter((b) => b.migrationPath === 'vpc-bare-metal' && b.notes.some((n) => /SAP/i.test(n))).length;
  if (sapLargeCount > 0) {
    recommendations.push(`${sapLargeCount} bare metal server(s) match SAP HANA-certified profiles exceeding 768 GB — migrate to IBM Power Virtual Server (PowerVS)`);
  }
  if (sapSmallCount > 0) {
    recommendations.push(`${sapSmallCount} bare metal server(s) match SAP-certified profiles (≤768 GB) — use SAP-certified VPC Bare Metal profiles (bx2d-metal-96x384 or mx2d-metal-96x768)`);
  }

  // Burstable savings hint
  const burstableEligible = vsiMigrations.filter((v) => {
    if (!v.recommendedProfile || v.status === 'blocked') return false;
    const cls = classifyForBurstable(v.hostname);
    return cls.isBurstableSuitable;
  }).length;
  if (burstableEligible > 0) {
    recommendations.push(`${burstableEligible} VSI(s) may be suitable for burstable (flex) profiles — consider for cost savings on variable workloads`);
  }

  return {
    totalInstances: total,
    vsiMigrations,
    bareMetalMigrations,
    summary: { readyToMigrate, needsWork, blocked },
    score,
    recommendations,
  };
}
