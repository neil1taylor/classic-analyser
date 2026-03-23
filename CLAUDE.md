# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IBM Cloud Infrastructure Explorer — a web-based inventory and analysis tool for IBM Cloud Classic (SoftLayer), VPC, and PowerVS infrastructure. It collects data from 27+ Classic API resource types, 26 VPC resource types (across all VPC regions), and 22 PowerVS resource types (across all workspaces), displays them in interactive tables, and exports to XLSX. Deployed as a single container on IBM Code Engine.

The project specification lives in `PRD.md`. The application is fully implemented.

## Architecture

**Single-container design:** Express.js serves both the React SPA (static files) and API proxy routes. All SoftLayer and VPC API calls go through the backend proxy to avoid CORS issues.

```
Browser → Express.js (/api/* proxy routes + / static SPA) → SoftLayer REST API
                                                           → VPC REST API ({region}.iaas.cloud.ibm.com)
                                                           → PowerVS REST API ({region}.power-iaas.cloud.ibm.com)
```

**Stateless API key handling (critical security requirement):**
- API key lives only in React Context (browser memory) — never localStorage, never server disk, never logs
- Every request sends the key via `X-API-Key` header; server extracts it, uses it for that request, then discards it
- No server-side sessions, no sticky sessions, no database
- 60-minute inactivity timeout clears the key in the browser

**Data collection** uses Server-Sent Events (SSE) to stream progress. Classic collection runs in two phases (shallow scan + deep scan) with 10 concurrent API calls per phase. VPC collection runs as a single phase across all auto-discovered regions with 10 concurrent resource tasks. PowerVS collection discovers workspaces via the Resource Controller API, collects Networks first (dependency), then Network Ports, then all remaining resources concurrently with 10 concurrent tasks.

**IMS Report Import** provides three alternative data input methods (no API key required):
- **Import XLSX** — re-imports a previously exported XLSX file (cloud-harvester output)
- **Import IMS Reports** — multi-file import of CSVs, HTMLs, drawio, report XLSXs (assessment/device inventory) from IBM's IMS reporting tool. Parsers in `src/services/report-parsers/` handle each format. The merger deduplicates by `id` with `hostname` fallback.
- **Import MDL** — uploads an IMS `.mdl` file to `POST /api/convert/mdl`, which runs `scripts/mdl-to-json.py` (Python) server-side to convert the serialized SoftLayer data model to JSON. This is the most complete data source (~13K+ resources per large account).

**Navigation** uses a 3-domain tab switcher (Carbon ContentSwitcher) in the SideNav. The `InfrastructureMode` is an array of `InfrastructureDomain` values (`'classic' | 'vpc' | 'powervs'`). Login validates all three domains in parallel via `Promise.allSettled` and builds the mode array from whichever succeed. Only domains the user has access to appear as tabs.

## Tech Stack

- **Frontend:** React 18, TypeScript 5, Vite 5, @carbon/react (Carbon Design System v11), Axios, react-window (virtualization), ExcelJS (xlsx export/import), multer (file uploads)
- **Backend:** Node.js 20 LTS, Express 4, winston (logging), helmet (security headers), compression, Python 3 (MDL conversion)
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
    help/                         HelpPage
  contexts/                       AuthContext, DataContext, UIContext, VpcDataContext, PowerVsDataContext,
                                  MigrationContext, AIContext,
                                  dataReducer, vpcDataReducer, powerVsDataReducer
  hooks/                          useDataCollection, useExport, useTableState,
                                  useDashboardMetrics, useCostData, useGeographyData, useTopologyData,
                                  useVpcDataCollection, useVpcExport, useVpcDashboardMetrics,
                                  useVpcCostData, useVpcTopologyData, useVpcGeographyData,
                                  usePowerVsDataCollection, usePowerVsExport, usePowerVsDashboardMetrics,
                                  usePowerVsCostData, usePowerVsTopologyData, usePowerVsGeographyData,
                                  useAISettings, useAIInsights, useAICostAnalysis, useAIChat, useAIReport,
                                  useTour, useLocalPreferences
  pages/                          AuthPage, DashboardPage, ResourcePage,
                                  CostsPage, GeographyPage, TopologyPage,
                                  VpcDashboardPage, VpcResourcePage, VpcTopologyPage,
                                  VpcCostsPage, VpcGeographyPage,
                                  PowerVsDashboardPage, PowerVsResourcePage, PowerVsTopologyPage,
                                  PowerVsCostsPage, PowerVsGeographyPage,
                                  ExportPage, SettingsPage, MigrationPage
  services/                       api.ts, import.ts, report-import.ts, transform.ts,
                                  vpc-api.ts, vpc-transform.ts,
                                  powervs-api.ts, powervs-transform.ts
    report-parsers/               types.ts, csv-utils.ts, csv-parsers.ts, html-parsers.ts,
                                  drawio-parser.ts, json-parser.ts, xlsx-parsers.ts,
                                  merger.ts, index.ts
  types/                          resources.ts, vpc-resources.ts, powervs-resources.ts
  utils/                          formatters.ts, relationships.ts, logger.ts, retry.ts
  data/                           ibmCloudDataCenters.json, ibmCloudRegions.json,
                                  classicResourceTypes.json, classicRelationships.json,
                                  classicDisplayNames.json, vpcResourceTypes.json,
                                  powerVsResourceTypes.json, index.ts
  styles/                         SCSS files

server/src/                       # Express backend
  routes/                         auth.ts, collect.ts, export.ts, convert.ts,
                                  vpc-auth.ts, vpc-collect.ts, vpc-export.ts,
                                  powervs-auth.ts, powervs-collect.ts, powervs-export.ts
  services/
    softlayer/                    client.ts, compute.ts, network.ts, storage.ts,
                                  security.ts, dns.ts, account.ts, types.ts
    vpc/                          client.ts, regions.ts, resources.ts,
                                  aggregator.ts, export.ts, types.ts
    powervs/                      client.ts, workspaces.ts, resources.ts,
                                  aggregator.ts, export.ts, types.ts
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
npm test                # Run tests
npm run lint            # Lint
```

## Key Design Constraints

- **Never persist or log API keys** — sanitize all logging output, never write keys to disk or session storage
- SoftLayer API auth uses HTTP Basic: `apikey:<user-api-key>` base64-encoded in the Authorization header
- SoftLayer API base URL: `https://api.softlayer.com/rest/v3.1/`
- VPC API auth uses IAM Bearer token (exchanged from the same API key)
- VPC API base URL: `https://{region}.iaas.cloud.ibm.com/v1/?version=2024-06-01&generation=2`
- PowerVS API auth uses IAM Bearer token (same exchange as VPC)
- PowerVS API base URL: `https://{region}.power-iaas.cloud.ibm.com/pcloud/v1/cloud-instances/{cloud_instance_id}/`
- PowerVS requires CRN header on every request; workspace discovery via Resource Controller API
- Code Engine deployment: 0.5 vCPU / 1GB RAM, auto-scaling 0–10 instances, 300s request timeout
- UI must follow IBM Carbon Design System standards (WCAG 2.1 AA)
- Primary use case is desktop; mobile is secondary
- XLSX exports use one worksheet per resource type, named with `v` prefix for Classic (e.g., `vVirtualServers`) and `p` prefix for PowerVS (e.g., `pPvsInstances`)

## Resource Types

**Classic:** 27+ types across categories: Compute (VSIs, Bare Metal), Network (VLANs, Subnets, Gateways, Firewalls, Security Groups, Load Balancers), Storage (Block, File, Object), Security (SSL Certs, SSH Keys), DNS (Domains, Records), and others (Placement Groups, Reserved Capacity, Dedicated Hosts, IPsec VPN, Billing Items, Users, Event Log). Relationship mapping links 13 parent-child resource pairs (e.g., VLAN→Subnet, Storage→VSI).

**VPC:** 26 types across categories: Compute (Instances, Bare Metal Servers, Dedicated Hosts, Placement Groups), Network (VPCs, Subnets, Security Groups, Floating IPs, Public Gateways, Network ACLs, Load Balancers, VPN Gateways, Endpoint Gateways, Routing Tables, Routes, Transit Gateways, Transit Gateway Connections, TGW Route Prefixes, TGW VPC VPN Gateways, Direct Link Gateways, Direct Link Virtual Connections, VPN Gateway Connections), Storage (Volumes), Security (SSH Keys, Images), Other (Flow Log Collectors). Transit Gateways are global resources collected via a separate API endpoint (`transit.cloud.ibm.com`). TGW Route Prefixes are collected via async route reports (POST + poll). TGW VPC VPN Gateways are discovered by examining TGW VPC connections and fetching VPN gateways from the connected VPC regions. Direct Link Gateways and Virtual Connections are collected via `directlink.cloud.ibm.com`. VPN Gateway Connections include peer CIDRs for the Routes page. Routing Tables are collected per VPC, and Routes are collected per routing table, with dependency ordering to ensure parent resources are available. Regional VPC resources are collected across all available VPC regions with `_region` field injection.

**PowerVS:** 22 types across categories: Compute (PVM Instances, Shared Processor Pools, Placement Groups, Host Groups), Network (Networks, Network Ports, Network Security Groups, Cloud Connections, DHCP Servers, VPN Connections, IKE Policies, IPSec Policies), Storage (Volumes, Volume Groups, Snapshots), Security (SSH Keys), Other (Workspaces, System Pools, SAP Profiles, Events, Images, Stock Images). PowerVS is workspace-scoped (not region-scoped like VPC). Workspace discovery uses the Resource Controller API to find all PowerVS service instances. PowerVS API calls require a CRN header with the workspace CRN. Zone-to-region mapping converts zones (e.g., `dal12`) to API regions (e.g., `us-south`). Network Ports depend on Networks (collected first). Resource keys are prefixed with `pvs` (e.g., `pvsInstances`), worksheet names with `p` (e.g., `pPvsInstances`).

**IMS Report Types:** 2 additional types added for IMS report import: Report Warnings (`reportWarnings` — priority, issue, type, recommendation) and Health Checks (`reportChecks` — checks performed with priority and rationale). These appear in Classic tables when importing IMS report files.

**IMS Report Import Formats:** The app supports importing data from IBM's IMS reporting tool in multiple formats: CSV (warnings, gateways, NAS, security groups), HTML (warnings with embedded JS arrays, overview with Chart.js data, summary tables, inventory with nested DOM trees), drawio (XML network topology), report XLSX (assessment with VPC mapping, device inventory with physical location), JSON (converted from .mdl), and .mdl (serialized SoftLayer API responses, converted server-side via Python). The merger deduplicates across all sources using `id` as primary key and `hostname` as fallback.
