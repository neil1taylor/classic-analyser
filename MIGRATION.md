# IBM Cloud Infrastructure Explorer
# VPC Migration Analysis - Technical Design

---

| | |
|---|---|
| **Document Type** | Technical Design & Recommendations |
| **Date** | January 28, 2025 |
| **Related Document** | IBM Cloud Infrastructure Explorer PRD v1.0 |
| **Purpose** | Detailed design for Phase 2 AI-powered VPC migration analysis |

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Migration Analysis Framework](#2-migration-analysis-framework)
3. [Compute Migration Assessment](#3-compute-migration-assessment)
4. [Network Migration Assessment](#4-network-migration-assessment)
5. [Storage Migration Assessment](#5-storage-migration-assessment)
6. [Security Migration Assessment](#6-security-migration-assessment)
7. [Feature Gap Analysis](#7-feature-gap-analysis)
8. [Dependency Mapping](#8-dependency-mapping)
9. [Migration Complexity Scoring](#9-migration-complexity-scoring)
10. [Cost Comparison Analysis](#10-cost-comparison-analysis)
11. [Migration Waves Planning](#11-migration-waves-planning)
12. [watsonx.ai Integration](#12-watsonxai-integration)
13. [Migration Readiness Report](#13-migration-readiness-report)
14. [User Interface Design](#14-user-interface-design)
15. [Implementation Approach](#15-implementation-approach)

---

## 1. Executive Overview

### 1.1 Purpose

The VPC Migration Analysis feature will provide organisations with AI-powered insights to plan and execute migrations from IBM Cloud Classic infrastructure to VPC. This addresses a critical customer need: understanding the complexity, effort, and potential blockers before committing to a migration project.

### 1.2 Business Value

| Stakeholder | Value Delivered |
|-------------|-----------------|
| **Customers** | Reduced migration risk, accurate planning, cost predictability |
| **IBM Tech Sellers** | Compelling discovery tool, migration opportunity identification |
| **IBM Client Engineers** | Accelerated assessment phase, professional deliverables |
| **IBM Services** | Pre-qualified migration opportunities, scoped engagements |

### 1.3 Key Capabilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VPC Migration Analysis Capabilities                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   ASSESS        │  │   PLAN          │  │   RECOMMEND     │             │
│  │                 │  │                 │  │                 │             │
│  │ • Compatibility │  │ • Wave planning │  │ • Profile maps  │             │
│  │ • Dependencies  │  │ • Timeline est. │  │ • Architecture  │             │
│  │ • Complexity    │  │ • Resource seq. │  │ • Best practices│             │
│  │ • Gaps          │  │ • Risk mitig.   │  │ • Alternatives  │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   ESTIMATE      │  │   VISUALISE     │  │   REPORT        │             │
│  │                 │  │                 │  │                 │             │
│  │ • Effort hours  │  │ • Before/after  │  │ • Executive sum │             │
│  │ • Cost compare  │  │ • Topology diff │  │ • Technical det │             │
│  │ • Timeline      │  │ • Migration map │  │ • Action items  │             │
│  │ • TCO analysis  │  │ • Dependencies  │  │ • Export (PDF)  │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Migration Analysis Framework

### 2.1 Analysis Dimensions

The migration analysis evaluates Classic infrastructure across five dimensions:

```
                              MIGRATION READINESS
                                     
                                  Compute
                                    ▲
                                   ╱ ╲
                                  ╱   ╲
                                 ╱     ╲
                        Security ───────── Network
                                 ╲     ╱
                                  ╲   ╱
                                   ╲ ╱
                              Storage ─── Features
                              
        Each dimension scored 0-100, combined into overall readiness score
```

### 2.2 Assessment Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Migration Assessment Workflow                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │ Classic  │    │ Analysis │    │   AI     │    │ Report   │            │
│   │ Inventory│───▶│ Engine   │───▶│ Enrichment───▶│ Generation│            │
│   │          │    │          │    │          │    │          │            │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│        │               │               │               │                   │
│        ▼               ▼               ▼               ▼                   │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │ Collected│    │ Rule-    │    │ watsonx  │    │ PDF/XLSX │            │
│   │ Data     │    │ Based    │    │ .ai      │    │ Export   │            │
│   │ (Phase 1)│    │ Matching │    │ Analysis │    │          │            │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow

```typescript
interface MigrationAnalysisInput {
  // From Phase 1 collection
  inventory: ClassicInventory;
  relationships: ResourceRelationships;
  
  // User preferences
  preferences: {
    targetRegion: string;           // e.g., 'us-south'
    budgetConstraint?: number;      // Monthly budget cap
    timelineConstraint?: string;    // Target completion date
    excludeResources?: string[];    // Resources not to migrate
  };
}

interface MigrationAnalysisOutput {
  summary: ExecutiveSummary;
  computeAnalysis: ComputeAssessment;
  networkAnalysis: NetworkAssessment;
  storageAnalysis: StorageAssessment;
  securityAnalysis: SecurityAssessment;
  featureGaps: FeatureGap[];
  dependencies: DependencyGraph;
  complexityScore: ComplexityScore;
  costComparison: CostAnalysis;
  migrationWaves: MigrationWave[];
  recommendations: Recommendation[];
  risks: Risk[];
  timeline: TimelineEstimate;
}
```

---

## 3. Compute Migration Assessment

### 3.1 Instance Profile Mapping

Classic VSIs use flexible configurations, while VPC uses predefined instance profiles. The analysis must map Classic specs to the best-fit VPC profile.

**Profile Data Source:** The VPC profile catalog is generated from IBM's Classic-to-VPC migration spreadsheets via `npm run import:mappings`. The generated `vpcProfileCatalog.json` contains 266 VSI profiles and 42 bare metal profiles (including Gen4 families: bx4, cx4, mx4) with hourly pricing. Hardcoded fallback arrays are used if the generated catalog is empty. See `src/services/migration/data/vpcProfiles.ts`.

**Mapping Algorithm:**

```typescript
interface ClassicVSI {
  cpu: number;
  memory: number;        // MB
  dedicatedHost: boolean;
  localDisk: boolean;
}

interface VPCProfile {
  name: string;          // e.g., 'bx2-4x16'
  family: string;        // 'balanced', 'compute', 'memory'
  vcpu: number;
  memory: number;        // GB
  bandwidth: number;     // Gbps
}

function mapToVPCProfile(classic: ClassicVSI): VPCProfileRecommendation {
  const memoryGB = classic.memory / 1024;
  
  // Find profiles that meet or exceed requirements
  const candidates = VPC_PROFILES.filter(p => 
    p.vcpu >= classic.cpu && 
    p.memory >= memoryGB
  );
  
  // Sort by cost efficiency (closest fit without over-provisioning)
  candidates.sort((a, b) => {
    const aWaste = (a.vcpu - classic.cpu) + (a.memory - memoryGB);
    const bWaste = (b.vcpu - classic.cpu) + (b.memory - memoryGB);
    return aWaste - bWaste;
  });
  
  // Determine profile family based on workload ratio
  const ratio = memoryGB / classic.cpu;
  let recommendedFamily: string;
  if (ratio <= 2) recommendedFamily = 'compute';      // cx2
  else if (ratio <= 4) recommendedFamily = 'balanced'; // bx2
  else recommendedFamily = 'memory';                   // mx2
  
  return {
    primary: candidates[0],
    alternatives: candidates.slice(1, 3),
    recommendedFamily,
    notes: generateProfileNotes(classic, candidates[0]),
  };
}
```

**Profile Mapping Table:**

| Classic Config | VPC Profile | Family | Notes |
|----------------|-------------|--------|-------|
| 1 vCPU, 1GB | bx2-2x8 | Balanced | VPC minimum is 2 vCPU |
| 1 vCPU, 2GB | bx2-2x8 | Balanced | VPC minimum is 2 vCPU |
| 2 vCPU, 4GB | cx2-2x4 | Compute | Exact match |
| 2 vCPU, 8GB | bx2-2x8 | Balanced | Exact match |
| 4 vCPU, 8GB | cx2-4x8 | Compute | Exact match |
| 4 vCPU, 16GB | bx2-4x16 | Balanced | Exact match |
| 4 vCPU, 32GB | mx2-4x32 | Memory | Exact match |
| 8 vCPU, 16GB | cx2-8x16 | Compute | Exact match |
| 8 vCPU, 32GB | bx2-8x32 | Balanced | Exact match |
| 8 vCPU, 64GB | mx2-8x64 | Memory | Exact match |
| 16 vCPU, 32GB | cx2-16x32 | Compute | Exact match |
| 16 vCPU, 64GB | bx2-16x64 | Balanced | Exact match |
| 16 vCPU, 128GB | mx2-16x128 | Memory | Exact match |
| 32 vCPU, 64GB | cx2-32x64 | Compute | Exact match |
| 32 vCPU, 128GB | bx2-32x128 | Balanced | Exact match |
| 48 vCPU, 384GB | mx2-48x384 | Memory | Exact match |
| 64 vCPU, 512GB | mx2-64x512 | Memory | Exact match |

**Edge Cases:**

| Classic Config | Issue | Recommendation |
|----------------|-------|----------------|
| > 64 vCPU | Exceeds VPC max | Use bare metal or multiple instances |
| > 512GB RAM | Exceeds VPC max | Use bare metal or application redesign |
| GPU instances | Different GPU options | Map to VPC GPU profiles |
| Dedicated host | Requires VPC dedicated host | Assess dedicated host requirements |

### 3.2 Operating System Compatibility

**OS Availability Matrix (57 entries — see `osCompatibility.ts` for full data):**

| Classic OS | VPC Image Type | VPC Image | Migration Notes |
|------------|---------------|-----------|-----------------|
| RHEL 6.x | ❌ None | N/A | EOL Nov 2020 — **must upgrade** to RHEL 8/9 |
| RHEL 7.x | ⚠️ BYOL | Custom image | EOL June 2024 — upgrade to RHEL 8/9 recommended |
| RHEL 8.x | ✅ Stock | ibm-redhat-8-8-minimal-amd64 | Direct migration |
| RHEL 9.x | ✅ Stock | ibm-redhat-9-2-minimal-amd64 | Direct migration |
| CentOS 5–6 | ❌ None | N/A | Long EOL — **must upgrade** to RHEL/Rocky 8/9 |
| CentOS 7.x | ⚠️ BYOL | Custom image | EOL June 2024 — migrate to Rocky/Alma/RHEL |
| CentOS 8.x | ❌ None | N/A | EOL Dec 2021 — **must upgrade** to RHEL/Rocky |
| Ubuntu 14–18 | ❌ None | N/A | EOL — **must upgrade** to Ubuntu 22.04/24.04 |
| Ubuntu 20.04 | ✅ Stock | ibm-ubuntu-20-04-6-minimal-amd64 | Direct migration |
| Ubuntu 22.04 | ✅ Stock | ibm-ubuntu-22-04-3-minimal-amd64 | Direct migration |
| Ubuntu 24.04 | ✅ Stock | ibm-ubuntu-24-04-minimal-amd64 | Direct migration |
| Debian 9 | ❌ None | N/A | EOL Jun 2022 — **must upgrade** to Debian 11/12 |
| Debian 10–12 | ✅ Stock | ibm-debian-*-minimal-amd64 | Direct migration |
| SLES 11 | ❌ None | N/A | EOL Mar 2022 — **must upgrade** to SLES 15 |
| SLES 12/15 | ✅ Stock | ibm-sles-*-amd64 | Direct migration |
| Rocky Linux 8/9 | ✅ Stock | ibm-rocky-linux-*-amd64 | Direct migration |
| AlmaLinux 8/9 | ⚠️ BYOL | Custom image | RHEL-compatible distribution |
| Oracle Linux 7–9 | ⚠️ BYOL | Custom image | RHEL-compatible distribution |
| Windows Server 2003 | ❌ **Blocker** | N/A | No VirtIO drivers exist — VMs cannot boot on VPC. Requires re-platforming. |
| Windows Server 2008/R2 | ❌ **Blocker** | N/A | VirtIO drivers dropped after virtio-win 0.1.173. VPC requires 1.9.24+ — VMs will not boot. |
| Windows Server 2012/R2 | ⚠️ BYOL | Custom image | EOL Oct 2023 — upgrade to 2019/2022 recommended |
| Windows Server 2016 | ✅ Stock | ibm-windows-server-2016-full-standard-amd64 | Direct migration |
| Windows Server 2019 | ✅ Stock | ibm-windows-server-2019-full-standard-amd64 | Direct migration |
| Windows Server 2022 | ✅ Stock | ibm-windows-server-2022-full-standard-amd64 | Direct migration |
| Fedora CoreOS | ✅ Stock | ibm-fedora-coreos-stable-amd64 | Container-optimized workloads |
| FreeBSD / OpenBSD | ❌ None | N/A | Not supported on VPC |
| Solaris | ❌ None | N/A | Not supported on VPC — re-platform to Linux |
| AIX | ❌ None | N/A | Not supported on VPC — use PowerVS |
| HP-UX | ❌ None | N/A | Not supported on VPC |
| VMware ESXi | ❌ None | N/A | Hypervisor — VMs must be migrated individually |

**OS Assessment Output:**

```typescript
interface OSAssessment {
  currentOS: string;
  currentVersion: string;
  vpcCompatible: boolean;
  vpcImage: string | null;
  upgradeRequired: boolean;
  upgradeTarget?: string;
  licenseImplications: string[];
  effort: 'none' | 'minimal' | 'moderate' | 'significant';
  notes: string[];
}
```

### 3.3 Bare Metal Assessment

Bare metal servers require special consideration.

**Spreadsheet-First Lookup:** Before algorithmic matching, the assessment looks up the server's processor description, total cores, and RAM in `bmMappings.json` — a curated table of 666 Classic bare metal configurations mapped to specific VPC VSI or bare metal profiles, grouped by storage category (0-10TB through 240+ TB). The lookup is in `src/services/migration/data/bmMappingLookup.ts`. If a match is found, the spreadsheet's recommended profile is used and the note includes "mapped from Classic-to-VPC migration guide". If no match, the algorithmic ratio-based matching is used as fallback.

**VPC Bare Metal Profiles:**

| Classic Bare Metal | VPC Bare Metal Profile | Notes |
|-------------------|------------------------|-------|
| Single E3 (4 cores) | bx2d-metal-96x384 | Significant upgrade |
| Dual E5 (24 cores) | bx2d-metal-96x384 | Right-size opportunity |
| Quad E7 (96 cores) | bx2d-metal-192x768 | May need multiple |
| GPU (V100) | gx2-metal-* | Different GPU models |
| SAP certified | SAP-specific profiles | Validate certification |

**Bare Metal Migration Paths:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Bare Metal Migration Decision Tree                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ┌─────────────────┐                                  │
│                        │ Classic Bare    │                                  │
│                        │ Metal Server    │                                  │
│                        └────────┬────────┘                                  │
│                                 │                                           │
│                    ┌────────────┼────────────┐                              │
│                    ▼            ▼            ▼                              │
│            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│            │ Workload    │ │ Workload    │ │ Workload    │                  │
│            │ Virtualisable│ │ Needs BM   │ │ Needs GPU   │                  │
│            └──────┬──────┘ └──────┬──────┘ └──────┬──────┘                  │
│                   │               │               │                         │
│                   ▼               ▼               ▼                         │
│            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│            │ Migrate to  │ │ Migrate to  │ │ Migrate to  │                  │
│            │ VPC VSI     │ │ VPC Bare    │ │ VPC GPU     │                  │
│            │ (cost save) │ │ Metal       │ │ Instances   │                  │
│            └─────────────┘ └─────────────┘ └─────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Compute Assessment Output

```typescript
type MigrationApproach = 'lift-and-shift' | 'rebuild' | 're-platform' | 're-architect';

interface ComputeAssessment {
  totalInstances: number;
  vsiMigrations: VSIMigration[];       // Each with migrationApproach field
  bareMetalMigrations: BareMetalMigration[];  // Each with migrationApproach field

  summary: {
    readyToMigrate: number;
    needsWork: number;
    blocked: number;
  };
  score: number;       // 0-100 readiness score
  recommendations: string[];
}

// Per-workload migration approach classification (based on IBM classic-to-vpc docs):
// - lift-and-shift: Modern OS, no blockers, clean VPC profile match
// - rebuild: EOL OS or OS requiring upgrade (IBM docs default recommendation)
// - re-platform: VMware/hypervisor hosts, Oracle/SAP, multiple blockers
// - re-architect: IKS/ROKS managed K8s worker nodes
```

---

## 4. Network Migration Assessment

### 4.1 VLAN to VPC Subnet Mapping

Classic uses VLANs, VPC uses subnets within a VPC. The mapping requires careful planning.

**Mapping Strategy:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Classic to VPC Network Mapping                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CLASSIC                              VPC                                  │
│   ═══════                              ═══                                  │
│                                                                             │
│   ┌─────────────────┐                 ┌─────────────────────────────────┐  │
│   │ Account         │                 │ VPC: production-vpc             │  │
│   │                 │                 │                                 │  │
│   │ ┌─────────────┐ │                 │  ┌─────────────────────────┐   │  │
│   │ │ VLAN 1234   │ │    ────────▶    │  │ Subnet: web-subnet      │   │  │
│   │ │ Public      │ │                 │  │ 10.240.0.0/24           │   │  │
│   │ │ 10.0.0.0/26 │ │                 │  │ Zone: us-south-1        │   │  │
│   │ └─────────────┘ │                 │  └─────────────────────────┘   │  │
│   │                 │                 │                                 │  │
│   │ ┌─────────────┐ │                 │  ┌─────────────────────────┐   │  │
│   │ │ VLAN 1235   │ │    ────────▶    │  │ Subnet: app-subnet      │   │  │
│   │ │ Private     │ │                 │  │ 10.240.1.0/24           │   │  │
│   │ │ 10.1.0.0/26 │ │                 │  │ Zone: us-south-1        │   │  │
│   │ └─────────────┘ │                 │  └─────────────────────────┘   │  │
│   │                 │                 │                                 │  │
│   │ ┌─────────────┐ │                 │  ┌─────────────────────────┐   │  │
│   │ │ VLAN 1236   │ │    ────────▶    │  │ Subnet: db-subnet       │   │  │
│   │ │ Private     │ │                 │  │ 10.240.2.0/24           │   │  │
│   │ │ 10.2.0.0/26 │ │                 │  │ Zone: us-south-1        │   │  │
│   │ └─────────────┘ │                 │  └─────────────────────────┘   │  │
│   │                 │                 │                                 │  │
│   └─────────────────┘                 └─────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Subnet Sizing Recommendations:**

| Classic VLAN Size | VPC Subnet Recommendation | Rationale |
|-------------------|---------------------------|-----------|
| /26 (62 hosts) | /24 (251 hosts) | Room for growth |
| /25 (126 hosts) | /23 (507 hosts) | 4x growth factor |
| /24 (254 hosts) | /22 (1019 hosts) | 4x growth factor |
| Multiple VLANs | Single larger subnet or VPC | Consolidation opportunity |

### 4.2 IP Address Planning

**IP Address Considerations:**

```typescript
interface IPAddressAnalysis {
  classicPublicIPs: {
    total: number;
    inUse: number;
    portable: number;
    static: number;
  };
  
  classicPrivateIPs: {
    total: number;
    inUse: number;
    subnets: SubnetAnalysis[];
  };
  
  vpcRecommendation: {
    floatingIPs: number;           // For public access
    reservedIPs: number;           // For consistent private IPs
    subnetSize: string;            // Recommended CIDR
    addressPlanningNotes: string[];
  };
  
  migrationConsiderations: {
    ipChangesRequired: boolean;    // Will IPs change?
    dnsUpdatesRequired: boolean;   // DNS records to update
    hardcodedIPs: string[];        // Known hardcoded IPs to address
    applicationImpact: string;
  };
}
```

**IP Migration Strategies:**

| Strategy | Description | Use When |
|----------|-------------|----------|
| **Re-IP** | Assign new VPC IPs, update DNS | Default approach, simplest |
| **IP Overlap Avoidance** | Plan VPC ranges to avoid Classic | Hybrid period needed |
| **DNS-Based Cutover** | Use DNS for seamless transition | Applications use DNS |
| **Load Balancer Fronting** | Keep IPs via LB | Public IP must be preserved |

### 4.3 Gateway Appliance Migration

**Classic Gateway to VPC Mapping:**

| Classic Gateway | VPC Equivalent | Migration Complexity |
|-----------------|----------------|---------------------|
| Vyatta (vRouter) | VPC Routes + NACLs | Medium - config translation |
| Juniper vSRX | Bring Your Own (vSRX on VPC) | High - manual setup |
| FortiGate | FortiGate on VPC (marketplace) | Medium - config export/import |
| AT&T vRouter | VPC native routing | Low - simplified |

**Gateway Migration Decision:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Gateway Migration Decision Tree                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   What gateway features are in use?                                         │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │ Basic Routing   │ ──────▶ VPC Routing Tables (native)                  │
│   └─────────────────┘                                                       │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │ NAT             │ ──────▶ VPC Public Gateways + Floating IPs           │
│   └─────────────────┘                                                       │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │ Firewall Rules  │ ──────▶ VPC Security Groups + NACLs                  │
│   └─────────────────┘                                                       │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │ VPN Termination │ ──────▶ VPC VPN Gateway                              │
│   └─────────────────┘                                                       │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │ Advanced        │ ──────▶ Third-party appliance on VPC                 │
│   │ (IPS, WAF, etc) │         (vSRX, FortiGate, Palo Alto)                 │
│   └─────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Firewall Rule Translation

**Classic Firewall to VPC Security Group:**

```typescript
interface FirewallRuleTranslation {
  classicRule: {
    orderValue: number;
    action: 'permit' | 'deny';
    protocol: string;
    sourceIp: string;
    sourceCidr: number;
    destIp: string;
    destCidr: number;
    destPortStart: number;
    destPortEnd: number;
  };
  
  vpcSecurityGroupRule: {
    direction: 'inbound' | 'outbound';
    protocol: 'tcp' | 'udp' | 'icmp' | 'all';
    portMin?: number;
    portMax?: number;
    remote: {
      type: 'cidr_block' | 'security_group' | 'any';
      value: string;
    };
  } | null;  // null if cannot translate
  
  vpcNaclRule?: {
    // For deny rules or complex scenarios
    action: 'allow' | 'deny';
    direction: 'inbound' | 'outbound';
    protocol: string;
    source: string;
    destination: string;
    portRange?: string;
  };
  
  translationNotes: string[];
  manualReviewRequired: boolean;
}
```

**Translation Rules:**

| Classic Rule Type | VPC Translation | Notes |
|-------------------|-----------------|-------|
| Permit TCP port | Security Group inbound | Direct translation |
| Permit UDP port | Security Group inbound | Direct translation |
| Permit ICMP | Security Group inbound | Direct translation |
| Permit IP range | Security Group with CIDR | Direct translation |
| Deny specific IP | NACL deny rule | Security Groups don't support deny |
| Deny port range | NACL deny rule | Security Groups don't support deny |
| Order-dependent | Requires NACL | Security Groups are stateless |

### 4.5 Load Balancer Migration

**Classic to VPC Load Balancer Mapping:**

| Classic LB Type | VPC Equivalent | Feature Parity |
|-----------------|----------------|----------------|
| Local Load Balancer | Application Load Balancer (ALB) | ✅ Full |
| Cloud Load Balancer | ALB or Network Load Balancer (NLB) | ✅ Full |
| Dedicated Hardware LB | ALB (multi-zone) | ⚠️ Different architecture |
| Global Load Balancer | Cloud Internet Services (CIS) | ✅ Full |

**Load Balancer Assessment:**

```typescript
interface LoadBalancerAssessment {
  classicLB: {
    id: number;
    name: string;
    type: string;
    protocol: string;
    port: number;
    backends: Backend[];
    healthCheck: HealthCheck;
    sslCert?: string;
  };
  
  vpcRecommendation: {
    type: 'application' | 'network';
    profile: string;
    pools: Pool[];
    listeners: Listener[];
    healthChecks: HealthCheck[];
  };
  
  migrationSteps: string[];
  estimatedDowntime: string;
  sslMigrationRequired: boolean;
}
```

### 4.6 Network Assessment Output

```typescript
interface NetworkAssessment {
  vlanAnalysis: {
    totalVlans: number;
    publicVlans: number;
    privateVlans: number;
    recommendedVPCSubnets: SubnetRecommendation[];
  };
  
  ipAnalysis: IPAddressAnalysis;
  
  gatewayAnalysis: {
    gatewaysFound: number;
    canUseNativeVPC: number;
    requiresAppliance: number;
    configTranslation: GatewayTranslation[];
  };
  
  firewallAnalysis: {
    totalRules: number;
    autoTranslatable: number;
    manualReview: number;
    securityGroupRules: SecurityGroupRule[];
    naclRules: NaclRule[];
  };
  
  loadBalancerAnalysis: LoadBalancerAssessment[];
  
  vpnAnalysis: {
    ipsecTunnels: number;
    canMigrateToVPCVPN: number;
    requiresManualConfig: number;
  };
  
  summary: {
    complexity: 'low' | 'medium' | 'high' | 'very-high';
    estimatedEffort: string;
    blockers: string[];
    recommendations: string[];
  };
}
```

---

## 5. Storage Migration Assessment

### 5.1 Block Storage Migration

**Storage Mapping Data Source:** Block and file storage tier mappings are generated from IBM's Classic-to-VPC storage mapping spreadsheet via `npm run import:mappings`. The generated `storageMappings.json` contains block/file storage profiles with throughput and IOPS ranges, tier-to-tier mappings, per-zone Classic pricing, VPC pricing, and SDP pricing components. See `src/services/migration/data/storageTiers.ts`.

**Classic to VPC Block Storage Mapping:**

| Classic Tier | Classic IOPS | VPC Profile | VPC IOPS | Notes |
|--------------|--------------|-------------|----------|-------|
| 0.25 IOPS/GB | 100–3000 | general-purpose | 3000 base (3 IOPS/GB) | VPC is better |
| 2 IOPS/GB | 100–24000 | general-purpose | 3000 base (3 IOPS/GB) | Spreadsheet mapping |
| 4 IOPS/GB | 100–48000 | 5iops-tier | 5000 per 1TB | VPC is better |
| 10 IOPS/GB | 200–40000 | 10iops-tier | 10000 per 1TB | Equivalent |
| Custom IOPS | Variable | custom | Up to 48000 | May need adjustment |

> **SDP boot volume note:** The Gen 2 `sdp` profile can technically be used for boot volumes but is **not recommended** — it cannot reliably detect GPT-formatted volumes and may boot to BIOS instead of UEFI. Must not be used with secure boot. Use `general-purpose` for boot volumes. See [Block Storage profiles](https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles) and [fullvalence migration guide](https://fullvalence.com/2025/11/10/from-vmware-to-ibm-cloud-vpc-vsi-part-3-migrating-virtual-machines/).

**Block Storage Migration Strategy:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Block Storage Migration Options                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Option 1: Snapshot-Based Migration                                        │
│   ══════════════════════════════════                                        │
│                                                                             │
│   Classic Volume ──▶ Create Snapshot ──▶ Copy to COS ──▶ Import to VPC     │
│                                                                             │
│   • Best for: Small to medium volumes (< 2TB)                              │
│   • Downtime: Minutes to hours depending on size                           │
│   • Complexity: Low                                                         │
│                                                                             │
│   ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│   Option 2: Replication-Based Migration                                     │
│   ═════════════════════════════════════                                     │
│                                                                             │
│   Classic Volume ◄──── Replication ────▶ VPC Volume                        │
│                   (via application)                                         │
│                                                                             │
│   • Best for: Large volumes, minimal downtime required                     │
│   • Downtime: Minutes (final cutover)                                      │
│   • Complexity: Medium to High                                             │
│                                                                             │
│   ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│   Option 3: Application-Level Migration                                     │
│   ═════════════════════════════════════                                     │
│                                                                             │
│   Classic App ──▶ Database dump/restore ──▶ VPC App                        │
│               ──▶ File sync (rsync)     ──▶                                │
│                                                                             │
│   • Best for: Databases, file servers                                      │
│   • Downtime: Depends on data size                                         │
│   • Complexity: Application-dependent                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 File Storage Migration

**Classic to VPC File Storage:**

| Classic Feature | VPC Equivalent | Migration Path |
|-----------------|----------------|----------------|
| NFS File Storage | VPC File Share | Data copy via rsync |
| Snapshot schedules | VPC snapshots | Recreate schedules |
| Replication | Cross-region replication | Configure in VPC |
| Access control (IP) | VPC security groups | Reconfigure |
| Encryption at rest | VPC provider-managed encryption | Verify key management |
| NFS usage (bytesUsed) | Capacity planning | Right-size VPC file shares |
| Disk utilization (SSH) | Capacity planning | Right-size VPC boot/data volumes (opt-in Phase 5 collection via SSH) |

### 5.3 Kubernetes Storage Exclusion

Storage volumes provisioned by IKS/ROKS clusters (detected via K8s metadata in the `notes` field — PVC, storageclass, plugin identifiers) are automatically excluded from migration assessment. These volumes are managed by the Kubernetes cluster and should migrate with the cluster, not individually.

**Detection:** The `isKubeStorage()` function in `csv-utils.ts` checks for `'pvc'`, `'storageclass'`, `ibm-file-plugin`, `ibm-block-attacher`, or `ibmcloud-block-storage-plugin` in the notes field. The `_isKubeStorage` flag is set at NAS CSV parse time and persists through merge and transform.

**Assessment impact:**
- K8s volumes are filtered out before `analyzeStorage()` processes block/file storage
- K8s volumes are filtered out before all storage pre-requisite checks
- A dedicated `storage-kube-consumed` info check lists affected volumes with cluster ID and PVC name
- A summary recommendation reports the count and total capacity of excluded K8s storage
- The Storage tab in migration shows a purple "K8s Volumes Excluded" tag
- The Block/File Storage resource tables show a warning banner when K8s volumes are present

**Remediation:** Plan cluster migration to VPC-based IKS/ROKS. VPC clusters provision new storage volumes automatically via the VPC storage CSI driver. Migrate persistent data using application-level backup/restore or Velero.

### 5.4 Storage Assessment Output

```typescript
interface StorageAssessment {
  blockStorage: {
    totalVolumes: number;
    totalCapacityTB: number;
    encryptedCount: number;
    snapshotCount: number;
    totalSnapshotSizeBytes: number;
    volumeAssessments: BlockVolumeAssessment[];
    migrationStrategy: 'snapshot' | 'replication' | 'hybrid';
    estimatedMigrationTime: string;
  };

  fileStorage: {
    totalVolumes: number;
    totalCapacityTB: number;
    totalBytesUsed: number;
    encryptedCount: number;
    snapshotCount: number;
    totalSnapshotSizeBytes: number;
    volumeAssessments: FileStorageAssessment[];
    estimatedMigrationTime: string;
  };

  objectStorage: {
    bucketsFound: number;
    migrationRequired: false;
    configurationChanges: string[];
  };

  portableStorage: {
    totalVolumes: number;
    totalCapacityGB: number;
    affectedVSIs: number;
  };

  summary: {
    totalDataTB: number;
    estimatedTransferTime: string;
    estimatedDowntime: string;
    costDuringMigration: number;
    recommendations: string[];
  };
}
```

---

## 6. Security Migration Assessment

### 6.1 Security Group Design

**Recommended Security Group Architecture:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VPC Security Group Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │   sg-bastion    │                                 │
│                         │   ───────────   │                                 │
│                         │ IN: 22 from     │                                 │
│                         │     admin CIDR  │                                 │
│                         └────────┬────────┘                                 │
│                                  │                                          │
│            ┌─────────────────────┼─────────────────────┐                    │
│            │                     │                     │                    │
│            ▼                     ▼                     ▼                    │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│   │    sg-web       │   │    sg-app       │   │    sg-db        │          │
│   │   ─────────     │   │   ─────────     │   │   ─────────     │          │
│   │ IN: 443 any     │   │ IN: 8080 from   │   │ IN: 5432 from   │          │
│   │ IN: 80 any      │   │     sg-web      │   │     sg-app      │          │
│   │ IN: 22 from     │   │ IN: 22 from     │   │ IN: 22 from     │          │
│   │     sg-bastion  │   │     sg-bastion  │   │     sg-bastion  │          │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘          │
│                                                                             │
│   Classic firewalls are translated to this tiered security group model      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Security Assessment Output

```typescript
interface SecurityAssessment {
  securityGroups: {
    classicFirewallRules: number;
    vpcSecurityGroupsNeeded: number;
    vpcNaclRulesNeeded: number;
    translationCoverage: number;
    manualReviewItems: string[];
  };
  
  certificates: SSLCertificateAssessment;
  sshKeys: SSHKeyAssessment;
  
  accessControl: {
    iamPoliciesNeeded: string[];
    serviceIDsNeeded: string[];
    resourceGroupStrategy: string;
  };
  
  compliance: {
    dataResidency: boolean;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    auditLogging: string[];
  };
  
  summary: {
    securityPostureChange: 'improved' | 'equivalent' | 'review-needed';
    criticalItems: string[];
    recommendations: string[];
  };
}
```

---

## 7. Feature Gap Analysis

### 7.1 Features Not Available in VPC

| Classic Feature | VPC Status | Workaround/Alternative |
|-----------------|------------|------------------------|
| **Auto Scale Groups** | Different implementation | VPC Instance Groups with policies |
| **Hardware Firewall** | Not available | Security Groups + NACLs + NFV |
| **Dedicated Firewall** | Not available | Third-party appliances (vSRX, FortiGate) |
| **Portable Private IPs** | Not available | Reserved IPs within subnet |
| **Portable Public IPs** | Not available | Floating IPs (similar) |
| **File Storage (NFS v3)** | NFS v4.1 only | Application compatibility check (bytesUsed now collected for capacity planning) |
| **Portable SAN Storage** | VPC Block Storage | Convert portable volumes to VPC block storage volumes |
| **EVault Backup** | Not available | Veeam, IBM Spectrum Protect |
| **Monthly Billing VSI** | Hourly only | Reserved capacity for savings |
| **Bare Metal Hourly** | Monthly only | Different billing model |
| **Legacy Datacenters** | Limited DCs | DC mapping required |
| **Software Add-ons (cPanel, Plesk, etc.)** | Not available | Install and license add-ons manually on VPC |
| **Bare Metal with VMware vSphere/ESXi** | Not available | VMs must migrate individually to VPC VSIs or OpenShift Virtualization |

### 7.2 Datacenter Availability

**Datacenter Mapping:**

| Classic DC | VPC Region | VPC Zones | Notes |
|------------|------------|-----------|-------|
| dal09, dal10, dal12, dal13 | us-south | us-south-1, 2, 3 | ✅ Full coverage |
| wdc04, wdc06, wdc07 | us-east | us-east-1, 2, 3 | ✅ Full coverage |
| lon02, lon04, lon05, lon06 | eu-gb | eu-gb-1, 2, 3 | ✅ Full coverage |
| fra02, fra04, fra05 | eu-de | eu-de-1, 2, 3 | ✅ Full coverage |
| tok02, tok04, tok05 | jp-tok | jp-tok-1, 2, 3 | ✅ Full coverage |
| syd01, syd04, syd05 | au-syd | au-syd-1, 2, 3 | ✅ Full coverage |
| che01 | in-che | ❌ No VPC | ⚠️ Migration to another region |
| sao01 | br-sao | br-sao-1, 2, 3 | ✅ Full coverage |

---

## 8. Dependency Mapping

### 8.1 Resource Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Dependency Graph Example                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────────┐                                │
│                              │   Gateway   │                                │
│                              │   gw-prod   │                                │
│                              └──────┬──────┘                                │
│                                     │                                       │
│              ┌──────────────────────┼──────────────────────┐                │
│              │                      │                      │                │
│              ▼                      ▼                      ▼                │
│       ┌─────────────┐        ┌─────────────┐        ┌─────────────┐        │
│       │ VLAN 1234   │        │ VLAN 1235   │        │ VLAN 1236   │        │
│       │ (Public)    │        │ (App)       │        │ (DB)        │        │
│       └──────┬──────┘        └──────┬──────┘        └──────┬──────┘        │
│              │                      │                      │                │
│              ▼                      ▼                      ▼                │
│       ┌─────────────┐        ┌─────────────┐        ┌─────────────┐        │
│       │ web-1       │───────▶│ app-1       │───────▶│ db-1        │        │
│       │ web-2       │───────▶│ app-2       │───────▶│ (Primary)   │        │
│       │ web-3       │        │             │        │             │        │
│       └──────┬──────┘        └─────────────┘        └──────┬──────┘        │
│              │                                             │                │
│              ▼                                             ▼                │
│       ┌─────────────┐                              ┌─────────────┐          │
│       │ LB-web      │                              │ block-vol-1 │          │
│       │ (443, 80)   │                              │ block-vol-2 │          │
│       └─────────────┘                              └─────────────┘          │
│                                                                             │
│   Migration Order: Gateway → VLANs → Storage → DB → App → Web → LB         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Migration Complexity Scoring

### 9.1 Scoring Model

```typescript
interface ComplexityScore {
  overall: number;                 // 0-100
  category: 'Low' | 'Medium' | 'High' | 'Very High';
  
  dimensions: {
    compute: DimensionScore;
    network: DimensionScore;
    storage: DimensionScore;
    security: DimensionScore;
    features: DimensionScore;
  };
  
  estimatedTimeline: {
    minimum: string;
    typical: string;
    maximum: string;
  };
  
  estimatedEffort: {
    planning: string;
    execution: string;
    testing: string;
    total: string;
  };
}
```

### 9.2 Score Interpretation

| Score Range | Category | Typical Timeline | Characteristics |
|-------------|----------|------------------|-----------------|
| 0-25 | Low | 1-2 weeks | Few resources, simple network, no blockers |
| 26-50 | Medium | 2-4 weeks | Moderate resources, some network complexity |
| 51-75 | High | 1-3 months | Many resources, complex network, some gaps |
| 76-100 | Very High | 3-6 months | Large environment, complex dependencies |

---

## 10. Cost Comparison Analysis

### 10.1 Cost Model

```typescript
interface CostAnalysis {
  currentClassicCost: MonthlyCost;
  projectedVPCCost: MonthlyCost;
  migrationCost: OneTimeCost;
  
  comparison: {
    monthlyDifference: number;
    percentageChange: number;
    breakEvenMonths: number;
    threeYearTCO: TCOAnalysis;
  };
  
  optimisationOpportunities: Optimisation[];
  
  costByCategory: {
    compute: { classic: number; vpc: number };
    storage: { classic: number; vpc: number };
    network: { classic: number; vpc: number };
  };
}
```

### 10.2 Cost Comparison Visualisation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Monthly Cost Comparison                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Classic Monthly: $12,450                VPC Monthly: $10,280              │
│                                                                             │
│   ┌─────────────────────────────────┐    ┌─────────────────────────────┐   │
│   │ ████████████████████████████████│    │ ██████████████████████████  │   │
│   └─────────────────────────────────┘    └─────────────────────────────┘   │
│                                                                             │
│   Monthly Savings: $2,170 (17.4%)                                          │
│   Annual Savings: $26,040                                                   │
│   3-Year Savings: $78,120                                                   │
│                                                                             │
│   Migration Cost: $15,000 (one-time)                                       │
│   Break-even: 7 months                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Migration Waves Planning

### 11.1 Wave Structure

```typescript
interface MigrationWave {
  waveNumber: number;
  name: string;
  description: string;
  resources: MigrationResource[];
  prerequisites: string[];
  timing: {
    estimatedDuration: string;
    recommendedWindow: string;
    dependencies: number[];
  };
  risks: Risk[];
  rollbackPlan: string;
  validationSteps: string[];
}
```

### 11.2 Wave Visualisation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Migration Wave Plan                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Week 1          Week 2          Week 3          Week 4                    │
│                                                                             │
│   ┌──────────┐                                                              │
│   │ Wave 0   │                                                              │
│   │Foundation│                                                              │
│   │ 2 days   │                                                              │
│   └────┬─────┘                                                              │
│        │                                                                    │
│        ├────────────┐                                                       │
│        ▼            ▼                                                       │
│   ┌──────────┐ ┌──────────┐                                                │
│   │ Wave 1   │ │ Wave 2   │                                                │
│   │ Network  │ │ Storage  │                                                │
│   │ 3 days   │ │ 5 days   │                                                │
│   └────┬─────┘ └────┬─────┘                                                │
│        └─────┬──────┘                                                       │
│              ▼                                                              │
│        ┌──────────┐                                                         │
│        │ Wave 3   │                                                         │
│        │ Database │                                                         │
│        └────┬─────┘                                                         │
│             ▼                                                               │
│        ┌──────────┐                                                         │
│        │ Wave 4   │                                                         │
│        │ App+Web  │                                                         │
│        └────┬─────┘                                                         │
│             ▼                                                               │
│        ┌──────────┐                                                         │
│        │ Wave 5   │                                                         │
│        │ Cutover  │                                                         │
│        └──────────┘                                                         │
│                                                                             │
│   Total Duration: 16 days                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. watsonx.ai Integration

### 12.1 AI Use Cases

| Use Case | Model | Purpose |
|----------|-------|---------|
| Architecture Recommendations | granite-13b-chat | VPC architecture suggestions |
| Migration Runbook Generation | granite-13b-chat | Step-by-step procedures |
| Risk Assessment | granite-13b-chat | Risk identification and mitigation |
| Configuration Translation | granite-13b-chat | VPC equivalent configuration |
| Q&A Assistant | granite-13b-chat | Migration guidance |
| Executive Summary | granite-13b-chat | Business-friendly summary |

### 12.2 Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     watsonx.ai Integration Architecture                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    Classic Explorer Backend                          │  │
│   │                                                                      │  │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │  │
│   │   │ Analysis    │    │  Prompt     │    │  Response   │            │  │
│   │   │ Engine      │───▶│  Builder    │───▶│  Parser     │            │  │
│   │   └─────────────┘    └──────┬──────┘    └─────────────┘            │  │
│   └─────────────────────────────┼───────────────────────────────────────┘  │
│                                 │                                          │
│                                 ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        watsonx.ai API                                │  │
│   │   Model: granite-13b-chat                                           │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 AI-Assisted Features

**Interactive Migration Assistant:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🤖 Migration Assistant                                           [ × ]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Ask me anything about your Classic to VPC migration!                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ You: What's the best way to migrate my Vyatta gateway?              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Assistant: Based on your Vyatta configuration, I recommend:         │   │
│  │                                                                      │   │
│  │ 1. For basic routing and NAT: Use VPC native routing tables and    │   │
│  │    Public Gateways.                                                 │   │
│  │                                                                      │   │
│  │ 2. For your IPsec VPN tunnels: Use VPC VPN Gateway.                │   │
│  │                                                                      │   │
│  │ 3. For advanced firewall rules: Split between Security Groups       │   │
│  │    and NACLs.                                                       │   │
│  │                                                                      │   │
│  │ Would you like me to generate the VPC configuration?                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Type your question...                                    [ Send ]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Migration Readiness Report

### 13.1 Executive Summary Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   IBM Cloud                                                                 │
│   CLASSIC TO VPC MIGRATION                                                  │
│   READINESS ASSESSMENT                                                      │
│                                                                             │
│   Account: ACME Corporation (123456)                                        │
│   Generated: January 28, 2025                                               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   OVERALL READINESS SCORE                                                   │
│                                                                             │
│                              72%                                            │
│                                                                             │
│                        READY WITH                                           │
│                      MODERATE EFFORT                                        │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Compute    ████████████████████░░░░░░  78%  Ready                  │ │
│   │  Network    ██████████████░░░░░░░░░░░░  58%  Needs Work             │ │
│   │  Storage    ████████████████████████░░  92%  Ready                  │ │
│   │  Security   ██████████████████░░░░░░░░  72%  Ready                  │ │
│   │  Features   ██████████████████████░░░░  85%  Ready                  │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   KEY FINDINGS                                                              │
│                                                                             │
│   ✓  45 of 53 compute instances can migrate directly                       │
│   ✓  Storage migration is straightforward (4.5TB total)                    │
│   ⚠  3 gateway appliances require manual configuration                     │
│   ⚠  8 instances require OS upgrade (CentOS 8 EOL)                         │
│   ✗  2 instances exceed VPC limits (custom bare metal)                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ESTIMATED MIGRATION                                                       │
│                                                                             │
│   Timeline:        4-6 weeks                                                │
│   Effort:          240-320 hours                                            │
│   Migration Cost:  $18,000 - $24,000                                        │
│                                                                             │
│   PROJECTED SAVINGS                                                         │
│                                                                             │
│   Monthly:         $2,170 (17.4% reduction)                                │
│   Annual:          $26,040                                                  │
│   3-Year TCO:      $78,120                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Export Formats

| Format | Use Case | Contents |
|--------|----------|----------|
| **PDF** | Executive presentations | Full report with visualisations |
| **XLSX** | Detailed analysis | All data in spreadsheet format |
| **JSON** | Automation input | Machine-readable for Terraform/Ansible |
| **Terraform** | IaC generation | VPC infrastructure code |

---

## 14. User Interface Design

### 14.1 Migration Analysis Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  IBM Cloud │ Infrastructure Explorer         [ Account ▼ ] [ ? ]    │
├─────────┬───────────────────────────────────────────────────────────────────┤
│         │                                                                   │
│ Summary │  VPC Migration Analysis                                           │
│         │                                                                   │
│ Compute │  ┌─────────────────────────────────────────────────────────────┐ │
│         │  │  Overall Readiness: 72%              Complexity: Medium     │ │
│ Network │  │                                                             │ │
│         │  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │ │
│ Storage │  │  │   COMPUTE     │ │   NETWORK     │ │   STORAGE     │     │ │
│         │  │  │     78%       │ │     58%       │ │     92%       │     │ │
│ Security│  │  │  45/53 ready  │ │  Needs work   │ │  4.5TB ready  │     │ │
│         │  │  └───────────────┘ └───────────────┘ └───────────────┘     │ │
│ ─────── │  └─────────────────────────────────────────────────────────────┘ │
│         │                                                                   │
│Migration│  ┌─────────────────────────────────────────────────────────────┐ │
│Analysis │  │  Quick Actions                                              │ │
│  ▸Assess│  │                                                             │ │
│  -Plan  │  │  [ 🔍 Run Full Analysis ]  [ 📊 Generate Report ]           │ │
│  -Report│  │  [ 🤖 Ask AI Assistant ]   [ 📥 Export to Terraform ]       │ │
│         │  └─────────────────────────────────────────────────────────────┘ │
│         │                                                                   │
│         │  ┌──────────────────────────────┐ ┌────────────────────────────┐ │
│         │  │  Cost Comparison             │ │  Key Blockers              │ │
│         │  │  Classic:  $12,450/mo        │ │  ⚠ 3 gateway appliances   │ │
│         │  │  VPC:      $10,280/mo        │ │  ⚠ 8 OS upgrades needed   │ │
│         │  │  Savings:  $2,170/mo (17%)   │ │  ✗ 2 unsupported configs  │ │
│         │  └──────────────────────────────┘ └────────────────────────────┘ │
│         │                                                                   │
└─────────┴───────────────────────────────────────────────────────────────────┘
```

---

## 15. Implementation Approach

### 15.1 Development Phases

**Phase 2A: Core Analysis Engine (4 weeks)**

| Week | Deliverables |
|------|--------------|
| 1 | Compute assessment (profile mapping, OS compatibility) |
| 2 | Network assessment (VLAN mapping, firewall translation) |
| 3 | Storage assessment, security assessment |
| 4 | Dependency mapping, complexity scoring |

**Phase 2B: AI Integration (3 weeks)**

| Week | Deliverables |
|------|--------------|
| 5 | watsonx.ai integration, prompt engineering |
| 6 | Architecture recommendations, configuration translation |
| 7 | Migration assistant chatbot, runbook generation |

**Phase 2C: Reporting & UI (3 weeks)**

| Week | Deliverables |
|------|--------------|
| 8 | Migration analysis dashboard |
| 9 | PDF/XLSX report generation |
| 10 | Terraform export, final polish |

### 15.2 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Analysis accuracy | > 95% | Manual validation |
| Profile mapping accuracy | > 98% | Correct VPC profile suggestions |
| Cost estimate accuracy | ± 10% | Compare to actual VPC costs |
| User satisfaction | > 4.5/5 | Post-analysis survey |
| Report generation time | < 30 sec | End-to-end timing |

### 15.3 Future Enhancements

| Feature | Description | Value |
|---------|-------------|-------|
| Terraform Generation | Auto-generate VPC infrastructure code | Accelerate deployment |
| Ansible Playbooks | Generate migration automation scripts | Reduce manual effort |
| Migration Execution | Actually perform migration steps | End-to-end solution |
| Progress Tracking | Track migration execution status | Visibility |
| Post-Migration Validation | Verify migrated resources | Quality assurance |

---

## Appendix A: VPC Instance Profile Reference

| Profile | vCPU | Memory (GB) | Bandwidth (Gbps) |
|---------|------|-------------|------------------|
| bx2-2x8 | 2 | 8 | 4 |
| bx2-4x16 | 4 | 16 | 8 |
| bx2-8x32 | 8 | 32 | 16 |
| bx2-16x64 | 16 | 64 | 32 |
| bx2-32x128 | 32 | 128 | 64 |
| bx2-48x192 | 48 | 192 | 80 |
| bx2-64x256 | 64 | 256 | 80 |
| cx2-2x4 | 2 | 4 | 4 |
| cx2-4x8 | 4 | 8 | 8 |
| cx2-8x16 | 8 | 16 | 16 |
| cx2-16x32 | 16 | 32 | 32 |
| cx2-32x64 | 32 | 64 | 64 |
| mx2-2x16 | 2 | 16 | 4 |
| mx2-4x32 | 4 | 32 | 8 |
| mx2-8x64 | 8 | 64 | 16 |
| mx2-16x128 | 16 | 128 | 32 |
| mx2-32x256 | 32 | 256 | 64 |
| mx2-48x384 | 48 | 384 | 80 |
| mx2-64x512 | 64 | 512 | 80 |

---

## Appendix B: Classic to VPC Feature Mapping

| Classic Feature | VPC Equivalent | Parity |
|-----------------|----------------|--------|
| Virtual Server | Virtual Server | ✅ Full |
| Bare Metal | Bare Metal | ✅ Full |
| VLAN | VPC Subnet | ⚠️ Different model |
| Hardware Firewall | Security Groups + NACLs | ⚠️ Different model |
| Gateway Appliance | Third-party or VPC native | ⚠️ Depends on features |
| Local Load Balancer | Application Load Balancer | ✅ Full |
| Block Storage | Block Storage | ✅ Full |
| File Storage | File Storage (NFS v4.1) | ⚠️ NFS v3 not supported |
| Object Storage | Object Storage | ✅ Same service |
| IPsec VPN | VPN Gateway | ✅ Full |
| Direct Link | Direct Link | ✅ Same service |
| Security Groups | Security Groups | ✅ Enhanced |
| Software Add-ons (cPanel, Plesk) | Self-install & license | ❌ Not available |
| EVault Backup | Veeam / IBM Backup for VPC | ⚠️ Different product |
| Reserved Capacity | — | ⚠️ No equivalent — use Savings Plans |
| GPU Instances | VPC GPU profiles (gx2/gx3d) | ⚠️ Different hardware |

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Classic Infrastructure** | IBM Cloud's original IaaS platform (formerly SoftLayer) |
| **VPC** | Virtual Private Cloud - IBM Cloud's next-generation network-isolated infrastructure |
| **VLAN** | Virtual LAN used in Classic for network segmentation |
| **Subnet** | IP address range within a VPC zone |
| **Security Group** | Stateful firewall rules attached to instances |
| **NACL** | Network Access Control List - stateless subnet-level firewall |
| **Floating IP** | Public IP that can be moved between instances |
| **Instance Profile** | Predefined vCPU/memory configuration in VPC |
| **Migration Wave** | Group of resources migrated together |
| **Complexity Score** | 0-100 rating of migration difficulty |
| **Migration Approach** | Per-workload recommendation: Lift-and-Shift, Rebuild, Re-platform, or Re-architect |
| **VRF** | Virtual Routing and Forwarding — required for Classic-to-VPC private connectivity |
| **watsonx.ai** | IBM's enterprise AI platform |

---

**Document End**