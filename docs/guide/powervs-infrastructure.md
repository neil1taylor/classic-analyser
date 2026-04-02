# PowerVS Infrastructure

Collecting and exploring IBM Power Virtual Server resources across all workspaces.

## Overview

IBM Power Virtual Server (PowerVS) is IBM's dedicated Power Systems environment in the cloud, providing AIX, IBM i, and Linux on Power workloads. Infrastructure Explorer discovers all PowerVS workspaces associated with your account and collects 22 resource types across compute, network, storage, and other categories.

## Workspace Discovery

PowerVS is workspace-scoped rather than region-scoped (unlike VPC). The application discovers workspaces through the following process:

1. **Resource Controller query** -- The Resource Controller API (`/v2/resource_instances`) is queried to find all PowerVS service instances in the account.
2. **CRN extraction** -- Each workspace has a Cloud Resource Name (CRN) that uniquely identifies it. The CRN is required as a header on every PowerVS API request.
3. **Zone-to-region mapping** -- Each workspace resides in a zone (e.g., `dal12`, `lon06`, `syd05`). The application maps zones to API regions (e.g., `dal12` maps to `us-south`, `lon06` maps to `eu-gb`) to determine the correct API endpoint: `https://{region}.power-iaas.cloud.ibm.com`.
4. **Multi-workspace collection** -- Resources are collected from each discovered workspace independently.

## Data Collection

Collection follows a dependency-ordered process with 10 concurrent tasks:

1. **Networks first** -- Networks are collected before other resource types because Network Ports depend on them.
2. **Network Ports second** -- Collected once Networks are available, as each port is associated with a parent network.
3. **Remaining resources concurrently** -- All other resource types (instances, volumes, SSH keys, etc.) are collected in parallel with up to 10 concurrent API calls.

Every PowerVS API request includes:
- An IAM Bearer token (the same token exchange used for VPC)
- A CRN header identifying the target workspace

Authentication uses the same API key as VPC and Platform Services -- all three domains use IAM token exchange.

## Resource Types

### Compute

| Resource | Description |
|----------|-------------|
| PVM Instances | Power Virtual Machine instances (AIX, IBM i, Linux) |
| Shared Processor Pools | Pools of shared processing capacity |
| Placement Groups | Anti-affinity and affinity rules for instance placement |
| Host Groups | Groups of dedicated hosts for instance deployment |

### Network

| Resource | Description |
|----------|-------------|
| Networks | Private and public networks within a workspace |
| Network Ports | IP addresses and ports attached to networks |
| Network Security Groups | Firewall rules for network traffic control |
| Cloud Connections | Connections between PowerVS and IBM Cloud services |
| DHCP Servers | Dynamic IP address assignment services |
| VPN Connections | Site-to-site VPN tunnels |
| IKE Policies | Internet Key Exchange policies for VPN |
| IPSec Policies | IPSec encryption and authentication policies |

### Storage

| Resource | Description |
|----------|-------------|
| Volumes | Block storage volumes (Tier 1, Tier 3, Fixed IOPS) |
| Volume Groups | Logical groups of volumes for management |
| Snapshots | Point-in-time copies of volumes |

### Other

| Resource | Description |
|----------|-------------|
| SSH Keys | Public keys for instance access |
| Workspaces | PowerVS service instances (discovered via Resource Controller) |
| System Pools | Available system pool capacity information |
| SAP Profiles | SAP-certified instance profiles |
| Events | Workspace activity events |
| Images | Custom OS images uploaded to the workspace |
| Stock Images | IBM-provided base OS images available for deployment |

## XLSX Export

When exporting to XLSX, PowerVS worksheets use a `p` prefix to distinguish them from Classic (`v` prefix) and Platform Services (`s` prefix) worksheets. Examples:

| Worksheet Name | Resource Type |
|----------------|---------------|
| `pPvsInstances` | PVM Instances |
| `pPvsNetworks` | Networks |
| `pPvsVolumes` | Volumes |
| `pPvsSSHKeys` | SSH Keys |
| `pPvsCloudConnections` | Cloud Connections |
| `pPvsSnapshots` | Snapshots |

This naming convention allows all four domains to coexist in a single XLSX file and enables correct re-import via the **Import XLSX** feature.
