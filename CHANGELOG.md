# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **Disk utilization in XLSX export** — the four disk utilization columns (Disk Used %, Disk Used / Total, Disk Util Status, Disk Util Details) are now included in the vVirtualServers and vBareMetal worksheets when exporting to XLSX. Previously collected but not exported
- **PowerVS and Platform Services XLSX import** — the Import XLSX feature now recognises PowerVS worksheets (`pPvs*` prefix) and Platform Services worksheets (`sServiceInstances`), routing imported data to the correct domain contexts. Infrastructure mode is set automatically based on which domains have data
- **Disk Utilization Collection** (opt-in) — SSH into Classic VSIs and Bare Metal servers via private IP to collect real filesystem usage (`df` on Linux, PowerShell on Windows). Credentials are fetched transiently from the SoftLayer API (`operatingSystem.passwords`), used for SSH, then discarded — never displayed, stored, logged, or exported. New Phase 5 runs after all API collection with 5 concurrent SSH connections and 10s timeout. Four new hidden-by-default columns on Virtual Servers and Bare Metal tables: Disk Used %, Disk Used / Total, Disk Util Status, Disk Util Details. Graceful failure per machine (unavailable/timeout/auth_failed/unsupported_os/no_credentials/no_ip)
- Enriched OS compatibility data — expanded from 18 to 43 OS entries with EOL dates, VPC image type (stock/BYOL/none), and detailed migration notes. New entries include Windows Server 2003/2008 (blocker — no VirtIO drivers), RHEL 6, CentOS 5/6, Ubuntu 14–18, Debian 9, SLES 11, Rocky Linux, AlmaLinux, Oracle Linux, Fedora CoreOS, Solaris, AIX, HP-UX, and OpenBSD
- New `os-unsupported` migration blocker check — flags servers running operating systems that cannot run on VPC at all (Windows 2003/2008 lack VirtIO drivers, Solaris/AIX/HP-UX are unsupported platforms). Separate from the existing EOL warning which now covers OSes that are EOL but still available via BYOL
- BYOL awareness in compute analysis — migration notes now indicate when an OS is only available as a BYOL custom image on VPC (e.g. RHEL 7, CentOS 7, Windows 2012)
- **Platform Services domain** — new fourth infrastructure tab that collects all IBM Cloud service instances (COS, Key Protect, SCC, databases, Event Streams, etc.) via the Resource Controller API. Includes service type identification (30+ known services), resource group name resolution, dashboard with service/location/category breakdowns, and XLSX export
- Cloud-harvester schema alignment — attached network storage fields (`attachedBlockStorageGb`, `attachedFileStorageGb`, `volumeCount`) on Virtual Servers and Bare Metal, `costBasis` on Virtual Servers, `replicationStatus` on Block and File Storage
- VMware Cross References frontend table definition (backend already collected; now visible in UI)
- Migration execution step templates per approach — structured guidance for lift-and-shift (image export → COS → VPC), rebuild, re-platform (VMware RMM, PowerVS), and re-architect (Velero for IKS/ROKS) with IBM tool references and documentation links
- Windows Cloudbase-Init & VirtIO pre-requisite check (`vsi-windows-cloudbase-init`) — flags Windows servers needing Cloudbase-Init and VirtIO drivers before VPC migration
- VPC Network ACL rule estimate check (`net-acl-rule-estimate`) — warns when Classic firewall rules exceed VPC NACL limits (25 inbound + 25 outbound per ACL)
- Documentation links (`docsUrl`) on all 12 feature gap definitions, linking to relevant IBM Cloud VPC documentation
- Expanded Classic-to-VPC migration links in Help docs — compute, network, storage, IKS/ROKS, and VMware domain-specific migration guides
- Migration approach recommendation per workload — classifies each VSI and Bare Metal as Lift & Shift, Rebuild, Re-platform, or Re-architect based on OS, hypervisor, IKS/ROKS, and blocker status. New "Approach" column in Compute Assessment tables.
- 6 new migration pre-requisite checks from IBM classic-to-vpc docs analysis: VRF Enablement (manual verification), Reserved Capacity (active commitments), Storage Utilization (right-sizing via bytesUsed), Software Add-on Detection (cPanel/Plesk/antivirus/monitoring), GPU Workload Detection, and migration approach classification
- Software Add-ons feature gap entry in Feature Gap Analysis
- Post-migration troubleshooting section in Help docs (internet access, SSH connectivity, performance)
- Expanded IBM migration resource links: Classic-to-VPC Migration Guide, VRF docs, VPC Quotas, ConvertIO/PrimaryIO
- VRF Enablement migration pre-requisite check (manual verification flag for Classic-to-VPC Transit Gateway connectivity)
- Storage discovery gaps closed — portable storage distinction on VSIs, file storage `bytesUsed`, `hasEncryptionAtRest`, datacenter name, per-volume snapshot collection in Phase 3
- 9 new migration pre-requisite checks: 32-bit OS, unsupported OS (blocker), EOL OS (warning), hypervisor detection (VMware/XenServer/Hyper-V), Oracle/SAP workload detection, IKS/ROKS worker node detection, single-socket high clock speed
- Hidden API fields surfaced in VSI and Bare Metal detail panels
- IMS report import — CSV, HTML, drawio, XLSX, MDL, and JSON parsers with multi-source merger
- Error boundaries, guided tour, export page, retry logic, AI hooks wired into application
- Frontend aligned with vcf_migration patterns — lazy routing, state persistence, UI components
- Collection timeout (10 min) and SSE keepalive (30s) on all three collection streams
- CI npm audit step and Trivy container image scan
- Deploy health-check retry with auto-rollback in deploy-ai-proxy workflow
- Deploy skill (`/deploy`) for Claude Code

### Changed
- Auth routes refactored — IAM helpers extracted to shared `utils/iam.ts`, Zod request validation added
- MDL parser improved — field renames, nested dict resolution, gateway IP extraction
- Deploy script (`code-engine.sh`) rewritten with `.env` loading, podman support, create-or-update pattern, min-scale 1
- File storage `replicationPartners` mask now includes nested fields (matching block storage)
- Documentation updated for storage discovery gaps across CLAUDE.md, PRD.md, MIGRATION.md, and in-app docs
- CI/CD deploy workflow: use `us.icr.io` registry, target resource group, create-or-update app pattern, ICR registry secret for image pulls, `workflow_dispatch` trigger

### Fixed
- ApiKeyForm test failures — added missing mocks for ImportReportButton and ImportMdlButton
- `blockDevices` crash on IMS report import guarded with `Array.isArray`
- Replaced abandoned `react-simple-maps` with `d3-geo` for React 19 compatibility

## [1.0.0] - 2025-01-28

### Added
- Initial release — IBM Cloud Infrastructure Explorer
- Classic infrastructure collection (27+ resource types)
- VPC collection (26 resource types across all regions)
- PowerVS collection (22 resource types across all workspaces)
- Interactive tables with column picker, filtering, sorting, virtualization
- XLSX export with one worksheet per resource type
- XLSX import for re-loading previously exported data
- Dashboard with resource counts, distribution charts, account info
- Cost analysis with treemap and sunburst visualizations
- Geography map showing resource distribution across datacenters
- Network topology diagram with relationship mapping
- VPC migration assessment with pre-requisite checks
- OAuth 2.0 PKCE and IAM passcode login flows
- VSI Profile Selection Guide with flowchart
- Docker multi-stage build for IBM Code Engine deployment
- GitHub Actions CI/CD pipeline
