# Product Requirements Definition

# IBM Cloud Infrastructure Explorer

**A comprehensive inventory and analysis tool for IBM Cloud Classic environments**

---

| | |
|---|---|
| **Version** | 2.2 |
| **Date** | January 31, 2026 |
| **Status** | Draft |
| **Classification** | Internal |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [Functional Requirements](#5-functional-requirements)
   - 5.1 [Authentication & API Connection](#51-authentication--api-connection)
   - 5.2 [Data Collection](#52-data-collection)
   - 5.3 [Data Display](#53-data-display)
   - 5.4 [Export Functionality](#54-export-functionality)
   - 5.5 [Application Settings & Information](#55-application-settings--information)
   - 5.6 [Data Import](#56-data-import)
   - 5.7 [Developer Diagnostics](#57-developer-diagnostics)
6. [Data Model & Resource Coverage](#6-data-model--resource-coverage)
7. [UI/UX Specifications](#7-uiux-specifications)
   - 7.1 [Design System](#71-design-system)
   - 7.2 [Page Layouts](#72-page-layouts)
   - 7.3 [Component Specifications](#73-component-specifications)
8. [Technical Architecture](#8-technical-architecture)
9. [API Integration Specifications](#9-api-integration-specifications)
10. [Security Considerations](#10-security-considerations)
11. [Deployment Guide](#11-deployment-guide)
12. [VMware Integration](#12-vmware-integration)
   - 12.1 [Overview](#121-overview)
   - 12.2 [VMware APIs](#122-vmware-apis)
   - 12.3 [Authentication & IAM Token Exchange](#123-authentication--iam-token-exchange)
   - 12.4 [VMware Data Model & Resource Coverage](#124-vmware-data-model--resource-coverage)
   - 12.5 [Cross-Reference & Deduplication](#125-cross-reference--deduplication)
   - 12.6 [UI Integration](#126-ui-integration)
   - 12.7 [Collection Integration](#127-collection-integration)
   - 12.8 [Export Integration](#128-export-integration)
   - 12.9 [VMware Relationship Mapping](#129-vmware-relationship-mapping)
   - 12.10 [Future: VCD Tenant Data](#1210-future-vcd-tenant-data)
13. [Phase 2 Roadmap](#13-phase-2-roadmap---ai-powered-migration-analysis)
14. [VPC Infrastructure Explorer](#14-vpc-infrastructure-explorer)
   - 14.1 [Overview](#141-overview)
   - 14.2 [VPC Resource Types](#142-vpc-resource-types)
   - 14.3 [Authentication & IAM Token Exchange](#143-authentication--iam-token-exchange)
   - 14.4 [VPC API Client](#144-vpc-api-client)
   - 14.5 [Multi-Region Collection](#145-multi-region-collection)
   - 14.6 [Data Collection (SSE)](#146-data-collection-sse)
   - 14.7 [Frontend Data Layer](#147-frontend-data-layer)
   - 14.8 [UI Integration](#148-ui-integration)
   - 14.9 [VPC Export](#149-vpc-export)
   - 14.10 [Navigation Structure](#1410-navigation-structure)
15. [AI-Powered Features](#15-ai-powered-features)
   - 15.1 [Overview](#151-overview)
   - 15.2 [AI Proxy Service](#152-ai-proxy-service)
   - 15.3 [Frontend AI Service Layer](#153-frontend-ai-service-layer)
   - 15.4 [AI Chat](#154-ai-chat)
   - 15.5 [AI Migration Insights](#155-ai-migration-insights)
   - 15.6 [AI Cost Optimization](#156-ai-cost-optimization)
   - 15.7 [DOCX Report Generation](#157-docx-report-generation)
   - 15.8 [Settings Page](#158-settings-page)
   - 15.9 [AI Proxy Deployment](#159-ai-proxy-deployment)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

IBM Cloud Infrastructure Explorer is a web-based inventory and analysis tool designed to provide comprehensive visibility into IBM Cloud Classic and VPC infrastructure environments. Similar in concept to RVTools for VMware environments, this tool addresses a critical gap in the IBM Cloud ecosystem by enabling infrastructure administrators, Tech Sellers, and Client Engineers to quickly inventory, analyze, and export detailed information about Classic and VPC infrastructure resources.

The tool will be deployed as a containerized web application on IBM Code Engine, providing a lightweight, on-demand solution that requires no persistent infrastructure. Users provide their IBM Cloud API key at runtime, and the application collects exhaustive data from all supported Classic infrastructure APIs and VPC infrastructure APIs (across all available regions), presenting it in interactive, filterable tables with full export capabilities to Microsoft Excel format.

The VPC Infrastructure Explorer operates as a fully independent section — with its own data collection (SSE), context, pages, and XLSX export — sharing only the authentication flow and UI shell with the Classic section.

Phase 2 of the project introduced rule-based VPC migration readiness assessment to help organizations plan their transition from Classic to VPC infrastructure. Phase 3 added AI-powered features via a separate watsonx.ai proxy service — including infrastructure chat, migration insights, cost optimization, and AI-enhanced DOCX report generation — alongside a unified report system that conditionally includes migration sections when migration data is available.

### 1.1 Key Objectives

1. Provide comprehensive inventory of all IBM Cloud Classic infrastructure resources
2. Inventory IBM Cloud VMware infrastructure (VCF for Classic and VCF as a Service)
3. Inventory IBM Cloud VPC infrastructure across all regions (19 resource types)
4. Enable resource relationship mapping and dependency visualization, including VMware ↔ Classic cross-references
5. Deliver professional, exportable reports in XLSX and DOCX formats
6. Support VPC migration planning with rule-based and AI-powered analysis
7. Provide AI-powered infrastructure chat, migration insights, and cost optimization via watsonx.ai
8. Provide a modern, professional UI using IBM Carbon Design System

### 1.2 Target Audience

- IBM Tech Sellers conducting client discovery workshops
- IBM Client Engineers delivering proof-of-concept implementations
- Enterprise infrastructure administrators managing Classic environments
- Migration architects planning Classic to VPC transitions

---

## 2. Problem Statement

### 2.1 Current Challenges

Organizations running workloads on IBM Cloud Classic infrastructure face several challenges when attempting to gain visibility into their environments:

- **Fragmented Visibility:** Resource information is scattered across multiple IBM Cloud console pages, requiring manual navigation to build a complete picture of the environment.

- **Limited Export Options:** The IBM Cloud console does not provide comprehensive export functionality, making it difficult to share inventory data with stakeholders or import into other tools.

- **API Complexity:** The SoftLayer/Classic Infrastructure API is extensive and complex, requiring significant development effort to build custom inventory solutions.

- **Migration Planning Gaps:** Organizations planning to migrate from Classic to VPC lack tooling to assess migration readiness and identify potential blockers.

- **No RVTools Equivalent:** Unlike VMware environments where RVTools provides comprehensive inventory capabilities, no equivalent tool exists for IBM Cloud Classic.

### 2.2 Target Solution

IBM Cloud Infrastructure Explorer will address these challenges by providing a unified, web-based interface that aggregates data from all Classic infrastructure APIs, presents it in interactive tables with powerful filtering and sorting capabilities, and enables export to familiar formats for further analysis and reporting.

---

## 3. Goals & Success Metrics

### 3.1 Primary Goals

| ID | Goal | Success Criteria |
|----|------|------------------|
| G1 | Complete Infrastructure Visibility | 100% coverage of supported Classic API endpoints |
| G2 | Fast Data Collection | Initial dashboard populated within 30 seconds (shallow scan); full inventory in < 5 minutes for accounts with < 500 resources |
| G3 | Professional User Experience | UI adheres to IBM Carbon Design System standards |
| G4 | Actionable Exports | XLSX exports compatible with Excel 2016+ and Google Sheets |
| G5 | Easy Deployment | One-click deployment to Code Engine |

### 3.2 Key Performance Indicators (KPIs)

- **Time to First Inventory:** Less than 2 minutes from API key entry to seeing first data
- **Data Accuracy:** 100% match between tool output and IBM Cloud console data
- **Export Completeness:** All visible data exportable to XLSX without data loss
- **User Satisfaction:** > 4.0/5.0 rating from internal users during pilot

---

## 4. User Personas

### 4.1 Primary Persona: IBM Tech Seller

**Name:** Sarah Chen, Technical Sales Specialist

**Role:** Pre-sales technical consultant working with enterprise clients

**Goals:**
- Quickly assess client Classic infrastructure during discovery workshops
- Generate professional inventory reports for client presentations
- Identify VPC migration opportunities and complexity

**Pain Points:**
- Limited time during client engagements to manually inventory resources
- Needs polished, IBM-branded outputs for client delivery

**Usage Pattern:** On-demand during client engagements, typically 2-3 times per week

### 4.2 Secondary Persona: Infrastructure Administrator

**Name:** Marcus Johnson, Senior Cloud Administrator

**Role:** Manages enterprise IBM Cloud Classic infrastructure

**Goals:**
- Maintain accurate inventory documentation for compliance
- Identify unused or underutilized resources
- Plan and execute migrations to VPC

**Pain Points:**
- Manual inventory processes are time-consuming and error-prone
- Difficulty tracking resource relationships and dependencies

**Usage Pattern:** Weekly inventory updates, ad-hoc queries for troubleshooting

### 4.3 Tertiary Persona: Client Engineer

**Name:** David Park, Client Engineering Lead

**Role:** Delivers proof-of-concept implementations and technical demonstrations

**Goals:**
- Rapidly understand client environments for PoC scoping
- Document existing state for migration projects
- Create technical architecture diagrams

**Pain Points:**
- Needs detailed technical data quickly for architecture planning
- Requires relationship data to understand dependencies

**Usage Pattern:** Intensive use during project initiation phases

---

## 5. Functional Requirements

### 5.1 Authentication & API Connection

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-1.1 | API Key Input | User enters IBM Cloud API key via secure input field (masked) | Must |
| FR-1.2 | No Persistence | API key is never stored; held only in memory during session | Must |
| FR-1.3 | Validation | Validate API key has sufficient Classic infrastructure permissions before proceeding | Must |
| FR-1.4 | Session Timeout | Session expires after 60 minutes of inactivity; API key cleared | Must |
| FR-1.5 | Account Info Display | Display account name, ID, and owner information after successful authentication | Must |
| FR-1.6 | Permission Check | Display warning if API key lacks permissions for specific resource types | Should |

### 5.2 Data Collection

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-2.1 | Manual Trigger | Data collection initiated via "Collect Data" button | Must |
| FR-2.2 | Progress Display | Show detailed progress with resource type and count (e.g., "Collecting VSIs... 45/120") | Must |
| FR-2.3 | Background Collection | Collection runs in background; UI remains responsive | Must |
| FR-2.4 | Live Population | Tables populate in real-time as data is collected | Must |
| FR-2.5 | Error Handling | Display errors for failed API calls; continue with available data | Must |
| FR-2.6 | Exhaustive Data | Collect all fields returned by each API endpoint | Must |
| FR-2.7 | Relationship Resolution | Automatically resolve and map relationships between resources | Must |
| FR-2.8 | Collection Cancellation | Allow user to cancel in-progress collection | Should |
| FR-2.9 | Retry Failed | Option to retry failed API calls | Should |
| FR-2.10 | Two-Phase Collection | Collection runs in two automatic phases: a shallow scan (minimal object masks for slow resources, full masks for fast resources) followed by a deep scan (full object masks for previously-shallow resources). Dashboard populates with summary data during shallow scan. | Must |
| FR-2.11 | Silent Data Replace | Deep scan data silently overwrites shallow data in the UI. No user interaction required between phases. | Must |
| FR-2.12 | Phase Progress | Progress indicator shows current phase name ("Shallow Scan" / "Deep Scan") and continuous percentage across both phases. | Must |
| FR-2.13 | Deep Scan Fallback | If a deep scan fetch fails for a resource, the shallow data remains visible for that resource. | Must |
| FR-2.14 | Abort Between Phases | If the user cancels during shallow scan, deep scan does not run. Abort signal checked between phases. | Must |
| FR-2.15 | Deferred Relationships | Relationship mapping and DNS record flattening only run after deep scan completes (they require full nested data). | Must |

### 5.3 Data Display

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-3.1 | Summary Dashboard | Overview page showing resource counts, high-level stats, and account info | Must |
| FR-3.2 | Resource Tables | Dedicated table for each resource type (one tab per resource) | Must |
| FR-3.3 | Column Sorting | Click column headers to sort ascending/descending | Must |
| FR-3.4 | Column Filtering | Filter controls per column (text search, dropdown for enums) | Must |
| FR-3.5 | Column Visibility | Toggle show/hide for individual columns | Must |
| FR-3.6 | Global Search | Search across all columns in current table | Must |
| FR-3.7 | Virtualized Scrolling | Efficient rendering for large datasets (1000+ rows) | Must |
| FR-3.8 | Column Resizing | Drag column borders to resize widths | Must |
| FR-3.9 | Row Selection | Select individual rows or all rows for partial exports | Must |
| FR-3.10 | Column Reordering | Drag and drop to reorder columns | Should |
| FR-3.11 | Saved Views | Save and restore column configurations | Could |

### 5.4 Export Functionality

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-4.1 | XLSX Export | Export all data to Microsoft Excel format (.xlsx) | Must |
| FR-4.2 | Multi-worksheet | One worksheet per resource type (similar to RVTools structure) | Must |
| FR-4.3 | File Naming | Format: IBMClassic_Export_YYYY-MM-DD_AccountName.xlsx | Must |
| FR-4.4 | Filtered Export | Export respects current filter/selection state | Must |
| FR-4.5 | Summary Sheet | Include summary worksheet with collection metadata and totals | Must |
| FR-4.6 | Single Table Export | Option to export only current table | Should |
| FR-4.7 | Column Formatting | Apply appropriate data types (dates, numbers) in Excel | Should |
| FR-4.8 | DOCX Unified Report | Generate a single professional DOCX report. Always includes cover page, table of contents, executive summary, environment overview (with pie charts), inventory tables, and appendices. When migration data is present, additionally includes migration readiness (with chart), compute/network/storage/security assessments, feature gaps, cost analysis (with chart), wave plan, recommendations, and assumptions. Includes headers, footers with page numbers, numbered table/figure captions, and page breaks between major sections. Optional AI-enhanced narrative sections. | Must |
| FR-4.9 | Pie Charts in DOCX | Embed canvas-rendered pie charts (resource distribution, datacenter spread, cost breakdown, migration readiness) in the DOCX report using IBM Design Language colour palette. Charts are rendered at 3× retina resolution. | Must |
| FR-4.10 | Report Export Dialog | Modal dialog for entering client name and toggling AI narrative inclusion. Single "Generate Report" action — report automatically includes migration sections when migration data is available. | Must |
| FR-4.11 | AI Report Narratives | When AI is configured and enabled, fetch watsonx.ai-generated prose for each DOCX report section. AI sections are styled with purple accents and include a disclaimer. | Should |

### 5.5 Application Settings & Information

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-5.1 | Theme Toggle | Light/dark mode toggle in header; persisted in localStorage. Uses Carbon White theme (light) and g100 theme (dark). Respects `prefers-color-scheme` on first visit. | Must |
| FR-5.2 | About Dialog | Modal showing product name, version (from package.json), author (Neil Taylor), "Built with Claude Code" credit with link, MIT licence, and relevant links | Must |
| FR-5.3 | Documentation Hub | Multi-section documentation hub at `/docs` with left-side secondary navigation. Accessible to all users (authenticated and unauthenticated). 12 content sections across 3 groups (Infrastructure, Features, Reference) plus Getting Started. Replaces the former Help Page and Documentation Page. `/help` redirects to `/docs`. Header help icon and login page "Get Started" link navigate to `/docs`. | Must |
| FR-5.4 | Favicon | Official IBM Cloud favicon (`public/favicon.png`) downloaded from `https://cloud.ibm.com` | Must |
| FR-5.6 | Settings Page | Dedicated `/settings` page with two sections: AI Configuration (enable/disable toggle, "Test Connection" button; proxy URL and API key are build-time env vars, not user-configurable) and Report Branding (client name, company name, author name). AI enabled state persisted in localStorage (default: disabled). Accessible from SideNav and Header icon. | Must |
| FR-5.7 | AI Chat Panel | Slide-in right panel accessible from Header chat icon (visible when AI is configured). Supports multi-turn conversation with watsonx.ai about the collected infrastructure data. Messages styled with user/assistant bubbles, purple accent for AI responses. | Should |

### 5.6 Data Import

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-6.1 | XLSX Import | Import a previously exported XLSX file to populate all tables | Must |
| FR-6.2 | No Auth Required for Import | XLSX import works without an API key — allows offline analysis | Must |
| FR-6.3 | Import Validation | Validate the XLSX structure matches the expected export format (check worksheet names) | Must |
| FR-6.4 | Import Data Display | Imported data populates the same tables and dashboard as live-collected data — including Topology, Cost Analysis, Geography, and Migration Assessment views | Must |
| FR-6.5 | Import Indicator | UI clearly indicates data source is "Imported from file" vs "Collected from API" | Should |
| FR-6.6 | Import Replaces Data | Importing a file replaces any currently loaded data | Must |
| FR-6.7 | Header→Field Reverse Mapping | Import uses RESOURCE_TYPES / VPC_RESOURCE_TYPES column definitions to reverse-map XLSX header text back to camelCase field names, ensuring imported objects have the same property names as live-collected data | Must |
| FR-6.8 | Type Coercion | Import coerces cell values based on column data type: numeric strings → numbers, "Yes"/"No" → booleans, currency strings → numbers | Must |
| FR-6.9 | Account Info from Summary | Import parses the Summary / VPC Summary worksheet to extract Account Name, Account ID, Email, and Account Owner; displays this in the header and dashboard | Should |
| FR-6.10 | VPC Import Support | Import recognises both Classic and VPC worksheet names, allowing a VPC export to be re-imported | Must |
| FR-6.11 | IMS Report Import | Import IMS reporting tool output: CSVs (warnings, gateways, NAS, security groups), HTMLs (warnings, overview, summary, inventory), drawio (topology), and report XLSXs (assessment, device inventory). Multi-file selection, auto-detects account ID from filenames. | Should |
| FR-6.12 | MDL Import | Import IMS `.mdl` files (serialized SoftLayer data model) via server-side conversion to JSON. The `.mdl` is the most complete data source with raw API responses for all resource types. Uploaded to `POST /api/convert/mdl`. | Should |
| FR-6.13 | Report Deduplication | When importing multiple report files, merge/deduplicate resources by `id` (primary) and `hostname` (fallback for files without IDs like assessment XLSX). | Should |
| FR-6.14 | Three Import Buttons | Auth page offers three distinct import paths: "Import XLSX" (cloud-harvester), "Import IMS Reports" (CSVs/HTMLs/drawio/XLSXs), and "Import MDL" (.mdl files). Each is independent to avoid double-counting. | Should |

### 5.7 Developer Diagnostics

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-7.1 | Console Logging | Detailed structured logging to browser Developer Tools console for all major operations | Must |
| FR-7.2 | Log Levels | Support DEBUG, INFO, WARN, ERROR levels; default to INFO in production, DEBUG in development | Must |
| FR-7.3 | API Call Logging | Log every SoftLayer API proxy call: endpoint, method, response status, duration (ms), result count — never log API keys | Must |
| FR-7.4 | Collection Progress Logging | Log each collection phase start/end, resource type, item count, errors, and total duration | Must |
| FR-7.5 | SSE Event Logging | Log each SSE event received (type, resource, count) at DEBUG level | Should |
| FR-7.6 | Import/Export Logging | Log XLSX import parsing (worksheets found, row counts) and export generation details | Should |
| FR-7.7 | Key Sanitisation | API keys must NEVER appear in console logs — enforce sanitisation on all log output | Must |

---

## 6. Data Model & Resource Coverage

The following sections detail all resource types to be collected from the IBM Cloud Classic Infrastructure API. Each resource type will have a dedicated worksheet in the export and a corresponding table in the UI.

#### Nested Array Flattening

Many SoftLayer API responses include nested arrays (e.g., `tagReferences`, `networkVlans`, `blockDevices`, `allowedVirtualGuests`). The frontend transform layer flattens these into human-readable comma-separated strings before storing them in state. This ensures the data is available in both the UI table column picker (hidden by default) and XLSX export columns without requiring the export layer to re-parse nested objects. Examples:

| Raw API Field | Flattened Column | Format |
|---------------|-----------------|--------|
| `tagReferences[].tag.name` | Tags | `"web, production, critical"` |
| `networkVlans[].vlanNumber + networkSpace` | VLANs | `"123 (PUBLIC), 456 (PRIVATE)"` |
| `blockDevices[].diskImage.capacity` | Disk (GB) | Sum of all capacities |
| `blockDevices[].diskImage.localDiskFlag` | Local/Portable Storage (GB) | Split by local vs portable |
| `hardDrives[].hardwareComponentModel.capacity` | Hard Drives | `"500GB, 500GB"` |
| `networkComponents[].name:primaryIpAddress:speed` | Network Components | `"eth0:10.1.2.3:1000Mbps, eth1:10.1.2.4:100Mbps"` |
| `allowedVirtualGuests[].hostname` | Allowed VSIs | `"vsi01, vsi02"` |
| `allowedHardware[].hostname` | Allowed Hardware | `"bm01, bm02"` |
| `replicationPartners[].username` | Replication Partners | `"SL02SEV1234-1"` |
| `virtualServers[].port + allocation` | Virtual Servers | `"Port 80 (50%), Port 443 (50%)"` |
| `roles[].name` | Roles | `"ADMIN, VIEWER"` |
| `permissions[].keyName` | Permissions | `"TICKET_VIEW, SERVER_ADD"` |
| `addressTranslations` | Address Translations | JSON string |
| `customerSubnets` | Customer Subnets | JSON string |
| `internalSubnets` | Internal Subnets | JSON string |

### 6.1 Compute Resources

#### 6.1.1 Virtual Servers (VSIs)

**API Endpoint:** `SoftLayer_Account/getVirtualGuests`

**Object Mask:** `mask[id,hostname,domain,fullyQualifiedDomainName,primaryIpAddress,primaryBackendIpAddress,maxCpu,maxMemory,startCpus,status,powerState,datacenter,operatingSystem[softwareDescription],hourlyBillingFlag,createDate,modifyDate,billingItem[recurringFee,hourlyRecurringFee,children[categoryCode,hourlyRecurringFee],orderItem],networkVlans[id,vlanNumber,name,networkSpace],blockDevices[diskImage[capacity,units]],tagReferences[tag],notes,dedicatedAccountHostOnlyFlag,placementGroupId,privateNetworkOnlyFlag,localDiskFlag]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| hostname | String | Server hostname |
| domain | String | Domain name |
| fullyQualifiedDomainName | String | FQDN (hostname.domain) |
| primaryIpAddress | String | Primary public IP |
| primaryBackendIpAddress | String | Primary private IP |
| maxCpu | Integer | Number of vCPUs |
| maxMemory | Integer | RAM in MB |
| startCpus | Integer | Allocated vCPUs |
| status | String | Current status (ACTIVE, etc.) |
| powerState | String | Power state (RUNNING, HALTED) |
| datacenter.name | String | Datacenter location |
| operatingSystem.softwareDescription.name | String | Operating system name |
| operatingSystem.softwareDescription.version | String | OS version |
| hourlyBillingFlag | Boolean | Hourly (true) or Monthly (false) |
| createDate | DateTime | Provisioning timestamp |
| modifyDate | DateTime | Last modification timestamp |
| billingItem.recurringFee | Decimal | Monthly recurring cost |
| billingItem.hourlyRecurringFee | Decimal | Hourly rate (parent billing item) |
| billingItem.children | Array | Child billing items (CPU, RAM, OS, network, etc.) |
| billingItem.children[].hourlyRecurringFee | Decimal | Hourly rate per child component |
| networkVlans | Array | Associated VLANs |
| blockDevices | Array | Attached storage devices (includes bootableFlag, device, diskImage.capacity, diskImage.units, diskImage.localDiskFlag, diskImage.description — used to distinguish local vs portable SAN storage) |
| tagReferences | Array | User-defined tags |
| notes | String | User notes |
| dedicatedAccountHostOnlyFlag | Boolean | Dedicated host indicator |
| placementGroupId | Integer | Placement group association |
| privateNetworkOnlyFlag | Boolean | Private network only |
| localDiskFlag | Boolean | Local disk vs SAN |

**Worksheet Name:** vVirtualServers

**Estimated Monthly Cost for Hourly VSIs:**

SoftLayer hourly-billed VSIs have a `recurringFee` of `0` because they are charged per-hour rather than per-month. To provide meaningful cost data, the frontend transform calculates an estimated monthly cost by summing the `hourlyRecurringFee` from the parent billing item and all child billing items (CPU, RAM, OS, network, etc.) and multiplying by 730 (average hours per month). Three display states exist for the "Classic Monthly Fee" column:

| Billing Type | Condition | Display |
|---|---|---|
| Monthly | `recurringFee > 0` | `$X.XX` (actual monthly fee) |
| Hourly (with billing) | `hourlyBillingFlag = true`, total hourly fees > 0 | `$X.XX (est.)` with tooltip "Estimated from hourly rate" |
| Hourly (no billing item) | `hourlyBillingFlag = true`, no billing data available | Italic "No billing item" text |

The estimated cost is flagged via `estimatedCost: true` and `noBillingItem: true` fields on transformed rows. These flags propagate through migration analysis (`VSIMigration.isEstimatedCost`, `VSIMigration.noBillingItem`) and are reflected in both the resource data tables and migration compute assessment panel. XLSX export includes a "Cost Basis" column showing "Monthly", "Estimated", or empty for each VSI.

#### 6.1.2 Bare Metal Servers

**API Endpoint:** `SoftLayer_Account/getHardware`

**Object Mask:** `mask[id,hostname,domain,fullyQualifiedDomainName,manufacturerSerialNumber,primaryIpAddress,primaryBackendIpAddress,processorPhysicalCoreAmount,memoryCapacity,hardDrives[capacity,hardwareComponentModel[hardwareGenericComponentModel[hardwareComponentType]]],datacenter,operatingSystem[softwareDescription],networkComponents[primaryIpAddress,port,speed,status,macAddress],billingItem[recurringFee],provisionDate,powerSupplyCount,networkGatewayMemberFlag,networkVlans,tagReferences,notes]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| hostname | String | Server hostname |
| domain | String | Domain name |
| fullyQualifiedDomainName | String | FQDN |
| manufacturerSerialNumber | String | Hardware serial number |
| primaryIpAddress | String | Primary public IP |
| primaryBackendIpAddress | String | Primary private IP |
| processorPhysicalCoreAmount | Integer | Physical CPU cores |
| memoryCapacity | Integer | RAM in GB |
| hardDrives | Array | Physical disk details |
| datacenter.name | String | Datacenter location |
| operatingSystem.softwareDescription | Object | OS details |
| networkComponents | Array | Network interfaces |
| billingItem.recurringFee | Decimal | Monthly cost |
| provisionDate | DateTime | Provisioning timestamp |
| powerSupplyCount | Integer | Number of power supplies |
| networkGatewayMemberFlag | Boolean | Gateway member indicator |
| networkVlans | Array | Associated VLANs |
| tagReferences | Array | User-defined tags |
| notes | String | User notes |

**Worksheet Name:** vBareMetal

### 6.2 Network Resources

#### 6.2.1 VLANs

**API Endpoint:** `SoftLayer_Account/getNetworkVlans`

**Object Mask:** `mask[id,vlanNumber,name,networkSpace,primaryRouter[hostname,datacenter],subnets[id,networkIdentifier,cidr,subnetType,gateway,broadcastAddress,usableIpAddressCount],virtualGuestCount,hardwareCount,firewallInterfaces,networkGateway[id,name]]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| vlanNumber | Integer | VLAN number |
| name | String | VLAN name |
| networkSpace | String | PUBLIC or PRIVATE |
| primaryRouter.hostname | String | Primary router hostname |
| primaryRouter.datacenter.name | String | Datacenter |
| subnets | Array | Associated subnets |
| virtualGuestCount | Integer | Number of VSIs |
| hardwareCount | Integer | Number of bare metal servers |
| firewallInterfaces | Array | Associated firewalls |
| networkGateway | Object | Gateway appliance |

**Worksheet Name:** vVLANs

#### 6.2.2 Subnets

**API Endpoint:** `SoftLayer_Account/getSubnets`

**Object Mask:** `mask[id,networkIdentifier,cidr,subnetType,gateway,broadcastAddress,usableIpAddressCount,totalIpAddresses,ipAddresses[ipAddress,isReserved,note,virtualGuest[hostname],hardware[hostname]],networkVlan[id,vlanNumber,name],datacenter]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| networkIdentifier | String | Network address |
| cidr | Integer | CIDR notation |
| subnetType | String | PRIMARY, SECONDARY, PORTABLE, STATIC, GLOBAL |
| gateway | String | Gateway IP address |
| broadcastAddress | String | Broadcast address |
| usableIpAddressCount | Integer | Number of usable IPs |
| totalIpAddresses | Integer | Total IP addresses |
| ipAddresses | Array | Individual IP allocations |
| networkVlan | Object | Parent VLAN |
| datacenter.name | String | Datacenter |

**Worksheet Name:** vSubnets

#### 6.2.3 Network Gateways

**API Endpoint:** `SoftLayer_Account/getNetworkGateways`

**Object Mask:** `mask[id,name,networkSpace,status,members[hardware[id,hostname,primaryIpAddress,primaryBackendIpAddress,datacenter]],insideVlans[id,vlanNumber,name],publicVlan[id,vlanNumber],privateVlan[id,vlanNumber],publicIpAddress,privateIpAddress]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| name | String | Gateway name |
| networkSpace | String | BOTH, PUBLIC, or PRIVATE |
| status.name | String | Gateway status |
| members | Array | Gateway member servers (HA pair) |
| insideVlans | Array | VLANs behind gateway |
| publicVlan | Object | Public transit VLAN |
| privateVlan | Object | Private transit VLAN |
| publicIpAddress.ipAddress | String | Public IP |
| privateIpAddress.ipAddress | String | Private IP |

**Worksheet Name:** vGateways

#### 6.2.4 Firewalls

**API Endpoint:** `SoftLayer_Account/getNetworkVlanFirewalls`

**Object Mask:** `mask[id,primaryIpAddress,firewallType,networkVlan[id,vlanNumber,name],billingItem[recurringFee],datacenter,rules[orderValue,action,protocol,sourceIpAddress,sourceIpCidr,destinationIpAddress,destinationIpCidr,destinationPortRangeStart,destinationPortRangeEnd]]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| primaryIpAddress | String | Firewall IP address |
| firewallType | String | HARDWARE_FIREWALL, VLAN_FIREWALL |
| networkVlan | Object | Associated VLAN |
| billingItem.recurringFee | Decimal | Monthly cost |
| datacenter.name | String | Datacenter |
| rules | Array | Firewall rules |

**Worksheet Name:** vFirewalls

#### 6.2.5 Security Groups

**API Endpoint:** `SoftLayer_Account/getSecurityGroups`

**Object Mask:** `mask[id,name,description,createDate,modifyDate,rules[id,direction,protocol,portRangeMin,portRangeMax,remoteIp,remoteGroup],networkComponentBindings[networkComponent[guest[hostname],hardware[hostname]]]]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| name | String | Security group name |
| description | String | Description |
| createDate | DateTime | Creation timestamp |
| modifyDate | DateTime | Last modification timestamp |
| rules | Array | Security group rules |
| networkComponentBindings | Array | Bound network interfaces |

**Worksheet Name:** vSecurityGroups

#### 6.2.6 Load Balancers

**API Endpoint:** `SoftLayer_Account/getAdcLoadBalancers`

**Object Mask:** `mask[id,name,ipAddress,loadBalancerType,connectionLimit,virtualServers[id,port,allocation,serviceGroups[services[ipAddress,port,healthCheck]]],healthMonitors,billingItem]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| name | String | Load balancer name |
| ipAddress.ipAddress | String | VIP address |
| loadBalancerType | String | LOCAL or GLOBAL |
| connectionLimit | Integer | Connection limit |
| virtualServers | Array | Virtual server configurations |
| healthMonitors | Array | Health check configurations |
| billingItem.recurringFee | Decimal | Monthly cost |

**Worksheet Name:** vLoadBalancers

### 6.3 Storage Resources

#### 6.3.1 Block Storage

**API Endpoint:** `SoftLayer_Account/getIscsiNetworkStorage`

**Object Mask:** `mask[id,username,capacityGb,iops,storageType,storageTierLevel,serviceResourceBackendIpAddress,lunId,allowedVirtualGuests[id,hostname],allowedHardware[id,hostname],allowedSubnets,snapshotCapacityGb,schedules,replicationPartners[id,username,serviceResourceBackendIpAddress],billingItem[recurringFee],createDate,notes,hasEncryptionAtRest,serviceResource[datacenter[name]],parentVolume[snapshotSizeBytes]]`

**Per-Volume API:** `SoftLayer_Network_Storage/{id}/getSnapshots` — collected in Phase 3 with concurrency limit of 5

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| username | String | Storage volume name |
| capacityGb | Integer | Capacity in GB |
| iops | Integer | IOPS allocation |
| storageType.keyName | String | ENDURANCE or PERFORMANCE |
| storageTierLevel | String | Performance tier (0.25, 2, 4, 10 IOPS/GB) |
| serviceResourceBackendIpAddress | String | Target IP address |
| lunId | String | LUN identifier |
| allowedVirtualGuests | Array | Authorized VSIs |
| allowedHardware | Array | Authorized bare metal |
| allowedSubnets | Array | Authorized subnets |
| snapshotCapacityGb | Integer | Snapshot space allocation |
| schedules | Array | Snapshot schedules |
| replicationPartners | Array | Replication targets |
| billingItem.recurringFee | Decimal | Monthly cost |
| createDate | DateTime | Creation timestamp |
| notes | String | User notes |
| hasEncryptionAtRest | Boolean | Encryption at rest status |
| serviceResource.datacenter.name | String | Datacenter location |
| parentVolume.snapshotSizeBytes | Integer | Actual snapshot bytes used |
| snapshots | Array | Per-volume snapshot list (collected in Phase 3) |

**Worksheet Name:** vBlockStorage

#### 6.3.2 File Storage

**API Endpoint:** `SoftLayer_Account/getNasNetworkStorage`

**Object Mask:** `mask[id,username,capacityGb,iops,storageType,storageTierLevel,serviceResourceBackendIpAddress,fileNetworkMountAddress,allowedVirtualGuests[id,hostname],allowedHardware[id,hostname],allowedSubnets,snapshotCapacityGb,schedules,replicationPartners[id,username,serviceResourceBackendIpAddress],billingItem[recurringFee],createDate,notes,bytesUsed,hasEncryptionAtRest,serviceResource[datacenter[name]],parentVolume[snapshotSizeBytes]]`

**Per-Volume API:** `SoftLayer_Network_Storage/{id}/getSnapshots` — collected in Phase 3 with concurrency limit of 5

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| username | String | Storage volume name |
| capacityGb | Integer | Capacity in GB |
| iops | Integer | IOPS allocation |
| storageType.keyName | String | ENDURANCE or PERFORMANCE |
| storageTierLevel | String | Performance tier |
| serviceResourceBackendIpAddress | String | Target IP address |
| fileNetworkMountAddress | String | NFS mount path |
| allowedVirtualGuests | Array | Authorized VSIs |
| allowedHardware | Array | Authorized bare metal |
| allowedSubnets | Array | Authorized subnets |
| snapshotCapacityGb | Integer | Snapshot space allocation |
| schedules | Array | Snapshot schedules |
| replicationPartners | Array | Replication targets (id, username, IP) |
| billingItem.recurringFee | Decimal | Monthly cost |
| createDate | DateTime | Creation timestamp |
| notes | String | User notes |
| bytesUsed | Integer | Current NFS usage in bytes |
| hasEncryptionAtRest | Boolean | Encryption at rest status |
| serviceResource.datacenter.name | String | Datacenter location |
| parentVolume.snapshotSizeBytes | Integer | Actual snapshot bytes used |
| snapshots | Array | Per-volume snapshot list (collected in Phase 3) |

**Worksheet Name:** vFileStorage

#### 6.3.3 Object Storage

**API Endpoint:** `SoftLayer_Account/getHubNetworkStorage`

**Object Mask:** `mask[id,username,storageType,capacityGb,bytesUsed,billingItem[recurringFee],createDate]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| username | String | Account name |
| storageType.keyName | String | Object storage type |
| capacityGb | Integer | Provisioned capacity |
| bytesUsed | Integer | Current usage |
| billingItem.recurringFee | Decimal | Monthly cost |
| createDate | DateTime | Creation timestamp |

**Worksheet Name:** vObjectStorage

### 6.4 Security Resources

#### 6.4.1 SSL Certificates

**API Endpoint:** `SoftLayer_Account/getSecurityCertificates`

**Object Mask:** `mask[id,commonName,organizationName,validityBegin,validityDays,validityEnd,createDate,modifyDate,notes]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| commonName | String | Certificate CN |
| organizationName | String | Organization |
| validityBegin | DateTime | Valid from date |
| validityDays | Integer | Validity period |
| validityEnd | DateTime | Expiration date |
| createDate | DateTime | Upload timestamp |
| notes | String | User notes |

**Worksheet Name:** vSSLCertificates

#### 6.4.2 SSH Keys

**API Endpoint:** `SoftLayer_Account/getSshKeys`

**Object Mask:** `mask[id,label,fingerprint,createDate,modifyDate,notes]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| label | String | Key label/name |
| fingerprint | String | Key fingerprint |
| createDate | DateTime | Creation timestamp |
| modifyDate | DateTime | Last modification |
| notes | String | User notes |

**Worksheet Name:** vSSHKeys

### 6.5 DNS Resources

#### 6.5.1 DNS Domains

**API Endpoint:** `SoftLayer_Account/getDomains`

**Object Mask:** `mask[id,name,serial,updateDate,resourceRecordCount,resourceRecords[id,host,type,data,ttl,priority]]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| name | String | Domain name |
| serial | Integer | SOA serial |
| updateDate | DateTime | Last modification |
| resourceRecordCount | Integer | Number of records |
| resourceRecords | Array | DNS records (A, CNAME, MX, TXT, etc.) |

**Worksheet Name:** vDNSDomains

#### 6.5.2 DNS Records

Derived from DNS Domains, flattened for easier analysis.

| Field | Type | Description |
|-------|------|-------------|
| domainId | Integer | Parent domain ID |
| domainName | String | Parent domain name |
| id | Integer | Record ID |
| host | String | Record host |
| type | String | Record type (A, CNAME, MX, etc.) |
| data | String | Record data |
| ttl | Integer | Time to live |
| priority | Integer | MX priority |

**Worksheet Name:** vDNSRecords

### 6.6 Images & Templates

#### 6.6.1 Image Templates

**API Endpoint:** `SoftLayer_Account/getBlockDeviceTemplateGroups`

**Object Mask:** `mask[id,name,note,createDate,status,datacenter,children[blockDevices[diskImage[capacity,units,softwareReferences[softwareDescription]]]],globalIdentifier,parentId]`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| globalIdentifier | String | Global UUID |
| name | String | Template name |
| note | String | Description |
| createDate | DateTime | Creation timestamp |
| status.name | String | Status |
| datacenter.name | String | Location (null if global) |
| parentId | Integer | Parent template ID |
| children | Array | Child images (flex images) |

**Worksheet Name:** vImages

### 6.7 Additional Resources

#### 6.7.1 Placement Groups

**API Endpoint:** `SoftLayer_Account/getPlacementGroups`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| name | String | Group name |
| createDate | DateTime | Creation timestamp |
| rule.name | String | Placement rule |
| backendRouter.hostname | String | Backend router |
| guestCount | Integer | Number of guests |

**Worksheet Name:** vPlacementGroups

#### 6.7.2 Reserved Capacity

**API Endpoint:** `SoftLayer_Account/getReservedCapacityGroups`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| name | String | Group name |
| createDate | DateTime | Creation timestamp |
| backendRouter.hostname | String | Backend router |
| instancesCount | Integer | Reserved instances |
| availableInstancesCount | Integer | Available slots |

**Worksheet Name:** vReservedCapacity

#### 6.7.3 Dedicated Hosts

**API Endpoint:** `SoftLayer_Account/getDedicatedHosts`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| name | String | Host name |
| createDate | DateTime | Creation timestamp |
| datacenter.name | String | Datacenter |
| cpuCount | Integer | CPU cores |
| memoryCapacity | Integer | RAM in GB |
| diskCapacity | Integer | Disk in GB |
| guestCount | Integer | Hosted guests |

**Worksheet Name:** vDedicatedHosts

#### 6.7.4 IPsec VPN Tunnels

**API Endpoint:** `SoftLayer_Account/getNetworkTunnelContexts`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| name | String | Tunnel name |
| customerPeerIpAddress | String | Remote peer IP |
| internalPeerIpAddress | String | Local peer IP |
| phaseOneAuthentication | String | Phase 1 auth |
| phaseOneEncryption | String | Phase 1 encryption |
| phaseTwoAuthentication | String | Phase 2 auth |
| phaseTwoEncryption | String | Phase 2 encryption |
| addressTranslations | Array | NAT configurations |
| customerSubnets | Array | Remote subnets |
| internalSubnets | Array | Local subnets |

**Worksheet Name:** vVPNTunnels

#### 6.7.5 Billing Items

**API Endpoint:** `SoftLayer_Account/getAllBillingItems`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| description | String | Item description |
| categoryCode | String | Category |
| recurringFee | Decimal | Monthly fee |
| setupFee | Decimal | One-time fee |
| createDate | DateTime | Start date |
| cancellationDate | DateTime | End date (if cancelled) |
| resourceTableId | Integer | Associated resource ID |
| hostName | String | Associated hostname |
| domainName | String | Associated domain |

**Worksheet Name:** vBilling

#### 6.7.6 Users

**API Endpoint:** `SoftLayer_Account/getUsers`

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique identifier |
| username | String | Username |
| email | String | Email address |
| firstName | String | First name |
| lastName | String | Last name |
| createDate | DateTime | Account creation |
| statusDate | DateTime | Status change date |
| userStatus.name | String | Account status |
| roles | Array | Assigned roles |
| permissions | Array | Assigned permissions |

**Worksheet Name:** vUsers

#### 6.7.7 Event Log

**API Endpoint:** `SoftLayer_Event_Log/getAllObjects`

| Field | Type | Description |
|-------|------|-------------|
| eventName | String | Event type |
| eventCreateDate | DateTime | Event timestamp |
| userType | String | User type |
| userId | Integer | User ID |
| username | String | Username |
| objectName | String | Affected object |
| objectId | Integer | Object ID |
| traceId | String | Trace identifier |
| metaData | String | Additional data |

**Worksheet Name:** vEventLog

### 6.8 Relationship Mapping

The tool will automatically resolve and display relationships between resources:

| Parent Resource | Child Resource | Relationship Field |
|-----------------|----------------|-------------------|
| VLAN | Virtual Server | networkVlans |
| VLAN | Bare Metal | networkVlans |
| VLAN | Subnet | networkVlan |
| VLAN | Firewall | networkVlan |
| Network Gateway | VLAN | insideVlans |
| Block Storage | Virtual Server | allowedVirtualGuests |
| Block Storage | Bare Metal | allowedHardware |
| File Storage | Virtual Server | allowedVirtualGuests |
| File Storage | Bare Metal | allowedHardware |
| Security Group | Virtual Server | networkComponentBindings |
| Placement Group | Virtual Server | placementGroupId |
| Dedicated Host | Virtual Server | dedicatedHost |
| Image Template | Virtual Server | blockDeviceTemplateGroup |

---

## 7. UI/UX Specifications

### 7.1 Design System

The application will be built using the **IBM Carbon Design System (v11)**, ensuring a professional, consistent, and accessible user interface that aligns with IBM brand standards.

#### 7.1.1 Core Components

- **@carbon/react** - React component library
- **@carbon/icons-react** - Icon library
- **@carbon/charts-react** - Data visualization (Phase 2)
- **IBM Plex** - Typography (Sans, Mono)

#### 7.1.2 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| $interactive-01 | #0f62fe | Primary actions, links |
| $ui-background | #f4f4f4 | Page background |
| $ui-01 | #ffffff | Container background |
| $ui-02 | #f4f4f4 | Secondary background |
| $text-01 | #161616 | Primary text |
| $text-02 | #525252 | Secondary text |
| $text-03 | #a8a8a8 | Placeholder text |
| $support-success | #24a148 | Success states |
| $support-error | #da1e28 | Error states |
| $support-warning | #f1c21b | Warning states |
| $support-info | #0043ce | Informational states |

#### 7.1.3 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 | IBM Plex Sans | 32px | Semibold |
| H2 | IBM Plex Sans | 24px | Semibold |
| H3 | IBM Plex Sans | 20px | Semibold |
| Body | IBM Plex Sans | 14px | Regular |
| Code | IBM Plex Mono | 14px | Regular |
| Table | IBM Plex Sans | 14px | Regular |

#### 7.1.4 Theming

The application supports light and dark modes using Carbon Design System's built-in theme tokens.

| Mode | Carbon Theme | Description |
|------|-------------|-------------|
| Light (default) | White | Default light theme with white backgrounds |
| Dark | g100 | Full dark theme with near-black backgrounds |

**Note:** Carbon provides four themes (White, g10, g90, g100). This application uses White and g100 as they provide the highest contrast between light and dark modes.

**Behaviour:**
- On first visit, the application respects the user's OS preference via the `prefers-color-scheme` CSS media query
- The user can override this via the theme toggle button (sun/moon icon) in the header
- The preference is persisted in `localStorage` (this is safe — it is a UI preference, not sensitive data)
- All Carbon components automatically adapt to the selected theme via CSS custom properties
- The favicon uses the official IBM Cloud icon (`public/favicon.png`)

### 7.2 Page Layouts

#### 7.2.1 Landing Page / API Key Entry

**Purpose:** Secure entry point for API key authentication

**Components:**
- Carbon Header with IBM Cloud branding and product name
- Centered content tile (max-width: 600px)
- Product logo and description text
- TextInput (password type) for API key entry with visibility toggle
- Primary Button "Connect"
- InlineNotification for validation errors
- "Get Started" link navigating to `/docs` (Documentation Hub)
- Footer with version number

**Wireframe Description:**
```
┌──────────────────────────────────────────────────────────────┐
│ IBM Cloud │ Classic Explorer          [🌙] [?] [ℹ]           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌────────────────────┐                    │
│                    │   [Product Logo]   │                    │
│                    │                    │                    │
│                    │  Enter your IBM    │                    │
│                    │  Cloud API Key     │                    │
│                    │                    │                    │
│                    │ ┌────────────────┐ │                    │
│                    │ │ ************** │ │                    │
│                    │ └────────────────┘ │                    │
│                    │                    │                    │
│                    │  [ Connect ]       │                    │
│                    │                    │                    │
│                    │  [ Import XLSX ]   │                    │
│                    │                    │                    │
│                    │  How to get an     │                    │
│                    │  API key →         │                    │
│                    └────────────────────┘                    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Version 1.0.0                                                │
└──────────────────────────────────────────────────────────────┘
```

The "Import XLSX" button is a secondary/ghost button below "Connect", allowing users to load a previously exported XLSX file without entering an API key. On successful import, the user is navigated directly to the dashboard with imported data populated.

#### 7.2.2 Summary Dashboard

**Purpose:** Overview of collected data with navigation to detailed views

**Components:**
- UI Shell with left navigation panel (SideNav)
- Account information header tile
- Resource count summary cards in 4-column grid
- "Collect Data" primary button with loading state
- Progress indicator with detailed status during collection
- "Export All" button (enabled after collection)
- Last collection timestamp
- Error/warning notification area

**Wireframe Description:**
```
┌──────────────────────────────────────────────────────────────┐
│ IBM Cloud │ Classic Explorer    [🌙] [?] [ℹ] [Account ▼]    │
├─────────┬────────────────────────────────────────────────────┤
│         │  Account: IBM Demo Account (123456)                │
│ Summary │  Owner: admin@ibm.com                              │
│         │                                                    │
│ Compute │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  - VSIs │  │ VSIs    │ │ Bare    │ │ VLANs   │ │ Subnets │  │
│  - Bare │  │   45    │ │ Metal   │ │   12    │ │   24    │  │
│    Metal│  │         │ │   8     │ │         │ │         │  │
│         │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│ Network │                                                    │
│  - VLANs│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  - Sub- │  │ Block   │ │ File    │ │ Fire-   │ │ Load    │  │
│    nets │  │ Storage │ │ Storage │ │ walls   │ │ Balanc. │  │
│  - Gate-│  │   15    │ │   8     │ │   4     │ │   2     │  │
│    ways │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│         │                                                    │
│ Storage │  [ Collect Data ]    [ Export All ]                │
│  - Block│                                                    │
│  - File │  Last collected: 2025-01-28 14:32:15 UTC           │
│  - Obj. │                                                    │
│         │  ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░ 45%               │
│ Security│  Collecting Virtual Servers... 45/120              │
│         │                                                    │
└─────────┴────────────────────────────────────────────────────┘
```

#### 7.2.3 Resource Data Table

**Purpose:** Detailed view of individual resource types with full table functionality

**Components:**
- UI Shell with left navigation (current item highlighted)
- Breadcrumb navigation
- Table toolbar with:
  - Global search input
  - Column visibility dropdown
  - Export button (current table)
  - Refresh button
- DataTable with:
  - Sortable column headers
  - Column filters (expandable)
  - Virtualized scrolling
  - Row selection checkboxes
  - Column resize handles
- Pagination controls (optional, virtualized scrolling preferred)
- Row count indicator

**Wireframe Description:**
```
┌──────────────────────────────────────────────────────────────┐
│ IBM Cloud │ Classic Explorer    [🌙] [?] [ℹ] [Account ▼]    │
├─────────┬────────────────────────────────────────────────────┤
│         │ Summary > Compute > Virtual Servers                │
│ Summary │                                                    │
│         │ ┌──────────────────────────────────────────────┐  │
│ Compute │ │ [Search...]     [Columns ▼] [Export] [⟳]   │  │
│ ▸ VSIs  │ └──────────────────────────────────────────────┘  │
│  - Bare │                                                    │
│    Metal│ ┌──┬────────────┬───────────┬──────┬──────┬─────┐ │
│         │ │☐ │ Hostname ▼ │ IP Address│ vCPU │ RAM  │ DC  │ │
│ Network │ ├──┼────────────┼───────────┼──────┼──────┼─────┤ │
│  - VLANs│ │☐ │ web-prod-1 │ 10.1.1.5  │  4   │ 8GB  │ dal13│ │
│  - Sub- │ │☐ │ web-prod-2 │ 10.1.1.6  │  4   │ 8GB  │ dal13│ │
│    nets │ │☐ │ db-prod-1  │ 10.1.2.10 │  8   │ 32GB │ dal13│ │
│  - Gate-│ │☐ │ app-dev-1  │ 10.2.1.5  │  2   │ 4GB  │ wdc07│ │
│    ways │ │☐ │ app-dev-2  │ 10.2.1.6  │  2   │ 4GB  │ wdc07│ │
│         │ │  │    ...     │    ...    │  ... │  ... │ ... │ │
│ Storage │ └──┴────────────┴───────────┴──────┴──────┴─────┘ │
│  - Block│                                                    │
│  - File │ Showing 45 items                                   │
│         │                                                    │
└─────────┴────────────────────────────────────────────────────┘
```

#### 7.2.4 About Dialog

**Purpose:** Display application information, credits, and links

**Components:**
- Carbon `ComposedModal` (dismissible via close button or clicking outside)
- Product name and IBM Cloud logo
- Version number (dynamically read from `package.json`)
- Author: **Neil Taylor**
- Built with: **Claude Code** (with link to https://claude.ai/code)
- Licence: **MIT** (with link to licence file in repository)
- Links section: GitHub repository, IBM Cloud documentation
- Close button

**Wireframe Description:**
```
┌──────────────────────────────────────┐
│  About Classic Explorer          [✕] │
├──────────────────────────────────────┤
│                                      │
│         [IBM Cloud Logo]             │
│                                      │
│   Infrastructure Explorer    │
│   Version 1.0.0                      │
│                                      │
│   Author: Neil Taylor                │
│   Built with: Claude Code 🔗         │
│                                      │
│   Licence: MIT 🔗                    │
│                                      │
│   ─────────────────────────          │
│   GitHub Repository 🔗               │
│   IBM Cloud Docs 🔗                  │
│                                      │
├──────────────────────────────────────┤
│                           [ Close ]  │
└──────────────────────────────────────┘
```

#### 7.2.5 Documentation Hub

**Purpose:** Comprehensive multi-section documentation hub accessible to all users (authenticated and unauthenticated). Merges the former Help Page and Documentation Page into a single hub with left-side secondary navigation.

**Route:** `/docs` — public route. Shows main SideNav when authenticated, standalone layout when not. `/help` redirects to `/docs`.

**Architecture:**
```
DocsHub (layout: left nav + right content, activeSection state)
  ├─ DocsNav (left secondary nav, collapsible groups, active highlighting)
  └─ DocsContent area
       └─ One of 12 section components rendered based on activeSection
```

State-based content switching (no nested routes). URL stays `/docs`. Scroll-to-top on section change.

**Components:**
- `DocsHub.tsx` — Layout wrapper with `activeSection` state and `renderSection()` switch
- `DocsNav.tsx` — Left navigation with collapsible groups, active item left-border highlight matching Carbon SideNav patterns
- `docsStyles.ts` — Shared TypeScript style constants (extracted from former inline styles)
- `docs.scss` — Hub layout styles with BEM naming, responsive breakpoints
- 12 section components in `sections/` directory

**Navigation Structure:**
```
Getting Started          (standalone)
─── Infrastructure ───   (collapsible group)
  Classic Infrastructure
  VPC Infrastructure
─── Features ───         (collapsible group)
  Data Tables
  Visualizations
  Migration Analysis
  AI Features
  Import & Export
  Settings
─── Reference ───        (collapsible group)
  Security & Privacy
  Resource Reference
  Troubleshooting
```

Groups are expanded by default, collapsible via group header buttons. Active section gets a left-border highlight. Below 672px, the left nav collapses to a horizontal scrollable bar.

**Sections:**

1. **Getting Started** — Overview, quick start, API key creation (full CLI guide with Service ID, IAM policies, verification commands), importing data (offline mode)
2. **Classic Infrastructure** — Classic dashboard, two-phase collection (shallow scan + deep scan), resource categories, 13 parent-child relationship mappings
3. **VPC Infrastructure** — VPC dashboard, multi-region collection, Transit Gateways (global endpoint), Direct Link gateways/virtual connections, VPN gateway connections, 24 resource types, regional `_region` field
4. **Data Tables** — Sorting, global search, column filtering, column visibility/resizing, row selection/expansion, pagination, virtualization, advanced filtering, toolbar actions
5. **Visualizations** — Topology diagrams (Classic + VPC), Geography maps, Cost Analysis (treemap, donut/bar charts, cost data sources)
6. **Migration Analysis** — 9 assessment tabs, readiness scoring (43 checks, 5 dimensions), migration waves, Terraform export, DOCX reports, IBM migration resource links (Virtualization Solutions Guide, RackWare, Wanclouds, open-source tools)
7. **AI Features** — Chat assistant (context-aware), migration insights (executive summary, risks, recommendations), cost optimization (narrative, savings), report narratives. Requires AI proxy configuration.
8. **Import & Export** — XLSX export (3 modes), XLSX import, unified DOCX report (with branding, TOC, pie charts, headers/footers), draw.io topology export, Terraform HCL export
9. **Settings** — AI configuration (enable/disable, test connection), report branding (client/company/author), theme toggle
10. **Security & Privacy** — API key in memory only, per-request X-API-Key header, no server sessions, 60-minute timeout, log sanitization, security headers (Helmet), data privacy (read-only, client-side exports)
11. **Resource Reference** — All 27+ Classic types and 24 VPC types in categorised tables with worksheet names and descriptions
12. **Troubleshooting** — Common issues table (issue/cause/solution), diagnostic steps (browser console, API key verification, network issues)

**Discoverability:**
- SideNav: "Documentation" link after VPC categories section (with `SideNavDivider`)
- Login page: "Get Started" link navigating to `/docs`
- Header: Help icon navigates to `/docs`
- `/help` route redirects to `/docs`

**Wireframe Description:**
```
┌──────────────────────────────────────────────────────────────┐
│ IBM Cloud │ Infrastructure Explorer  [🌙] [💬] [⚙] [?] [ℹ]  │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ Getting      │  Getting Started                              │
│  Started     │  ════════════════                             │
│              │                                               │
│ ▾ Infra      │  Set up access and start exploring your       │
│  Classic     │  IBM Cloud infrastructure                     │
│  VPC         │                                               │
│              │  Overview                                     │
│ ▾ Features   │  ────────                                     │
│  Data Tables │  The IBM Cloud Infrastructure Explorer is a   │
│  Visuals     │  web-based inventory and analysis tool for    │
│  Migration   │  IBM Cloud Classic and VPC infrastructure...  │
│  AI Features │                                               │
│  Import/Exp  │  Quick Start                                  │
│  Settings    │  ───────────                                  │
│              │  1. Obtain an IBM Cloud API key               │
│ ▾ Reference  │  2. Enter your API key and click Connect      │
│  Security    │  3. Click Collect Data                        │
│  Resources   │  4. Browse resources via sidebar              │
│  Trouble-    │                                               │
│  shooting    │  Creating an API Key                          │
│              │  ────────────────────                         │
│              │  ...                                          │
└──────────────┴───────────────────────────────────────────────┘
```

#### 7.2.7 Imported Data Indicator

When viewing data imported from an XLSX file (rather than collected live from the API), the dashboard displays an indicator banner:

```
┌──────────────────────────────────────────────────────────────┐
│ ℹ Viewing imported data from "IBMClassic_Export_2025-01-28   │
│   _DemoAccount.xlsx" — imported Jan 29, 2025                 │
│                                        [ Clear & Return ]    │
└──────────────────────────────────────────────────────────────┘
```

- Uses a Carbon `InlineNotification` (kind: "info")
- Shows the filename and import timestamp
- "Clear & Return" button clears the imported data and navigates back to the landing page
- The indicator appears on the dashboard and all resource table views

### 7.3 Component Specifications

#### 7.3.1 Progress Indicator

**During Data Collection:**
- Linear progress bar showing overall completion percentage
- Text status showing current resource type and count
- Animated loading icon
- Cancel button

**States:**
- Idle: No progress shown
- Collecting: Progress bar + status text
- Completed: Success notification with summary
- Partial: Warning notification listing failed resources
- Error: Error notification with retry option

#### 7.3.2 Data Table

**Features:**
- Carbon DataTable component as base
- react-window for virtualized scrolling (1000+ rows)
- Column resize via react-resizable
- Multi-column sort support
- Filter row with type-appropriate controls:
  - Text: Search input with debounce
  - Enum: Multi-select dropdown
  - Number: Range inputs (min/max)
  - Date: Date range picker
  - Boolean: Checkbox
- Row selection with shift-click range select
- Column visibility persistence (session storage)

#### 7.3.3 Export Dialog

**Options:**
- Export scope: All data / Current table / Selected rows
- Include filters: Yes / No
- Open after download: Yes / No

### 7.4 Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Large | ≥1312px | Full layout with expanded side nav |
| Medium | 672-1311px | Collapsed side nav (icons only) |
| Small | <672px | Hidden side nav (hamburger menu) |

**Note:** Primary use case is desktop; mobile support is secondary priority.

### 7.5 Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Screen reader support via ARIA attributes
- Sufficient color contrast ratios
- Focus indicators on interactive elements
- Skip navigation link

### 7.6 Visual Enhancements

Detailed visual design specifications are maintained in [`VISUAL.md`](./VISUAL.md). This section summarises the Priority 1 features implemented in the current release.

#### 7.6.1 Priority 1 Features (Implemented)

**Animated Metric Cards**
- Resource count cards use spring-physics animation (`@react-spring/web`) to count up from 0 on first render
- Cards include hover micro-interaction: `translateY(-4px) scale(1.02)` elevation with blue border accent
- Skeleton shimmer loading state when data has not yet been collected
- Sub-metric text showing top 2 datacenter distributions (e.g. "12 dal13 | 8 wdc07")

**Donut Distribution Charts**
- Three `DonutChart` components (`@carbon/charts-react`) displayed after data collection:
  - OS Distribution — groups VSIs + bare metal by operating system
  - Datacenter Distribution — all compute resources by datacenter
  - CPU Distribution — VSIs by vCPU bucket (2, 4, 8, 16+)
- Centre label shows total server count
- Legend positioned at bottom

**Multi-Phase Progress Stepper**
- Five-step visual stepper: Authenticating → Shallow Scan → Deep Scan → Relationships → Complete
- Step node icons: `CheckmarkFilled` (completed), `InProgress` with spin animation (active), `CircleDash` (pending), `ErrorFilled` (error)
- Connector lines between steps coloured blue (complete) or gray (pending)
- Current phase name, resource-level progress bar, elapsed time, and ETA displayed below stepper

**Skeleton Loading**
- Shimmer animation using CSS `linear-gradient` with `--cds-skeleton-background` / `--cds-skeleton-element` tokens
- Applied to metric cards before data is available, matching card layout dimensions

**Micro-Interactions**
- Card hover: elevation + blue border (`--cds-link-primary`)
- Primary button hover: `translateY(-1px)` lift
- Datacenter concentration indicator: shows "spread across N DCs" or "1 DC" per resource card (no historical trending — single point-in-time collection)

#### 7.6.2 Priority 2/3 Features (Implemented)

**Infrastructure Topology Diagram (`@xyflow/react`)**
- Interactive node graph with 12 custom node types: Internet, Gateway, VLAN, Firewall, VSI, Bare Metal, Storage, Transit Gateway, TGW Connection, VPN Gateway, Direct Link, Private Network Bus (Cloud Services)
- Pan, zoom, minimap, and datacenter filter dropdown
- Status indicator dots (green=running, yellow=provisioning, red=error, gray=stopped)
- Edge styles: solid red (public network), solid blue (private network), dotted blue (storage), solid red (firewall), teal (VPN gateway connections), purple (transit gateway connections), orange (direct link connections)
- Network colour convention: public network lines are red (`#da1e28`), private network lines are blue (`#0f62fe`)
- Transit Gateway nodes display connection count and routing scope badge (green "Global" or gray "Local")
- **TGW Connection Nodes** — each Transit Gateway connection (VPC, GRE tunnel, Classic, Direct Link, Power VS) renders as a separate node in a hub-spoke layout below the parent TGW:
  - Carbon icons for connection types: `VirtualPrivateCloud` (VPC), `ConnectionTwoWay` (GRE tunnels), `Cube` (Classic), `DirectLink`, `Flash` (Power VS)
  - Color-coded left border and type badge: VPC blue (`#0f62fe`), GRE teal (`#009d9a`), Classic gray (`#525252`), Direct Link orange (`#ff832b`), Power VS magenta (`#9f1853`)
  - Status dot and attachment status display
  - Account ownership badge (blue "Own" or purple "Cross" for cross-account connections)
  - Route prefix count summary; click to expand/collapse inline prefix list (up to 12 prefixes shown)
  - Double-click opens a slide-in detail panel (`ConnectionDetailPanel`) showing full connection info, searchable prefix list, and connection ID
  - Supports `redundant_gre` and `redundant_gre_tunnel` types; route reports map individual tunnel routes back to parent connection via tunnel-to-parent ID mapping
- VPN Gateway nodes (teal) appear below their parent Transit Gateway, showing name, mode (route/policy), connected VPC name, and region
- Direct Link nodes (orange) appear below their parent Transit Gateway or connected to the private network backbone
- Accessible via `/topology` route and side navigation

**Routes Page (Known Subnets)**
- Aggregated table showing all subnets known to or reachable from the account
- Data sources: Own VPC subnets, Own Classic subnets, TGW route prefixes, Direct Link virtual connections, VPN peer CIDRs
- Columns: CIDR, Source Type (color-coded tags), Name, Reachability, Region, VPC/VLAN, Transit Gateway
- Filtering by source type (All, Own VPC, Own Classic, TGW, Direct Link, VPN) and free-text search
- Pagination with configurable page sizes (10, 25, 50, 100)
- Accessible via `/routes` route under Classic > Network menu in side navigation

**Cost Analysis Dashboard (`d3-hierarchy`, `d3-scale`, `@carbon/charts-react`)**
- Donut chart: monthly cost by resource type
- Stacked bar chart: cost by datacenter (Compute / Storage / Network breakdown)
- D3 treemap: hierarchical cost breakdown with category groupings and hover tooltips
- Accessible via `/costs` route and side navigation

**Geographic Datacenter Map (`react-simple-maps`)**
- World map with zoomable/pannable projection
- Bubble markers sized by server count at each datacenter (50+ IBM DC coordinates)
- Click-to-select detail panel showing server count, monthly cost, and per-resource breakdown
- Summary list sorted by server count
- Accessible via `/geography` route and side navigation

**Additional Dashboard Charts**
- Stacked bar chart: servers by datacenter and type (VSI vs Bare Metal)
- Gauge charts: aggregate vCPU utilisation, memory capacity, storage capacity

#### 7.6.3 High-Impact Enhancement Features

**Expandable Row Details**

Every data table row includes a chevron icon in the first column. Clicking the chevron expands an inline detail panel below the row, showing:

- **Key fields** — A comprehensive set of fields for the resource type, ordered logically (identity → network → specs → storage → OS → location → dates/cost → network detail → metadata). Virtual Servers show: id, hostname, domain, fqdn, primaryIp, backendIp, status, powerState, startCpus, maxCpu, maxMemory, diskGb, localDisk, os, datacenter, hourlyBilling, dedicated, privateNetworkOnly, placementGroupId, createDate, modifyDate, recurringFee, networkVlans, tags, notes. Bare Metal shows: id, hostname, domain, fqdn, serialNumber, primaryIp, backendIp, cores, memory, hardDrives, os, datacenter, provisionDate, recurringFee, powerSupplyCount, gatewayMember, networkComponents, networkVlans, tags, notes. Other resource types have their own curated lists; types without a curated list display all available columns. Values are formatted using the same formatters as the table cells.
- **Related resources** — Calls `getRelatedResources()` from `src/utils/relationships.ts` to find parent and child resources linked via `RELATIONSHIP_DEFINITIONS`. On-the-fly computation is tried first (matching join fields across resource types). For imported data where join fields may be missing (e.g., `primaryNetworkComponent.networkVlan.id` is not exported as a column), the function falls back to the imported `vRelationships` worksheet data, matching by resource type display name and row ID. Results are deduplicated so relationships found by both methods appear only once. Related items are displayed as Carbon `Tag` components grouped by relationship label (blue for children, purple for parents).

Behaviour:
- Only one row may be expanded at a time — expanding a different row closes the previous one
- Clicking the chevron does not trigger row selection (uses `stopPropagation`)
- Expanded row resets on page change
- The detail panel has a `var(--cds-layer-accent)` background and `4px solid var(--cds-link-primary)` left border accent

**Topology Layer Filtering**

A "Layers" filter button (using the Carbon `Filter` icon) appears next to the datacenter dropdown in the topology toolbar. Clicking it opens a popover with checkboxes for six toggleable node categories:

| Layer | Node Types |
|-------|-----------|
| Virtual Servers | VSI nodes |
| Bare Metal | Bare Metal nodes |
| Gateways | Gateway nodes |
| Firewalls | Firewall nodes |
| Storage | Storage nodes |
| Subnets | Subnet nodes |
| Transit Gateways | Transit Gateway nodes, TGW Connection nodes, VPN Gateway child nodes |
| Direct Links | Direct Link nodes |

Backbone infrastructure (Internet, FCR, BCR, VLANs, Private Network Bus) is always visible regardless of layer toggles. When a layer is hidden, both the nodes and their connected edges are removed from the diagram. The `useTopologyData` hook accepts an optional `visibleLayers` parameter to perform server-side filtering before node/edge construction.

**Dagre Automatic Layout**

A layout mode dropdown ("Hierarchical (Auto)" / "Manual (Fixed)") appears in the topology toolbar. The default is "Hierarchical (Auto)" which uses the dagre directed acyclic graph layout algorithm to automatically position nodes in a top-down hierarchy:

- Internet at the top, flowing down through FCR routers, gateways, public VLANs, compute nodes, private VLANs, BCR routers, storage, private network bus, transit gateways, VPN gateways, and direct links at the bottom
- Configuration: `rankdir: 'TB'`, `ranksep: 130`, `nodesep: 50`
- Node dimensions are estimated per node type for optimal spacing
- The layout is implemented in `src/hooks/useDagreLayout.ts` using the `dagre` library
- `fitView()` is called after each layout recalculation
- "Manual (Fixed)" reverts to the original Y-constant positioning from `useTopologyData`

**Topology View Switcher**

The `/topology` page uses a Carbon `ContentSwitcher` at the top to toggle between two views: "Infrastructure" (existing diagram) and "Subnets" (new subnet-centric diagram). Each view is rendered inside its own `ReactFlowProvider` and conditionally mounted based on the active switch index.

**VLAN Node Inline Subnets**

VLAN nodes in the Infrastructure topology display subnet information directly within the node card instead of using an expand/collapse mechanism. Each VLAN node shows:
- Total subnet count (e.g. "3 subnets")
- A list of CIDR notations in monospace font (e.g. `10.0.0.0/24`, `10.0.1.0/28`)

The `subnetCidrs` string array is computed by `useTopologyData` from the `subnets` collection keyed by VLAN number.

**Subnet Topology Diagram**

The "Subnets" view provides a subnet-centric network topology.

Layout (top to bottom):
- **Internet** — single node at top
- **FCR** (Frontend Customer Router) — one per datacenter, red accent
- **Public Subnets** — detailed cards showing network/CIDR, gateway IP, subnet type badge, usable IP count, VLAN number, datacenter; red borders
- **Routing Devices** — Gateway appliances and dual-NIC compute devices (VSIs and bare metal with both public and private IPs) shown as bridging nodes
- **Private Subnets** — same detail cards as public, blue borders
- **BCR** (Backend Customer Router) — one per datacenter, blue accent
- **IBM Cloud Private Network** — wide horizontal bus bar node (blue background, `#0f62fe`); all BCRs connect down to this node with animated blue edges. Serves as the backbone connecting Classic infrastructure to Transit Gateways and Direct Links
- **Transit Gateways** — connected below the Private Network bus bar; display connection count and routing scope badge
- **TGW Connection Nodes** — separate nodes for each connection (VPC, GRE tunnel, Classic, Direct Link, Power VS) arranged in hub-spoke layout below parent TGW; click to expand route prefixes, double-click to open detail panel
- **VPN Gateways** — teal-colored child nodes below their parent Transit Gateway, showing name, mode, connected VPC name, and region
- **Direct Links** — orange-colored nodes connected to their parent Transit Gateway or to the Private Network bus bar

Edge coloring: red for public network paths (Internet → FCR → public subnets → routing devices), blue for private network paths (routing devices → private subnets → BCR → IBM Cloud Private Network), purple for transit gateway connections, teal for VPN gateway connections, orange for direct link connections.

New components:
- `SubnetDetailNode` — rich subnet card with network/CIDR, gateway, type badge, IP count, VLAN, datacenter; border color reflects network space (red = public, blue = private)
- `DualNicDeviceNode` — routing device card showing hostname, public IP (red text), private IP (blue text), device type badge (Gateway Appliance, VSI, or Bare Metal)
- `PrivateNetworkBusNode` — wide horizontal bus bar representing the IBM Cloud Private Network backbone; visually connects BCR layer to Transit Gateway/Direct Link layer
- `TransitGatewayNode` — displays TGW name, location, connection count, and routing scope badge (Global/Local)
- `TgwConnectionNode` — individual connection node with Carbon icon, type badge, status dot, ownership badge, expandable prefix list; supports click to expand/collapse and double-click to open detail panel
- `ConnectionDetailPanel` — slide-in side panel showing full connection details: name, type, status, ownership, parent TGW, searchable route prefix list, connection ID footer
- `VpnGatewayNode` — teal-colored node showing VPN gateway name, status, mode badge, connected VPC name and region
- `DirectLinkNode` — orange-colored node showing Direct Link gateway name, type, and speed
- `SubnetTopologyDiagram` (`src/components/topology/SubnetTopologyDiagram.tsx`) — diagram component using `useSubnetTopologyData` hook with dagre auto-layout
- `useSubnetTopologyData` (`src/hooks/useSubnetTopologyData.ts`) — builds the subnet topology graph from collected subnets, VLANs, gateways, compute resources, transit gateways, VPN gateways, and direct links

Features: datacenter filter dropdown, stat tags (public/private subnet counts, gateway count, dual-NIC device count, transit gateway count, TGW connection count, VPN gateway count, direct link count).

**ReactFlow Dark Theme Styling**

Global CSS overrides in `src/styles/global.scss` style the ReactFlow `Controls` panel and `MiniMap` to match the Carbon dark theme, using `--cds-layer`, `--cds-border-subtle`, and `--cds-text-primary` tokens.

**Auth Error Display**

Authentication error messages now include the HTTP status code and status text alongside the backend's descriptive message. For example, a 502 response displays as `502 (Bad Gateway): Unable to validate API key. The SoftLayer API may be unavailable.` The error is extracted from the Axios response object (`response.status`, `response.statusText`, `response.data.message`) in `ApiKeyForm.tsx`.

#### 7.6.4 Design Decisions: Features Not Implemented

| Feature | Reason |
|---------|--------|
| Sparkline Mini-Charts | No time-series data — single snapshot collection; sparklines would misrepresent static distributions as temporal trends |
| Toast Slide-in Animation | Marginal UX improvement over existing Carbon InlineNotification; effort-to-impact ratio does not justify implementation |
| Confetti on Completion | Inappropriate for professional infrastructure tool used repeatedly in operational workflows |
| Sunburst Cost Drill-down | Redundant with existing D3 treemap — identical data, different geometry, no additional analytical insight |
| Cost Trend Line Chart | No historical data — single snapshot per session; trend lines meaningless without multi-session persistence (conflicts with stateless architecture) |
| Inline Table Sparklines | Same constraint as sparklines — per-row sparklines require time-series metrics not collected by snapshot API |

#### 7.6.5 Additional Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `@react-spring/web` | ^9.7.5 | Spring-physics number animation |
| `@carbon/charts-react` | ^1.22.0 | Donut, stacked bar, and gauge charts |
| `@carbon/charts` | ^1.22.0 | Carbon Charts core |
| `@xyflow/react` | ^12 | Infrastructure topology diagram |
| `d3-hierarchy` | ^3 | Treemap layout for cost breakdown |
| `d3-scale` | ^4 | Ordinal colour scales for treemap |
| `d3-shape` | ^3 | Shape utilities |
| `d3-interpolate` | ^3 | Colour interpolation |
| `react-simple-maps` | ^3 | Geographic datacenter map |
| `dagre` | ^0.8 | Directed acyclic graph layout for topology diagram |

#### 7.6.6 Chart Colour Palette

All data visualisations use the IBM categorical colour palette:

```
Primary:   #6929c4  #1192e8  #005d5d  #9f1853  #fa4d56
Secondary: #198038  #002d9c  #ee538b  #b28600  #009d9a
```

Charts respect the active Carbon theme: light mode uses the `'white'` Carbon Charts theme; dark mode (`g100`) uses the `'g90'` Carbon Charts theme.

---

## 8. Technical Architecture

### 8.1 High-Level Architecture

The application uses a **single-container architecture** where Express.js serves both the React static files and API proxy routes. This design eliminates CORS issues entirely since all requests are same-origin.

```
┌─────────────────────────────────────────────────────────────────┐
│                        IBM Code Engine                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │        Main Application Container                         │  │
│  │                    Express.js Server                      │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │   /                  → React SPA (static files)      │ │  │
│  │  │   /api/auth/validate → Proxy to SoftLayer            │ │  │
│  │  │   /api/collect/*     → Proxy to SoftLayer            │ │  │
│  │  │   /api/export        → Generate XLSX                 │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │        AI Proxy Container (separate deployment)           │  │
│  │                    Express.js Server                      │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │   /api/insights          → Migration AI insights     │ │  │
│  │  │   /api/chat              → Infrastructure Q&A        │ │  │
│  │  │   /api/cost-optimization → Cost savings narrative    │ │  │
│  │  │   /api/report-narratives → DOCX prose sections       │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
          │ Server-to-server                   │ watsonx.ai text generation
          │                                    │
          ▼                                    ▼
┌───────────────────────────┐    ┌───────────────────────────────┐
│  IBM Cloud Classic APIs   │    │  IBM watsonx.ai               │
│  (SoftLayer REST)         │    │  us-south.ml.cloud.ibm.com    │
│  api.softlayer.com        │    │  granite-3-8b-instruct        │
└───────────────────────────┘    └───────────────────────────────┘
```

**Note:** The AI Proxy is deployed as a separate Code Engine application (`ai-proxy`). All AI requests from the browser are routed through the main Express server at `/api/ai/*` (same-origin) — the server forwards them to the AI proxy using `AI_PROXY_URL` and `AI_PROXY_SECRET` environment variables. The browser never contacts the AI proxy directly, eliminating CORS requirements.

#### 8.1.1 Why This Architecture?

**CORS Considerations:**

The SoftLayer API at `api.softlayer.com` does not include CORS headers, which means browser-based JavaScript cannot call it directly. The browser would block the response even if the API call succeeded.

**Solution - Backend Proxy:**

By routing all SoftLayer API calls through our Express.js backend:
- Browser makes same-origin requests to `/api/*` (no CORS)
- Server makes server-to-server requests to SoftLayer (CORS doesn't apply)
- API keys are never exposed in browser network traffic to external domains

### 8.2 Stateless API Key Architecture

The server is completely **stateless** - API keys are never stored on the server. This enables horizontal scaling and ensures security.

#### 8.2.1 Per-Request Key Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Per-User Session Flow                           │
└─────────────────────────────────────────────────────────────────────────┘

User's Browser                      Server                      SoftLayer API
     │                                │                               │
     │  1. User enters API Key        │                               │
     │     (stored in React state)    │                               │
     │                                │                               │
     │  2. POST /api/collect          │                               │
     │     Header: X-API-Key: abc123  │                               │
     │  ─────────────────────────────►│                               │
     │                                │                               │
     │                                │  3. Extract key from header   │
     │                                │     Call SoftLayer with key   │
     │                                │  ─────────────────────────────►
     │                                │                               │
     │                                │  4. SoftLayer returns data    │
     │                                │  ◄─────────────────────────────
     │                                │                               │
     │  5. Server returns data        │                               │
     │     (key discarded from memory)│                               │
     │  ◄─────────────────────────────│                               │
     │                                │                               │
     │  6. Data displayed in UI       │                               │
     │     (key still in React state) │                               │
```

#### 8.2.2 Multiple Concurrent Users

Each user's request is completely independent. The server processes requests statelessly:

```
User A (browser holds key: abc123)
    └─► POST /api/collect [X-API-Key: abc123] ─► Server proxies with abc123 ─► SoftLayer

User B (browser holds key: xyz789)
    └─► POST /api/collect [X-API-Key: xyz789] ─► Server proxies with xyz789 ─► SoftLayer

User C (browser holds key: def456)
    └─► POST /api/collect [X-API-Key: def456] ─► Server proxies with def456 ─► SoftLayer
```

#### 8.2.3 API Key Storage Locations

| Location | What's Stored | Lifetime | Security |
|----------|---------------|----------|----------|
| Browser (React Context) | User's own API key | Until tab closed or 60-min timeout | Memory only, never localStorage |
| Server (request scope) | Key from current request | Duration of single request (~ms) | Discarded after response sent |
| Server (disk/database) | **Nothing** | N/A | Keys are never persisted |
| Logs | **Nothing** | N/A | Keys are never logged |

#### 8.2.4 Benefits of Stateless Architecture

| Benefit | Description |
|---------|-------------|
| **Horizontal Scaling** | Any Code Engine instance can handle any request - no sticky sessions needed |
| **Security** | No API key database to protect or breach |
| **Simplicity** | No session management, no database, no cleanup jobs |
| **Privacy** | Users' keys never leave their control (browser + in-flight to server) |
| **Cost** | No persistent storage costs |

### 8.3 Technology Stack

#### 8.3.1 Frontend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React | 18.x | UI framework |
| UI Library | @carbon/react | 1.x | IBM Carbon components |
| Icons | @carbon/icons-react | 11.x | Icon library |
| State Management | React Context + useReducer | - | Application state (including API key) |
| HTTP Client | Axios | 1.x | API communication |
| Table Virtualization | react-window | 1.x | Large dataset rendering |
| XLSX Export | SheetJS (xlsx) | 0.x | Excel file generation (client-side option) |
| DOCX Export | docx | 9.x | Word document generation (client-side) |
| File Download | file-saver | 2.x | Client-side file download trigger |
| Build Tool | Vite | 5.x | Development and build |
| Type Checking | TypeScript | 5.x | Type safety |

#### 8.3.2 Backend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 20.x LTS | Server runtime |
| Framework | Express.js | 4.x | HTTP server & static file serving |
| HTTP Client | node-fetch or axios | - | Server-side SoftLayer API calls |
| XLSX Generation | ExcelJS or SheetJS | - | Server-side Excel file generation |
| Compression | compression | 1.x | Response compression |
| Logging | winston | 3.x | Application logging (excluding sensitive data) |
| Security | helmet | 7.x | HTTP security headers |

#### 8.3.3 AI Proxy

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 20.x LTS | Server runtime |
| Framework | Express.js | 4.x | HTTP server |
| AI Model | IBM Granite 3 8B Instruct | - | Text generation via watsonx.ai |
| IAM Auth | ibm-cloud-sdk-core | 5.x | IAM token exchange for watsonx.ai |
| Rate Limiting | express-rate-limit | 7.x | 30 req/min sliding window |
| Security | helmet | 7.x | HTTP security headers |
| Logging | winston | 3.x | Application logging |

#### 8.3.4 Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Container Runtime | IBM Code Engine | Serverless container hosting |
| Container Registry | IBM Container Registry | Image storage |
| Build | GitHub Actions | CI/CD pipeline |
| Monitoring | IBM Log Analysis | Application logs |

### 8.4 Frontend Architecture

```
src/
├── components/
│   ├── common/
│   │   ├── Header.tsx              # Theme toggle, docs, about icon buttons + Account dropdown
│   │   ├── SideNav.tsx
│   │   ├── ProgressIndicator.tsx
│   │   ├── ExportDialog.tsx
│   │   └── AboutModal.tsx          # About dialog (version, author, licence, links)
│   ├── dashboard/
│   │   ├── Dashboard.tsx
│   │   ├── ResourceCard.tsx
│   │   ├── AccountInfo.tsx
│   │   └── ImportBanner.tsx        # Imported data indicator banner
│   ├── tables/
│   │   ├── DataTable.tsx
│   │   ├── ColumnFilter.tsx
│   │   ├── ColumnSelector.tsx
│   │   └── VirtualizedTable.tsx
│   ├── auth/
│   │   ├── ApiKeyForm.tsx
│   │   └── ImportButton.tsx        # XLSX import button + file picker on landing page
│   ├── ai/
│   │   ├── AIChatPanel.tsx         # Slide-in chat panel with message list
│   │   ├── AIChatMessage.tsx       # User/assistant message bubble component
│   │   └── AIChatInput.tsx         # TextArea + Send button
│   ├── settings/
│   │   └── SettingsPanel.tsx       # AI config + Report branding settings
│   ├── costs/
│   │   └── AICostInsights.tsx      # AI-powered cost optimization narrative
│   ├── migration/
│   │   └── AIInsightsPanel.tsx     # AI migration executive summary + risks
│   └── docs/
│       ├── DocsHub.tsx             # Documentation hub layout (left nav + content, activeSection state)
│       ├── DocsNav.tsx             # Left secondary nav with collapsible groups
│       ├── docsStyles.ts           # Shared inline style constants
│       └── sections/               # 12 section components
│           ├── index.ts            # Barrel export
│           ├── GettingStartedSection.tsx
│           ├── ClassicSection.tsx
│           ├── VpcSection.tsx
│           ├── DataTablesSection.tsx
│           ├── VisualizationsSection.tsx
│           ├── MigrationSection.tsx
│           ├── AIFeaturesSection.tsx
│           ├── ImportExportSection.tsx
│           ├── SettingsSection.tsx
│           ├── SecuritySection.tsx
│           ├── ResourceReferenceSection.tsx
│           └── TroubleshootingSection.tsx
├── contexts/
│   ├── AuthContext.tsx
│   ├── DataContext.tsx             # Updated: handles both collected and imported data
│   ├── UIContext.tsx               # Updated: includes theme state (light/dark), chatPanelOpen
│   └── AIContext.tsx               # AI state: config, insights, chat, cost optimization
├── hooks/
│   ├── useDataCollection.ts
│   ├── useExport.ts
│   ├── useTableState.ts
│   ├── useInventoryExport.ts       # DOCX inventory report generation (delegates to unified buildReport)
│   └── useMigrationExport.ts       # DOCX migration report generation (delegates to unified buildReport)
├── services/
│   ├── api.ts
│   ├── export.ts
│   ├── import.ts                   # XLSX parsing, validation, data mapping (client-side)
│   ├── ai/
│   │   ├── aiProxyClient.ts        # Axios client with retry, same-origin /api/ai base
│   │   ├── cache.ts                # Client-side LRU cache (24h TTL)
│   │   ├── contextBuilders.ts      # Sanitize data for AI (strip hostnames/IPs)
│   │   ├── insightsApi.ts          # Fetch migration insights
│   │   ├── chatApi.ts              # Send chat messages
│   │   ├── costApi.ts              # Fetch cost optimization
│   │   └── reportApi.ts            # Fetch report narratives
│   └── report/
│       └── docx/
│           ├── index.ts            # buildReport() unified entry, legacy buildInventoryReport/buildMigrationReport wrappers
│           ├── types.ts            # ReportBranding, ReportConfig
│           ├── utils/              # styles, tables, aiSections, branding, charts (pie), captions (numbered)
│           └── sections/           # 15 section builders (cover, exec summary, etc.)
├── types/
│   ├── resources.ts
│   └── ai.ts                       # AI type definitions
├── utils/
│   ├── formatters.ts
│   ├── relationships.ts
│   └── logger.ts                   # Client-side console logger with levels & key sanitisation
├── App.tsx
└── main.tsx
```

### 8.5 Backend Architecture

```
server/
├── src/
│   ├── index.ts                 # Express app entry point
│   ├── routes/
│   │   ├── auth.ts              # POST /api/auth/validate
│   │   ├── collect.ts           # POST /api/collect/* endpoints
│   │   └── export.ts            # POST /api/export
│   ├── services/
│   │   ├── softlayer/
│   │   │   ├── client.ts        # SoftLayer API client (stateless)
│   │   │   ├── compute.ts       # VSI, Bare Metal collection
│   │   │   ├── network.ts       # VLANs, Subnets, Gateways
│   │   │   ├── storage.ts       # Block, File, Object storage
│   │   │   └── security.ts      # Certs, SSH keys, Security groups
│   │   ├── aggregator.ts        # Parallel collection orchestrator
│   │   └── relationships.ts     # Resource relationship mapping
│   ├── middleware/
│   │   ├── apiKey.ts            # Extract & validate API key from header
│   │   └── error.ts             # Error handling (no key logging)
│   └── utils/
│       └── logger.ts            # Winston config (sanitized logging)
├── Dockerfile
└── package.json
```

#### 8.5.1 API Key Middleware Example

```typescript
// middleware/apiKey.ts
export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Attach to request for use in route handlers
  // Key exists only for duration of this request
  req.apiKey = apiKey;
  next();
};
```

#### 8.5.2 SoftLayer Proxy Example

```typescript
// routes/collect.ts
router.post('/virtual-servers', apiKeyMiddleware, async (req, res) => {
  const apiKey = req.apiKey; // From middleware, exists only for this request
  
  try {
    const response = await fetch(
      'https://api.softlayer.com/rest/v3.1/SoftLayer_Account/getVirtualGuests?objectMask=mask[...]',
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`apikey:${apiKey}`).toString('base64')
        }
      }
    );
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    // Log error WITHOUT the API key
    logger.error('SoftLayer API error', { endpoint: 'getVirtualGuests', status: error.status });
    res.status(502).json({ error: 'Failed to fetch from SoftLayer API' });
  }
  
  // apiKey goes out of scope here - automatically garbage collected
});

### 8.6 Data Flow

#### 8.6.1 Authentication Flow

```
1. User enters API key in frontend login form
2. Frontend stores API key in React Context (memory only)
3. Frontend sends POST /api/auth/validate with API key in X-API-Key header
4. Backend extracts key from header, calls SoftLayer_Account/getObject
5. Backend returns account info on success (does NOT store the key)
6. Frontend stores account info, displays dashboard
7. All subsequent API requests include the key in X-API-Key header
8. Each request is independently authenticated - no server-side sessions
```

#### 8.6.2 Data Collection Flow

```
1. User clicks "Collect Data" button
2. Frontend sends POST /api/collect/start with API key in X-API-Key header
3. Backend extracts key from header (not stored)
4. Backend initiates parallel API calls to SoftLayer, each using the provided key
5. Backend uses Server-Sent Events (SSE) to stream progress back to frontend
6. Frontend updates progress indicator and populates tables as data arrives
7. On completion, frontend displays summary notification
8. Backend has no memory of the API key after response completes
```

#### 8.6.3 Export Flow

```
1. User clicks "Export All" or "Export Table"
2. Frontend sends POST /api/export with collected data and API key header
3. Backend generates XLSX using ExcelJS (no SoftLayer calls needed - data already collected)
4. Backend returns file as download stream
5. Browser downloads file: IBMClassic_Export_YYYY-MM-DD_AccountName.xlsx
```

#### 8.6.4 Import Flow

```
1. User clicks "Import XLSX" on landing page (no API key needed)
2. Browser file picker opens; user selects a .xlsx file
3. Frontend parses XLSX client-side using ExcelJS
4. Frontend validates worksheet names match expected export format (see Section 16.3 Appendix C)
5. Summary / VPC Summary worksheet is parsed for account info (Account Name, ID, Email, Owner)
6. For each recognised data worksheet, XLSX headers are reverse-mapped to field names
   using RESOURCE_TYPES / VPC_RESOURCE_TYPES column definitions (header → field)
7. Cell values are coerced based on column data type (numbers, booleans, currency)
8. Data is loaded into DataContext (same state shape as live collection)
9. Account info (if found) is set in AuthContext for header/dashboard display
10. Dashboard, tables, topology, costs, geography, and migration views all render correctly
11. UI shows "Imported" indicator banner with filename and timestamp
12. No server calls are needed — import is entirely client-side
```

**Header→Field Mapping:**

The import relies on RESOURCE_TYPES and VPC_RESOURCE_TYPES as the single source of truth for field naming. The export writes column headers that match these definitions (e.g., "Primary IP", "Classic Monthly Fee"), and the import reverse-maps these headers back to field names (e.g., `primaryIp`, `recurringFee`). This ensures imported objects have identical property names to live-collected data, so all downstream features (tables, topology, cost analysis, geography, migration) work correctly.

For headers not found in RESOURCE_TYPES/VPC_RESOURCE_TYPES (e.g., extra columns from older exports), the raw header text is used as the key for backwards compatibility.

**Validation Rules:**
- The file must contain at least one recognised worksheet name (e.g., `vVirtualServers`, `vBareMetal`, `vVpcInstances`)
- Both Classic and VPC worksheet names are recognised
- Unrecognised worksheets are ignored with a console warning
- If no recognised worksheets are found, display an error notification
- Each recognised worksheet is parsed and its data mapped into the same format as collected data

### 8.7 Browser Console Logging

The frontend includes a structured logging utility for diagnostics via the browser Developer Tools console. This aids debugging during development and troubleshooting in production.

#### 8.7.1 Log Format

Logs use consistent prefixes for easy filtering in DevTools:

| Prefix | Category | Example |
|--------|----------|---------|
| `[ClassicExplorer:API]` | API proxy calls | Endpoint, method, status, duration, result count |
| `[ClassicExplorer:Collection]` | Data collection lifecycle | Phase start/end, resource type, item count, errors |
| `[ClassicExplorer:SSE]` | Server-Sent Events | Event type, resource, count |
| `[ClassicExplorer:Import]` | XLSX import | Worksheets found, row counts, validation results |
| `[ClassicExplorer:Export]` | XLSX export | Worksheets generated, row counts, file size |
| `[ClassicExplorer:Auth]` | Authentication | Login/logout events (never log key values) |
| `[ClassicExplorer:UI]` | UI events | Theme changes, navigation, modal open/close |

#### 8.7.2 Log Levels

| Level | Console Method | Default Enabled |
|-------|---------------|-----------------|
| DEBUG | `console.debug` | Development only |
| INFO | `console.info` | Always |
| WARN | `console.warn` | Always |
| ERROR | `console.error` | Always |

The log level defaults to `INFO` in production and `DEBUG` in development (`import.meta.env.DEV`).

#### 8.7.3 Console Features

- **`console.group` / `console.groupEnd`** — Group related logs (e.g., all events within a full collection run)
- **`console.table`** — Display tabular data (e.g., collection summary with resource types and counts)
- **`console.time` / `console.timeEnd`** — Measure performance (e.g., total collection duration, import parsing time)

#### 8.7.4 Key Sanitisation

The logger utility includes a sanitisation function that strips any API key values from log output. All logging calls pass through this function before reaching the console. This is a defence-in-depth measure — API keys should never reach the logger in the first place, but the sanitiser provides an additional safety net.

### 8.8 Session Management

**Key Principle:** The server is stateless. All session state lives in the browser.

| Aspect | Implementation |
|--------|----------------|
| API Key Storage | React Context (browser memory only) |
| Server Sessions | None - each request is independent |
| Timeout | 60-minute inactivity timer in frontend |
| On Timeout | Clear React Context, redirect to login |
| On Browser Close | All data cleared (nothing persisted) |
| Multiple Tabs | Each tab maintains its own independent session |

**Why Stateless?**
- Code Engine can scale instances up/down automatically
- No sticky sessions required - any instance handles any request
- No session database to manage or secure
- Simpler disaster recovery - no state to lose

---

## 9. API Integration Specifications

### 9.1 IBM Cloud Classic API Overview

The tool will integrate with the IBM Cloud Classic Infrastructure API (formerly SoftLayer API) using RESTful endpoints.

**Base URL:** `https://api.softlayer.com/rest/v3.1/`

**Authentication:** HTTP Basic Auth with username (set to 'apikey') and API key as password.

### 9.2 API Call Patterns

#### 9.2.1 Object Masks

Object masks are used to specify which fields to return, reducing response size and improving performance.

**Example:**
```
GET /SoftLayer_Account/getVirtualGuests
?objectMask=mask[id,hostname,primaryIpAddress,datacenter[name]]
```

#### 9.2.2 Pagination

For large result sets, use resultLimit and offset parameters.

**Example:**
```
GET /SoftLayer_Account/getVirtualGuests
?resultLimit=100
&offset=0
```

#### 9.2.3 Error Handling

| HTTP Status | SoftLayer Error | Action |
|-------------|-----------------|--------|
| 401 | SoftLayer_Exception_InvalidCredential | Invalid API key - prompt re-entry |
| 403 | SoftLayer_Exception_NotAuthorized | Insufficient permissions - display warning |
| 404 | SoftLayer_Exception_ObjectNotFound | Resource deleted - skip and continue |
| 500 | SoftLayer_Exception | API error - retry with backoff |
| 503 | Rate limit | Implement exponential backoff |

### 9.3 API Call Sequence

**Two-Phase Collection Strategy:**

```
Phase 1 — Shallow Scan (all 23 resources concurrently, MAX_CONCURRENCY=10):
  Fast resources (full masks — 10 resources):
  ├── SoftLayer_Account/getObject
  ├── SoftLayer_Account/getDedicatedHosts
  ├── SoftLayer_Account/getPlacementGroups
  ├── SoftLayer_Account/getSecurityCertificates
  ├── SoftLayer_Account/getSshKeys
  ├── SoftLayer_Account/getUsers
  ├── SoftLayer_Event_Log/getAllObjects
  ├── SoftLayer_Account/getHubNetworkStorage
  ├── SoftLayer_Account/getNetworkTunnelContexts
  └── SoftLayer_Account/getReservedCapacityGroups

  Slow resources (minimal masks — 13 resources):
  ├── SoftLayer_Account/getVirtualGuests       (id + summary fields only)
  ├── SoftLayer_Account/getHardware            (id + summary fields only)
  ├── SoftLayer_Account/getNetworkVlans        (id + core fields only)
  ├── SoftLayer_Account/getSubnets             (no ipAddresses[])
  ├── SoftLayer_Account/getNetworkGateways     (no members/insideVlans)
  ├── SoftLayer_Account/getNetworkVlanFirewalls (no rules/billingItem)
  ├── SoftLayer_Account/getSecurityGroups      (no rules/bindings)
  ├── SoftLayer_Account/getAdcLoadBalancers    (no virtualServers)
  ├── SoftLayer_Account/getIscsiNetworkStorage (no allowed hosts)
  ├── SoftLayer_Account/getNasNetworkStorage   (no allowed hosts)
  ├── SoftLayer_Account/getBlockDeviceTemplateGroups (no children)
  ├── SoftLayer_Account/getDomains            (no resourceRecords[])
  └── SoftLayer_Account/getAllBillingItems     (id + summary fields only)

Phase 2 — Deep Scan (13 slow resources re-fetched with full masks):
  ├── SoftLayer_Account/getVirtualGuests       (full mask)
  ├── SoftLayer_Account/getHardware            (full mask)
  ├── SoftLayer_Account/getNetworkVlans        (full mask)
  ├── SoftLayer_Account/getSubnets             (full mask)
  ├── SoftLayer_Account/getNetworkGateways     (full mask)
  ├── SoftLayer_Account/getNetworkVlanFirewalls (full mask)
  ├── SoftLayer_Account/getSecurityGroups      (full mask)
  ├── SoftLayer_Account/getAdcLoadBalancers    (full mask)
  ├── SoftLayer_Account/getIscsiNetworkStorage (full mask)
  ├── SoftLayer_Account/getNasNetworkStorage   (full mask)
  ├── SoftLayer_Account/getBlockDeviceTemplateGroups (full mask)
  ├── SoftLayer_Account/getDomains            (full mask)
  └── SoftLayer_Account/getAllBillingItems     (full mask)

Phase 3 — Nested + Billing (parallel):
  ├── SoftLayer_Account/getAllBillingItems     (full mask)
  ├── SoftLayer_Network_Storage/{id}/getSnapshots (per block+file volume, concurrency 5)
  ├── Transit Gateway Connections (per TG from Phase 2)
  ├── VMware nested (cluster hosts, VLANs, PVDCs, PVDC clusters)
  └── Merge snapshots back onto storage volumes, re-send via SSE

Post-Collection:
  ├── Flatten DNS records from deep domains
  ├── Build relationship map from deep data
  └── Send complete event
```

### 9.4 Rate Limiting

IBM Cloud Classic API has rate limits. The tool will implement:

- Maximum 10 concurrent API calls
- Exponential backoff on 503 responses
- Minimum 100ms delay between calls to same endpoint
- Progress reporting to user during rate limit delays

---

## 10. Security Considerations

### 10.1 API Key Handling - Stateless Architecture

The most critical security feature is that **API keys are never stored on the server**.

#### 10.1.1 Key Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        API Key Lifecycle                                 │
└─────────────────────────────────────────────────────────────────────────┘

  User Entry          Browser Storage        Request Transit       Server Processing
      │                     │                      │                      │
      ▼                     ▼                      ▼                      ▼
┌──────────┐         ┌──────────────┐       ┌──────────────┐      ┌──────────────┐
│  User    │         │ React Context│       │ HTTPS Header │      │ Request Scope│
│  types   │────────►│ (memory only)│──────►│ X-API-Key    │─────►│ Variable     │
│  key     │         │              │       │              │      │              │
└──────────┘         └──────────────┘       └──────────────┘      └──────────────┘
                            │                                            │
                            │ Cleared on:                                │ Cleared:
                            │ - Tab close                                │ - After each
                            │ - 60min timeout                            │   response
                            │ - User logout                              │ - Garbage
                            │                                            │   collected
                            ▼                                            ▼
                     ┌──────────────┐                             ┌──────────────┐
                     │   GONE       │                             │   GONE       │
                     └──────────────┘                             └──────────────┘
```

#### 10.1.2 What is NOT Stored

| Location | API Key Stored? | Notes |
|----------|-----------------|-------|
| Server database | ❌ NO | No database exists |
| Server filesystem | ❌ NO | Nothing written to disk |
| Server logs | ❌ NO | Explicitly excluded from logging |
| Server memory (persistent) | ❌ NO | Only exists during request processing |
| Browser localStorage | ❌ NO | Never used |
| Browser sessionStorage | ❌ NO | Never used |
| Browser cookies | ❌ NO | Never used |
| Browser memory (React) | ✅ YES | Only place key is held, cleared on tab close |

#### 10.1.3 Request Security

| Requirement | Implementation |
|-------------|----------------|
| Transport encryption | All API calls over HTTPS (TLS 1.3) |
| Header transmission | API key sent in `X-API-Key` header (not URL params) |
| No caching | `Cache-Control: no-store` on all API responses |
| No referrer leakage | `Referrer-Policy: no-referrer` header |

### 10.2 Application Security

| Area | Measure |
|------|---------|
| Input validation | Sanitize all user inputs before API calls |
| Content Security Policy | Strict CSP preventing XSS attacks |
| HTTP Security Headers | Helmet.js for comprehensive headers |
| Dependencies | Regular security audits with `npm audit` |
| Container security | Non-root user, read-only filesystem where possible |

### 10.3 Logging Security

**Critical Rule:** API keys must never appear in logs.

**Critical Rule:** Never log full API response bodies or large JSON objects. Server-side logging must use the structured `winston` logger (not `console.log`/`console.error`) and log only metadata (status codes, error messages, counts, top-level keys) — never raw payloads. Debug-level `console.log` statements that dump full `JSON.stringify(..., null, 2)` output must not be committed; they produce excessive noise in production logs and risk exposing sensitive infrastructure data (IP addresses, hostnames, network configurations).

```typescript
// GOOD: Log metadata only
logger.info('VMware host raw sample', { instanceId, clusterId, topKeys: Object.keys(rawHosts[0]) });
logger.error('Auth validation error', { statusCode: error.statusCode, message: error.message });

// BAD: Never log full response bodies
console.log('[VMware] Raw host sample:', JSON.stringify(rawHosts[0], null, 2));
console.error('[AUTH] Validation error:', error.statusCode, error.message, error.body?.substring(0, 300));
```

```typescript
// Example: Middleware that sanitizes logs
const sanitizeForLogging = (req) => ({
  method: req.method,
  path: req.path,
  // Explicitly exclude headers
});
```

### 10.4 Data Security

| Data Type | Handling |
|-----------|----------|
| API responses | Held in browser memory only during session |
| Collected inventory | Browser memory only, cleared on tab close |
| Exported files | Generated on-demand, streamed to download, not cached |
| Error messages | Sanitized to prevent information disclosure |

### 10.5 Multi-User Isolation

Since the server is stateless, there's no risk of data leakage between users:

```
User A's request → Server uses User A's key → Returns User A's data → Forgets everything
User B's request → Server uses User B's key → Returns User B's data → Forgets everything
```

- No shared state between requests
- No session mixing possible
- Each request is completely isolated

### 10.6 Compliance

| Standard | Status |
|----------|--------|
| SOC 2 | Code Engine provides SOC 2 compliance for infrastructure |
| GDPR | No personal data stored; user data processed only during session |
| IBM Data Privacy | Follows IBM data handling guidelines |
| API Key Security | Exceeds requirements by never storing keys |

---

## 11. Deployment Guide

### 11.1 Prerequisites

- IBM Cloud account with Code Engine access
- IBM Container Registry namespace
- GitHub repository for source code
- IBM Cloud CLI with Code Engine plugin

### 11.2 Container Image

**Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/src/services/migration/data ./src/services/migration/data
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
EXPOSE 8080
USER node
ENV NODE_ENV=production
CMD ["node", "server/dist/index.js"]
```

The `src/services/migration/data` directory is copied into the production image to provide the VPC pricing fallback JSON file, which the pricing endpoint uses to fill in older-generation profile pricing (bx2-\*, cx2-\*, mx2-\*) not available as individual plans in the Global Catalog API.

### 11.3 Code Engine Deployment

**Application Configuration:**

| Parameter | Value |
|-----------|-------|
| Name | infrastructure-explorer |
| Runtime | Container image |
| CPU | 0.5 vCPU |
| Memory | 1 GB |
| Min instances | 0 |
| Max instances | 10 |
| Port | 8080 |
| Visibility | Public |
| Request timeout | 300 seconds |

**Environment Variables:**

| Variable | Value | Description |
|----------|-------|-------------|
| NODE_ENV | production | Runtime environment |
| LOG_LEVEL | info | Logging verbosity |

### 11.4 CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
name: Deploy to Code Engine
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Login to IBM Cloud
        uses: ibm/actions/iam-login@v1
        with:
          apikey: ${{ secrets.IBM_CLOUD_API_KEY }}
          
      - name: Build and push image
        run: |
          ibmcloud cr login
          docker build -t icr.io/${{ secrets.ICR_NAMESPACE }}/infrastructure-explorer:${{ github.sha }} .
          docker push icr.io/${{ secrets.ICR_NAMESPACE }}/infrastructure-explorer:${{ github.sha }}
          
      - name: Deploy to Code Engine
        run: |
          ibmcloud ce app update \
            --name infrastructure-explorer \
            --image icr.io/${{ secrets.ICR_NAMESPACE }}/infrastructure-explorer:${{ github.sha }}
```

### 11.5 Monitoring & Logging

- **Logs:** Streamed to IBM Log Analysis via Code Engine integration
- **Metrics:** Code Engine built-in metrics (requests, latency, errors)
- **Alerts:** Configure alerts for error rate > 5% or latency > 10s

---

## 12. VMware Integration

### 12.1 Overview

This section defines the integration of IBM Cloud VMware resources into the Infrastructure Explorer. IBM Cloud offers VMware infrastructure through two API surfaces:

1. **IBM Cloud for VMware Solutions API** — manages VCF for Classic (vCenter Server instances, ESXi clusters, ESXi hosts on Classic bare metal)
2. **VMware Cloud Foundation (VCF) as a Service API** — manages Cloud Director-based environments (director sites, PVDCs, VDCs, edges, transit gateways)

Both APIs use **IAM Bearer token authentication**. The same IBM Cloud API key that authenticates to the SoftLayer API can be exchanged for an IAM token to access these VMware APIs. The tool will automatically perform this token exchange and collect VMware resources alongside Classic resources in a single collection operation.

**Important:** As of 31 October 2025, new VMware Solutions deployments are unavailable for new customers. Existing customers retain full API access. Many IBM Cloud Classic accounts have VMware infrastructure, making this integration valuable for the tool's target audience.

### 12.2 VMware APIs

#### 12.2.1 IBM Cloud for VMware Solutions API (VCF for Classic)

- **Base URL:** `https://api.vmware-solutions.cloud.ibm.com` (global)
- **API Docs:** https://cloud.ibm.com/apidocs/vmware-solutions
- **Auth:** IAM Bearer token
- **Purpose:** Manage VMware vCenter Server instances deployed on IBM Cloud Classic bare metal infrastructure

**Key Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/vcenters` | List all vCenter Server instances |
| GET | `/v1/vcenters/{id}` | Get vCenter Server instance details |
| GET | `/v1/vcenters/{id}/clusters` | List clusters in an instance |
| GET | `/v1/vcenters/{id}/clusters/{cluster_id}` | Get cluster details including hosts |

#### 12.2.2 VMware Cloud Foundation as a Service API

- **Base URL:** `https://api.vmware-solutions.cloud.ibm.com` (global; same host as VCF for Classic)
- **API Docs:** https://cloud.ibm.com/apidocs/vmware-service
- **Go SDK:** https://github.com/IBM/vmware-go-sdk (`vmwarev1` package)
- **Auth:** IAM Bearer token
- **Purpose:** Manage VMware Cloud Director-based environments (single-tenant and multitenant)

**Key Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/director_sites` | List all director sites |
| GET | `/v1/director_sites/{id}` | Get director site details |
| GET | `/v1/director_sites/{id}/pvdcs` | List provider VDCs in a site |
| GET | `/v1/director_sites/{id}/pvdcs/{pvdc_id}` | Get PVDC details |
| GET | `/v1/director_sites/{id}/pvdcs/{pvdc_id}/clusters` | List clusters in a PVDC |
| GET | `/v1/director_sites/{id}/pvdcs/{pvdc_id}/clusters/{cluster_id}` | Get cluster details |
| GET | `/v1/director_sites/{id}/regions` | List available regions for a site |
| GET | `/v1/director_sites/{id}/host_profiles` | List available host profiles |
| GET | `/v1/vdcs` | List all virtual data centers |
| GET | `/v1/vdcs/{id}` | Get VDC details (edges, transit gateways) |
| GET | `/v1/multitenant_director_sites` | List multitenant director sites |

### 12.3 Authentication & IAM Token Exchange

The existing API key authentication flow will be extended to support IAM token exchange.

**Flow:**

```
User enters IBM Cloud API key
        │
        ├──► SoftLayer Basic Auth (existing) ──► Classic API calls
        │
        └──► IAM Token Exchange (new) ──► VMware API calls
             POST https://iam.cloud.ibm.com/identity/token
             grant_type=urn:ibm:params:oauth:grant-type:apikey
             apikey=<user-api-key>
             Response: { "access_token": "...", "expiration": ... }
```

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-VMW-1.1 | IAM Token Exchange | Backend exchanges the user's API key for an IAM access token via `POST https://iam.cloud.ibm.com/identity/token` | Must |
| FR-VMW-1.2 | Token Caching | Cache IAM token for its validity period (typically 1 hour). Refresh before expiry. Token held in memory only — never persisted. | Must |
| FR-VMW-1.3 | Token Cleanup | IAM token cleared from memory when user session ends or times out (same lifecycle as API key) | Must |
| FR-VMW-1.4 | Graceful Degradation | If IAM token exchange fails (e.g., API key lacks IAM permissions), continue with Classic-only collection. Show warning notification. | Must |
| FR-VMW-1.5 | No Extra Credentials | No additional API key or credential input required — reuse existing API key | Must |

### 12.4 VMware Data Model & Resource Coverage

#### 12.4.1 vCenter Server Instances (VCF for Classic)

**API:** IBM Cloud for VMware Solutions API

| Field | Type | Description |
|-------|------|-------------|
| id | String | Instance ID |
| name | String | Instance name |
| status | String | Instance status (Ready, Modifying, Deleting, etc.) |
| region | String | IBM Cloud region |
| resourceGroup | String | Resource group name |
| vcenterVersion | String | vCenter Server version |
| nsxVersion | String | NSX version |
| vsanEnabled | Boolean | vSAN storage enabled |
| nfsEnabled | Boolean | NFS storage enabled |
| clusters | Array | Cluster summary list |
| createDate | DateTime | Creation timestamp |

**Worksheet Name:** vVMwareInstances

#### 12.4.2 VMware Clusters (VCF for Classic)

| Field | Type | Description |
|-------|------|-------------|
| id | String | Cluster ID |
| name | String | Cluster name |
| instanceId | String | Parent instance ID |
| instanceName | String | Parent instance name |
| hostCount | Integer | Number of ESXi hosts |
| hostProfile | String | Bare metal host profile |
| storageType | String | vSAN or NFS |
| status | String | Cluster status |
| datacenter | String | IBM Cloud datacenter |

**Worksheet Name:** vVMwareClusters

#### 12.4.3 Director Sites (VCF as a Service)

**API:** VMware Cloud Foundation as a Service API

| Field | Type | Description |
|-------|------|-------------|
| id | String | Director site ID |
| name | String | Site name (immutable after creation) |
| status | String | Site status |
| resourceGroup | Object | IBM resource group (id, name) |
| region | String | IBM Cloud region |
| requester | String | Email of user who ordered the site |
| instanceOrdered | DateTime | Order timestamp |
| instanceCreated | DateTime | Creation/availability timestamp |
| pvdcs | Array | Provider VDC list |
| services | Array | Enabled services (Veeam, VCDA, etc.) |

**Worksheet Name:** vDirectorSites

#### 12.4.4 Provider Virtual Data Centers (PVDCs)

| Field | Type | Description |
|-------|------|-------------|
| id | String | PVDC ID |
| name | String | PVDC name |
| directorSiteId | String | Parent director site ID |
| directorSiteName | String | Parent director site name |
| dataCenterName | String | IBM Cloud datacenter |
| status | String | PVDC status |
| clusters | Array | Cluster list |
| providerTypes | Array | Provider type information |

**Worksheet Name:** vPVDCs

#### 12.4.5 VCF Clusters (VCF as a Service)

| Field | Type | Description |
|-------|------|-------------|
| id | String | Cluster ID |
| name | String | Cluster name |
| directorSiteId | String | Parent director site ID |
| pvdcId | String | Parent PVDC ID |
| hostCount | Integer | Number of hosts |
| hostProfile | String | Host profile identifier |
| fileShares | Object | NFS file share configuration |
| status | String | Cluster status |
| statusReasons | Array | Status detail reasons |
| dataCenterName | String | IBM Cloud datacenter |

**Worksheet Name:** vVCFClusters

#### 12.4.6 Virtual Data Centers (VDCs)

| Field | Type | Description |
|-------|------|-------------|
| id | String | VDC ID |
| name | String | VDC name |
| allocationModel | String | Allocation model (paygo, reserved, etc.) |
| status | String | VDC status |
| directorSite | Object | Parent director site reference (id, name, region) |
| pvdc | Object | Parent PVDC reference |
| edge | Object | NSX edge gateway details |
| transitGateways | Array | Connected transit gateways |
| providerType | Object | Provider type details |
| cpu | Object | CPU allocation (allocated, limit) |
| ram | Object | RAM allocation (allocated, limit) |
| disk | Object | Disk allocation (allocated, limit) |
| fastProvisioningEnabled | Boolean | Fast provisioning flag |
| rhel | Object | RHEL licensing details |
| windows | Object | Windows licensing details |
| createdTime | DateTime | Creation timestamp |
| deletedTime | DateTime | Deletion timestamp (if deleted) |

**Worksheet Name:** vVDCs

#### 12.4.7 Edges

| Field | Type | Description |
|-------|------|-------------|
| id | String | Edge ID |
| type | String | Edge type (performance, efficiency) |
| size | String | Edge size |
| status | String | Edge status |
| transitGateways | Array | Connected transit gateways |
| vdcId | String | Parent VDC ID |

**Worksheet Name:** (included inline within vVDCs)

#### 12.4.8 Multitenant Director Sites

| Field | Type | Description |
|-------|------|-------------|
| id | String | Site ID |
| name | String | Site name |
| region | String | IBM Cloud region |
| pvdcs | Array | Available PVDCs |
| services | Array | Available services |

**Worksheet Name:** vMultitenantSites

#### 12.4.9 Host Profiles

| Field | Type | Description |
|-------|------|-------------|
| id | String | Profile ID |
| name | String | Profile name |
| cpu | Object | CPU specifications |
| memory | Object | Memory specifications |
| storage | Object | Storage specifications |

**Worksheet Name:** (reference data, not exported separately)

### 12.5 Cross-Reference & Deduplication

VMware infrastructure on IBM Cloud Classic runs on bare metal servers, VLANs, subnets, and storage that are also visible through the SoftLayer API. To avoid double-counting and to provide cross-visibility:

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-VMW-5.1 | Classic Resource Annotation | Add a `vmwareRole` column to Classic resource tables (Bare Metal, VLANs, Subnets, Block/File Storage) that indicates if the resource is part of a VMware deployment (e.g., "ESXi Host in cluster mgmt-cluster-01") | Must |
| FR-VMW-5.2 | VMware→Classic Linking | VMware tables include Classic resource IDs where applicable (e.g., cluster host list includes bare metal server IDs) | Must |
| FR-VMW-5.3 | Dashboard Dedup Awareness | Dashboard shows separate "Classic" and "VMware" resource counts. A summary tile shows overlap count (e.g., "12 Bare Metal servers are ESXi hosts") | Must |
| FR-VMW-5.4 | Cross-Reference Resolution | After both Classic and VMware data is collected, run a cross-reference pass that matches: bare metal hostnames/IDs to ESXi hosts, VLAN numbers to VMware network VLANs, storage volumes to VMware datastores | Must |
| FR-VMW-5.5 | No Double Export | XLSX export keeps Classic and VMware worksheets separate. Cross-reference columns exist in both directions but resources are not duplicated. | Must |

**Cross-Reference Matching Strategy:**

| Classic Resource | VMware Resource | Match Key |
|-----------------|-----------------|-----------|
| Bare Metal Server | ESXi Host | Hostname, IP address, or hardware ID |
| VLAN | VMware Network VLAN | VLAN number + datacenter |
| Subnet | VMware Subnet | Network identifier + CIDR |
| Block/File Storage | VMware Datastore | Storage target IP or volume name |

### 12.6 UI Integration

#### 12.6.1 SideNav Structure

The SideNav is organized into two clearly labeled sections — **Classic** and **VPC** — each with a plain text section header (non-clickable, no icon), dashboard links, a divider, then resource category menus. The section headers are rendered on a `var(--cds-layer-01)` background with a bottom border to visually distinguish them from clickable nav items. Each page-level nav item (Summary, Topology, Cost Analysis, Geography, Migration Analysis, Documentation, Settings) displays a 16px Carbon icon inline before the label: `Dashboard`, `NetworkOverlay`, `Currency`, `EarthFilled`, `Migrate`, `Document`, and `Settings` respectively. Each resource category menu also displays a Carbon icon via the `renderIcon` prop: Compute (`Chip`), Network (`Network_3`), Storage (`DataBase`), Security (`Security`), DNS (`ServerDns`), VMware (`VirtualMachine`), Other (`OverflowMenuHorizontal`).

VPC category menu titles and dashboard links have their "VPC" prefix removed since the section header makes it redundant.

```
┌─ CLASSIC ───────────────────────────────────┐  ← section header (plain text, no icon)
│  📊 Summary                                  │
│  🔗 Topology                                 │
│  💲 Cost Analysis                            │
│  🌍 Geography                                │
│  🔄 Migration Analysis                       │
│  ───── divider ─────                         │
│  🖥 ▸ Compute                                │
│  🌐 ▸ Network                                │
│        VLANs, Subnets, Gateways, ...         │
│        Routes           → /routes            │  ← aggregated known subnets view
│  💾 ▸ Storage                                │
│  🔒 ▸ Security                               │
│  📡 ▸ DNS                                    │
│  🖧 ▸ VMware                                 │
│  ⋯ ▸ Other                                   │
├─ ───── divider ───── ───────────────────────┤
├─ VPC ───────────────────────────────────────┤  ← section header (plain text, no icon)
│  📊 Summary              → /vpc/dashboard    │
│  🔗 Topology             → /vpc/topology     │
│  💲 Cost Analysis        → /vpc/costs        │
│  🌍 Geography            → /vpc/geography    │
│  ───── divider ─────                         │
│  🖥 ▸ Compute         ("VPC" prefix stripped) │
│  🌐 ▸ Network                                │
│  💾 ▸ Storage                                │
│  🔒 ▸ Security                               │
│  ⋯ ▸ Other                                   │
├─ ───── divider ───── ───────────────────────┤
│  📄 Documentation          → /docs           │
│  ⚙️ Settings               → /settings       │
└──────────────────────────────────────────────┘
```

#### 12.6.2 Dashboard VMware Section

The Summary Dashboard adds a new **VMware** row of resource count cards below the existing Classic cards:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ vCenter         │ │ VMware          │ │ Director        │ │ Virtual Data    │
│ Instances       │ │ Clusters        │ │ Sites           │ │ Centers         │
│      3          │ │      7          │ │      2          │ │      5          │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

An overlap summary tile appears when cross-reference data is available:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ VMware ↔ Classic Overlap: 24 Bare Metal servers are ESXi hosts │            │
│ 8 VLANs are VMware network VLANs │ 16 Storage volumes are VMware datastores│
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 12.6.3 Classic Table Annotation

Existing Classic resource tables gain an additional column:

| Column Name | Applies To | Values |
|-------------|-----------|--------|
| VMware Role | Bare Metal | "ESXi Host – {cluster_name}" or empty |
| VMware Role | VLANs | "VMware Management/vMotion/vSAN/Workload VLAN" or empty |
| VMware Role | Subnets | "VMware Subnet" or empty |
| VMware Role | Block/File Storage | "VMware Datastore – {cluster_name}" or empty |

### 12.7 Collection Integration

| ID | Requirement | Description | Priority |
|----|-------------|-------------|----------|
| FR-VMW-7.1 | Combined Collection | Single "Collect Data" button triggers both Classic (SoftLayer) and VMware (IAM) collection | Must |
| FR-VMW-7.2 | Parallel Collection | VMware top-level API calls run in the same concurrent phase as the Classic deep scan. VMware nested calls (clusters, PVDCs) run concurrently with the Classic billing items call — the slowest Classic resource — so VMware results appear before billing completes. | Must |
| FR-VMW-7.3 | Progress Integration | Progress indicator shows VMware collection progress alongside Classic phases. VMware resources appear as additional items in the progress list. | Must |
| FR-VMW-7.4 | SSE Events | VMware collection progress streamed via the same SSE channel as Classic collection | Must |
| FR-VMW-7.5 | Cross-Reference Phase | After both Classic and VMware collection complete, a cross-reference phase runs to match resources. Progress shows "Cross-referencing VMware ↔ Classic resources..." | Must |
| FR-VMW-7.6 | VMware-Only Failure | If VMware APIs fail but Classic succeeds, show warning and display Classic data normally. VMware sections show "No VMware data available" or error details. | Must |
| FR-VMW-7.7 | Global Endpoint | Both VCF for Classic and VCF as a Service use the global endpoint `https://api.vmware-solutions.cloud.ibm.com`. The API returns resources across all regions in a single response — no regional iteration required. | Must |

**Collection Phase Integration:**

VMware API calls use IAM Bearer token auth on a different host (`api.vmware-solutions.cloud.ibm.com`) from the Classic SoftLayer API (`api.softlayer.com`), so they share no rate limits and can run fully in parallel. The collection phases are structured to surface VMware results before the slowest Classic call (billing items) finishes:

```
Phase 1: Shallow Scan
    └── 22 Classic resources (10 fast + 12 minimal masks)

Phase 2: Deep Scan + VMware Top-Level  (concurrent)
    ├── 12 Classic resources (full object masks, excludes billing)
    └── 4 VMware top-level calls:
            vmwareInstances, directorSites, vdcs, multitenantSites

Phase 3: Billing + VMware Nested Details  (concurrent)
    ├── billingItems  (slowest Classic call — runs here so VMware isn't blocked by it)
    └── VMware nested calls (per-instance clusters, per-site PVDCs)

Phase 4: TGW Route Reports + VPC VPN Gateways  (if TGWs with connections exist)
    ├── Transit Gateway Route Reports — POST to create, poll until complete, extract route prefixes
    └── VPN Gateways for TGW VPC Connections — fetch VPN gateways from VPC regions connected via TGW

Phase 5: VCF Clusters  (if PVDCs found in Phase 3)
    └── Per-PVDC cluster collection

Phase 6: Cross-Reference Resolution
    └── Matches bare metal ↔ ESXi hosts, VLANs, storage

Phase 7: Relationship Mapping
    └── Classic + VMware hierarchy relationships
```

The IAM token exchange is initiated in parallel with Phase 2 setup so the token is ready by the time VMware tasks execute. If the token exchange fails (API key lacks IAM permissions), VMware phases are skipped and Classic collection proceeds normally with a warning.

### 12.8 Export Integration

VMware data is exported as additional worksheets in the same XLSX file:

| Worksheet | Content |
|-----------|---------|
| vVMwareInstances | vCenter Server instance inventory |
| vVMwareClusters | VMware cluster inventory (VCF for Classic) |
| vDirectorSites | Director site inventory (VCF as a Service) |
| vPVDCs | Provider VDC inventory |
| vVCFClusters | VCF as a Service cluster inventory |
| vVDCs | Virtual Data Center inventory |
| vMultitenantSites | Multitenant director site inventory |
| vVMwareCrossReferences | VMware ↔ Classic cross-reference mapping |

**Note:** The `v` prefix convention is maintained. Existing Classic worksheets gain the `vmwareRole` column where applicable.

### 12.9 VMware Relationship Mapping

#### 12.9.1 VMware Internal Hierarchy

| Parent Resource | Child Resource | Relationship |
|-----------------|----------------|-------------|
| vCenter Instance | VMware Cluster | Instance contains clusters |
| Director Site | PVDC | Site contains PVDCs |
| PVDC | VCF Cluster | PVDC contains clusters |
| Director Site | VDC | Site hosts VDCs |
| VDC | Edge | VDC has an edge gateway |
| Edge | Transit Gateway | Edge connects to transit gateways |

#### 12.9.2 VMware ↔ Classic Cross-References

| VMware Resource | Classic Resource | Relationship |
|-----------------|-----------------|-------------|
| ESXi Host | Bare Metal Server | Host runs on bare metal |
| VMware Cluster | VLANs | Cluster uses VLANs for management/vMotion/vSAN/workload |
| VMware Instance | Subnets | Instance uses portable subnets |
| VMware Datastore | Block/File Storage | Datastore mapped to Classic storage volume |

### 12.10 Future: VCD Tenant Data

A future enhancement may integrate VMware Cloud Director (VCD) tenant-level data. This would require:

- **Additional credentials:** VCD organization administrator username/password or API token
- **Different API:** VMware Cloud Director REST API (`https://{vcd-url}/api/`)
- **Resources:** vApps, VMs, org networks, catalogs, media, independent disks, edge gateway rules

This is deferred to a future phase and will not be implemented in the initial VMware integration.

---

## 13. VPC Migration Analysis (Implemented)

### 13.1 Overview

The VPC Migration Analysis feature provides rule-based analysis capabilities to help organisations assess their readiness for migrating from IBM Cloud Classic to VPC infrastructure. All analysis runs **client-side** using data already collected in DataContext — no backend endpoints required. The technical design is documented in `MIGRATION.md`.

**Current scope (Phase 2A — Rule-Based Analysis):**
- 9 analysis engines covering compute, network, storage, security, feature gaps, dependencies, complexity scoring, cost comparison, and wave planning
- Per-resource-type pre-requisite remediation checklists with pass/fail/warning/unknown status
- Interactive dashboard with Carbon Design System UI
- Unified DOCX report export with TOC, pie charts, numbered captions, headers/footers (conditionally includes migration sections)

**Current scope (Phase 2B — AI-Powered Features):**
- watsonx.ai integration via separate AI proxy service (see Section 15)
- AI-enriched migration insights (executive summary, risks, recommendations)
- AI infrastructure chat for Q&A about collected data
- AI cost optimization narratives
- AI-enhanced DOCX report sections
- Settings page for AI proxy configuration and report branding

**Current scope (Phase 2C — Terraform Export):**
- Multi-region Terraform zip generation (one VPC per region, derived from Classic DC mappings)
- Security groups duplicated per VPC based on Classic server bindings (inferred from `collectedData['relationships']`)
- Single Terraform workspace with provider aliases per region
- Transit Gateway connecting VPCs + Classic when 2+ regions (prefix-filtered routes: PERMIT migration CIDRs, DENY all else)
- Migration subnet per VPC (172.16.{index}.0/24) reachable from Classic via TGW
- Modular structure: vpc, subnets, security_groups, network_acls, transit_gateway modules
- Browser-only generation — no backend calls required

**Future scope (not yet implemented):**
- Ansible playbook export generation
- Migration execution tracking

### 13.2 Implemented Features

#### 13.2.1 Compute Assessment
- Classic VSI → VPC instance profile mapping using 71 predefined profiles (bx2/bx3d/cx2/cx3d/mx2/mx3d/vx2d/ux2d families)
- Profile selection algorithm based on vCPU/memory ratio (compute ≤2.5, balanced ≤5, memory ≤10, very-high-memory ≤14, ultra-high-memory >14) and closest-fit matching
- OS compatibility checking against 15-entry matrix (RHEL, Ubuntu, CentOS, Debian, Windows, FreeBSD)
- Bare metal migration path assessment (virtualise, VPC bare metal, PowerVS for Oracle, PowerVS for SAP, or not migratable)
- Oracle bare metal detection: hardware profile matching against 3 IBM Oracle-certified HCL configurations (4c/64GB, 16c/384GB, 48c/768GB) combined with "No OS" / Oracle Linux detection. Matched servers are recommended for migration to IBM Power Virtual Server (PowerVS) running Oracle on AIX. See [IBM Bare Metal Servers for Oracle](https://www.ibm.com/products/bare-metal-servers-oracle) and [PowerVS Oracle deployment](https://cloud.ibm.com/docs/power-iaas?topic=power-iaas-use-case-oracle)
- SAP HANA bare metal detection: hardware profile matching against 9 IBM SAP-certified configurations (36c/192GB, 36c/384GB, 36c/768GB, 32c/192GB, 32c/384GB, 40c/768GB, 56c/1536GB, 56c/3072GB, 112c/3072GB) combined with SAP-specific OS (SLES for SAP / RHEL for SAP) or hostname pattern detection. Configs ≤768 GB are directed to SAP-certified VPC Bare Metal profiles (bx2d-metal-96x384, mx2d-metal-96x768); configs >768 GB are directed to IBM Power Virtual Server (PowerVS). See [SAP HANA Classic BM profiles](https://cloud.ibm.com/docs/sap?topic=sap-hana-iaas-offerings-profiles-intel-bm)
- Per-instance status classification: Ready / Needs Work / Blocked

#### 13.2.2 Network Assessment
- VLAN → VPC subnet mapping with zone assignment via 8-region datacenter mapping
- Gateway appliance assessment (native VPC vs third-party appliance requirement)
- Firewall rule translation estimation (auto-translatable vs manual review)
- Load balancer type mapping (Classic → VPC Application/Network LB)
- IPsec VPN tunnel migration assessment
- Network complexity scoring (low/medium/high/very-high)

#### 13.2.3 Storage Assessment
- Block storage IOPS tier mapping using 5-tier lookup table
- Migration strategy recommendation (snapshot-based for <2TB, replication-based for larger)
- File storage NFS v3→v4.1 compatibility flagging
- Object Storage pass-through identification (same COS service)

#### 13.2.4 Security Assessment
- Security group migration planning with VPC group count estimation
- SSL certificate inventory with expiry detection (expired, expiring within 30 days)
- SSH key import validation
- Secrets Manager recommendation for certificate management

#### 13.2.5 Feature Gap Analysis
- 10 Classic-only feature detections with severity classification
- Resource-aware detection (scans collected data for affected resources)
- Datacenter availability checking (unsupported VPC regions)
- Workaround recommendations for each gap

#### 13.2.6 Migration Complexity Scoring
- Overall readiness score (0–100%) from weighted dimensions (compute 30%, network 25%, storage/security/features 15% each)
- Per-dimension scores with findings lists
- Complexity categorisation: Low / Medium / High / Very High

| Score Range | Category | Characteristics |
|-------------|----------|-----------------|
| 0-25 | Low | Few resources, simple network, no blockers |
| 26-50 | Medium | Moderate resources, some network complexity |
| 51-75 | High | Many resources, complex network, some gaps |
| 76-100 | Very High | Large environment, complex dependencies |

#### 13.2.7 Cost Comparison
- Classic vs VPC monthly cost estimation by category (compute, storage, network)
- VPC cost projection using profile pricing and storage tier rates
- Monthly savings, percentage change, break-even analysis
- 3-year TCO projection

**Pricing data limitation:** The IBM Cloud catalog/pricing API (`globalcatalog.cloud.ibm.com`) returns **list prices** only. It does not reflect account-specific discounts such as committed use, enterprise/volume discounts, or custom negotiated contract pricing. All VPC estimated costs displayed in the migration assessment panels (e.g., `recommendedProfile.estimatedCost`) are therefore based on list prices. The IBM Cloud Billing and Usage APIs (`billing.cloud.ibm.com`) can show actual billed amounts retrospectively but do not provide a prospective rate card. Users with negotiated discounts should treat VPC estimates as upper-bound figures.

#### 13.2.8 Migration Wave Planning
- Automatic resource grouping into ordered waves: Foundation → Network → Storage → Compute → Cutover
- Per-wave: resources, prerequisites, estimated duration, validation steps, rollback plan
- Large compute sets split into multiple batches

#### 13.2.9 Dependency Mapping
- Directed dependency graph built from collected data relationships
- Interactive visualisation using @xyflow/react
- Node types: gateway, VLAN, subnet, VSI, bare metal, storage, firewall, load balancer

#### 13.2.10 Pre-Requisite Remediation Checklists

Each migration assessment tab (Compute, Network, Storage, Security) includes a remediation checklist panel that evaluates per-resource-type pre-requisite checks against the collected Classic data. Checks produce one of five severity levels: **blocker**, **warning**, **info**, **unknown** (cannot determine from API), or **passed**.

**Compute checks (23):**

| Check | Severity | Logic |
|---|---|---|
| Boot Disk Maximum (250 GB) | blocker | `blockDevices[0].capacity > 250` |
| Data Volume Count Maximum (12) | blocker | `blockDevices.length - 1 > 12` |
| vCPU Maximum (200) | blocker | `maxCpu > 200` |
| Memory Maximum (5,600 GiB) | blocker | `maxMemory > 5734400` MB |
| OS Compatibility | blocker | OS not available in VPC image catalog |
| Datacenter Availability | blocker | Classic DC has no VPC region mapping |
| Disk Size (2 TB per volume) | warning | Any `blockDevice.capacity > 2000` |
| Local Disk Usage | warning | `localDiskFlag === true` |
| Private Network Only | info | `privateNetworkOnlyFlag === true` |
| Cloud-init / Cloudbase-init | unknown | Cannot determine from API |
| Virtio Drivers | unknown | Cannot determine from API |
| Migration Downtime Planning | unknown | Informational |
| Gateway Member (BM) | blocker | `networkGatewayMemberFlag === true` |
| Core Count Maximum 192 (BM) | blocker | `processorPhysicalCoreAmount > 192` |
| Memory Maximum 768 GB (BM) | blocker | `memoryCapacity > 768` |
| Network Speed Compatibility (BM) | warning | NIC speed > 25 Gbps |
| Hypervisor Detected — VMware / XenServer / Hyper-V (BM) | blocker | OS/notes/tags match `vmware\|vsphere\|esxi\|xenserver\|hyper-v` |
| Potential Oracle Workload (BM) | warning | Hardware matches Oracle HCL config (4c/64GB, 16c/384GB, 48c/768GB) + No OS / Oracle Linux |
| Potential SAP Workload (BM) | warning | Hardware matches SAP HANA-certified config (9 profiles) + SLES/RHEL for SAP OS or SAP hostname pattern |
| 32-bit Operating System | blocker | OS string matches 32-bit pattern (`32-bit`, `i386`, `x86` non-64) |
| End-of-Life Operating System | warning | OS matches EOL versions (CentOS 5-7, RHEL 5-6, Win 2003/2008, Debian 8-9, Ubuntu 14/16, SLES 11-12) |
| Single-Socket High Clock Speed (BM) | unknown | Processor model/speed not in API mask — cannot determine |
| Possible IKS/ROKS Worker Node | warning | Hostname contains "kube" — likely IKS or ROKS worker node, cluster must be recreated on VPC |

**Storage checks (7):**

| Check | Severity | Logic |
|---|---|---|
| Block Volume Size (16 TB max) | blocker | `capacityGb > 16384` |
| File Volume Size (32 TB max) | blocker | `capacityGb > 32768` |
| IOPS Compatibility | warning | Custom IOPS > 48,000 |
| Snapshot Configuration | info | Has snapshot schedules |
| Replication Partners | info | Has replication configured |
| Volume Attachment Count | info | VSI with > 12 attached volumes |
| Multi-Attach Block Storage | warning | Block volume authorized for > 1 host or > 1 subnet (false positives possible — authorization ≠ active mount) |

**Network checks (9):**

| Check | Severity | Logic |
|---|---|---|
| Firewall Rule Count | warning | Rules per firewall > 25 |
| Security Group Rule Count | warning | Rules per SG > 25 |
| Load Balancer Type | info | All LBs listed with type mapping |
| Gateway Appliance | warning | Gateways requiring appliance migration |
| VLAN Subnet Mapping | info | VLANs in DCs without VPC region |
| Public IP Address | blocker | VSI/Bare Metal has a public IP (public subnets cannot migrate to VPC) |
| VPC Reserved IP Conflict | warning | Private IP falls on a VPC reserved address (network, gateway, DNS, future, broadcast) |
| IPv6 Address Usage | warning | Subnet `networkIdentifier` contains `:` or `subnetType` contains IPv6 (false positives possible — IPv6 often auto-assigned) |
| VRRP High Availability Pattern | unknown | VRRP config not exposed by SoftLayer API — cannot determine |

**Security checks (3):**

| Check | Severity | Logic |
|---|---|---|
| SSL Certificate Expiry | warning | Expires within 90 days |
| SSH Key Compatibility | passed | SSH keys work in VPC |
| Hardware Security Module (HSM) | warning | Billing item category matches `security_module`/`hsm` or BM hostname/notes contain "HSM" — migrate to Key Protect or HPCS |

**UI presentation:**
- Reusable `RemediationChecklist` component using Carbon `Accordion`
- Summary badges at top: "X Blockers" (red Tag), "X Warnings" (warm-gray Tag), or "All checks passed" (green Tag)
- Rows sorted by severity: Blockers → Warnings → Info → Unknown → Passed
- Each row shows: severity icon, check name, severity tag, affected count badge
- Expanded detail shows: description, threshold, remediation steps (dark box), "View Documentation" link to IBM docs, affected resource list (max 5 shown, expandable "... and N more" toggle)

**Data types:**

```typescript
type CheckSeverity = 'blocker' | 'warning' | 'info' | 'unknown' | 'passed';

interface PreRequisiteCheck {
  id: string;
  name: string;
  category: 'compute' | 'storage' | 'network' | 'security';
  description: string;
  threshold?: string;
  docsUrl: string;
  remediationSteps: string[];
}

interface CheckResult {
  check: PreRequisiteCheck;
  severity: CheckSeverity;
  affectedCount: number;
  totalChecked: number;
  affectedResources: AffectedResource[];
}

interface PreReqCheckResults {
  compute: CheckResult[];
  storage: CheckResult[];
  network: CheckResult[];
  security: CheckResult[];
}
```

`PreReqCheckResults` is added to `MigrationAnalysisOutput` as `prereqChecks` and computed by `runAllPreReqChecks()` in `src/services/migration/checks/index.ts`.

#### 13.2.11 VPC Pricing Reference

A dedicated **"VPC Pricing"** tab in the Migration Dashboard displays all VPC pricing elements used by the cost comparison engine. This tab is **always available** — it does not require running an analysis first, since pricing data loads on mount independently.

**Backend pricing endpoint (`GET /api/migration/pricing`):**

The backend attempts to fetch live pricing from the IBM Cloud Global Catalog API (`globalcatalog.cloud.ibm.com/api/v1`) for `is.instance`, `is.bare-metal-server`, `is.volume`, and `is.floating-ip` services. Newer-generation profiles (bx3d-\*, cx3d-\*, mx3d-\*, etc.) exist as individual catalog plans with per-profile `instance-hours` metrics. Older-generation profiles (bx2-\*, cx2-\*, mx2-\*, etc.) are bundled under aggregate plans (e.g. `gen2-instance`) with per-vCPU/RAM pricing that cannot be extracted per-profile. After the live catalog fetch, the endpoint merges any missing profiles from the static fallback file (`src/services/migration/data/vpcPricing.json`), ensuring complete coverage across all generations. If the live fetch fails entirely or returns no extractable profile data, it falls back to the static JSON file alone. The response includes a `source` field indicating which path was used:

| Field | Value | Meaning |
|-------|-------|---------|
| `source` | `'live-catalog'` | Pricing fetched successfully from IBM Cloud Global Catalog API |
| `source` | `'fallback-file'` | Live fetch failed or returned no profiles; static fallback JSON used |

The response is cached server-side for 24 hours (`CACHE_TTL_MS`).

**Frontend type (`VPCPricingData`):**

```typescript
interface VPCPricingData {
  generatedAt: string;
  region: string;
  source?: 'live-catalog' | 'fallback-file';
  profiles: Record<string, { monthlyCost: number }>;
  storage: { 'block-general': number; 'block-5iops': number; 'block-10iops': number; file: number };
  network: { 'floating-ip': number; 'vpn-gateway': number; 'load-balancer': number };
}
```

**VPCPricingPanel component (`src/components/migration/VPCPricingPanel.tsx`):**

- **Source indicator:** A `Tile` at the top showing a Carbon `Tag` — green "Live Catalog" or blue "Fallback File" — plus the `region` and `generatedAt` timestamp
- **Compute Profiles table:** Carbon `DataTable` (sortable) with columns: Profile Name, Family, vCPUs, Memory (GB), Bandwidth (Gbps), Monthly Cost ($). Rows are built by merging the 71 `VPC_PROFILES` spec entries with pricing data from the `profiles` record. A `Dropdown` filter allows filtering by profile family (balanced, compute, memory, very-high-memory, ultra-high-memory)
- **Storage Pricing table:** 4 rows — Block General (3 IOPS/GB), Block 5 IOPS/GB, Block 10 IOPS/GB, File Storage — showing $/GB/month
- **Network Pricing table:** 3 rows — Floating IP, VPN Gateway, Application Load Balancer — showing $/month

**Context exposure:** `MigrationContext` exposes `pricing: VPCPricingData | null` alongside the existing `pricingLoaded: boolean`, allowing the VPC Pricing tab to render without depending on analysis state.

### 13.3 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (Client-Side)                       │
│                                                                 │
│  ┌────────────────┐    ┌────────────────────────────────┐       │
│  │ DataContext     │───►│ Migration Analysis Engines    │       │
│  │ (collectedData)│    │                                │       │
│  └────────────────┘    │  - computeAnalysis.ts          │       │
│                        │  - networkAnalysis.ts          │       │
│  ┌────────────────┐    │  - storageAnalysis.ts          │       │
│  │ Preferences    │───►│  - securityAnalysis.ts         │       │
│  │ (user input)   │    │  - featureGapAnalysis.ts       │       │
│  └────────────────┘    │  - dependencyMapping.ts        │       │
│                        │  - complexityScoring.ts        │       │
│                        │  - costComparison.ts           │       │
│                        │  - wavePlanning.ts             │       │
│                        │  - checks/ (prereq checklists) │       │
│                        └───────────────┬────────────────┘       │
│                                        │                        │
│                                        ▼                        │
│                        ┌────────────────────────────────┐       │
│                        │ MigrationContext               │       │
│                        │ (analysisResult state)         │       │
│                        └───────────────┬────────────────┘       │
│                                        │                        │
│                       ┌────────────────┼────────────────┐       │
│                       ▼                ▼                ▼       │
│              ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│              │ Dashboard UI │  │ DOCX Report  │  │ AIContext │  │
│              │ (Carbon+Tabs)│  │ (modular)    │  │ (insights │  │
│              │ + AI Panels  │  │ (docx pkg)   │  │  chat,    │  │
│              └──────────────┘  └──────┬───────┘  │  costs)   │  │
│                                       │          └─────┬─────┘  │
│                                       │                │        │
│                         ┌─────────────┴────────────────┘        │
│                         │ Optional AI narrative requests        │
│                         ▼                                       │
│                 ┌──────────────────┐                            │
│                 │ AI Proxy Client  │                            │
│                 │ (X-API-Key auth) │                            │
│                 └────────┬─────────┘                            │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS
                           ▼
                 ┌──────────────────┐      ┌──────────────────────┐
                 │ AI Proxy Service │─────►│ IBM watsonx.ai       │
                 │ (Code Engine)    │      │ granite-3-8b-instruct│
                 └──────────────────┘      └──────────────────────┘
```

**Key design decisions:**
- All rule-based analysis runs as pure functions consuming `collectedData` + `MigrationPreferences` — no additional backend endpoints beyond pricing
- VPC pricing is the one backend-fetched resource (`GET /api/migration/pricing`), cached for 24 hours, with automatic fallback to a static JSON file. The frontend also bundles `vpcPricing.json` as a client-side fallback — `applyPricing()` and `applyBareMetalPricing()` use it for any profile not found in server-fetched pricing, ensuring VPC cost estimates are never $0
- `runAnalysis()` executes synchronously via `requestAnimationFrame` to avoid UI freeze
- DOCX generation uses a modular section-builder architecture (`src/services/report/docx/`) with the `docx` npm package entirely in-browser; `file-saver` handles download. A single unified report conditionally includes migration sections when migration data is available
- AI features are optional enhancements — all AI calls go through an independent AI proxy service configured via Settings page. AI degrades gracefully when the proxy is unavailable
- Privacy by design: only aggregated/sanitized data is sent to the AI proxy. Context builders strip hostnames, IP addresses, and other identifying information before submission
- AI-generated content in DOCX reports is styled with purple accents and includes a disclaimer
- Reference data (VPC profiles, OS compatibility, datacenter mapping) stored as const lookup tables

### 13.4 User Interface

- **Navigation:** "Migration Analysis" menu item between Geography and the resource divider in SideNav
- **Route:** `/migration`
- **Layout:** Preferences panel → Readiness Score Card → 9 tabbed assessment panels (Compute, Network, Storage, Security, Feature Gaps, Costs, Migration Waves, Dependencies, VPC Pricing)
- **Remediation Checklists:** Each of the first 4 assessment tabs (Compute, Network, Storage, Security) includes a `RemediationChecklist` component below the existing content, showing pre-requisite checks sorted by severity with expandable detail rows
- **Export:** Unified DOCX report via modal dialog (includes migration sections when analysis data is available)
- **Components:** Follow existing Carbon Design System patterns — DataTable, Tabs, Tags, Tiles, Accordion, ProgressBar, Recharts for cost charts, @xyflow/react for dependency graph

### 13.5 Report Export

A single unified DOCX report is generated via the Report Export Dialog (see Section 15.7 for full details). The report automatically includes migration sections when migration analysis data is available.

**Always included:**
- Cover page with client name, company, date, IBM branding
- Table of Contents (auto-updates on open in Word)
- Executive summary (AI-enhanced or rule-based)
- Environment overview with resource counts, datacenter distribution, and pie charts (resource distribution by category, datacenter spread)
- Per-resource-type inventory tables with numbered captions
- Appendices (glossary, version info)
- Headers ("IBM Cloud Infrastructure Report") and footers (page numbers) — skipped on cover page
- Page breaks between all major (H1) sections

**Conditionally included (when migration data is present):**
- Migration readiness score breakdown with readiness-by-dimension pie chart
- Compute assessment with VSI and bare metal migration tables
- Network assessment with VLAN-to-subnet mapping table
- Storage assessment summary
- Security assessment summary
- Feature gap analysis table
- Cost comparison table with category breakdown and Classic cost breakdown pie chart (AI cost optimization narrative when available)
- Migration wave plan with per-wave details
- Recommendations (AI-enhanced or rule-based)
- Methodology and assumptions

All tables and charts have auto-incrementing numbered captions ("Table N: ..." / "Figure N: ..."). AI-enhanced narrative sections are visually distinguished with purple styling and include a disclaimer.

### 13.6 Terraform Export (Phase 2C)

The Terraform export generates a downloadable zip containing a complete, multi-region Terraform configuration for migrating Classic infrastructure to VPC.

#### Architecture

- **Multi-region:** One VPC per VPC region, derived from Classic datacenter-to-region mapping (8 mappings covering dal/wdc/lon/fra/tok/syd/che/sao)
- **Single workspace:** All regions managed in one Terraform workspace with provider aliases per region
- **Modular:** Reusable child modules (vpc, subnets, security_groups, network_acls, transit_gateway) called per region with provider passthrough
- **Browser-only:** All generation runs client-side using data from DataContext — no backend calls

#### Generated Structure

```
terraform-vpc-migration/
├── README.md              # Multi-region docs with architecture diagram
├── main.tf                # Per-region module calls + conditional TGW module
├── variables.tf           # vpcs map variable, TGW vars, tags
├── terraform.tfvars       # Pre-populated nested per-region data
├── outputs.tf             # Per-region outputs (vpc_ids, subnet_ids, tgw_id)
├── versions.tf            # Terraform >= 1.5, IBM-Cloud/ibm >= 1.71.0
├── provider.tf            # Provider aliases per region + default provider
└── modules/
    ├── vpc/               # VPC + migration subnet (172.16.x.0/24)
    ├── subnets/           # Address prefixes + subnets (unchanged, per region)
    ├── security_groups/   # SGs + rules (unchanged, per region)
    ├── network_acls/      # Default allow-all ACL (unchanged, per region)
    └── transit_gateway/   # TGW + VPC connections + Classic connection + prefix filters
```

#### Data Flow

1. `useTerraformExport` hook extracts subnet recommendations, SG rules, relationships, virtualServers, and bareMetal from analysisResult + collectedData
2. `groupByRegion()` transform groups subnets by DC→region mapping, infers SG→region from relationship bindings (Security Group → Virtual Server/Bare Metal → hostname → datacenter → region)
3. SGs with no server bindings are replicated to ALL VPCs
4. Per-region `TerraformRegionConfig` built with transformed subnets, SGs, and migration subnet CIDR
5. Transit Gateway included only when 2+ regions; prefix filters PERMIT only migration subnet CIDRs on Classic connection

#### Edge Cases

- **Unavailable datacenter (che01):** Subnets from `available: false` DCs fall back to `preferences.targetRegion`
- **Single region:** No TGW module, no TGW variables, simpler outputs
- **SGs with no bindings:** Duplicated into all VPCs as a safety measure
- **Migration subnet CIDR:** `172.16.{regionIndex}.0/24` (index = sorted region position, avoids Classic 10.x range)

### 13.7 Future Enhancements

| Feature | Description |
|---------|-------------|
| ~~Terraform Generation~~ | ~~Auto-generate VPC infrastructure code~~ — **Implemented** (Phase 2C): multi-region Terraform zip with VPC/subnet/SG/ACL/TGW modules |
| Ansible Playbooks | Generate migration automation scripts |
| Migration Execution | Actually perform migration steps via API |
| Progress Tracking | Track migration execution status |
| XLSX Migration Sheet | Add migration data as additional worksheet in standard export |
| PowerVS Migration Detail | Expanded Oracle/PowerVS sizing recommendations, AIX compatibility matrix, and automated PowerVS workspace provisioning |
| SAP PowerVS Sizing | Detailed SAP HANA memory sizing for PowerVS, SAP Application Performance Standard (SAPS) benchmarks, and SAP Note cross-reference |

---

## 14. VPC Infrastructure Explorer

### 14.1 Overview

The VPC Infrastructure Explorer provides a fully independent section for inventorying IBM Cloud VPC infrastructure resources. It operates separately from the Classic Infrastructure collection — with its own data collection (SSE), context, pages, and XLSX export — sharing only the authentication flow (IBM Cloud API key → IAM token) and the UI shell (Header, SideNav, Carbon components).

**Key characteristics:**
- Completely separate `VpcDataContext` — no coupling with Classic `DataContext`
- Reuses the IBM Cloud API key from `AuthContext` (same key works for both SoftLayer Basic auth and VPC IAM token auth)
- Multi-region fan-out: collects from all available VPC regions automatically
- 19 VPC resource types across 5 categories
- Independent SSE-based collection stream via `/api/vpc/collect/stream`
- Independent XLSX export via `/api/vpc/export`

### 14.2 VPC Resource Types

| Category | Resource | API Path | Frontend Key |
|----------|----------|----------|-------------|
| Compute | Virtual Server Instances | `/v1/instances` | `vpcInstances` |
| Compute | Bare Metal Servers | `/v1/bare_metal_servers` | `vpcBareMetalServers` |
| Compute | Dedicated Hosts | `/v1/dedicated_hosts` | `vpcDedicatedHosts` |
| Compute | Placement Groups | `/v1/placement_groups` | `vpcPlacementGroups` |
| Network | VPCs | `/v1/vpcs` | `vpcs` |
| Network | Subnets | `/v1/subnets` | `vpcSubnets` |
| Network | Security Groups | `/v1/security_groups` | `vpcSecurityGroups` |
| Network | Floating IPs | `/v1/floating_ips` | `vpcFloatingIps` |
| Network | Public Gateways | `/v1/public_gateways` | `vpcPublicGateways` |
| Network | Network ACLs | `/v1/network_acls` | `vpcNetworkAcls` |
| Network | Load Balancers | `/v1/load_balancers` | `vpcLoadBalancers` |
| Network | VPN Gateways | `/v1/vpn_gateways` | `vpcVpnGateways` |
| Network | Endpoint Gateways | `/v1/endpoint_gateways` | `vpcEndpointGateways` |
| Network | Routing Tables | `/v1/vpcs/{vpc_id}/routing_tables` | `vpcRoutingTables` |
| Network | Routes | `/v1/vpcs/{vpc_id}/routing_tables/{rt_id}/routes` | `vpcRoutes` |
| Network | Transit Gateways | `/v1/transit_gateways` (transit.cloud.ibm.com) | `transitGateways` |
| Network | Transit Gateway Connections | `/v1/transit_gateways/{id}/connections` (transit.cloud.ibm.com) | `transitGatewayConnections` |
| Network | TGW Route Prefixes | `/v1/transit_gateways/{id}/route_reports` (transit.cloud.ibm.com) | `tgwRoutePrefixes` |
| Network | TGW VPC VPN Gateways | `/v1/vpn_gateways` (per VPC region connected via TGW) | `tgwVpcVpnGateways` |
| Network | Direct Link Gateways | `/v1/gateways` (directlink.cloud.ibm.com) | `directLinkGateways` |
| Network | Direct Link Virtual Connections | `/v1/gateways/{id}/virtual_connections` (directlink.cloud.ibm.com) | `directLinkVirtualConnections` |
| Network | VPN Gateway Connections | `/v1/vpn_gateways/{id}/connections` | `vpnGatewayConnections` |
| Storage | Block Storage Volumes | `/v1/volumes` | `vpcVolumes` |
| Security | SSH Keys | `/v1/keys` | `vpcSshKeys` |
| Security | Images (private) | `/v1/images?visibility=private` | `vpcImages` |
| Other | Flow Log Collectors | `/v1/flow_log_collectors` | `vpcFlowLogCollectors` |

Each regional record is enriched with a `_region` field indicating the region it was collected from. Transit Gateways are global resources collected via the Transit Gateway API at `transit.cloud.ibm.com` (not per-region). Transit Gateway Connections are sub-resources fetched for each transit gateway, with the parent gateway's id and name injected.

**TGW Route Prefixes** are collected by creating a route report via `POST /transit_gateways/{id}/route_reports`, then polling the report status every 2 seconds (max 15 attempts) until `status === 'complete'`. The report's `connections[].routes[].prefix` values are preserved in two forms: a flat deduplicated sorted `prefixes` array for backward compatibility, and a `connectionPrefixes` array that groups prefixes by connection (with `connectionId`, `connectionName`, `connectionType`, and per-connection `prefixes`). This enables topology diagrams to show which prefixes (e.g., PowerVS subnets) belong to which TGW connection. On timeout or error, empty prefixes are returned (non-fatal). Route reports are collected in both Classic and VPC collection flows.

**TGW VPC VPN Gateways** are discovered by examining TGW connections with `network_type === 'vpc'`, parsing the VPC region and ID from the connection's `network_id` CRN, grouping by region, and fetching `/v1/vpn_gateways` per region. VPN gateways are matched to their parent TGW via the VPC ID. Each record includes the VPN gateway's id, name, status, mode, plus parent TGW context and VPC context (id, name, region).

**Direct Link Gateways** are global resources collected via `GET /v1/gateways` at `directlink.cloud.ibm.com`. The collection runs before regional VPC resources to enable per-gateway virtual connection fetches. Each gateway record includes id, name, type, speed, operational status, and location.

**Direct Link Virtual Connections** are sub-resources fetched via `GET /v1/gateways/{id}/virtual_connections` for each Direct Link gateway. Each record includes the connection id, name, type, network account/id, status, and parent gateway context (id, name).

**VPN Gateway Connections** are sub-resources fetched via `GET /v1/vpn_gateways/{id}/connections` for each VPN gateway. Each record includes connection id, name, status, peer address, local/peer CIDRs, IKE/IPsec policies, and parent gateway context. The `peerCidrsArray` field provides the remote subnets reachable via the VPN connection, used by the Routes page to show VPN-reachable networks.

**Routing Tables** are sub-resources of VPCs, collected via `GET /v1/vpcs/{vpc_id}/routing_tables` for each VPC. VPCs are collected first as a dependency, then grouped by region. Each routing table record includes id, name, lifecycle state, is_default flag, associated subnets, route count, and ingress settings. The `_region`, `_vpcId`, and `_vpcName` fields are injected for context.

**Routes** are sub-resources of routing tables, collected via `GET /v1/vpcs/{vpc_id}/routing_tables/{routing_table_id}/routes` for each routing table. Routing tables are collected first as a dependency. Each route record includes id, name, destination CIDR, action (deliver/delegate/drop), priority, origin, zone, and next_hop information. The transformation normalizes next_hop into human-readable `nextHopType` and `nextHopTarget` fields:
- **IP Address**: Direct IP routing (`next_hop.address`)
- **VPN Gateway**: VPN-based routing (`next_hop.resource_type === 'vpn_gateway'`)
- **Transit Gateway**: TGW connection routing (`next_hop.resource_type === 'vpc_routing_table_route_next_hop_transit_gateway_connection'`)
- **VPE Gateway**: Endpoint gateway routing (`next_hop.resource_type === 'endpoint_gateway'`)
- **Service**: Direct Link or Classic infrastructure routes (`origin === 'service'`)

When viewing a routing table in the detail panel, the associated routes are displayed in a compact table showing destination CIDR, action, and formatted next-hop information.

### 14.3 Authentication & IAM Token Exchange

VPC APIs use IAM Bearer token authentication. The `VpcClient` exchanges the user's IBM Cloud API key for an IAM access token:

```
POST https://iam.cloud.ibm.com/identity/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<API_KEY>
```

The token is cached in memory with a 60-second expiry buffer (re-exchanged when `expiration - 60s < now`). This follows the same pattern as the existing `VMwareClient`.

**Validation endpoint:** `POST /api/vpc/auth/validate` exchanges the token and confirms the API key has VPC access.

### 14.4 VPC API Client

The `VpcClient` class (`server/src/services/vpc/client.ts`) handles all VPC API communication:

- **Base URL pattern:** `https://{region}.iaas.cloud.ibm.com/v1/{path}?version=2024-06-01&generation=2`
- **Pagination:** Cursor-based via `next.href` field in responses; `requestAllPages()` follows all pages automatically
- **Retry:** Exponential backoff for HTTP 429 (rate limit) and 503 (service unavailable), up to 3 retries
- **Concurrency:** Region fan-out limited to 5 concurrent regions per resource type

### 14.5 Multi-Region Collection

Regions are auto-discovered via `GET /v1/regions` from the `us-south` seed endpoint. Only regions with `status === 'available'` are used. If discovery fails, a hardcoded fallback list is used:

| Region | Location |
|--------|----------|
| us-south | Dallas |
| us-east | Washington DC |
| eu-gb | London |
| eu-de | Frankfurt |
| eu-es | Madrid |
| jp-tok | Tokyo |
| jp-osa | Osaka |
| au-syd | Sydney |
| ca-tor | Toronto |
| br-sao | São Paulo |

Each resource collector fans out to all available regions concurrently (max 5 simultaneous), collects all pages, and injects the `_region` field into each item.

### 14.6 Data Collection (SSE)

**Endpoint:** `GET /api/vpc/collect/stream`

The aggregator (`server/src/services/vpc/aggregator.ts`) orchestrates collection:

1. Exchange IAM token
2. Discover available regions
3. Collect VPCs first (routing tables depend on them)
4. Collect routing tables (routes depend on them)
5. Collect routes
6. Collect remaining 23 resource types (including TGW Route Prefixes, Direct Link, VPN connections) at concurrency 10
7. Stream SSE events to the frontend

Total: 26 resource types collected.

**SSE event format** (same structure as Classic collection):

| Event | Payload |
|-------|---------|
| `progress` | `{ resource, status, completedResources, totalResources, phase }` |
| `data` | `{ resource, count, items }` |
| `error` | `{ resource, message }` |
| `complete` | `{ totalResources, duration, errors[] }` |

The frontend `useVpcDataCollection` hook connects to this SSE stream and dispatches updates to `VpcDataContext`.

### 14.7 Frontend Data Layer

**VpcDataContext** (`src/contexts/VpcDataContext.tsx`) — completely independent from `DataContext`:

| State | Type | Description |
|-------|------|-------------|
| `vpcCollectedData` | `Record<string, unknown[]>` | Collected resources keyed by frontend key |
| `vpcCollectionStatus` | `'idle' \| 'collecting' \| 'complete' \| 'error'` | Current collection state |
| `vpcProgress` | `{ resource, status, completedResources, totalResources, phase }` | Live progress |
| `vpcErrors` | `Array<{ resource, message }>` | Collection errors |
| `vpcCollectionDuration` | `number \| null` | Total collection time in ms |

**Hooks:**

| Hook | Purpose |
|------|---------|
| `useVpcDataCollection` | Start/cancel VPC collection, manages SSE connection |
| `useVpcExport` | Trigger XLSX export of VPC data |
| `useVpcDashboardMetrics` | Compute summary metrics (instance/VPC/subnet/volume counts, region distribution) |
| `useVpcCostData` | Aggregate VPC resource inventory by region |
| `useVpcTopologyData` | Build ReactFlow nodes/edges for VPC → Subnet → Instance hierarchy |
| `useVpcGeographyData` | Group VPC resources by region with lat/lng coordinates |

**Transform layer** (`src/services/vpc-transform.ts`): 17 transform functions flatten nested VPC API responses (snake_case) to frontend-friendly camelCase fields. The `VPC_TRANSFORMERS` map dispatches by resource key.

### 14.8 UI Integration

**Pages:**

| Route | Page | Description |
|-------|------|-------------|
| `/vpc/dashboard` | VpcDashboardPage | Summary stats, resource cards, progress, export |
| `/vpc/resources/:type` | VpcResourcePage | DataTable for any VPC resource type |
| `/vpc/topology` | VpcTopologyPage | VPC → Subnet → Instance hierarchy diagram |
| `/vpc/costs` | VpcCostsPage | Resource inventory breakdown by region |
| `/vpc/geography` | VpcGeographyPage | Region cards with resource counts |

**VPC Dashboard** (`src/components/vpc/VpcDashboard.tsx`):
- "Collect VPC Data" button with inline progress bar (not reusing Classic ProgressIndicator)
- Summary stat cards: Total Instances, Total VPCs, Total Subnets, Total Volumes
- Resource distribution by region
- Resource cards grid (17 cards) with count badges, linking to `/vpc/resources/:key`
- Export dialog integration

**VPC Resource Page** (`src/pages/VpcResourcePage.tsx`):
- Same pattern as Classic `ResourcePage` — reads resource type from URL param, looks up column definitions from `VPC_RESOURCE_TYPES`, reads data from `VpcDataContext`
- Reuses the existing `DataTable` component

### 14.9 VPC Export

**Endpoint:** `POST /api/vpc/export`

Accepts VPC collected data in the request body and returns an XLSX file with:

- **VPC Summary** sheet: collection metadata, resource counts
- One worksheet per resource type (prefixed `vVpc*`):

| Worksheet | Content |
|-----------|---------|
| vVpcInstances | Virtual server instance inventory |
| vVpcBareMetalServers | Bare metal server inventory |
| vVpcDedicatedHosts | Dedicated host inventory |
| vVpcPlacementGroups | Placement group inventory |
| vVpcs | VPC inventory |
| vVpcSubnets | Subnet inventory |
| vVpcSecurityGroups | Security group inventory |
| vVpcFloatingIps | Floating IP inventory |
| vVpcPublicGateways | Public gateway inventory |
| vVpcNetworkAcls | Network ACL inventory |
| vVpcLoadBalancers | Load balancer inventory |
| vVpcVpnGateways | VPN gateway inventory |
| vVpcEndpointGateways | Endpoint gateway inventory |
| vVpcVolumes | Block storage volume inventory |
| vVpcSshKeys | SSH key inventory |
| vVpcImages | Private image inventory |
| vVpcFlowLogCollectors | Flow log collector inventory |
| vTransitGateways | Transit gateway inventory |
| vTGConnections | Transit gateway connection inventory |

Uses the same blue header styling and auto-width columns as the Classic export.

### 14.10 Navigation Structure

The SideNav is organized into two labeled sections with styled header bars. See [Section 12.6.1](#1261-sidenav-structure) for the full SideNav layout including both Classic and VPC sections.

VPC dashboard links use short names (Summary, Topology, Cost Analysis, Geography) since the "VPC" section header provides context. VPC resource category menus similarly drop the "VPC " prefix (e.g., "VPC Compute" → "Compute"). Routes remain unchanged:

```
VPC section:
  Summary        → /vpc/dashboard
  Topology       → /vpc/topology
  Cost Analysis  → /vpc/costs
  Geography      → /vpc/geography
  ───── divider ─────
  Compute / Network / Storage / Security / Other
    → /vpc/resources/:type
```

VPC resource category menus display count badges from `VpcDataContext`, independently of Classic collection state.

---

## 15. AI-Powered Features

### 15.1 Overview

AI features are powered by IBM watsonx.ai (Granite 3 8B Instruct model) via a separate AI proxy service. All AI features are **optional** — they degrade gracefully when the proxy is unavailable or not configured. The AI proxy is deployed as an independent Code Engine application with its own container, scaling, and secrets.

**Privacy by design:** Only aggregated, sanitized data is sent to the AI proxy. Context builders (`src/services/ai/contextBuilders.ts`) strip hostnames, IP addresses, and other identifying information before any data leaves the browser. No raw infrastructure data is transmitted.

**Graceful degradation:** All AI UI elements check `isConfigured` and `isAvailable` from `AIContext`. When the proxy is unreachable, AI buttons/panels are hidden or disabled. Rule-based analysis continues to function independently.

### 15.2 AI Proxy Service

A standalone Express.js service deployed independently to IBM Code Engine.

**Directory:** `ai-proxy/`

```
ai-proxy/
  package.json
  tsconfig.json
  Dockerfile                      # Node 20 Alpine, port 8080
  deploy/
    code-engine.sh                # IBM Code Engine deployment script
  src/
    index.ts                      # Express app, route mounting
    config.ts                     # Typed env config
    middleware/
      auth.ts                     # X-API-Key shared-secret validation
      rateLimiter.ts              # 30 req/min sliding window per IP
      error.ts                    # Error handler with sanitized logging
    services/
      iamToken.ts                 # IAM token exchange + 30-min caching
      watsonx.ts                  # watsonx.ai text generation client
      cache.ts                    # In-memory LRU cache (100 entries, 30-min TTL)
    routes/
      health.ts                   # GET /health
      insights.ts                 # POST /api/insights
      chat.ts                     # POST /api/chat
      costOptimization.ts         # POST /api/cost-optimization
      reportNarratives.ts         # POST /api/report-narratives
    prompts/
      insights.ts                 # Migration insights prompt templates
      chat.ts                     # Infrastructure Q&A system prompt
      costOptimization.ts         # Cost optimization prompts
      reportNarratives.ts         # Per-section DOCX narrative prompts
    types/
      index.ts                    # Request/response interfaces
```

**Model:** `ibm/granite-3-8b-instruct` via `https://us-south.ml.cloud.ibm.com/ml/v1/text/generation`

**Authentication:** Shared secret in `AI_PROXY_SECRET` env var, validated via `X-API-Key` request header.

**Endpoints:**

| Method | Path | Purpose | Input |
|--------|------|---------|-------|
| GET | `/health` | Health check | - |
| POST | `/api/insights` | Migration executive summary, risks, recommendations | Aggregated analysis data |
| POST | `/api/chat` | Infrastructure Q&A with conversation history | Messages + infrastructure context |
| POST | `/api/cost-optimization` | Cost savings narrative and right-sizing | Cost analysis data |
| POST | `/api/report-narratives` | Prose sections for DOCX reports | Section type + relevant data |

**Caching:** Server-side LRU cache with 100 entry limit and 30-minute TTL. Requests with identical payloads return cached responses.

**Rate limiting:** 30 requests per minute per IP address, sliding window.

**IAM token caching:** IAM access token for watsonx.ai is cached for 30 minutes and refreshed automatically.

### 15.3 Frontend AI Service Layer

**AIContext** (`src/contexts/AIContext.tsx`) provides:

| State/Action | Type | Description |
|--------------|------|-------------|
| `isConfigured` | `boolean` | AI proxy is configured on the server (via `GET /api/ai/config`) and AI is enabled in localStorage |
| `isAvailable` | `boolean` | AI proxy health check succeeded |
| `insights` | `AIInsightsResponse \| null` | Cached migration insights |
| `insightsLoading` | `boolean` | Insights request in progress |
| `generateInsights(result)` | `function` | Trigger insights generation |
| `chatMessages` | `AIChatMessage[]` | Chat conversation history |
| `chatLoading` | `boolean` | Chat request in progress |
| `sendChatMessage(msg, data, result?)` | `function` | Send chat message |
| `clearChat()` | `function` | Clear conversation |
| `costOptimization` | `AICostOptimizationResponse \| null` | Cached cost optimization |
| `costLoading` | `boolean` | Cost optimization in progress |
| `generateCostOptimization(costData)` | `function` | Trigger cost optimization |

**Client-side caching:** AI responses are cached with 24-hour TTL, keyed on a hash of the input data. Cache is stored in memory (not localStorage).

**Context builders** sanitize data before sending to the AI proxy:
- `buildInsightsInput()` — aggregates analysis results, strips PII
- `buildChatContext()` — infrastructure summary for conversation context
- `buildCostInput()` — cost comparison data
- `buildReportNarrativeInput()` — per-section data for DOCX narratives

### 15.4 AI Chat

An infrastructure Q&A chat panel accessible from the Header chat icon (visible when AI is configured).

**Components:**
- `AIChatPanel` — Slide-in right panel (400px), fixed position
- `AIChatMessage` — Message bubbles (user: blue/right, assistant: purple-bordered/left)
- `AIChatInput` — TextArea with Send button, Enter key to send

The chat sends collected infrastructure data as context along with the user's message. Conversation history is maintained for multi-turn Q&A. The AI responds based on the actual collected data, not general knowledge.

### 15.5 AI Migration Insights

`AIInsightsPanel` component on the Migration Dashboard:
- "Generate AI Insights" button triggers a request to `/api/insights`
- Displays: executive summary tile, risk cards (severity-colored: critical/high/medium/low), recommendation list
- Purple accent borders distinguish AI content from rule-based analysis
- Includes AI disclaimer text

**Response format:**
```typescript
interface AIInsightsResponse {
  executiveSummary: string;
  risks: Array<{ title: string; severity: 'low' | 'medium' | 'high' | 'critical'; description: string }>;
  recommendations: string[];
}
```

### 15.6 AI Cost Optimization

`AICostInsights` component on the Cost Analysis page:
- "Get AI Suggestions" button triggers a request to `/api/cost-optimization`
- Displays: narrative text block, savings opportunity cards
- Only visible when migration cost analysis data is available and AI is configured

### 15.7 DOCX Report Generation

Reports are generated client-side using a modular section-builder architecture in `src/services/report/docx/`.

**Architecture:** A single `buildReport()` function orchestrates all section assembly. Each report section is a function (sync or async) returning `(Paragraph | Table)[]`. Sections accept optional `aiNarrative?: string` parameters — when provided, AI content is rendered with purple styling and a disclaimer. Migration sections are conditionally included when `migrationData` is passed.

**Document features:**
- **Table of Contents** — inserted after cover page using `TableOfContents` with `updateFields: true`; auto-refreshes when opened in Word
- **Headers** — "IBM Cloud Infrastructure Report" (left-aligned, small gray text); skipped on first page (cover)
- **Footers** — Centered page numbers; skipped on first page (cover)
- **Page breaks** — Each H1 section starts on a new page
- **Numbered captions** — Auto-incrementing "Table N: ..." and "Figure N: ..." captions on all tables and charts, reset at report start
- **Pie charts** — Canvas-rendered at 3× retina resolution (1440×840px), embedded as PNG `ImageRun`; uses IBM colour palette (`0F62FE`, `8A3FFC`, `24A148`, `FF832B`, `1192E8`, `DA1E28`, `009D9A`, `EE538B`)

**Section builders** (`src/services/report/docx/sections/`):

| Section | Included | AI-Enhanced | Charts |
|---------|----------|-------------|--------|
| `coverPage` | Always | No | — |
| `executiveSummary` | Always | Yes | — |
| `environmentOverview` | Always | Yes | Resource distribution, Datacenter spread |
| `inventoryDetails` | Always | No | — |
| `migrationReadiness` | Migration only | Yes | Readiness by dimension |
| `computeAssessment` | Migration only | Yes | — |
| `networkAssessment` | Migration only | Yes | — |
| `storageAssessment` | Migration only | Yes | — |
| `securityAssessment` | Migration only | Yes | — |
| `featureGaps` | Migration only | No | — |
| `costAnalysis` | Migration only | Yes | Classic cost breakdown |
| `wavePlan` | Migration only | No | — |
| `recommendations` | Migration only | Yes | — |
| `assumptions` | Migration only | No | — |
| `appendices` | Always | No | — |

**Utility modules:**
- `utils/styles.ts` — Colors (IBM Blue `#0F62FE`, AI Purple `#8A3FFC`, Green `#24A148`, Orange `#FF832B`, Red `#DA1E28`, Medium Gray `#E0E0E0`), heading/body/bullet/spacer/pageBreak helpers. Heading sizes: H1=32, H2=26, H3=22 half-points
- `utils/tables.ts` — Styled table builders with alternating row colours and cell padding (margins)
- `utils/charts.ts` — `renderPieChart()` canvas renderer and `buildPieChartImage()` DOCX paragraph builder
- `utils/captions.ts` — `resetCaptionCounters()`, `tableCaption()`, `figureCaption()` for auto-incrementing numbered captions
- `utils/aiSections.ts` — AI disclaimer paragraph (purple italic), AI narrative wrapper
- `utils/branding.ts` — Read report branding from localStorage

**Report generation flow:**
1. User clicks "Generate Report" → Report Export Dialog opens
2. User enters client name, toggles AI narratives (no report type selection — unified report)
3. If AI enabled, hook fetches narratives for each section via `/api/report-narratives`
4. `buildReport(collectedData, config, migrationData?)` orchestrates section assembly; caption counters are reset; async sections (with charts) are awaited
5. `Packer.toBlob()` generates the DOCX binary
6. `saveAs()` triggers browser download

Legacy `buildInventoryReport()` and `buildMigrationReport()` functions are retained as thin wrappers around `buildReport()` for backward compatibility.

### 15.8 Settings Page

**Route:** `/settings`
**Component:** `SettingsPanel` with two sections:

**AI Configuration:**
- Enable/disable toggle (persisted in `localStorage` as `ai_enabled`, default: disabled)
- "Test Connection" button — calls proxy `/health` endpoint (15-second timeout to accommodate cold starts); a successful test also refreshes the main AI availability state
- Connection status indicator (success/failure notification)
- AI availability is determined by the frontend calling `GET /api/ai/config` (no caching — re-checked on every availability refresh), which returns `{ configured: true }` when both `AI_PROXY_URL` and `AI_PROXY_SECRET` environment variables are set on the server. The browser never receives the proxy URL or secret — all AI requests go through the same-origin `/api/ai/*` Express routes
- Toggle auto-saves and refreshes AI availability immediately on change (no save button needed)

**Report Branding:**
- Client name (used on DOCX cover page)
- Company name
- Author name
- Persisted in `localStorage`, saved via explicit "Save Branding" button

### 15.9 AI Proxy Deployment

**IBM Code Engine configuration:**

| Parameter | Value |
|-----------|-------|
| Name | ai-proxy |
| CPU | 0.25 vCPU |
| Memory | 0.5 GB |
| Min instances | 0 |
| Max instances | 5 |
| Port | 8080 |
| Request timeout | 120 seconds |

**Environment variables:**

| Variable | Description |
|----------|-------------|
| `WATSONX_API_KEY` | IBM Cloud API key with watsonx.ai access |
| `WATSONX_PROJECT_ID` | watsonx.ai project ID |
| `WATSONX_URL` | watsonx.ai endpoint (default: `https://us-south.ml.cloud.ibm.com`) |
| `AI_PROXY_SECRET` | Shared secret for X-API-Key auth |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |

**CI/CD:** GitHub Actions workflow (`.github/workflows/deploy-ai-proxy.yml`) triggers on pushes to `ai-proxy/**` on `main` branch. Builds Docker image, pushes to IBM Container Registry, deploys to Code Engine.

**Main app integration:** `server/src/index.ts` reads `AI_PROXY_URL` and `AI_PROXY_SECRET` environment variables at startup. An Express router (`server/src/routes/ai-proxy.ts`) is mounted at `/api/ai` with: `GET /config` (returns `{ configured: true/false }`), `GET /health` (forwards to AI proxy), and a `router.use('/')` middleware catch-all for POST requests (avoids Express path-to-regexp wildcard compatibility issues). The catch-all extracts the sub-path from `req.path` and forwards to `AI_PROXY_URL/api/<sub-path>` with the `X-API-Key` header. The frontend AI service layer uses relative paths (e.g., `/insights`, `/chat`) against the `/api/ai` baseURL. The frontend fetches `/api/ai/config` on startup to determine availability — no `window.__AI_CONFIG__` injection needed. The `connect-src` CSP directive only needs `'self'` since all AI requests are same-origin. This eliminates CORS requirements, works identically in dev and production, and keeps secrets server-side.

**Main app environment variables:**

| Variable | Description |
|----------|-------------|
| `AI_PROXY_URL` | Full URL of the deployed AI proxy (optional — omit to disable AI features). Used server-side only for proxying `/api/ai/*` requests |
| `AI_PROXY_SECRET` | Shared secret for AI proxy `X-API-Key` auth, used server-side only (optional) |

**Local development:** The dev server loads environment variables from a `.env` file in the project root via the `--env-file` flag (`tsx watch --env-file=.env server/src/index.ts`). Copy `.env.example` to `.env` and fill in `AI_PROXY_URL` and `AI_PROXY_SECRET` to enable AI features locally. The `.env` file is gitignored; `.env.example` is committed as a template.

---

## 16. Appendices

### 16.1 Appendix A: Glossary

| Term | Definition |
|------|------------|
| Classic Infrastructure | IBM Cloud's original infrastructure platform (formerly SoftLayer) |
| VPC | Virtual Private Cloud - IBM Cloud's next-generation infrastructure platform |
| VSI | Virtual Server Instance |
| VLAN | Virtual Local Area Network |
| Object Mask | SoftLayer API feature to specify returned fields |
| Carbon Design System | IBM's open-source design system for products and experiences |
| Code Engine | IBM's fully managed serverless platform |
| watsonx.ai | IBM's enterprise AI platform |

### 16.2 Appendix B: Reference Documents

1. IBM Cloud Classic Infrastructure API Documentation
   - https://sldn.softlayer.com/reference/softlayerapi/

2. IBM Carbon Design System
   - https://carbondesignsystem.com/

3. IBM Code Engine Documentation
   - https://cloud.ibm.com/docs/codeengine

4. watsonx.ai Documentation
   - https://www.ibm.com/docs/en/watsonx-as-a-service

### 16.3 Appendix C: XLSX Export Structure

**Column naming convention:** Export column headers match the `header` values defined in `RESOURCE_TYPES` (`src/types/resources.ts`) and `VPC_RESOURCE_TYPES` (`src/types/vpc-resources.ts`). Export column keys match the `field` values from these same definitions. This alignment enables the import to reverse-map headers back to field names, ensuring round-trip fidelity (export → import produces identical object shapes to live collection).

The exported XLSX file will contain the following worksheets:

| Worksheet | Content |
|-----------|---------|
| Summary | Collection metadata, resource counts, account info |
| vVirtualServers | Virtual server inventory (includes Start CPUs, Modified, Dedicated, Placement Group, Tags, Disk GB, Local Storage GB, Portable Storage GB, Portable Storage Details, VLANs) |
| vBareMetal | Bare metal server inventory (includes Hard Drives, Network Components, VLANs, Tags) |
| vVLANs | VLAN inventory |
| vSubnets | Subnet inventory |
| vGateways | Network gateway inventory |
| vFirewalls | Firewall inventory |
| vSecurityGroups | Security group inventory (includes Modified) |
| vLoadBalancers | Load balancer inventory (includes Virtual Servers) |
| vBlockStorage | Block storage inventory (includes Allowed VSIs, Allowed Hardware, Replication Partners, Datacenter, Encrypted, Snapshot Count, Snapshot Used, Allowed Subnets) |
| vFileStorage | File storage inventory (includes Allowed VSIs, Allowed Hardware, Replication Partners, Bytes Used, Datacenter, Encrypted, Snapshot Count, Snapshot Used, Allowed Subnets) |
| vObjectStorage | Object storage inventory |
| vSSLCertificates | SSL certificate inventory |
| vSSHKeys | SSH key inventory |
| vDNSDomains | DNS domain inventory |
| vDNSRecords | DNS record inventory (flattened) |
| vImages | Image template inventory |
| vPlacementGroups | Placement group inventory |
| vReservedCapacity | Reserved capacity inventory |
| vDedicatedHosts | Dedicated host inventory |
| vVPNTunnels | IPsec VPN tunnel inventory (includes Address Translations, Customer Subnets, Internal Subnets) |
| vBilling | Billing item inventory |
| vUsers | User inventory (includes Status Date, Roles, Permissions) |
| vEventLog | Recent event log entries |
| vRelationships | Resource relationship mapping (imported back during XLSX import to restore relationships whose join fields are not present in flattened export columns) |
| vVMwareInstances | vCenter Server instance inventory |
| vVMwareClusters | VMware cluster inventory (VCF for Classic) |
| vDirectorSites | Director site inventory (VCF as a Service) |
| vPVDCs | Provider VDC inventory |
| vVCFClusters | VCF as a Service cluster inventory |
| vVDCs | Virtual Data Center inventory |
| vMultitenantSites | Multitenant director site inventory |
| vVMwareRelationships | VMware ↔ Classic cross-reference mapping |

**VPC Export (separate file via `/api/vpc/export`):**

| Worksheet | Content |
|-----------|---------|
| VPC Summary | Collection metadata, resource counts |
| vVpcInstances | VPC virtual server instance inventory |
| vVpcBareMetalServers | VPC bare metal server inventory |
| vVpcDedicatedHosts | VPC dedicated host inventory |
| vVpcPlacementGroups | VPC placement group inventory |
| vVpcs | VPC inventory |
| vVpcSubnets | VPC subnet inventory |
| vVpcSecurityGroups | VPC security group inventory |
| vVpcFloatingIps | VPC floating IP inventory |
| vVpcPublicGateways | VPC public gateway inventory |
| vVpcNetworkAcls | VPC network ACL inventory |
| vVpcLoadBalancers | VPC load balancer inventory |
| vVpcVpnGateways | VPC VPN gateway inventory |
| vVpcEndpointGateways | VPC endpoint gateway inventory |
| vVpcVolumes | VPC block storage volume inventory |
| vVpcSshKeys | VPC SSH key inventory |
| vVpcImages | VPC private image inventory |
| vVpcFlowLogCollectors | VPC flow log collector inventory |
| vTransitGateways | Transit gateway inventory |
| vTGConnections | Transit gateway connection inventory |

### 16.4 Appendix D: Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-28 | - | Initial PRD |
| 1.1 | 2026-01-29 | - | Added Section 12: VMware Integration (VCF for Classic + VCF as a Service APIs, IAM token exchange, cross-reference/deduplication, UI integration, collection/export integration, relationship mapping) |
| 1.2 | 2026-01-30 | - | Added Section 14: VPC Infrastructure Explorer (19 VPC resource types, multi-region collection, independent SSE/context/export, VPC navigation section, VPC dashboard/topology/costs/geography pages) |
| 1.3 | 2026-01-30 | - | Restructured SideNav into Classic + VPC sections with styled header bars (background, bottom border, Carbon icons: InfrastructureClassic / IbmCloudVpc), removed redundant "VPC" prefix from VPC nav items and category menus |
| 1.4 | 2026-01-31 | - | Added Documentation page (`/docs`) — public route accessible to all users with comprehensive guide covering architecture, security, API key creation, migration analysis (with IBM docs, RackWare, Wanclouds, open-source tool links), and troubleshooting. Added SideNav link and login page link for discoverability. |
| 1.5 | 2026-01-31 | - | Fixed XLSX import round-trip: aligned export column keys/headers with RESOURCE_TYPES and VPC_RESOURCE_TYPES field definitions; added header→field reverse mapping on import with type coercion (numbers, booleans, currency); added account info parsing from Summary sheet; added VPC worksheet recognition to import. All downstream features (Topology, Cost Analysis, Geography, Migration) now work with imported data. (FR-6.4 updated, FR-6.7–FR-6.10 added, Appendix C updated) |
| 1.6 | 2026-01-31 | - | Per-connection TGW route prefixes: preserved per-connection prefix data in route report collection (`connectionPrefixes` field); added route report collection to VPC aggregator (20 resource types); Classic and VPC topology diagrams now group prefixes by connection with color-coded type badges (PowerVS, VPC, Classic, DirectLink); data table shows connection count and summary columns. Fixed relationship import: `vRelationships` worksheet is now recognized during import and used as fallback in `getRelatedResources()` for relationships whose join fields are missing from flattened export data. |
| 1.7 | 2026-01-31 | - | Added Section 15: AI-Powered Features. Implemented watsonx.ai integration via separate AI proxy service (`ai-proxy/`): infrastructure chat, migration insights, cost optimization, and DOCX report narratives using Granite 3 8B Instruct model. Added modular DOCX report generation (`src/services/report/docx/`) with 15 section builders supporting two report types (Inventory and Migration Assessment) with optional AI-enhanced prose sections. Added Settings page (`/settings`) for AI proxy configuration and report branding. Added AIContext, frontend AI service layer (`src/services/ai/`), AIChatPanel, AIInsightsPanel, AICostInsights components. Added AI proxy CI/CD workflow (`.github/workflows/deploy-ai-proxy.yml`). Updated architecture diagrams, tech stack, frontend structure, SideNav, and export requirements. Moved watsonx.ai from future enhancements to implemented. |
| 1.8 | 2026-01-31 | - | Moved AI proxy URL and API key from user-configurable Settings inputs to build-time Vite environment variables (`VITE_AI_PROXY_URL`, `VITE_AI_PROXY_API_KEY`). Removed proxy URL and API key text inputs and "Save AI Settings" button from Settings page. AI features now default to disabled (`ai_enabled` must be explicitly set to `'true'`). Toggle auto-saves and refreshes availability immediately. Removed `StorageEvent` listener for `ai_*` keys from AIContext. |
| 1.9 | 2026-01-31 | - | Added 16px Carbon icons to all page-level SideNav items: `Dashboard` (Summary), `NetworkOverlay` (Topology), `Currency` (Cost Analysis), `EarthFilled` (Geography), `Migrate` (Migration Analysis), `Document` (Documentation), `Settings` (Settings). Removed `InfrastructureClassic` and `IbmCloudVpc` icons from Classic and VPC section headers — headers are now plain text only. |
| 2.0 | 2026-01-31 | - | Added Carbon icons to SideNav resource category menus via `renderIcon` prop: `Chip` (Compute), `Network_3` (Network), `DataBase` (Storage), `Security` (Security), `ServerDns` (DNS), `VirtualMachine` (VMware), `OverflowMenuHorizontal` (Other). Applied to both Classic and VPC sections. |
| 2.1 | 2026-01-31 | - | Added estimated monthly cost calculation for hourly-billed Virtual Servers. Extended SoftLayer object mask to fetch `billingItem.hourlyRecurringFee` and `billingItem.children[hourlyRecurringFee]`. Frontend transform sums parent + child hourly rates and multiplies by 730 to produce estimated monthly cost. Three display states: actual monthly fee, estimated with `(est.)` tag and tooltip, or italic "No billing item" for hourly VSIs with no active billing data. Added `estimatedCost` and `noBillingItem` flags to transformed data and migration `VSIMigration` type. XLSX export adds "Cost Basis" column (Monthly/Estimated). Updated DataTable, VirtualizedTable, and migration ComputeAssessmentPanel to render all three states. |
| 2.3 | 2026-02-01 | - | Replaced Help Page and Documentation Page with a multi-section Documentation Hub (`/docs`). 12 content sections with left-side collapsible secondary navigation (Getting Started, Classic Infrastructure, VPC Infrastructure, Data Tables, Visualizations, Migration Analysis, AI Features, Import & Export, Settings, Security & Privacy, Resource Reference, Troubleshooting). State-based content switching, responsive horizontal nav below 672px. `/help` redirects to `/docs`. Header help icon navigates to `/docs`. Login page links replaced with single "Get Started" link to `/docs`. Deleted `HelpPage.tsx` and `DocumentationPage.tsx`. New files: `DocsHub.tsx`, `DocsNav.tsx`, `docsStyles.ts`, `docs.scss`, 12 section components in `sections/`, barrel `index.ts`. |
| 2.4 | 2026-02-01 | - | Moved AI proxy configuration from build-time Vite environment variables to runtime server injection. Express server reads `AI_PROXY_URL` and `AI_PROXY_SECRET` from process environment and injects them into `index.html` as `window.__AI_CONFIG__` at request time. Frontend `getConfig()` reads `window.__AI_CONFIG__` first, falling back to `import.meta.env` for local development. Eliminates `--build-arg` requirement — AI configuration now works with standard Code Engine `--env` flags. Updated `deploy_app.md` deployment instructions accordingly. |
| 2.5 | 2026-02-01 | - | Removed unused Multi-Zone Deployment toggle and Availability Target radio buttons from Migration Preferences. These fields (`multiZone`, `targetAvailability`) were not consumed by any analysis logic — the app maps each Classic DC directly to a VPC zone. Removed from `MigrationPreferences` interface, `DEFAULT_PREFERENCES`, and `MigrationPreferencesPanel` UI. Cleaned up unused Carbon imports (`Toggle`, `RadioButtonGroup`, `RadioButton`). |
| 2.6 | 2026-02-02 | - | Proxied AI requests through Express server to fix CORS. Added `server/src/routes/ai-proxy.ts` router mounted at `/api/ai` with: `GET /config` returns `{ configured }` status, `GET /health` forwards to AI proxy health check, `router.use('/')` middleware catch-all forwards POST requests to `AI_PROXY_URL/api/*` with `X-API-Key` header (uses `req.path` extraction for Express path-to-regexp compatibility). Frontend `aiProxyClient.ts` now uses same-origin `baseURL: '/api/ai'` with relative paths (`/insights`, `/chat`, etc.) and fetches configuration from `/api/ai/config` endpoint (no caching — re-checked on every availability refresh). Removed `window.__AI_CONFIG__` script injection from `index.html`. Removed `fs` import from `server/src/index.ts`. Simplified `AIConfig` type: removed `proxyUrl` and `apiKey`, replaced with `configured: boolean`. `isAIConfigured()` is now async. Removed `AI_PROXY_URL` from CSP `connect-src`. Health check timeout increased to 15 seconds to accommodate cold starts. Successful Settings test connection now refreshes main AI availability state. Added `.env` / `.env.example` support for local development via `--env-file` flag in dev script. |
| 2.2 | 2026-01-31 | - | Added Carbon `Tooltip` wrappers across the application. **Phase 1 (toggles):** billing toggle (Dashboard), AI features toggle (Settings), AI narratives toggle (Report Export), ~~multi-zone deployment toggle (removed in 2.5)~~. **Phase 2 (broader UI):** Migration table column headers (`DC`, `OS`, `IOPS`, `Strategy`, `VLAN #`, `Space`) via new `headerTooltip` field on `MigrationColumnDef`; migration summary tags (Ready/Needs Work/Blocked, Block/File/Object/TB, VLANs/Gateways/Firewalls/LBs/VPN/complexity, auto-translatable/manual review); readiness score card (overall score, complexity tag, dimension labels); security assessment tiles (group count, rules total, VPC groups needed, certificate counts, SSH keys); feature gap count tag; cost comparison tile labels (Classic Monthly, VPC Monthly, Monthly Savings, 3-Year Savings, Break-even, percentage change); migration preferences (~~Standard/HA radio buttons (removed in 2.5)~~, budget input); topology diagram stat tags (VSIs, TGW, VPN GWs) and legend abbreviations (FCR, BCR); VPC topology node badges (Classic Access, IPs avail, Public/Private LB); data table estimated cost `(est.)` span (replaced HTML `title`); export dialog filtered-data checkbox; progress indicator phase names (Shallow Scan, Deep Scan, Relationships); VPC progress indicator phase names (Region Discovery, VPC Collection, Processing); sidebar resource count badges. All use Carbon v11 `<Tooltip label="..." align="bottom">` pattern. |

---

**Document End**