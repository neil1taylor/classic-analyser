# Getting Started

## Overview

The IBM Cloud Infrastructure Explorer is a web-based inventory and analysis tool for IBM Cloud Classic (SoftLayer), VPC, PowerVS, and Platform Services infrastructure. It collects data from 27+ Classic API resource types, 26 VPC resource types (across all VPC regions), 22 PowerVS resource types (across all workspaces), and all Platform Services instances (COS, Key Protect, SCC, etc.), displays them in interactive tables, and exports to XLSX.

**Who it's for:** IBM Tech Sellers, Client Engineers, and Infrastructure Admins who need visibility into Classic, VPC, PowerVS, and Platform Services infrastructure for inventory, migration planning, and cost analysis.

## Quick Start

1. Obtain an IBM Cloud API key from the [IBM Cloud console](https://cloud.ibm.com/iam/apikeys).
2. Enter your API key on the login page and click **Connect**.
3. Once authenticated, click **Collect Data** to retrieve your infrastructure resources.
4. Browse your resources using the sidebar navigation and data tables.

Your API key is stored only in browser memory and is never saved to disk or sent to any server other than the IBM Cloud APIs. A 60-minute inactivity timeout automatically clears the key.

## Creating an API Key

This guide walks through creating a Service ID with the minimum permissions required by this application using the `ibmcloud` CLI. The app only performs **read-only** operations.

### Prerequisites

- [IBM Cloud CLI](https://cloud.ibm.com/docs/cli?topic=cli-getting-started) installed.
- Logged in with sufficient privileges to create Service IDs and assign policies.

```bash
ibmcloud login --sso   # or: ibmcloud login -u <email> -p <password>
```

Target the correct account (if you have multiple):

```bash
ibmcloud target -c <ACCOUNT_ID>
```

### Step 1: Create a Service ID

```bash
ibmcloud iam service-id-create infra-explorer \
  --description "Read-only Service ID for IBM Cloud Infrastructure Explorer"
```

Note the **Service ID** value in the output (format: `ServiceId-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

```bash
# Store it in a variable for convenience
SERVICE_ID="ServiceId-<paste-your-id-here>"
```

### Step 2: Assign IAM Policies

**VPC Infrastructure Services -- Viewer** (all resource types, all regions):

```bash
ibmcloud iam service-policy-create "$SERVICE_ID" \
  --service-name is \
  --roles Viewer
```

This grants read-only access to all VPC resource types across all regions.

**Transit Gateway -- Viewer:**

```bash
ibmcloud iam service-policy-create "$SERVICE_ID" \
  --service-name transit \
  --roles Viewer
```

**Classic Infrastructure Permissions:**

```bash
ibmcloud iam service-policy-create "$SERVICE_ID" \
  --service-name is \
  --roles Viewer \
  --service-type classic-infrastructure
```

> **Important:** Classic infrastructure permissions on Service IDs have limitations. If the above command does not grant sufficient access, you may need to use a **user API key** instead. In that case, ensure the user account has the following classic infrastructure permissions assigned via **Manage > Access (IAM) > Users > [user] > Classic infrastructure**:
>
> - **Account:** View account summary, view all hardware, view all virtual servers
> - **Network:** View bandwidth statistics, manage port control, add/edit/view VLAN spanning
> - **Services:** View DNS, manage DNS, view certificates (SSL), manage certificates (SSL), view storage, manage storage
>
> Alternatively, assign the **View Only** classic infrastructure permission set which covers all required read access.

### Step 3: Create an API Key

```bash
ibmcloud iam service-api-key-create infra-explorer-key "$SERVICE_ID" \
  --description "API key for IBM Cloud Infrastructure Explorer" \
  --output-format json
```

**Save the `apikey` value immediately** -- it cannot be retrieved again after creation.

> **Security:** Store the key securely. Do not commit it to source control. Delete the key file after importing it into the application.

### Step 4: Verify the Key Works

Test IAM token exchange:

```bash
curl -s -X POST "https://iam.cloud.ibm.com/identity/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<YOUR_API_KEY>" \
  | jq .access_token
```

Test a Classic Infrastructure API call:

```bash
API_KEY="<YOUR_API_KEY>"
AUTH=$(echo -n "apikey:${API_KEY}" | base64)

curl -s "https://api.softlayer.com/rest/v3.1/SoftLayer_Account/getObject" \
  -H "Authorization: Basic ${AUTH}" \
  | jq .companyName
```

### Step 5: Cleanup / Revocation

When you no longer need the key:

```bash
ibmcloud iam service-api-key-delete infra-explorer-key "$SERVICE_ID"
ibmcloud iam service-id-delete "$SERVICE_ID"
```

## Importing Data (Offline Mode)

You can import previously exported XLSX files to view data without connecting to the IBM Cloud API. This is useful for offline analysis or sharing data between team members.

1. On the login page, click the **Import XLSX** button.
2. Select an XLSX file that was previously exported from this application.
3. The application will parse the worksheets and populate the data tables.
4. An info banner at the top of the dashboard indicates you are viewing imported data.
5. Click **Clear & Return** to discard the imported data and return to the login page.

The import feature recognises worksheets from all four domains: Classic and VPC (`v` prefix, e.g., `vVirtualServers`), PowerVS (`p` prefix, e.g., `pPvsInstances`), and Platform Services (`s` prefix, e.g., `sServiceInstances`). Worksheets with unrecognised names are skipped.

You can also import XLSX files generated by [cloud-harvester](https://github.com/neil1taylor/cloud-harvester), a CLI tool that collects IBM Cloud infrastructure data across Classic, VPC, PowerVS, and VMware domains.
