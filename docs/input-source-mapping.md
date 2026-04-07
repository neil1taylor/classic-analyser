# Input Source to Table Mapping

This document maps each data input source to the resource tables it populates.

## Input Sources

| Source | Description | Scope |
|--------|-------------|-------|
| **API** | Live collection from SoftLayer, VPC, PowerVS, and Platform APIs via SSE | All 4 domains |
| **Harvester XLSX** | Re-import of a previously exported XLSX file | All 4 domains |
| **IMS Reports** | Multi-file import of CSVs, HTMLs, drawio, report XLSXs from IBM's IMS reporting tool | Classic only |
| **MDL** | Serialized SoftLayer data model (`.mdl` file), converted server-side to JSON via `scripts/mdl-to-json.py` | Classic only |

---

## Classic Resources

| Key | Table Label | Worksheet | API | XLSX | IMS | MDL | IMS Detail |
|-----|-------------|-----------|:---:|:----:|:---:|:---:|------------|
| `virtualServers` | Virtual Servers | `vVirtualServers` | Y | Y | Y | Y | inventory HTML, device inventory XLSX, drawio, consolidated XLSX |
| `bareMetal` | Bare Metal Servers | `vBareMetal` | Y | Y | Y | Y | inventory HTML, device inventory XLSX, drawio, consolidated XLSX |
| `virtualHosts` | Virtual Hosts | `vVirtualHosts` | Y | Y | Y | Y | drawio |
| `dedicatedHosts` | Dedicated Hosts | `vDedicatedHosts` | Y | Y | - | - | |
| `imageTemplates` | Image Templates | `vImages` | Y | Y | - | - | |
| `vlans` | VLANs | `vVLANs` | Y | Y | Y | Y | drawio, inventory HTML |
| `subnets` | Subnets | `vSubnets` | Y | Y | Y | - | drawio (extracted from VLANs) |
| `gateways` | Network Gateways | `vGateways` | Y | Y | Y | Y | inventory HTML, drawio |
| `routers` | Routers | `vRouters` | Y | Y | Y | Y | drawio |
| `firewalls` | Firewalls | `vFirewalls` | Y | Y | - | - | |
| `securityGroups` | Security Groups | `vSecurityGroups` | Y | Y | Y | - | securitygroups CSV, inventory HTML, consolidated XLSX |
| `securityGroupRules` | Security Group Rules | `vSecurityGroupRules` | Y | Y | - | - | |
| `loadBalancers` | Load Balancers | `vLoadBalancers` | Y | Y | - | Y | MDL key: `applicationDeliveryController` |
| `blockStorage` | Block Storage | `vBlockStorage` | Y | Y | Y | - | NAS CSV (nasType=ISCSI), consolidated XLSX |
| `fileStorage` | File Storage | `vFileStorage` | Y | Y | Y | Y | NAS CSV (nasType=NAS), inventory HTML, consolidated XLSX |
| `objectStorage` | Object Storage | `vObjectStorage` | Y | Y | - | - | |
| `sslCertificates` | SSL Certificates | `vSSLCertificates` | Y | Y | - | - | |
| `sshKeys` | SSH Keys | `vSSHKeys` | Y | Y | - | - | |
| `dnsDomains` | DNS Domains | `vDNSDomains` | Y | Y | - | - | |
| `dnsRecords` | DNS Records | `vDNSRecords` | Y | Y | - | - | |
| `vpnTunnels` | VPN Tunnels | `vVPNTunnels` | Y | Y | - | - | |
| `classicTransitGateways` | Transit Gateways | `vTransitGateways` | Y | Y | Y | Y | gateway CSV, drawio |
| `classicTransitGatewayConnections` | Transit GW Connections | `vTransitGWConns` | Y | Y | Y | Y | gateway CSV, drawio |
| `transitGatewayDevices` | TGW Devices | `vTGWDevices` | Y | Y | Y | Y | drawio |
| `tgwRoutePrefixes` | TGW Route Prefixes | `vTGWRoutePrefixes` | Y | Y | - | - | |
| `tgwVpcVpnGateways` | TGW VPC VPN Gateways | `vTGWVpcVPNGWs` | Y | Y | - | - | |
| `directLinkGateways` | Direct Link Gateways | `vDirectLinks` | Y | Y | Y | Y | gateway CSV, drawio, consolidated XLSX |
| `relationships` | Relationships | `vRelationships` | Y | Y | - | - | |
| `billingItems` | Billing Items | `vBilling` | Y | Y | - | - | |
| `placementGroups` | Placement Groups | `vPlacementGroups` | Y | Y | - | - | |
| `reservedCapacity` | Reserved Capacity | `vReservedCapacity` | Y | Y | - | - | |
| `users` | Users | `vUsers` | Y | Y | - | - | |
| `eventLog` | Event Log | `vEventLog` | Y | Y | - | - | |
| `vmwareInstances` | VMware Instances | `vVMwareInstances` | Y | Y | - | - | |
| `vmwareClusters` | VMware Clusters | `vVMwareClusters` | Y | Y | - | - | |
| `vmwareHosts` | VMware Hosts | `vVMwareHosts` | Y | Y | - | - | |
| `vmwareVlans` | VMware VLANs | `vVMwareVlans` | Y | Y | - | - | |
| `vmwareSubnets` | VMware Subnets | `vVMwareSubnets` | Y | Y | - | - | |
| `directorSites` | Director Sites | `vDirectorSites` | Y | Y | - | - | |
| `pvdcs` | PVDCs | `vPVDCs` | Y | Y | - | - | |
| `vcfClusters` | VCF Clusters | `vVCFClusters` | Y | Y | - | - | |
| `vdcs` | VDCs | `vVDCs` | Y | Y | - | - | |
| `multitenantSites` | Multitenant Sites | `vMultitenantSites` | Y | Y | - | - | |
| `reportWarnings` | Report Warnings | `vReportWarnings` | - | - | Y | - | warnings CSV, warnings HTML |
| `reportChecks` | Report Checks | `vReportChecks` | - | - | Y | - | summary HTML |
| `vmwareCrossReferences` | VMware Cross Refs | `vVMwareCrossReferences` | Y | Y | - | - | |
| `bandwidthUsage` | Bandwidth Usage | `vBandwidthUsage` | Y | Y | Y | - | consolidated XLSX |
| `bandwidthPooling` | Bandwidth Pooling | `vBandwidthPooling` | Y | Y | Y | - | consolidated XLSX |

### IMS-only UI data (not exported as tables)

These are parsed from IMS reports but used only for dashboard display, not shown as resource tables:

| Key | Source | Purpose |
|-----|--------|---------|
| `reportWarningSummaries` | warnings HTML | Warning summary by category |
| `reportDistributions` | overview HTML | Chart.js distribution data |
| `reportCosts` | overview HTML | Monthly cost breakdown |
| `reportResourceCounts` | summary HTML | Resource type counts |
| `reportWarningSummary` | summary HTML | Warning priority summary |
| `_topology` | drawio | Network edge list for topology diagram |

---

## VPC Resources

All VPC resources are populated only by the **VPC API** or **Harvester XLSX** re-import. IMS reports and MDL files do not contain VPC data.

| Key | Table Label | Worksheet |
|-----|-------------|-----------|
| `vpcInstances` | Virtual Server Instances | `vVpcInstances` |
| `vpcBareMetalServers` | Bare Metal Servers | `vVpcBareMetal` |
| `vpcDedicatedHosts` | Dedicated Hosts | `vVpcDedicatedHosts` |
| `vpcPlacementGroups` | Placement Groups | `vVpcPlacementGroups` |
| `vpcs` | VPCs | `vVpcs` |
| `vpcSubnets` | Subnets | `vVpcSubnets` |
| `vpcSecurityGroups` | Security Groups | `vVpcSecurityGroups` |
| `vpcFloatingIps` | Floating IPs | `vVpcFloatingIps` |
| `vpcPublicGateways` | Public Gateways | `vVpcPublicGateways` |
| `vpcNetworkAcls` | Network ACLs | `vVpcNetworkAcls` |
| `vpcLoadBalancers` | Load Balancers | `vVpcLoadBalancers` |
| `vpcVpnGateways` | VPN Gateways | `vVpcVpnGateways` |
| `transitGateways` | Transit Gateways | `vTransitGateways` |
| `transitGatewayConnections` | Transit Gateway Connections | `vTGConnections` |
| `directLinkGateways` | Direct Link Gateways | `vDirectLinkGateways` |
| `directLinkVirtualConnections` | Direct Link Virtual Connections | `vDLVirtualConns` |
| `vpnGatewayConnections` | VPN Gateway Connections | `vVpnGwConns` |
| `vpcEndpointGateways` | Endpoint Gateways | `vVpcEndpointGateways` |
| `vpcRoutingTables` | Routing Tables | `vVpcRoutingTables` |
| `vpcRoutes` | Routes | `vVpcRoutes` |
| `vpcVolumes` | Block Storage Volumes | `vVpcVolumes` |
| `vpcSshKeys` | SSH Keys | `vVpcSshKeys` |
| `vpcImages` | Images (Private) | `vVpcImages` |
| `vpcFlowLogCollectors` | Flow Log Collectors | `vVpcFlowLogs` |

---

## PowerVS Resources

All PowerVS resources are populated only by the **PowerVS API** or **Harvester XLSX** re-import. Worksheet names use `p` prefix.

| Key | Table Label | Worksheet |
|-----|-------------|-----------|
| `pvsInstances` | PVM Instances | `pPvsInstances` |
| `pvsSharedProcessorPools` | Shared Processor Pools | `pPvsSPPools` |
| `pvsPlacementGroups` | Placement Groups | `pPvsPlacementGrps` |
| `pvsHostGroups` | Host Groups | `pPvsHostGroups` |
| `pvsNetworks` | Networks | `pPvsNetworks` |
| `pvsNetworkPorts` | Network Ports | `pPvsNetPorts` |
| `pvsNetworkSecurityGroups` | Network Security Groups | `pPvsNSGs` |
| `pvsCloudConnections` | Cloud Connections | `pPvsCloudConns` |
| `pvsDhcpServers` | DHCP Servers | `pPvsDhcp` |
| `pvsVpnConnections` | VPN Connections | `pPvsVpnConns` |
| `pvsIkePolicies` | IKE Policies | `pPvsIkePolicies` |
| `pvsIpsecPolicies` | IPSec Policies | `pPvsIpsecPolicies` |
| `pvsVolumes` | Volumes | `pPvsVolumes` |
| `pvsVolumeGroups` | Volume Groups | `pPvsVolGroups` |
| `pvsSnapshots` | Snapshots | `pPvsSnapshots` |
| `pvsSshKeys` | SSH Keys | `pPvsSshKeys` |
| `pvsImages` | Images | `pPvsImages` |
| `pvsStockImages` | Stock Images | `pPvsStockImages` |
| `pvsWorkspaces` | Workspaces | `pPvsWorkspaces` |
| `pvsSystemPools` | System Pools | `pPvsSystemPools` |
| `pvsSapProfiles` | SAP Profiles | `pPvsSapProfiles` |
| `pvsEvents` | Events | `pPvsEvents` |

---

## Platform Services

Populated only by the **Resource Controller API** or **Harvester XLSX** re-import.

| Key | Table Label | Worksheet |
|-----|-------------|-----------|
| `serviceInstances` | Service Instances | `sServiceInstances` |

---

## IMS Report File Formats

Each IMS file format is identified by filename suffix and parsed by a dedicated function.

| File Pattern | Type Key | Parser | Resource Keys Produced |
|---|---|---|---|
| `{id}.csv` | `warnings_csv` | `parseWarningsCsv` | `reportWarnings` |
| `{id}_gw.csv` | `gateway_csv` | `parseGatewayCsv` | `directLinkGateways`, `classicTransitGateways`, `classicTransitGatewayConnections` |
| `{id}_nas.csv` | `nas_csv` | `parseNasCsv` | `fileStorage`, `blockStorage` |
| `{id}_securitygroups.csv` | `securitygroups_csv` | `parseSecurityGroupsCsv` | `securityGroups` |
| `{id}.html` | `warnings_html` | `parseWarningsHtml` | `reportWarningSummaries` |
| `{id}_overview.html` | `overview_html` | `parseOverviewHtml` | `reportDistributions`, `reportCosts` |
| `{id}_summary.html` | `summary_html` | `parseSummaryHtml` | `reportResourceCounts`, `reportWarningSummary`, `reportChecks` |
| `{id}_inventory.html` | `inventory_html` | `parseInventoryHtml` | `virtualServers`, `bareMetal`, `vlans`, `gateways`, `fileStorage`, `securityGroups` |
| `{id}.drawio` | `drawio` | `parseDrawio` | `bareMetal`, `virtualServers`, `virtualHosts`, `vlans`, `gateways`, `routers`, `classicTransitGateways`, `classicTransitGatewayConnections`, `transitGatewayDevices`, `directLinkGateways`, `subnets` (extracted), `_topology` (edges) |
| `{id}.json` | `json` | `parseReportJson` | All keys from MDL-converted JSON (see MDL section) |
| `{id}_deviceinventory.xlsx` | `deviceinventory_xlsx` | `parseDeviceInventoryXlsx` | `bareMetal`, `virtualServers` |
| `{id}_consolidated.xlsx` | `consolidated_xlsx` | `parseConsolidatedXlsx` | `bareMetal`, `virtualServers`, `fileStorage`, `blockStorage`, `directLinkGateways`, `securityGroups`, `bandwidthUsage`, `bandwidthPooling` |

### Merge Priority

When multiple IMS files contribute to the same resource key, later parsers win on field conflicts. Priority order (lowest to highest):

1. `overview_html`
2. `summary_html`
3. `warnings_csv`
4. `warnings_html`
5. `securitygroups_csv`
6. `nas_csv`
7. `gateway_csv`
8. `drawio`
9. `inventory_html`
10. `json` (MDL-converted)
11. `deviceinventory_xlsx`
12. `consolidated_xlsx` (highest priority)

Deduplication merges records by `id` (primary key) with `hostname` as fallback. Later values overwrite earlier non-empty fields.

---

## MDL Type Mapping

The MDL converter (`scripts/mdl-to-json.py`) maps SoftLayer `TypeAttribute` values to app resource keys:

| MDL TypeAttribute | App Resource Key |
|-------------------|-----------------|
| `baremetal` | `bareMetal` |
| `virtualguest` | `virtualServers` |
| `storage` | `fileStorage` |
| `vlan` | `vlans` |
| `gateway` | `gateways` |
| `router` | `routers` |
| `virtualhost` | `virtualHosts` |
| `transitGateway` | `classicTransitGateways` |
| `transitGatewayDevice` | `transitGatewayDevices` |
| `transitGatewayConnection` | `classicTransitGatewayConnections` |
| `directLinkTenant` | `directLinkGateways` |
| `directLinkRouter` | `directLinkRouters` |
| `directLinkVlan` | `directLinkVlans` |
| `applicationDeliveryController` | `loadBalancers` |

In flat mode (default), the converter strips deeply nested data and keeps only fields the app uses for display. Field names are renamed to match app column definitions (e.g., `OS` -> `os`, `PublicIP` -> `primaryIp`).

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/data/classicResourceTypes.json` | Classic resource key + worksheet definitions |
| `src/data/vpcResourceTypes.json` | VPC resource key + worksheet definitions |
| `src/data/powerVsResourceTypes.json` | PowerVS resource key + worksheet definitions |
| `src/data/platformResourceTypes.json` | Platform resource key + worksheet definitions |
| `src/services/import.ts` | Harvester XLSX import logic |
| `src/services/report-import.ts` | IMS report orchestration + merge priority |
| `src/services/report-parsers/merger.ts` | Deduplication + merge logic |
| `src/services/report-parsers/csv-parsers.ts` | CSV parser functions |
| `src/services/report-parsers/html-parsers.ts` | HTML parser functions |
| `src/services/report-parsers/drawio-parser.ts` | Drawio parser + MODEL_TYPE_MAP |
| `src/services/report-parsers/xlsx-parsers.ts` | Device inventory and consolidated XLSX parsers |
| `src/services/report-parsers/json-parser.ts` | MDL-converted JSON parser |
| `scripts/mdl-to-json.py` | MDL to JSON converter |
