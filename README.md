# IBM Cloud Infrastructure Explorer

A web-based inventory and analysis tool for IBM Cloud Classic (SoftLayer), VPC, PowerVS, and Platform Services infrastructure. It collects data from 75+ resource types across all four infrastructure domains, displays them in interactive tables with filtering and search, and exports to XLSX.

## Features

- **Classic Infrastructure:** 27+ resource types — Compute (VSIs, Bare Metal), Network (VLANs, Subnets, Gateways, Firewalls), Storage (Block, File, Object), Security, DNS, and more
- **VPC Infrastructure:** 26 resource types across all VPC regions — Instances, VPCs, Subnets, Security Groups, Load Balancers, Transit Gateways, Direct Link, and more
- **PowerVS Infrastructure:** 22 resource types across all workspaces — PVM Instances, Networks, Volumes, Cloud Connections, and more
- **Platform Services:** All IBM Cloud service instances (COS, Key Protect, SCC, databases, etc.) via the Resource Controller API with service type identification and resource group name resolution
- **Interactive dashboards** with resource counts, distribution charts, and account info
- **Data tables** with column filtering, sorting, search, and virtualized rendering for large datasets
- **Topology diagrams** showing resource relationships
- **Geography maps** showing resource distribution across regions
- **Cost analysis** views
- **Export hub** — dedicated Export page with XLSX, PDF, DOCX, and PPTX formats per domain
- **XLSX export/import** with one worksheet per resource type across all four domains (Classic, VPC, PowerVS, Platform Services). Classic exports include disk utilization columns when collected
- **IMS report import** — parse CSVs, HTMLs, drawio, and report XLSXs from IBM's IMS reporting tool
- **MDL import** — server-side conversion of IMS `.mdl` data files (serialized SoftLayer API responses) to populate all views
- **Disk utilization collection** (opt-in) — SSH into Classic servers to collect real filesystem usage via private IP. Credentials are transient and never stored or displayed
- **Real-time progress** via Server-Sent Events during data collection
- **Guided tour** onboarding for first-time users
- **Section error boundaries** — chart/section errors don't crash the whole dashboard
- **Retry with exponential backoff** on transient API failures
- **VPC migration assessment** — 50 automated pre-requisite checks (28 compute, 11 network, 8 storage, 3 security), per-workload migration approach recommendation (Lift & Shift / Rebuild / Re-platform / Re-architect), cost comparison, wave planning, Terraform export, and DOCX reports
- **AI-powered insights** — optional watsonx.ai integration for chat, cost optimization, and report enhancement
- **Account-scoped settings** — AI and preference persistence scoped per IBM Cloud account
- **Stateless security** — API keys live only in browser memory, never persisted

## Architecture

Single-container design: Express.js serves both the React SPA and API proxy routes. All IBM Cloud API calls go through the backend proxy to avoid CORS issues.

```
Browser → Express.js (/api/* proxy + / static SPA) → SoftLayer REST API
                                                    → VPC REST API
                                                    → PowerVS REST API
```

## Tech Stack

- **Frontend:** React 18, TypeScript 5, Vite 5, Carbon Design System v11, react-window, ExcelJS, multer
- **Backend:** Node.js 20, Express 4, winston, helmet, compression, Python 3 (MDL conversion)
- **Infrastructure:** Docker (Node 20 Alpine + Python 3, multi-stage build), IBM Code Engine

## Prerequisites

- Node.js 20 LTS
- npm
- Python 3 (for MDL import — optional, only needed for `.mdl` file conversion)
- An IBM Cloud API key with access to Classic, VPC, and/or PowerVS infrastructure (or use import for offline analysis)

## Getting Started

```bash
# Install dependencies
npm ci

# Start development server
npm run dev

# Run tests
npm test

# Production build
npm run build

# Start production server
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

See `.env.example` for available configuration options.

## Docker

```bash
# Build
docker build -t ibm-infrastructure-explorer .

# Run
docker run -p 8080:8080 ibm-infrastructure-explorer
```

## Project Structure

```
src/                    # React frontend
  components/           # UI components (auth, dashboard, tables, costs, geography, topology)
  contexts/             # React Context providers + reducers (Auth, Data, UI, VPC, PowerVS, AI, Migration)
  hooks/                # Custom hooks for data collection, export, metrics, AI, tour, preferences
  pages/                # Page components (incl. ExportPage)
  services/             # API clients, data transforms, report parsers (with retry)
    report-parsers/     # IMS report file parsers (CSV, HTML, drawio, JSON, XLSX)
  types/                # TypeScript type definitions
  data/                 # Data-driven JSON configs (regions, datacenters, resource types)
  utils/                # Formatters, relationships, logger, retry

server/src/             # Express backend
  routes/               # API proxy routes (classic, VPC, PowerVS) + MDL convert endpoint
  services/             # IBM Cloud API clients and aggregators
  middleware/           # API key extraction, error handling

scripts/                # Utility scripts
  mdl-to-json.py        # Converts IMS .mdl files to JSON
```

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.
