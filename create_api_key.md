# Creating a Least-Privilege API Key for IBM Cloud Infrastructure Explorer

This guide walks through creating a Service ID with the minimum permissions required by this application using the `ibmcloud` CLI. The app only performs **read-only** operations — no resources are created, modified, or deleted.

## Prerequisites

- [IBM Cloud CLI](https://cloud.ibm.com/docs/cli?topic=cli-getting-started) installed
- Logged in with sufficient privileges to create Service IDs and assign policies:
  ```bash
  ibmcloud login --sso   # or: ibmcloud login -u <email> -p <password>
  ```
- Target the correct account (if you have multiple):
  ```bash
  ibmcloud target -c <ACCOUNT_ID>
  ```

## 1. Create a Service ID

```bash
ibmcloud iam service-id-create infra-explorer \
  --description "Read-only Service ID for IBM Cloud Infrastructure Explorer"
```

Note the **Service ID** value in the output (format: `ServiceId-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). You will need it in the following steps.

```bash
# Store it in a variable for convenience
SERVICE_ID="ServiceId-<paste-your-id-here>"
```

## 2. Assign IAM Policies

### VPC Infrastructure Services — Viewer (all resource types, all regions)

```bash
ibmcloud iam service-policy-create "$SERVICE_ID" \
  --service-name is \
  --roles Viewer
```

This grants read-only access to all VPC resource types across all regions, including: instances, bare metal servers, dedicated hosts, placement groups, VPCs, subnets, security groups, floating IPs, public gateways, network ACLs, load balancers, VPN gateways, endpoint gateways, volumes, SSH keys, images, and flow log collectors.

### Transit Gateway — Viewer

```bash
ibmcloud iam service-policy-create "$SERVICE_ID" \
  --service-name transit \
  --roles Viewer
```

This grants read-only access to transit gateways and their connections (global resources).

### Classic Infrastructure Permissions

Classic infrastructure permissions use a separate permission model. Grant **view-only** access:

```bash
ibmcloud iam service-policy-create "$SERVICE_ID" \
  --service-name is \
  --roles Viewer \
  --service-type classic-infrastructure
```

> **Important:** Classic infrastructure permissions on Service IDs have limitations. If the above command does not grant sufficient access, you may need to use a **user API key** instead of a Service ID key. In that case, ensure the user account has the following classic infrastructure permissions assigned via the IBM Cloud console (**Manage > Access (IAM) > Users > [user] > Classic infrastructure**):
>
> - **Account** category: View account summary, view all hardware, view all virtual servers
> - **Network** category: View bandwidth statistics, manage port control, add/edit/view VLAN spanning
> - **Services** category: View DNS, manage DNS, view certificates (SSL), manage certificates (SSL), view storage, manage storage
>
> Alternatively, assign the **View Only** classic infrastructure permission set which covers all required read access.

## 3. Create an API Key

```bash
ibmcloud iam service-api-key-create infra-explorer-key "$SERVICE_ID" \
  --description "API key for IBM Cloud Infrastructure Explorer" \
  --output-format json
```

**Save the `apikey` value immediately** — it cannot be retrieved again after creation.

To save it to a file:

```bash
ibmcloud iam service-api-key-create infra-explorer-key "$SERVICE_ID" \
  --description "API key for IBM Cloud Infrastructure Explorer" \
  --file infra-explorer-key.json
```

> **Security:** Store the key securely. Do not commit it to source control. Delete the key file after importing it into the application.

## 4. Verify the Key Works

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

Test a VPC API call (using the IAM token from above):

```bash
TOKEN="<ACCESS_TOKEN_FROM_ABOVE>"

curl -s "https://us-south.iaas.cloud.ibm.com/v1/regions?version=2024-06-01&generation=2" \
  -H "Authorization: Bearer ${TOKEN}" \
  | jq '.regions[].name'
```

## 5. Cleanup / Revocation

Delete the API key:

```bash
ibmcloud iam service-api-key-delete infra-explorer-key "$SERVICE_ID"
```

Remove all policies and delete the Service ID:

```bash
# List policies to get their IDs
ibmcloud iam service-policies "$SERVICE_ID"

# Delete each policy
ibmcloud iam service-policy-delete "$SERVICE_ID" <POLICY_ID>

# Delete the Service ID
ibmcloud iam service-id-delete "$SERVICE_ID"
```

## Notes

- **Classic infrastructure on Service IDs** is limited. IBM Cloud's classic infrastructure permission model predates IAM and not all SoftLayer API methods are accessible via Service ID keys. If data collection returns authorization errors for classic resources, switch to a user API key with the "View Only" classic infrastructure permission set.
- **VPC access** works reliably with Service IDs and IAM policies.
- **Transit Gateway** is a global service — no region targeting is needed for the policy.
- The application never modifies resources, so **Viewer** / **read-only** access is sufficient for all operations.
- API keys should be rotated periodically. Create a new key, update the application, then delete the old key.
