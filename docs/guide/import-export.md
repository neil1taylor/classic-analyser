# Import & Export

## Import Methods

The application supports three methods for importing infrastructure data, all available from the login page without requiring an API key.

### XLSX Import

Re-import a previously exported XLSX file to view data without connecting to the IBM Cloud API.

**Steps:**

1. Click **Import XLSX** on the login page
2. Select the `.xlsx` file from your filesystem
3. Data populates automatically across all domains

The importer recognizes worksheets by their naming prefix:

| Prefix | Domain            | Example Worksheet      |
|--------|-------------------|------------------------|
| `v`    | Classic / VPC     | `vVirtualServers`      |
| `p`    | PowerVS           | `pPvsInstances`        |
| `s`    | Platform Services | `sServiceInstances`    |

> **Note:** XLSX import is compatible with cloud-harvester output files.

### IMS Report Import

Multi-file import from IBM's Infrastructure Management Services (IMS) reporting tool. This method accepts multiple files in different formats and merges them into a unified dataset.

**Supported formats:**

| Format   | Content                                                      |
|----------|--------------------------------------------------------------|
| CSV      | Warnings, gateways, NAS, security groups                     |
| HTML     | Warnings, overview data, summary tables, inventory trees     |
| draw.io  | XML network topology diagrams                                |
| XLSX     | Device inventory, consolidated reports                        |
| JSON     | Converted from `.mdl` files                                  |

**Steps:**

1. Click **Import IMS Reports** on the login page
2. Select one or more files (any combination of supported formats)
3. The merger deduplicates records by `id` (primary key) with `hostname` fallback
4. Data populates into Classic resource tables

IMS report import adds two additional resource types:

- **Report Warnings** — priority, issue, type, and recommendation
- **Health Checks** — checks performed with priority and rationale

See [Input File Reference](input-file-reference.md) for detailed format documentation.

### MDL Import

Uploads an IMS `.mdl` file for server-side conversion to JSON. This is the most complete data source, containing approximately 13,000+ resources per large account.

**Steps:**

1. Click **Import MDL** on the login page
2. Select the `.mdl` file
3. The file is uploaded to the server and converted via Python
4. Status progresses through: Uploading, Converting, Loading data

> **Note:** MDL import requires the server-side Python runtime (included in the Docker container).

## Export Formats

### XLSX

The primary export format. One worksheet per resource type with domain-specific naming prefixes:

| Prefix | Domain            | Example                |
|--------|-------------------|------------------------|
| `v`    | Classic / VPC     | `vVirtualServers`      |
| `p`    | PowerVS           | `pPvsInstances`        |
| `s`    | Platform Services | `sServiceInstances`    |

When disk utilization has been collected, additional columns are included in the export for filesystem usage data.

### PDF

Formatted report containing:

- Summary metrics
- Distribution charts
- Resource tables

### DOCX

Editable migration assessment report with:

- Configurable branding (set in Settings)
- Optional AI-generated narratives
- Executive summary
- Readiness scores by category
- Cost projections
- Wave plans
- Remediation items

### PPTX

Presentation slides including:

- Title slide
- Summary metrics
- Distribution charts
- Data slides per resource type

### draw.io XML

Topology diagrams exported as XML files compatible with [diagrams.net](https://www.diagrams.net/) for further editing and annotation.

### Assessment Template (.xlsx)

Official IBM "Template for Assessment" format with six sheets: Account, BMs, VSI, PaaS, Storage, Networking. Includes VPC profile mappings, EoS colour-coded dates, and cost estimates with optional internal discount rates. Available from the migration report export dialog when migration analysis has been run.

### Terraform HCL

VPC infrastructure-as-code generated from Classic resources:

- VPC instances with matched profiles
- Subnets mapped from Classic VLANs
- Security groups translated from firewall rules
- Storage volumes with IOPS tier mapping

## Export Scope

The scope of exported data depends on where you initiate the export:

| Context         | Scope                                              |
|-----------------|----------------------------------------------------|
| Dashboard       | All collected data across all resource types        |
| Resource table  | Choose: all rows, filtered rows, or selected rows  |

When exporting from a resource table, the export dialog lets you select which rows to include based on your current filters and selections.
