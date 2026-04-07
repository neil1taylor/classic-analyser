# Input File Reference

## Overview

The IMS Report Import feature accepts multiple file formats from IBM's Infrastructure Migration Services (IMS) reporting tool. Files are classified by filename pattern, parsed in priority order, and merged with deduplication. This provides a comprehensive way to import infrastructure data without requiring a live API key.

---

## File Detection Rules

Files are classified by matching their filename against the patterns below. More specific patterns take precedence over generic ones because they are evaluated first.

| Pattern | Type | Description |
|---------|------|-------------|
| `*_gw.csv` | Gateway CSV | Direct Link, Transit Gateways, TGW Connections |
| `*_nas.csv` | NAS CSV | File/NAS storage volumes |
| `*_securitygroups.csv` | Security Groups CSV | Security group definitions |
| `*.csv` | Warnings CSV | Assessment warnings and recommendations |
| `*_overview.html` | Overview HTML | Chart.js cost/distribution data |
| `*_summary.html` | Summary HTML | Resource counts, warning summary, health checks |
| `*_inventory.html` | Inventory HTML | Full resource inventory (nested DOM trees) |
| `*.html` | Warnings HTML | Embedded JS arrays with warning data |
| `*.drawio` | draw.io XML | Network topology diagrams |
| `*.json` | JSON | Converted MDL data |
| `*_deviceinventory.xlsx` | Device Inventory XLSX | Physical location and hardware details |
| `*_consolidated.xlsx` | Consolidated XLSX | Combined data with bandwidth metrics |

> **Note:** Filename patterns are matched in the order shown. More specific patterns (e.g., `*_gw.csv`) take precedence over generic patterns (e.g., `*.csv`). The HTML patterns also match `.htm` extensions. Account ID is extracted from a leading numeric prefix in the filename (e.g., `123456_warnings.csv`).

---

## Merge Priority Order

Lower-priority parsers are processed first; higher-priority parsers overwrite conflicting fields. Within each priority tier, parsers run in the order listed.

**Text parsers (lower priority):**

1. Overview HTML
2. Summary HTML
3. Warnings CSV
4. Warnings HTML
5. Security Groups CSV
6. NAS CSV
7. Gateway CSV
8. draw.io
9. Inventory HTML
10. JSON

**File parsers (higher priority):**

11. Device Inventory XLSX
12. Consolidated XLSX

---

## Deduplication Logic

Resources are deduplicated per resource type using a merged resource map:

- **Primary key:** `id` field -- if two records share the same `id`, their fields are merged.
- **Fallback key:** `hostname` field -- for sources that have hostnames but no IDs, hostname is used to match against existing records.
- **Merge rule:** Later non-empty values overwrite earlier values. Fields that are `undefined`, `null`, or empty string in the incoming record do not overwrite existing values.
- **Anonymous records:** Resources without `id` or `hostname` are assigned synthetic keys (`_anon_0`, `_anon_1`, etc.) and are never merged with other records.

---

## CSV Formats

### Warnings CSV (`*.csv`)

General assessment warnings and recommendations.

| Column | Maps To | Description |
|--------|---------|-------------|
| ID | `id` | Resource identifier |
| Name | `name` | Resource name |
| Location | `location` | Datacenter location |
| Priority | `priority` | Warning priority level |
| Warning | `warning` | Warning message |
| Issue | `issue` | Issue description |
| Type | `type` | Warning type/category |
| Recommendation | `recommendation` | Recommended action |

**Output resource type:** `reportWarnings`

---

### Gateway CSV (`*_gw.csv`)

Contains three sections separated by title lines (lines that are exact section name strings without commas).

#### Section 1: Direct Link 2 Tenants

**Output resource type:** `directLinkGateways`

| Column | Maps To |
|--------|---------|
| Id | `id` |
| Name | `name` |
| Location | `location` |
| LocalIp | `localIp` |
| RemoteIp | `remoteIp` |
| Link Speed | `linkSpeed` |
| Link Status | `linkStatus` |
| BGP Status | `bgpStatus` |
| Operational Status | `operationalStatus` |

#### Section 2: Transit Gateways

**Output resource type:** `classicTransitGateways`

| Column | Maps To |
|--------|---------|
| Id | `id` |
| Name | `name` |
| Datacenters | `datacenters` |
| Zones | `zones` |
| Status | `status` |
| Global | `global` (string converted to boolean) |

#### Section 3: Transit Gateway Connections

**Output resource type:** `classicTransitGatewayConnections`

| Column | Maps To |
|--------|---------|
| Id | `id` |
| Name | `name` |
| Gateway | `gatewayId` |
| Datacenters | `datacenters` |
| Zone | `zone` |
| Network Type | `networkType` |
| Base Network Type | `baseNetworkType` |
| Local Gatway | `localGatewayIp` |
| Local Tunnel | `localTunnelIp` |
| Remote Gateway | `remoteGatewayIp` |
| Remote Tunnel | `remoteTunnelIp` |
| Status | `status` |

> **Note:** The source column header is "Local Gatway" (typo in the IMS report). The parser maps this as-is.

---

### NAS/File Storage CSV (`*_nas.csv`)

File storage volume inventory. Rows before the header row (which starts with `ID,`) are skipped automatically, including datacenter summary rows.

| Column | Maps To | Description |
|--------|---------|-------------|
| ID | `id` | Volume identifier |
| name | `hostname` | Volume hostname |
| DatacenterName | `datacenter` | Datacenter location |
| nasType | `nasType` | NAS type classification |
| storageType | `storageType` | Storage class |
| capacityGb | `capacityGb` | Provisioned capacity in GB |
| totalBytesUsed | `totalBytesUsed` | Bytes consumed |
| percent | `percentUsed` | Usage percentage |
| provisionedIops | `iops` | Provisioned IOPS |
| notes | `notes` | URL-decoded notes field |

**Output resource type:** `fileStorage`

---

### Security Groups CSV (`*_securitygroups.csv`)

Rows before the header row (which starts with `Security Group Id`) are skipped automatically, including the "Security Groups" title line.

| Column | Maps To | Description |
|--------|---------|-------------|
| Security Group Id | `id` | Security group identifier |
| Name | `name` | Group name |
| Description | `description` | Group description |
| Attached Network Components | `attachedComponents` | Connected network components |
| Attached Virtual Hosts | `attachedHosts` | Connected virtual hosts |

**Output resource type:** `securityGroups`

---

## HTML Formats

### Warnings HTML (`*.html`)

Extracts embedded JavaScript arrays from the HTML source. The parser searches for patterns matching:

```
var VariableName = [{ key: value, ... }];
```

Each array becomes a collection of `reportWarningSummary` records. A `resourceType` field is added to each record, set to the JavaScript variable name (e.g., `Baremetalservers`, `Storage`).

The parser also extracts account info (company name, account ID, owner name, email) from HTML header patterns.

**Output resource type:** `reportWarningSummaries`

---

### Overview HTML (`*_overview.html`)

Extracts Chart.js data embedded in the page via `new Chart(...)` constructor calls.

**Cost breakdown** (chart ID `mrr_chart`):

| Field | Source |
|-------|--------|
| `category` | Chart label |
| `monthlyCost` | Chart data value |

**Output resource type:** `reportCosts`

**Resource distributions** (all other chart IDs except `Legend`):

| Field | Source |
|-------|--------|
| `chartId` | Chart element ID |
| `title` | Chart title text |
| `total` | Parsed integer from title (e.g., `(1234 GB)` yields `1234`) |
| `distribution` | Object mapping labels to values |

**Output resource type:** `reportDistributions`

Also extracts recurring cost from text pattern `Recurring Costs ... $X,XXX.XX` and account info from HTML headers.

---

### Summary HTML (`*_summary.html`)

Parses three HTML tables from the page using DOM parsing.

#### Table 1: Resources Analyzed

**Output resource type:** `reportResourceCounts`

| Column | Maps To | Description |
|--------|---------|-------------|
| Resource | `resource` | Resource type name |
| Total | `total` | Total count |
| Warned | `warned` | Count with warnings |
| Count | `count` | Active count |
| Critical | `critical` | Critical severity count |
| Important | `important` | Important severity count |
| Warnings | `warnings` | Warning severity count |

#### Table 2: Summary of Warnings

**Output resource type:** `reportWarningSummary`

| Column | Maps To | Description |
|--------|---------|-------------|
| Warning | `warning` | Warning description |
| Resource | `resource` | Affected resource type |
| Issue | `issue` | Issue description |
| Priority | `priority` | Priority level |
| Count | `count` | Number of affected resources |

#### Table 3: Checks Performed

**Output resource type:** `reportChecks`

| Field | Description |
|-------|-------------|
| `priority` | Check priority level (from column 1) |
| `issue` | Issue description (from column 2) |
| `type` | Check type/category (from column 3) |
| `check` | Check description (from column 4, text before "Recommendation:") |
| `recommendation` | Recommended action (split from column 4 at "Recommendation:" keyword) |
| `rationale` | Rationale for the check (extracted from text after "Rational:" or "Rationale:" in the recommendation) |

Also extracts VRF status: if the text contains "VRF enabled", sets `vrfEnabled: true` on account info.

---

### Inventory HTML (`*_inventory.html`)

The richest HTML parser. Extracts nested `<ul>/<li>` tree structures with `<span class="caret">` toggle elements. Each top-level caret represents a resource instance. The parser recursively walks the DOM tree, converting `<li><b>key</b>: value</li>` patterns into object properties.

Resources are classified by examining their parsed properties:

| Detection Rule | Resource Type | Output Key |
|---------------|---------------|------------|
| Has `processorPhysicalCoreAmount` or `hardwareStatus` | Bare Metal | `bareMetal` |
| Has `maxCpu` or `startCpus` | Virtual Server | `virtualServers` |
| Has `vlanNumber` | VLAN | `vlans` |
| Has `networkSpace` AND `members` | Gateway | `gateways` |
| Has `capacityGb` or `nasType` | Storage | `fileStorage` |
| Label contains "security group" or has `rules` | Security Group | `securityGroups` |

#### Bare Metal field mapping

`id`, `hostname` (falls back to `fullyQualifiedDomainName`), `domain`, `primaryIpAddress`, `primaryBackendIpAddress`, `processorPhysicalCoreAmount`, `memoryCapacity`, `datacenter` (from nested `datacenter.name`), `operatingSystemReferenceCode` (deep-searched for `longDescription` within nested `operatingSystem`), `hardwareStatusId`, `provisionDate`, `notes`

#### Virtual Server field mapping

`id`, `hostname` (falls back to `fullyQualifiedDomainName`), `domain`, `primaryIpAddress`, `primaryBackendIpAddress`, `maxCpu` (falls back to `startCpus`), `maxMemory`, `datacenter` (from nested `datacenter.name`), `operatingSystemReferenceCode` (deep-searched for `longDescription`), `dedicatedHost`, `localDiskFlag`, `notes`

#### VLAN field mapping

`id`, `vlanNumber`, `name`, `datacenter` (from nested `primaryRouter.datacenter.name`), `networkSpace`, `subnetCount`

#### Gateway field mapping

`id`, `name`, `networkSpace`, `publicIpAddress`, `privateIpAddress`, `status`

#### Storage field mapping

`id`, `hostname` (falls back to `nasType`), `datacenter` (from nested `serviceResource.datacenter`), `nasType`, `storageType`, `capacityGb`, `totalBytesUsed`, `iops` (from `provisionedIops` or `iops`), `notes`

#### Security Group field mapping

`id`, `name`, `description`, `rules`

---

## draw.io Format

XML file containing `<diagram>` tabs (typically one per datacenter). Resource nodes are `<UserObject modelType="...">` elements; network connections are `<mxCell edge="1">` elements.

### Resource type mapping

| modelType | Output Key |
|-----------|------------|
| `baremetal` | `bareMetal` |
| `virtualguest` | `virtualServers` |
| `virtualhost` | `virtualHosts` |
| `vlan` | `vlans` |
| `gateway` | `gateways` |
| `router` | `routers` |
| `transitGateway` | `classicTransitGateways` |
| `transitGatewayDevice` | `transitGatewayDevices` |
| `transitGatewayConnection` | `classicTransitGatewayConnections` |

All XML attributes on the `<UserObject>` element become resource fields. The `sl_id` attribute maps to the `id` field (parsed as integer if numeric). The datacenter name comes from the `<diagram>` tab's `name` attribute. Known numeric fields (`processors`, `memory`, `maxCpu`, `hostID`) are parsed as integers. Known boolean fields (`dedicated`, `localDiskFlag`, `global`, `is_billing`) are converted from string to boolean.

Model-specific normalization is applied:

- **baremetal / virtualguest:** `name` copies to `hostname`; `PublicIP`/`PrivateIP` normalize to standard field names; `OS` maps to `operatingSystemReferenceCode`
- **vlan:** VLAN number and name extracted from `name` field pattern `1104: vcs-tok04-DMZYZ`; `domain` maps to `networkSpace`; subnet attributes aggregated
- **gateway:** `PublicIP`/`PrivateIP` normalize to standard field names
- **router:** `primaryName` maps to `name`; `domain` maps to `networkSpace`
- **transitGateway / transitGatewayConnection:** Datacenter suffixes stripped from `sl_id`

### Edge connection types

| Visual Indicator | Connection Type |
|-----------------|----------------|
| Edge ID contains `_TR` or style has `dashed=1` + red color | `PUBLIC_TRUNKED` |
| Edge ID contains `_TR` or style has `dashed=1` + other color | `PRIVATE_TRUNKED` |
| Blue color (`#0000FF`) | `PRIVATE_NATIVE` |
| Red color (`#FF0000`) | `PUBLIC_NATIVE` |
| Edge ID starts with `SLC_PRIVATE` | `PRIVATE_NATIVE` or `PRIVATE_TRUNKED` |
| Edge ID starts with `SLC_PUBLIC` | `PUBLIC_NATIVE` or `PUBLIC_TRUNKED` |
| Default | `IMPLICIT` |

---

## XLSX Report Formats

### Device Inventory XLSX (`*_deviceinventory.xlsx`)

#### Bare Metal Servers sheet

**Output resource type:** `bareMetal`

| Column | Maps To | Notes |
|--------|---------|-------|
| ID | `id` | |
| Type Attribute | `typeAttribute` | |
| Hostname | `hostname` | |
| Domain | `domain` | |
| Datacenter | `datacenter` | |
| Server Room | `serverRoom` | |
| Rack | `rack` | |
| Provision Date | `provisionDate` | |
| Hardware Chassis | `hardwareChassis` | |
| Motherboard | `motherboard` | |
| OS | `operatingSystemReferenceCode` | |
| Public IP | `primaryIpAddress` | |
| Private IP | `primaryBackendIpAddress` | |
| Public VLAN | `publicVlan` | |
| Private VLAN | `privateVlan` | |
| Public Router | `publicRouter` | |
| Private Router | `privateRouter` | |
| Core Count | `processorPhysicalCoreAmount` | |
| Public Speed | `publicNetworkSpeed` | |
| Private Speed | `privateNetworkSpeed` | |
| Memory | `memoryCapacity` | Parsed: `"64GB"` becomes `64` |
| Processor Type | `processorType` | |
| Processor Count | `processorCount` | |
| Raid Controller | `raidController` | |

#### Virtual Guests sheet

**Output resource type:** `virtualServers`

| Column | Maps To | Notes |
|--------|---------|-------|
| ID | `id` | |
| Type Attribute | `typeAttribute` | |
| Hostname | `hostname` | |
| Domain | `domain` | |
| Datacenter | `datacenter` | |
| Server Room | `serverRoom` | |
| Rack | `rack` | |
| Provision Date | `provisionDate` | |
| Hardware Chassis | `hardwareChassis` | |
| Motherboard | `motherboard` | |
| OS | `operatingSystemReferenceCode` | |
| Public IP | `primaryIpAddress` | |
| Private IP | `primaryBackendIpAddress` | |
| Public VLAN | `publicVlan` | |
| Private VLAN | `privateVlan` | |
| Public Router | `publicRouter` | |
| Private Router | `privateRouter` | |
| Core Count | `maxCpu` | |
| Memory | `maxMemory` | |
| Local Disk Flag | `localDiskFlag` | String `"true"` converted to boolean |
| Public Speed | `publicNetworkSpeed` | |
| Private Speed | `privateNetworkSpeed` | |
| Block Devices | `blockDevices` | |

---

### Consolidated XLSX (`*_consolidated.xlsx`)

The consolidated report combines data from multiple sources into a single XLSX file, plus bandwidth metrics.

#### Overview sheet

Key-value pairs (Column A = key, Column B = value). `Account ID` maps to `accountInfo.id`.

#### NAS Storage sheet

**Output resource type:** `fileStorage`

Same column layout as NAS CSV. Header row is auto-detected by scanning for a row starting with `ID`.

#### Gateways sheet

**Output resource type:** `directLinkGateways`

Same column layout as Gateway CSV Section 1 (Direct Link 2 Tenants). Header row is auto-detected by scanning for a row starting with `Id`.

#### Security Groups sheet

**Output resource type:** `securityGroups`

Same column layout as Security Groups CSV. Header row is auto-detected by scanning for a row starting with `Security Group Id`.

#### Device Inventory (Bare Metal) sheet

**Output resource type:** `bareMetal`

Same column layout as Device Inventory XLSX Bare Metal Servers, plus two additional columns:

| Column | Maps To |
|--------|---------|
| Non-OS Software | `nonOsSoftware` |
| Storage Groups | `storageGroups` |

#### Device Inventory (Virtual) sheet

**Output resource type:** `virtualServers`

Same column layout as Device Inventory XLSX Virtual Guests.

#### Bandwidth sheets

Four sheets with identical column layouts:

- **Bandwidth (Public BM)** -- public bandwidth for bare metal servers
- **Bandwidth (Public VSI)** -- public bandwidth for virtual servers
- **Bandwidth (Private BM)** -- private bandwidth for bare metal servers
- **Bandwidth (Private VSI)** -- private bandwidth for virtual servers

| Column | Maps To |
|--------|---------|
| Hardware ID | `id` |
| Hostname | `hostname` |
| Domain | `domain` |
| Datacenter | `datacenter` |
| Pool ID | `poolId` |
| Month 1 Start | `month1Start` |
| Month 1 End | `month1End` |
| Month 1 In (GB) | `month1InGb` |
| Month 1 Out (GB) | `month1OutGb` |
| Month 2 Start | `month2Start` |
| Month 2 End | `month2End` |
| Month 2 In (GB) | `month2InGb` |
| Month 2 Out (GB) | `month2OutGb` |
| Month 3 Start | `month3Start` |
| Month 3 End | `month3End` |
| Month 3 In (GB) | `month3InGb` |
| Month 3 Out (GB) | `month3OutGb` |
| 3 Month Avg In (GB) | `avgInGb` |
| 3 Month Avg Out (GB) | `avgOutGb` |

Each bandwidth record also receives `direction` (`"public"` or `"private"`) and `deviceType` (`"bareMetal"` or `"virtualServer"`) fields based on which sheet it came from.

Bandwidth records are merged back onto matching `bareMetal` and `virtualServers` records (matched by `id`) as:

- `publicBandwidthAvgInGb`, `publicBandwidthAvgOutGb`
- `privateBandwidthAvgInGb`, `privateBandwidthAvgOutGb`
- `bandwidthPoolId`

#### Bandwidth Pooling sheet

**Output resource type:** `bandwidthPooling`

| Column | Maps To |
|--------|---------|
| Pool ID | `poolId` |
| Pool Name | `poolName` |
| Pool Type | `poolType` |
| Location Group ID | `locationGroupId` |
| Total Allocated (GB) | `totalAllocatedGb` |
| Billing Cycle Usage (GB) | `billingCycleUsageGb` |
| Public Usage Total (GB) | `publicUsageTotalGb` |
| Allowed Usage (GB) | `allowedUsageGb` |
| Estimated Usage (GB) | `estimatedUsageGb` |
| Projected Usage (GB) | `projectedUsageGb` |
| Device Type | `deviceType` |
| Device ID | `deviceId` |
| Device Hostname | `deviceHostname` |
| Device Domain | `deviceDomain` |
| Device FQDN | `deviceFqdn` |
| Device Datacenter | `deviceDatacenter` |

---

## XLSX Re-Import Format

Previously exported XLSX files (from Infrastructure Explorer or cloud-harvester) can be re-imported using the Import XLSX feature. Worksheets are identified by a domain-prefix naming convention:

| Prefix | Domain | Examples |
|--------|--------|---------|
| `v` | Classic | `vVirtualServers`, `vBareMetal`, `vVLANs` |
| `v` | VPC | `vVpcInstances`, `vVpcSubnets` |
| `p` | PowerVS | `pPvsInstances`, `pPvsNetworks` |
| `s` | Platform | `sServiceInstances` |

Worksheet names are matched case-insensitively against the registered resource type definitions. Unrecognized worksheet names are silently skipped.

**Account info** is extracted from `Summary` or `VPC Summary` sheets:

| Row Label | Maps To |
|-----------|---------|
| Account Name | `companyName` |
| Account ID | `id` |
| Account Email | `email` |
| Account Owner | `firstName`, `lastName` |

Row 1 of each data worksheet contains column headers. Column headers are matched against the resource type's declared column definitions to determine the target field name and data type.

---

## Data Type Handling

The following data type coercions are applied across all parsers:

| Data Type | Rule |
|-----------|------|
| **Rich text** | Excel cells with rich text formatting are flattened to plain strings by concatenating all text segments. |
| **Dates** | Excel date values (JavaScript `Date` objects) are converted to ISO 8601 format strings. |
| **Booleans** | String values `"yes"`, `"true"`, `"1"` become `true`; `"no"`, `"false"`, `"0"` become `false` (case-insensitive). |
| **Numbers** | String values that are purely numeric are parsed as numbers in the Inventory HTML parser. XLSX parsers preserve Excel's native number typing. |
| **Currency** | For XLSX re-import, `$` and `%` characters are stripped before parsing as float. |
| **Empty values** | `null`, `undefined`, and empty string values are not written to the output object, preserving the ability to merge without overwriting valid data. |
| **Unrecognized columns** | Columns not in the field map are preserved using the original header name as the field key. |
