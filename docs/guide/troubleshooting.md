# Troubleshooting

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Authentication fails | Invalid API key or insufficient permissions | Verify the key in the IBM Cloud IAM console. Ensure the key has VPC Viewer and Classic Infrastructure permissions assigned. |
| Classic resources return authorization errors | Service ID has limited Classic infrastructure access | Switch to a user API key with the "View Only" classic infrastructure permission set. Service IDs cannot access all Classic API endpoints. |
| Some resource types fail during collection | Missing permissions or temporary service unavailability | Failed resources appear as warnings in the progress indicator. Successfully collected resources remain available for browsing and export. |
| Session expired / returned to login | 60-minute inactivity timeout triggered | Re-enter your API key. Export data before extended pauses to avoid re-collection. |
| VPC data missing for some regions | Region access not enabled or network connectivity issue | Verify the account has access to the expected region in the IBM Cloud console under VPC Infrastructure > Overview. |
| XLSX import skips worksheets | Worksheet names do not match expected naming convention | Ensure worksheets use domain-prefixed names (e.g., `vVirtualServers`, `pPvsInstances`). See the [Input File Reference](./input-file-reference.md) for the full naming convention. |
| Disk utilization shows "unavailable" or "timeout" | Server unreachable via private IP or SSH port blocked | The application needs network access to the server's private IP on port 22. Check firewall rules, security groups, and VPN connectivity. |
| Disk utilization shows "auth_failed" | OS credentials stored in SoftLayer are stale or incorrect | Credentials may have been changed on the server without updating SoftLayer. This is expected for some machines and is informational. |
| Disk utilization shows "no_credentials" | No OS credentials stored in SoftLayer for this server | Common for servers provisioned from custom images or with externally managed credentials. Informational, not an error. |
| AI features unavailable | AI proxy service not configured or unreachable | Go to Settings > AI Configuration, enable AI features, and click Test Connection. Verify the AI proxy service is deployed and accessible. |
| XLSX export fails or produces empty file | Browser memory constraints with very large datasets | Try exporting fewer resource types or reduce the dataset size. XLSX generation happens entirely in the browser and is limited by available memory. |
| PowerVS collection fails | Workspace CRN or zone-to-region mapping issue | Verify the account has active PowerVS workspaces. Check that the API key has access to the Resource Controller API. |

---

## Diagnostic Steps

### Browser Console Logs

Open Developer Tools (F12 or Cmd+Option+I on macOS) and navigate to the Console tab. Application log messages are prefixed with `[ClassicExplorer:<module>]`, making them easy to filter.

Common module prefixes:

| Prefix | Area |
|--------|------|
| `[ClassicExplorer:Auth]` | Authentication and login |
| `[ClassicExplorer:DataCollection]` | Classic API data collection |
| `[ClassicExplorer:VpcCollection]` | VPC API data collection |
| `[ClassicExplorer:PowerVsCollection]` | PowerVS API data collection |
| `[ClassicExplorer:Import]` | XLSX re-import |
| `[ClassicExplorer:ReportImport]` | IMS report import |
| `[ClassicExplorer:Export]` | XLSX export |

To filter in Chrome DevTools, type `[ClassicExplorer` in the Console filter box.

---

### Verify API Key Permissions

Test your API key outside the application to isolate permission issues.

**Exchange the API key for an IAM token:**

```bash
curl -X POST "https://iam.cloud.ibm.com/identity/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=YOUR_API_KEY"
```

A successful response returns an `access_token`. If this fails, the API key itself is invalid.

**Test Classic (SoftLayer) API access:**

```bash
curl -u "apikey:YOUR_API_KEY" \
  "https://api.softlayer.com/rest/v3.1/SoftLayer_Account/getObject"
```

A successful response returns account details as JSON. A `401` error indicates the key lacks Classic infrastructure permissions.

**Test VPC API access:**

```bash
curl -H "Authorization: Bearer YOUR_IAM_TOKEN" \
  "https://us-south.iaas.cloud.ibm.com/v1/regions?version=2024-06-01&generation=2"
```

A successful response returns a list of available VPC regions. A `403` error indicates the key lacks VPC viewer permissions.

---

### Network Issues

The application uses Server-Sent Events (SSE) for streaming collection progress. This requires a stable, long-lived HTTP connection between the browser and the server.

**Common network problems:**

| Problem | Symptom | Solution |
|---------|---------|----------|
| Corporate proxy terminates long connections | Collection appears to hang or disconnects mid-progress | Configure proxy to allow long-lived connections to the application URL, or use a direct connection. |
| Firewall blocks SSE | Progress indicator never updates | Ensure the firewall allows HTTP connections with `Content-Type: text/event-stream`. |
| VPN disconnection | Collection fails partway through | Reconnect VPN and restart collection. Previously collected data may need to be re-collected. |
| Request timeout (Code Engine 300s limit) | Very large accounts fail during deep scan | Large accounts with thousands of resources may exceed the SSE connection timeout. Consider using IMS report import as an alternative data source. |

---

### Data Collection Phases

If collection fails at a specific phase, this information helps identify the issue:

| Phase | Classic | What It Collects |
|-------|---------|-----------------|
| 1 | Shallow scan | Top-level resource lists (VSIs, bare metals, VLANs, etc.) with 10 concurrent API calls |
| 2 | Deep scan | Detailed properties for each resource (OS info, network components, etc.) |
| 3 | Nested/billing | Per-volume snapshots, billing items, VMware nested resources, Transit Gateway connections |
| 4 | TGW route reports | Transit Gateway route report generation (async POST + poll) |
| 5 | Disk utilization | SSH into servers to collect filesystem usage (opt-in only, 5 concurrent connections, 10s timeout) |

| Phase | VPC | What It Collects |
|-------|-----|-----------------|
| 1 | All resources | All VPC resource types across all auto-discovered regions with 10 concurrent tasks |

| Phase | PowerVS | What It Collects |
|-------|---------|-----------------|
| 1 | Networks first | Networks collected as a dependency before other resources |
| 2 | Network Ports | Collected after Networks are available |
| 3 | Remaining resources | All other PowerVS resource types with 10 concurrent tasks |

---

### Clearing Application State

If the application enters an unexpected state:

1. **Soft reset** -- click the user avatar in the header and select "Logout". This clears the API key and all collected data from memory.
2. **Hard reset** -- close the browser tab entirely. All application state is held in memory and will be discarded.
3. **Clear preferences** -- open Developer Tools > Application > Local Storage and delete entries for the application origin. This resets theme, AI configuration, and report branding preferences.
