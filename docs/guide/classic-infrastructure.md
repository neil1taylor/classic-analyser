# Classic Infrastructure

Collecting and exploring IBM Cloud Classic (SoftLayer) resources.

## Dashboard

The Classic dashboard provides an overview of your infrastructure resources:

- **Account Info:** Displays your account name, number, and email address.
- **Collect Data:** Starts data collection from the SoftLayer API using Server-Sent Events for real-time progress.
- **Export All:** Exports all collected data to an XLSX file.
- **Resource Cards:** Shows the count of each resource type. Click a card to navigate to its data table.
- **Distribution Charts:** Donut and bar charts showing resource distribution by datacenter, status, and type.
- **Progress Indicator:** Shows collection progress across resource types during data collection.

## Data Collection

Classic data collection uses Server-Sent Events (SSE) to stream real-time progress to the browser. The server sends incremental updates as each resource type completes, so you can begin browsing data before collection finishes. Collection runs in up to five phases with 10 concurrent API calls (phases 1-3).

### Phase 1: Shallow Scan

Discovers all resources across 27+ types by calling SoftLayer list/getAll endpoints. Returns basic resource data (IDs, names, statuses).

### Phase 2: Deep Scan

Enriches each discovered resource with full details by calling individual getObject endpoints with object masks. Deep scan adds properties like network components, software descriptions, billing information, and related resource IDs.

### Phase 3: Billing & Nested Details

Collects billing items, per-volume storage snapshots (concurrency 5), VMware nested resources, and Transit Gateway connections. These are the slowest API calls and depend on Phase 2 results.

### Phase 4: TGW Route Reports

Generates Transit Gateway route reports (async POST + poll) and fetches VPN gateways for VPC-connected Transit Gateways.

### Phase 5: Disk Utilization (opt-in)

> **Warning:** This phase SSHs into your servers via their private IPs. It requires network connectivity between the application container and the target machines. OS credentials are fetched transiently from the SoftLayer API, used for the SSH connection, then immediately discarded -- they are never displayed, stored, logged, or exported.

When the **Disk util** toggle is enabled before starting collection, the collector SSHs into each Virtual Server and Bare Metal server via its private IP to collect real filesystem usage. Linux machines use `df` and Windows machines use PowerShell. SSH uses 5 concurrent connections with a 10-second timeout. Machines that are unreachable, lack credentials, or run unsupported operating systems are gracefully skipped with a status indicator.

New columns added to VSI and Bare Metal tables (hidden by default): Disk Used %, Disk Used / Total, Disk Util Status, and Disk Util Details.

Resources that fail during collection (e.g., due to permissions) are shown as warnings on the dashboard. Successfully collected resources remain available for browsing and export.

## Resource Categories

- **Compute:** Virtual Servers (VSIs), Bare Metal Servers, Dedicated Hosts, Image Templates
- **Network:** VLANs, Subnets, Network Gateways, Firewalls, Security Groups, Load Balancers, VPN Tunnels
- **Storage:** Block Storage, File Storage, Object Storage
- **Security:** SSL Certificates, SSH Keys
- **DNS:** DNS Domains, DNS Records
- **Other:** Billing Items, Placement Groups, Reserved Capacity, Dedicated Hosts, IPsec VPN, Users, Event Log

## Relationship Mapping

The explorer maps 13 parent-child resource relationships, enabling you to understand how resources are connected:

- VLAN &rarr; Subnet
- VLAN &rarr; Virtual Server
- VLAN &rarr; Bare Metal Server
- Virtual Server &rarr; Block Storage
- Virtual Server &rarr; Security Group
- Bare Metal &rarr; Block Storage
- Subnet &rarr; IP Address
- Network Gateway &rarr; VLAN
- Firewall &rarr; VLAN
- Load Balancer &rarr; Virtual Server
- DNS Domain &rarr; DNS Record
- Dedicated Host &rarr; Virtual Server
- Placement Group &rarr; Virtual Server

These relationships power the Topology diagram and dependency analysis in the Migration view.
