# Security & Privacy

## API Key Handling

The application follows a stateless, memory-only approach to API key management:

- **Browser memory only** -- the API key is stored in React Context. It is never saved to `localStorage`, cookies, server disk, or server logs.
- **Per-request transmission** -- every API request sends the key via the `X-API-Key` HTTP header. The Express.js backend extracts it, uses it for that single upstream call, then discards it.
- **No server-side state** -- there are no sessions, sticky sessions, or databases. Each request is fully self-contained.
- **Automatic expiry** -- a 60-minute inactivity timeout clears the key from browser memory and returns the user to the login screen.

---

## API Authentication

All IBM Cloud API calls are proxied through the Express.js backend. The browser never contacts IBM Cloud APIs directly.

| Domain | Auth Method | Details |
|--------|------------|---------|
| Classic (SoftLayer) | HTTP Basic | `apikey:<key>` base64-encoded in the `Authorization` header |
| VPC | IAM Bearer token | API key exchanged for a token via `POST https://iam.cloud.ibm.com/identity/token` |
| PowerVS | IAM Bearer token | Same IAM token exchange as VPC; CRN header required on every request |
| Platform Services | IAM Bearer token | Same IAM token exchange as VPC |

---

## Disk Utilization Credentials

When the opt-in Phase 5 disk utilization collection is enabled:

- OS credentials are fetched transiently from the SoftLayer API (`operatingSystem.passwords` object mask).
- Credentials are used immediately for an SSH connection to the server's private IP, then discarded within the same function scope.
- **Never sent to the browser** -- only utilization data (filesystem paths, sizes, percentages) reaches the frontend via SSE.
- **Never included in XLSX exports** -- the export pipeline has no access to credentials.
- **Never logged** -- `passwords` is included in the server's `SENSITIVE_KEYS` redaction set in the Winston logger configuration.
- **Defense-in-depth** -- `operatingSystem.passwords` is explicitly deleted from the resource object before SSE transmission to the browser, even though the field was never intended to be included.

> **Warning:** Disk utilization requires network connectivity from the application server to the target machine's private IP address on port 22 (SSH). If the application is deployed outside the IBM Cloud private network, a VPN or direct link connection is required.

---

## Log Sanitization

### Server-side

Winston logging uses custom formatters that redact sensitive values:

- API keys, IAM tokens, and `Authorization` headers are stripped from log output.
- The `SENSITIVE_KEYS` set includes `apiKey`, `api_key`, `password`, `passwords`, `token`, `authorization`, and related variations.
- Stack traces and error objects are sanitized before logging.

### Client-side

Browser logging uses a namespaced logger (`[ClassicExplorer:*]`) that:

- Never outputs API keys or credentials to the browser console.
- Supports configurable log levels (debug, info, warn, error).
- Prefixes all messages with the module name for traceability.

---

## Security Headers

The Express.js backend uses Helmet middleware to set security headers:

| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | Restricts resource loading to same-origin and trusted CDNs |
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options: DENY` | Prevents clickjacking via iframe embedding |
| `Strict-Transport-Security` | Enforces HTTPS connections |
| `X-XSS-Protection` | Legacy XSS filter for older browsers |

---

## Data Privacy

- **No server-side persistence** -- all collected infrastructure data lives in browser memory (React state). The server processes API responses in-flight but does not store them.
- **Tab close discards everything** -- closing the browser tab or navigating away removes all data from memory. There is no recovery mechanism.
- **60-minute timeout** -- inactivity for 60 minutes clears both the API key and all collected data from browser memory.
- **Client-side export** -- XLSX files are generated entirely in the browser using ExcelJS. Infrastructure data never passes through the server for export purposes.
- **Read-only operation** -- the application never creates, modifies, or deletes any cloud resources. All API calls are read-only (GET requests and SoftLayer `getObject`/`getXxx` methods).
- **IMS Report Import** -- imported data is parsed entirely in the browser (for CSV, HTML, draw.io, JSON, and XLSX reports). Only MDL file conversion uses the server (Python script), and the converted JSON is returned to the browser then discarded server-side.

---

## Deployment Security

When deployed on IBM Code Engine:

- The container runs as a non-root user.
- No persistent volumes are attached -- the container filesystem is ephemeral.
- Auto-scaling to zero instances means no compute resources run when the application is idle.
- HTTPS is enforced by the Code Engine ingress layer.
- Container images are built with a multi-stage Docker build to minimize the attack surface (Node 20 Alpine base).
