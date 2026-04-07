# Migration Assessment

## Overview

The Migration Assessment provides a comprehensive Classic-to-VPC readiness evaluation and planning toolkit. It analyzes every Classic resource for VPC compatibility, identifies blockers and warnings, recommends migration approaches, estimates costs, and generates actionable migration wave plans.

## Assessment Tabs

The migration assessment is organized into nine tabs:

| Tab              | Description                                                    |
|------------------|----------------------------------------------------------------|
| **Compute**      | VSI and Bare Metal profile matching, OS compatibility          |
| **Network**      | VLAN, subnet, firewall, and load balancer migration readiness  |
| **Storage**      | Block, file, and object storage compatibility checks           |
| **Security**     | Security group rules, SSL certificates, SSH key analysis       |
| **Feature Gaps** | Classic-only features with no direct VPC equivalent            |
| **Costs**        | Classic vs VPC cost comparison and 3-year projections          |
| **Migration Waves** | Dependency-grouped migration timeline                       |
| **Dependencies** | Interactive resource dependency graph                          |
| **VPC Pricing**  | VPC profile pricing reference                                  |

## Pre-Requisite Checks

The assessment runs **64 pre-requisite checks** across four categories:

### Compute Checks (32)

Key checks include:

- Boot disk size within VPC limits (250 GB max)
- vCPU count within VPC profile maximums
- Memory within VPC profile maximums
- OS compatibility against 43 entries (stock, BYOL, unsupported)
- Unsupported OS blockers: Windows Server 2003/2008, Solaris, AIX, HP-UX, FreeBSD
- End-of-life OS warnings: RHEL 7, CentOS 7, Windows Server 2012
- 32-bit OS detection
- Hypervisor detection (VMware, Xen, KVM)
- Datacenter availability in VPC regions
- IKS/ROKS worker node identification
- Dedicated host compatibility
- **VPC quota: vCPU per region** (200 default)
- **VPC quota: memory per region** (5,600 GB default)
- **VPC quota: bare metal servers per account** (25 default)
- **VPC quota: placement groups per region** (100 default)

### Network Checks (17)

- VLAN spanning and VRF requirements
- Firewall rule compatibility (200 rules per ACL)
- Security group rule count (250 rules per SG)
- Load balancer configuration
- Gateway appliance migration paths
- IPv6 usage detection
- **VPC quota: VPCs per region** (10 default)
- **VPC quota: subnets per VPC** (100 default)
- **VPC quota: security groups per VPC** (100 default)
- **VPC quota: ACLs per VPC** (100 default)
- **VPC quota: floating IPs per zone** (40 default)
- **VPC quota: VPN gateways per region** (9 default)

### Storage Checks (12)

- Block storage volume size and IOPS limits
- File storage compatibility
- Multi-attach storage detection
- Snapshot requirements
- **VPC quota: volumes per region** (300 default)
- **VPC quota: file shares per account** (300 default)

### Security Checks (3)

- SSL certificate compatibility
- SSH key format requirements
- HSM device detection

### Severity Levels

Each check produces one of five severity levels:

| Severity    | Meaning                                              |
|-------------|------------------------------------------------------|
| **Blocker** | Cannot migrate without remediation                   |
| **Warning** | Migration possible but requires attention            |
| **Info**    | Informational finding, no action required            |
| **Unknown** | Insufficient data to determine compatibility         |
| **Passed**  | Fully compatible, no issues found                    |

## Profile Mapping Data

Migration profile recommendations are driven by curated IBM Classic-to-VPC mapping data:

- **VSI profiles:** 266 VPC VSI profiles (including Gen4: bx4, cx4, mx4) with hourly pricing, matched to Classic VSIs by memory:CPU ratio with Gen3+ preference
- **Bare metal profiles:** 42 VPC bare metal profiles. Classic bare metal servers are first looked up in a curated table of 666 processor/core/RAM configurations mapped to specific VPC profiles. If no exact match, algorithmic ratio-based matching is used as fallback
- **Storage tiers:** Block and file storage tier mappings from IBM's storage migration reference, including SDS/SDP and traditional VPC profile recommendations

When a bare metal recommendation comes from the curated mapping data, the note includes "mapped from Classic-to-VPC migration guide".

## Migration Approach Classification

Each VSI and Bare Metal server receives a recommended migration approach:

| Approach            | When Recommended                                           |
|---------------------|------------------------------------------------------------|
| **Lift & Shift**    | OS is stock-compatible, no blockers, no hypervisor issues  |
| **Rebuild**         | IBM's default recommendation — provision fresh VPC instances with latest OS |
| **Re-platform**     | OS requires BYOL or minor configuration changes            |
| **Re-architect**    | Hypervisor detected, IKS/ROKS workers, or fundamental incompatibilities |

The classification is based on OS compatibility, hypervisor detection, IKS/ROKS presence, and whether any blocker-level checks failed.

> **Note:** IBM's official guidance recommends "Rebuild" as the default approach for most migrations.

## Readiness Scoring

Each resource receives a readiness score from 0 to 100% calculated across five dimensions:

1. Compute compatibility
2. Network compatibility
3. Storage compatibility
4. Security compatibility
5. Feature gap impact

Resources with blocker-level findings include a remediation checklist with specific actions required before migration.

## Cost Comparison

The cost analysis compares Classic and VPC infrastructure costs:

- **Monthly comparison** — side-by-side Classic vs VPC costs for compute, storage, and network
- **3-year projections** — total cost of ownership over 36 months
- **Break-even analysis** — identifies when VPC savings offset migration costs
- **Bar charts** — visual comparison by compute, storage, and network categories

## Migration Waves

Resources are organized into dependency-grouped migration waves:

- Each wave includes: name, resource count, estimated duration, prerequisites, and resource list
- Timeline visualization shows wave sequence and dependencies
- Resources with shared dependencies are grouped into the same wave
- Wave ordering respects prerequisite relationships

## Dependency Graph

An interactive network diagram showing resource dependencies:

- Nodes represent resources
- Edges represent dependencies (e.g., VSI depends on VLAN, storage attached to VSI)
- Click nodes for detail panel
- Zoom and pan controls

## Export Options

### Terraform HCL

Generated Terraform configuration for VPC infrastructure:

- VPC instances with matched profiles
- Subnets mapped from Classic VLANs
- Security groups translated from Classic firewall rules
- Storage volumes with appropriate IOPS tiers

### DOCX Reports

Full migration assessment report export including:

- Executive summary
- Readiness scores by category
- Cost projections and break-even analysis
- Wave plans with timelines
- Remediation items for each blocker

## Post-Migration Troubleshooting

Brief guidance for common post-migration issues:

| Issue                | Resolution                                                  |
|----------------------|-------------------------------------------------------------|
| No internet access   | Attach a floating IP or configure a public gateway          |
| SSH not connecting   | Verify security group rules allow port 22; check key format |
| Poor performance     | Review profile sizing; check storage IOPS tier              |

## IBM Migration Resources

### Architecture and Planning

- [IBM Cloud Virtualization Solutions](https://www.ibm.com/cloud/virtualization)
- [VSI Architecture Reference](https://cloud.ibm.com/docs/vpc?topic=vpc-about-advanced-virtual-servers)
- [Pre-migration Planning](https://cloud.ibm.com/docs/vpc?topic=vpc-migrating-classic)
- [Wave Planning](https://cloud.ibm.com/docs/vpc?topic=vpc-migrating-classic-wave)
- [Post-migration](https://cloud.ibm.com/docs/vpc?topic=vpc-migrating-classic-post)

### Migration Guides

- [Classic-to-VPC Migration Guide](https://cloud.ibm.com/docs/vpc?topic=vpc-migrating-classic)
- [VRF Enablement](https://cloud.ibm.com/docs/account?topic=account-vrf-service-endpoint)
- [VPC Quotas and Limits](https://cloud.ibm.com/docs/vpc?topic=vpc-quotas)
- [Compute Migration](https://cloud.ibm.com/docs/vpc?topic=vpc-migrating-classic-virtual-servers)
- [Network Migration](https://cloud.ibm.com/docs/vpc?topic=vpc-migrating-classic-network)
- [Storage Migration](https://cloud.ibm.com/docs/vpc?topic=vpc-migrating-classic-block-storage)
- [IKS Migration](https://cloud.ibm.com/docs/containers?topic=containers-vpc-migrate)
- [VMware Migration](https://cloud.ibm.com/docs/vmwaresolutions?topic=vmwaresolutions-vpc-vcf-migration)

### Migration Tools

- [RackWare](https://cloud.ibm.com/catalog/content/IBM-MarketPlace-P2P-1.3-22935832-bd76-49ab-b53e-12fc5d04c266-global) — automated server migration
- [Wanclouds VPC+](https://cloud.ibm.com/catalog/services/wanclouds-vpc) — multi-cloud migration
- [vpc-migration-tools (GitHub)](https://github.com/IBM-Cloud/vpc-migration-tools) — open-source migration utilities
- [IBM Cloud Migration Tools Catalog](https://cloud.ibm.com/catalog?search=migration)
