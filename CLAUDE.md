# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IBM Cloud Infrastructure Explorer — a web-based inventory and analysis tool for IBM Cloud Classic (SoftLayer), VPC, PowerVS, and Platform Services infrastructure. It collects data from 27+ Classic API resource types, 26 VPC resource types (across all VPC regions), 22 PowerVS resource types (across all workspaces), and all Platform Services instances (COS, Key Protect, SCC, databases, etc. via the Resource Controller API), displays them in interactive tables, and exports to XLSX. Deployed as a single container on IBM Code Engine.

The project specification lives in `PRD.md`. The application is fully implemented.

## Architecture

**Single-container design:** Express.js serves both the React SPA (static files) and API proxy routes. All SoftLayer and VPC API calls go through the backend proxy to avoid CORS issues.

```
Browser → Express.js (/api/* proxy routes + / static SPA) → SoftLayer REST API
                                                           → VPC REST API ({region}.iaas.cloud.ibm.com)
                                                           → PowerVS REST API ({region}.power-iaas.cloud.ibm.com)
                                                           → Resource Controller API (resource-controller.cloud.ibm.com)
```

**Stateless API key handling (critical security requirement):**
- API key lives only in React Context (browser memory) — never localStorage, never server disk, never logs
- Every request sends the key via `X-API-Key` header; server extracts it, uses it for that request, then discards it
- No server-side sessions, no sticky sessions, no database
- 60-minute inactivity timeout clears the key in the browser

**Data collection** uses Server-Sent Events (SSE) to stream progress. Classic collection runs in up to five phases: Phase 1 (shallow scan) + Phase 2 (deep scan) + Phase 3 (nested/billing) + Phase 4 (TGW route reports) + Phase 5 (disk utilization, opt-in). Phases 1-3 use 10 concurrent API calls. Phase 3 includes per-volume snapshot collection for block and file storage (5 concurrent calls), billing items, VMware nested resources, and Transit Gateway connections. Phase 5 (opt-in via "Disk util" toggle) fetches OS credentials from the SoftLayer API, SSHs into each VSI/BM via private IP to collect real filesystem usage, then discards credentials — they are never displayed, stored, logged, or exported. SSH uses 5 concurrent connections with 10s timeout; machines that are unreachable or lack credentials are gracefully skipped. VPC collection runs as a single phase across all auto-discovered regions with 10 concurrent resource tasks. PowerVS collection discovers workspaces via the Resource Controller API, collects Networks first (dependency), then Network Ports, then all remaining resources concurrently with 10 concurrent tasks.

**IMS Report Import** provides three alternative data input methods (no API key required):
- **Import XLSX** — re-imports a previously exported XLSX file (cloud-harvester output)
- **Import IMS Reports** — multi-file import of CSVs, HTMLs, drawio, report XLSXs (device inventory/consolidated) from IBM's IMS reporting tool. Parsers in `src/services/report-parsers/` handle each format. The merger deduplicates by `id` with `hostname` fallback. Note: `_assessment.xlsx` files are post-assessment outputs and are intentionally excluded from import.
- **Import MDL** — uploads an IMS `.mdl` file to `POST /api/convert/mdl`, which runs `scripts/mdl-to-json.py` (Python) server-side to convert the serialized SoftLayer data model to JSON. This is the most complete data source (~13K+ resources per large account).

**Navigation** uses a 4-domain tab switcher (Carbon ContentSwitcher) in the SideNav. The `InfrastructureMode` is an array of `InfrastructureDomain` values (`'classic' | 'vpc' | 'powervs' | 'platform'`). Login validates Classic, VPC, and PowerVS in parallel via `Promise.allSettled` and builds the mode array from whichever succeed. Platform Services is implicitly enabled whenever VPC or PowerVS auth succeeds (all use IAM tokens). Only domains the user has access to appear as tabs.

## Tech Stack

- **Frontend:** React 18, TypeScript 5, Vite 5, @carbon/react (Carbon Design System v11), Axios, react-window (virtualization), ExcelJS (xlsx export/import), multer (file uploads)
- **Backend:** Node.js 20 LTS, Express 4, winston (logging), helmet (security headers), compression, ssh2 (disk utilization SSH), Python 3 (MDL conversion)
- **Infrastructure:** Docker (Node 20 Alpine + Python 3, multi-stage build), IBM Code Engine, GitHub Actions CI/CD

## Project Structure

```
src/                              # React frontend
  components/
    auth/                         ApiKeyForm, ImportButton, ImportReportButton, ImportMdlButton
    common/                       Header, SideNav, ExportDialog, AboutModal,
                                  ProgressIndicator, AnimatedCounter, TrendIndicator, SkeletonCard,
                                  SectionErrorBoundary, GuidedTour, LoadingSkeleton, MetricCard
    dashboard/                    Dashboard, AccountInfo, ResourceCard, DistributionCharts, ImportBanner
    tables/                       DataTable, VirtualizedTable, TableToolbar,
                                  ColumnFilter, AdvancedFilter, ColumnResizer
    costs/                        CostDashboard, CostTreemap
    geography/                    GeographyMap
    topology/                     TopologyDiagram, TopologyNodes
    vpc/                          VpcDashboard
    platform/                     PlatformDashboard
    help/                         HelpPage
  contexts/                       AuthContext, DataContext, UIContext, VpcDataContext, PowerVsDataContext,
                                  PlatformDataContext, MigrationContext, AIContext,
                                  dataReducer, vpcDataReducer, powerVsDataReducer, platformDataReducer
  hooks/                          useDataCollection, useExport, useTableState,
                                  useDashboardMetrics, useCostData, useGeographyData, useTopologyData,
                                  useVpcDataCollection, useVpcExport, useVpcDashboardMetrics,
                                  useVpcCostData, useVpcTopologyData, useVpcGeographyData,
                                  usePowerVsDataCollection, usePowerVsExport, usePowerVsDashboardMetrics,
                                  usePowerVsCostData, usePowerVsTopologyData, usePowerVsGeographyData,
                                  usePlatformDataCollection, usePlatformExport, usePlatformDashboardMetrics,
                                  useAISettings, useAIInsights, useAICostAnalysis, useAIChat, useAIReport,
                                  useTour, useLocalPreferences
  pages/                          AuthPage, DashboardPage, ResourcePage,
                                  CostsPage, GeographyPage, TopologyPage,
                                  VpcDashboardPage, VpcResourcePage, VpcTopologyPage,
                                  VpcCostsPage, VpcGeographyPage,
                                  PowerVsDashboardPage, PowerVsResourcePage, PowerVsTopologyPage,
                                  PowerVsCostsPage, PowerVsGeographyPage,
                                  PlatformDashboardPage, PlatformResourcePage,
                                  ExportPage, SettingsPage, MigrationPage
  services/                       api.ts, import.ts, report-import.ts, transform.ts,
                                  vpc-api.ts, vpc-transform.ts,
                                  powervs-api.ts, powervs-transform.ts,
                                  platform-api.ts, platform-transform.ts
    report-parsers/               types.ts, csv-utils.ts, csv-parsers.ts, html-parsers.ts,
                                  drawio-parser.ts, json-parser.ts, xlsx-parsers.ts,
                                  merger.ts, index.ts
    migration/                    index.ts, computeAnalysis.ts, networkAnalysis.ts,
                                  storageAnalysis.ts, securityAnalysis.ts, featureGapAnalysis.ts,
                                  complexityScoring.ts, costComparison.ts, wavePlanning.ts,
                                  dependencyMapping.ts
      checks/                     index.ts, computeChecks.ts (28), networkChecks.ts (11),
                                  storageChecks.ts (8), securityChecks.ts (3), checkUtils.ts
      data/                       datacenterMapping.ts, osCompatibility.ts, vpcProfiles.ts,
                                  vpcCostEstimates.ts, featureGaps.ts, storageTiers.ts
  types/                          resources.ts, vpc-resources.ts, powervs-resources.ts,
                                  platform-resources.ts, migration.ts
  utils/                          formatters.ts, relationships.ts, logger.ts, retry.ts
  data/                           ibmCloudDataCenters.json, ibmCloudRegions.json,
                                  classicResourceTypes.json, classicRelationships.json,
                                  classicDisplayNames.json, vpcResourceTypes.json,
                                  powerVsResourceTypes.json, platformResourceTypes.json, index.ts
  styles/                         SCSS files

server/src/                       # Express backend
  routes/                         auth.ts, collect.ts, export.ts, convert.ts,
                                  vpc-auth.ts, vpc-collect.ts, vpc-export.ts,
                                  powervs-auth.ts, powervs-collect.ts, powervs-export.ts,
                                  platform-collect.ts, platform-export.ts
  services/
    softlayer/                    client.ts, compute.ts, network.ts, storage.ts,
                                  security.ts, dns.ts, account.ts, diskutil.ts, types.ts
    vpc/                          client.ts, regions.ts, resources.ts,
                                  aggregator.ts, export.ts, types.ts
    powervs/                      client.ts, workspaces.ts, resources.ts,
                                  aggregator.ts, export.ts, types.ts
    platform/                     resources.ts, aggregator.ts, export.ts, types.ts
    aggregator.ts, relationships.ts, export.ts
  middleware/                     apiKey.ts, error.ts
  types/                          express.d.ts
  utils/                          logger.ts, concurrency.ts, iam.ts, sse.ts, validation.ts

scripts/                          # Utility scripts
  mdl-to-json.py                  Converts IMS .mdl data files to JSON for browser import
```

## Build Commands

```bash
npm ci                  # Install dependencies
npm run dev             # Development server
npm run build           # Production build (frontend + backend)
npm start               # Production server
npm test                # Run all unit + integration tests
npm run test:integration # Parser/merger integration tests (alt_input/ data)
npm run test:roundtrip  # Export roundtrip test
npm run test:e2e        # Playwright E2E tests (builds + browser)
npm run lint            # Lint
```

## Key Design Constraints

- **Never persist or log API keys or OS credentials** — sanitize all logging output, never write keys to disk or session storage. OS credentials (fetched for disk utilization) are transient: fetched from the SL API, used for SSH, then discarded in the same function scope. Never sent to the frontend, never included in XLSX export, never logged. `passwords` is in the logger `SENSITIVE_KEYS` set
- SoftLayer API auth uses HTTP Basic: `apikey:<user-api-key>` base64-encoded in the Authorization header
- SoftLayer API base URL: `https://api.softlayer.com/rest/v3.1/`
- VPC API auth uses IAM Bearer token (exchanged from the same API key)
- VPC API base URL: `https://{region}.iaas.cloud.ibm.com/v1/?version=2024-06-01&generation=2`
- PowerVS API auth uses IAM Bearer token (same exchange as VPC)
- PowerVS API base URL: `https://{region}.power-iaas.cloud.ibm.com/pcloud/v1/cloud-instances/{cloud_instance_id}/`
- PowerVS requires CRN header on every request; workspace discovery via Resource Controller API
- Platform Services API auth uses IAM Bearer token (same exchange as VPC)
- Platform Services API base URL: `https://resource-controller.cloud.ibm.com/v2/`
- Platform Services collects all service instances and resource groups; enriches with known service names
- Code Engine deployment: 0.5 vCPU / 1GB RAM, auto-scaling 0–10 instances, 300s request timeout
- UI must follow IBM Carbon Design System standards (WCAG 2.1 AA)
- Primary use case is desktop; mobile is secondary
- XLSX exports use one worksheet per resource type, named with `v` prefix for Classic (e.g., `vVirtualServers`) and `p` prefix for PowerVS (e.g., `pPvsInstances`)
- **Changelog** — release notes are maintained in `src/data/changelog.json` (bundled at build time) and displayed on the About page (`/about`). When shipping a new version, add a new entry to the `releases` array with `version`, `date`, and `sections` (added/changed/fixed/removed)

## Resource Types

**Classic:** 27+ types across categories: Compute (VSIs, Bare Metal), Network (VLANs, Subnets, Gateways, Firewalls, Security Groups, Load Balancers), Storage (Block, File, Object), Security (SSL Certs, SSH Keys), DNS (Domains, Records), and others (Placement Groups, Reserved Capacity, Dedicated Hosts, IPsec VPN, Billing Items, Users, Event Log). Relationship mapping links 13 parent-child resource pairs (e.g., VLAN→Subnet, Storage→VSI).

**VPC:** 26 types across categories: Compute (Instances, Bare Metal Servers, Dedicated Hosts, Placement Groups), Network (VPCs, Subnets, Security Groups, Floating IPs, Public Gateways, Network ACLs, Load Balancers, VPN Gateways, Endpoint Gateways, Routing Tables, Routes, Transit Gateways, Transit Gateway Connections, TGW Route Prefixes, TGW VPC VPN Gateways, Direct Link Gateways, Direct Link Virtual Connections, VPN Gateway Connections), Storage (Volumes), Security (SSH Keys, Images), Other (Flow Log Collectors). Transit Gateways are global resources collected via a separate API endpoint (`transit.cloud.ibm.com`). TGW Route Prefixes are collected via async route reports (POST + poll). TGW VPC VPN Gateways are discovered by examining TGW VPC connections and fetching VPN gateways from the connected VPC regions. Direct Link Gateways and Virtual Connections are collected via `directlink.cloud.ibm.com`. VPN Gateway Connections include peer CIDRs for the Routes page. Routing Tables are collected per VPC, and Routes are collected per routing table, with dependency ordering to ensure parent resources are available. Regional VPC resources are collected across all available VPC regions with `_region` field injection.

**PowerVS:** 22 types across categories: Compute (PVM Instances, Shared Processor Pools, Placement Groups, Host Groups), Network (Networks, Network Ports, Network Security Groups, Cloud Connections, DHCP Servers, VPN Connections, IKE Policies, IPSec Policies), Storage (Volumes, Volume Groups, Snapshots), Security (SSH Keys), Other (Workspaces, System Pools, SAP Profiles, Events, Images, Stock Images). PowerVS is workspace-scoped (not region-scoped like VPC). Workspace discovery uses the Resource Controller API to find all PowerVS service instances. PowerVS API calls require a CRN header with the workspace CRN. Zone-to-region mapping converts zones (e.g., `dal12`) to API regions (e.g., `us-south`). Network Ports depend on Networks (collected first). Resource keys are prefixed with `pvs` (e.g., `pvsInstances`), worksheet names with `p` (e.g., `pPvsInstances`).

**Platform Services:** All IBM Cloud service instances collected via the Resource Controller API (`/v2/resource_instances`). Displayed as a single `serviceInstances` table with computed `_serviceType`, `_serviceCategory`, and `_resourceGroupName` fields. Resource groups are fetched separately (`/v2/resource_groups`) for name resolution. A `KNOWN_SERVICES` map provides display-friendly names for 30+ service types (COS, Key Protect, SCC, databases, Event Streams, etc.); unknown services fall back to the raw `resource_id`. Worksheet name: `sServiceInstances`. Platform Services is available whenever VPC or PowerVS auth succeeds (all use IAM tokens).

**IMS Report Types:** 2 additional types added for IMS report import: Report Warnings (`reportWarnings` — priority, issue, type, recommendation) and Health Checks (`reportChecks` — checks performed with priority and rationale). These appear in Classic tables when importing IMS report files.

**IMS Report Import Formats:** The app supports importing data from IBM's IMS reporting tool in multiple formats: CSV (warnings, gateways, NAS, security groups), HTML (warnings with embedded JS arrays, overview with Chart.js data, summary tables, inventory with nested DOM trees), drawio (XML network topology), report XLSX (device inventory with physical location, consolidated with bandwidth metrics), JSON (converted from .mdl), and .mdl (serialized SoftLayer API responses, converted server-side via Python). The `_assessment.xlsx` file is a post-assessment output and is not imported. The merger deduplicates across all sources using `id` as primary key and `hostname` as fallback.

**IMS NAS Storage Naming & Deduplication:** IMS NAS exports use SoftLayer naming conventions that encode the resource type in the hostname prefix. Block storage volumes appear as two rows with different IDs: `{prefix}SEVC{acct}_{seq}` (NAS_CONTAINER — backend storage container, has datacenter) and `{prefix}SEL{acct}-{seq}` (ISCSI — iSCSI LUN, datacenter "unknown", has K8s PVC notes). The prefix varies by storage platform (e.g., `IBM02`, `DSW02`). File storage uses `IBM02SEV{acct}_{seq}` (NAS, no duplication). Backup vaults use `IBME{acct}-{seq}` (EVAULT). The `deduplicateBlockStorage()` function in `csv-utils.ts` merges SEVC/SEL pairs by matching the suffix number, keeping the SEL record (richer metadata) and backfilling datacenter from the SEVC.

## Migration Assessment

**Pre-requisite checks (50 total):** Compute (28), Network (11), Storage (8), Security (3), plus 12 feature gap definitions. Each check produces a severity: blocker, warning, info, unknown, or passed. Check logic lives in `src/services/migration/checks/`. The `runAllPreReqChecks()` function in `checks/index.ts` orchestrates all four check categories.

**Migration approach classification:** Each VSI and Bare Metal server receives a recommended migration approach — `lift-and-shift`, `rebuild`, `re-platform`, or `re-architect` — based on OS compatibility, hypervisor detection, IKS/ROKS presence, and blocker status. The decision tree is in `computeAnalysis.ts` (`classifyMigrationApproach` / `classifyBareMetalApproach`). IBM's official guidance recommends "Rebuild" as the default approach (provision fresh VPC instances with latest OS).

**Analysis services** in `src/services/migration/`: computeAnalysis (profile matching, approach classification), networkAnalysis, storageAnalysis, securityAnalysis, featureGapAnalysis, complexityScoring (5-dimension 0-100), costComparison (3-year projections), wavePlanning (dependency-grouped waves), dependencyMapping (resource graph).

**Reference data** in `src/services/migration/data/`: datacenterMapping (Classic DC → VPC region/zones), osCompatibility (43 OS entries), vpcProfiles (200+ VSI + 20 BM profiles), featureGaps (12 Classic-only features), storageTiers (IOPS mappings).
