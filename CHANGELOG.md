# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
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

### Fixed
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
