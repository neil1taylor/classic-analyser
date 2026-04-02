# Visualizations

## Topology Diagrams

Interactive diagrams showing infrastructure resource connections. Both Classic and VPC have dedicated topology views.

### Classic Topology

The Classic topology diagram visualizes 13 parent-child resource relationships:

- **Nodes** are colored by category (Compute, Network, Storage, Security, etc.)
- **Edges** represent parent-child or association relationships between resources
- **Layout** uses automatic hierarchical arrangement (Dagre algorithm)

#### Controls

| Action              | How                                         |
|---------------------|---------------------------------------------|
| Pan                 | Click and drag on the canvas                |
| Zoom                | Scroll wheel or pinch gesture               |
| Fit to view         | Click the fit-to-view button                |
| Resource details    | Click any node to open the side panel       |
| Toggle categories   | Show/hide resource categories using toggles |
| Export              | Download as draw.io XML for editing         |

### VPC Topology

The VPC topology provides a region-aware layout:

- **Regions** displayed as swimlanes
- **VPCs** shown as containers holding their subnets
- **Instances** connected to security groups, floating IPs, and load balancers
- **Transit Gateway** connections shown linking VPCs across regions
- Same pan, zoom, and click-for-details controls as Classic topology

## Geography Maps

World map with datacenter and region markers, built with D3 and TopoJSON.

### Features

- **Proportional markers** — marker size scales with resource count at each location
- **Hover tooltips** — shows resource count breakdown by type for each datacenter or region
- **VPC grouping** — VPC resources grouped by their `_region` field
- **Zoom and pan** — scroll to zoom, drag to pan across the map

### Data Sources

| Domain           | Location Source                         |
|------------------|-----------------------------------------|
| Classic          | Datacenter field on each resource       |
| VPC              | `_region` field injected during collection |
| PowerVS          | Workspace zone/region                   |

## Cost Analysis

Financial insights into infrastructure spending, available from the Costs page.

### Cost Treemap

A hierarchical treemap where tile size represents relative cost:

- Top level grouped by category (Compute, Network, Storage)
- Second level grouped by resource type
- Click any tile to drill down into its children
- Hover for exact cost figures

### Cost Charts

| Chart Type    | What It Shows                                      |
|---------------|----------------------------------------------------|
| Donut chart   | Cost distribution by category                      |
| Bar chart     | Top resources ranked by monthly recurring cost     |
| Summary cards | Total monthly cost, resource count, average cost   |

### Cost Data Sources

| Domain    | Source                                                        |
|-----------|---------------------------------------------------------------|
| Classic   | Billing Items collected during Phase 3 (requires billing toggle) |
| VPC       | Estimated from the IBM Cloud pricing catalog                  |

> **Note:** Cost data is not available for IMS report imports. The billing toggle must be enabled during Classic collection to include cost information.

## Routes Page

The Routes page consolidates all subnets reachable from the account into a single view:

- **VPC subnets** — from all collected VPC regions
- **Classic subnets** — from Classic infrastructure
- **Transit Gateway prefixes** — route prefixes from Transit Gateway route reports
- **Direct Link prefixes** — prefixes from Direct Link gateways
- **VPN prefixes** — peer CIDRs from VPN gateway connections

This provides a unified view of the account's network reachability across all domains and connection types.
