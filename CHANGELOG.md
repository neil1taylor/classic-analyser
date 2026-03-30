# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
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
- 9 new migration pre-requisite checks: 32-bit OS, EOL OS, hypervisor detection (VMware/XenServer/Hyper-V), Oracle/SAP workload detection, IKS/ROKS worker node detection, single-socket high clock speed
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
