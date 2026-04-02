# VPC Infrastructure

Collecting and exploring IBM Cloud VPC resources across all regions.

## VPC Dashboard

The VPC dashboard mirrors the Classic dashboard layout but focuses on VPC-specific resources. It shows resource counts, regional distribution, and collection status for all VPC resource types.

- **Resource Cards:** Count of each VPC resource type across all regions.
- **Regional Distribution:** Charts showing how resources are spread across regions.
- **Collect VPC Data:** Starts multi-region collection using SSE for real-time progress.

## Multi-Region Collection

VPC data collection runs as a single phase across all auto-discovered regions with 10 concurrent resource tasks. The collector:

1. Exchanges your API key for an IAM Bearer token.
2. Discovers all available VPC regions via the regions API.
3. Collects 26 resource types from each region in parallel.
4. Injects a `_region` field into every resource for filtering and display.

Routing Tables are collected per VPC, and Routes are collected per routing table, with dependency ordering to ensure parent resources are available before child resources are requested.

### Transit Gateways

Transit Gateways are global resources collected via a separate API endpoint (`transit.cloud.ibm.com`) rather than regional VPC endpoints. The collector also retrieves:

- **Transit Gateway Connections** -- all connections attached to each gateway
- **TGW Route Prefixes** -- generated via async route reports (POST + poll)
- **TGW VPC VPN Gateways** -- discovered by examining TGW VPC connections and fetching VPN gateways from the connected VPC regions

### Direct Link

Direct Link Gateways and Virtual Connections are collected via the `directlink.cloud.ibm.com` API endpoint. These are global resources not tied to a specific VPC region.

## VPC Resource Types

- **Compute:** Instances, Bare Metal Servers, Dedicated Hosts, Placement Groups
- **Network:** VPCs, Subnets, Security Groups, Floating IPs, Public Gateways, Network ACLs, Load Balancers, VPN Gateways, VPN Gateway Connections, Endpoint Gateways, Routing Tables, Routes
- **Transit:** Transit Gateways, Transit Gateway Connections, TGW Route Prefixes, TGW VPC VPN Gateways, Direct Link Gateways, Direct Link Virtual Connections
- **Storage:** Volumes
- **Security:** SSH Keys, Images
- **Other:** Flow Log Collectors

## Regional Data

Every VPC resource includes a `_region` field indicating which region it was collected from. You can filter data tables by region to focus on specific geographic areas. The Geography map visualises resource distribution across all collected regions.

VPN Gateway Connections include peer CIDRs, which appear on the Routes page for network path analysis.
