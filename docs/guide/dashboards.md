# Dashboards

## Overview

Each infrastructure domain — Classic, VPC, PowerVS, and Platform Services — has its own dashboard providing an at-a-glance summary of collected resources. Only domains the user has access to appear as navigable tabs.

## Common Dashboard Features

All dashboards share a consistent set of components:

### Account Info

Displays the account name, account ID, and owner email address at the top of the dashboard.

### Collection Controls

- **Collect Data** button to initiate data collection
- Optional toggles for Classic: billing items, disk utilization
- Real-time progress indicator showing current phase and step during collection
- Cancel button to abort an in-progress collection

### Resource Cards

Each resource type is represented by a card showing:

- Resource count with animated counter
- Category badge (Compute, Network, Storage, Security, etc.)
- Datacenter or region distribution summary
- Click any card to navigate directly to its data table

### Distribution Charts

Visual breakdowns of resource distribution:

- **Donut charts** — resource distribution by datacenter, region, or category
- **Bar charts** — resource counts by OS type, CPU count, memory, or other attributes

### Collection Timestamp

Shows the date and time when data was last collected, so users know the freshness of displayed information.

### Import Banner

When viewing imported data (rather than live API data), a banner is displayed indicating the data source and import method.

## Classic Dashboard

The Classic dashboard includes all common features plus:

- **VMware Overlap Detection** — identifies ESXi hosts, VMware-associated VLANs, and VMware-related storage volumes
- **Billing Toggle** — opt-in collection of billing items (Phase 3), which adds cost data to resources
- **Disk Utilization Toggle** — opt-in SSH-based filesystem usage collection (Phase 5) for VSIs and Bare Metal servers
- **Multi-phase Progress** — displays progress across up to five collection phases:
  1. Phase 1: Shallow scan
  2. Phase 2: Deep scan
  3. Phase 3: Nested/billing data
  4. Phase 4: Transit Gateway route reports
  5. Phase 5: Disk utilization (opt-in)

## VPC Dashboard

The VPC dashboard provides:

- Region-specific distribution metrics across all auto-discovered VPC regions
- Resource counts grouped by region
- VPC-level resource summaries (instances, subnets, security groups, volumes)

## PowerVS Dashboard

The PowerVS dashboard provides:

- Workspace-scoped data display
- Workspace selection for multi-workspace accounts
- PowerVS-specific resource categories (PVM instances, shared processor pools, networks)

## Platform Services Dashboard

The Platform Services dashboard provides:

- Service instances table with type and category identification
- Distribution by service type and category
- Resource group breakdown

> **Note:** Platform Services is available whenever VPC or PowerVS authentication succeeds, as all use IAM tokens. No separate authentication is required.
