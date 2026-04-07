# Feature Overview

## What It Does

IBM Cloud Infrastructure Explorer is a web-based inventory and analysis tool for IBM Cloud Classic (SoftLayer), VPC, PowerVS, and Platform Services infrastructure. It collects resources from live APIs or imported files, displays them in interactive dashboards and data tables, provides migration assessment and cost analysis, and exports to multiple formats. The application runs as a single container and never creates, modifies, or deletes cloud resources.

## Data Sources

### Live API Collection

| Source | Resources | Method |
|--------|-----------|--------|
| Classic (SoftLayer) API | 27+ types (VSIs, Bare Metal, VLANs, Storage, etc.) | 5-phase SSE collection, 10 concurrent calls |
| VPC API | 26 types across all regions | Single-phase multi-region, 10 concurrent tasks |
| PowerVS API | 22 types across all workspaces | Workspace discovery, dependency-ordered |
| Platform Services (Resource Controller) API | All service instances (30+ known types) | Single-phase collection |

### File Import (No API Key Required)

| Format | Description |
|--------|-------------|
| XLSX Re-import | Previously exported cloud-harvester or Infrastructure Explorer files |
| IMS Reports | Multi-file import: CSV, HTML, drawio, XLSX from IBM's IMS reporting tool |
| MDL | IMS `.mdl` file (server-side Python conversion, ~13K+ resources) |

## Analysis & Visualization

- Interactive dashboards with metric cards, distribution charts, and trend indicators
- Virtualized data tables with filtering, sorting, column customization, and search
- Network topology diagrams (React Flow + Dagre hierarchical layout)
- Geographic world maps showing datacenter/region resource distribution
- Cost analysis with treemaps, donut charts, and monthly breakdowns
- Classic-to-VPC migration assessment (65 pre-requisite checks, readiness scoring, wave planning, cost comparison)
- Dependency mapping and migration approach classification
- Optional AI-powered insights via IBM watsonx.ai integration

## Export Formats

| Format | Content |
|--------|---------|
| XLSX | One worksheet per resource type, all domains |
| PDF | Formatted tables with summary metrics and charts |
| DOCX | Editable migration report with optional AI narratives |
| PPTX | Presentation slides with metrics and distribution charts |
| Terraform HCL | VPC infrastructure-as-code from Classic resources |
| draw.io XML | Topology diagrams for editing in diagrams.net |

## Security Model

- API key stored only in browser memory (React Context) -- never on disk, localStorage, or server
- 60-minute inactivity timeout clears all data
- All API calls proxied through the backend -- the browser never contacts IBM Cloud directly
- Read-only -- never creates, modifies, or deletes cloud resources
- OS credentials (for disk utilization) are transient -- fetched, used for SSH, immediately discarded
