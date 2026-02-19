# IBM Cloud Infrastructure Explorer

A web-based inventory and analysis tool for IBM Cloud Classic (SoftLayer), VPC, and PowerVS infrastructure. It collects data from 75+ resource types across all three infrastructure domains, displays them in interactive tables with filtering and search, and exports to XLSX.

## Features

- **Classic Infrastructure:** 27+ resource types — Compute (VSIs, Bare Metal), Network (VLANs, Subnets, Gateways, Firewalls), Storage (Block, File, Object), Security, DNS, and more
- **VPC Infrastructure:** 26 resource types across all VPC regions — Instances, VPCs, Subnets, Security Groups, Load Balancers, Transit Gateways, Direct Link, and more
- **PowerVS Infrastructure:** 22 resource types across all workspaces — PVM Instances, Networks, Volumes, Cloud Connections, and more
- **Interactive dashboards** with resource counts, distribution charts, and account info
- **Data tables** with column filtering, sorting, search, and virtualized rendering for large datasets
- **Topology diagrams** showing resource relationships
- **Geography maps** showing resource distribution across regions
- **Cost analysis** views
- **XLSX export/import** with one worksheet per resource type
- **Real-time progress** via Server-Sent Events during data collection
- **Stateless security** — API keys live only in browser memory, never persisted

## Architecture

Single-container design: Express.js serves both the React SPA and API proxy routes. All IBM Cloud API calls go through the backend proxy to avoid CORS issues.

```
Browser → Express.js (/api/* proxy + / static SPA) → SoftLayer REST API
                                                    → VPC REST API
                                                    → PowerVS REST API
```

## Tech Stack

- **Frontend:** React 18, TypeScript 5, Vite 5, Carbon Design System v11, react-window, ExcelJS
- **Backend:** Node.js 20, Express 4, winston, helmet, compression
- **Infrastructure:** Docker (multi-stage build), IBM Code Engine

## Prerequisites

- Node.js 20 LTS
- npm
- An IBM Cloud API key with access to Classic, VPC, and/or PowerVS infrastructure

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
  contexts/             # React Context providers (Auth, Data, UI, VPC, PowerVS)
  hooks/                # Custom hooks for data collection, export, metrics
  pages/                # Page components
  services/             # API clients and data transforms
  types/                # TypeScript type definitions
  utils/                # Formatters, relationships, logger

server/src/             # Express backend
  routes/               # API proxy routes (classic, VPC, PowerVS)
  services/             # IBM Cloud API clients and aggregators
  middleware/           # API key extraction, error handling
```

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.
