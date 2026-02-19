# Proxies — Complete Guide

Everything you need to know about the IBM Cloud Infrastructure Explorer's two proxy services: the **Main Proxy** (Express backend that proxies IBM Cloud APIs and serves the SPA) and the **AI Proxy** (watsonx.ai sidecar for AI-powered analysis). Includes architecture, configuration, and step-by-step deployment instructions for both.

---

## Table of Contents

- [Proxies — Complete Guide](#proxies--complete-guide)
  - [Table of Contents](#table-of-contents)
  - [1. Architecture Overview](#1-architecture-overview)
  - [2. Main Proxy (Express Backend)](#2-main-proxy-express-backend)
    - [2.1 How the Proxy Works](#21-how-the-proxy-works)
    - [2.2 API Routes](#22-api-routes)
    - [2.3 Authentication Flow](#23-authentication-flow)
    - [2.4 SSE Streaming (Data Collection)](#24-sse-streaming-data-collection)
    - [2.5 Security Model](#25-security-model)
  - [3. AI Proxy (watsonx.ai Sidecar)](#3-ai-proxy-watsonxai-sidecar)
    - [3.1 Overview](#31-overview)
    - [3.2 AI Proxy Routes](#32-ai-proxy-routes)
    - [3.3 watsonx.ai Integration](#33-watsonxai-integration)
    - [3.4 AI Proxy Auth \& Rate Limiting](#34-ai-proxy-auth--rate-limiting)
  - [4. watsonx.ai Project \& Runtime Setup](#4-watsonxai-project--runtime-setup)
    - [4.1 Create a watsonx.ai Project (UI)](#41-create-a-watsonxai-project-ui)
    - [4.2 Create a watsonx.ai Project (CLI)](#42-create-a-watsonxai-project-cli)
    - [4.3 Provision a Watson Machine Learning Runtime](#43-provision-a-watson-machine-learning-runtime)
    - [4.4 Get Your Project ID](#44-get-your-project-id)
    - [4.5 Generate an API Key](#45-generate-an-api-key)
  - [5. Environment Variables Reference](#5-environment-variables-reference)
    - [Main Proxy](#main-proxy)
    - [AI Proxy](#ai-proxy)
  - [6. Deploying the Main Proxy — Step by Step](#6-deploying-the-main-proxy--step-by-step)
    - [6.1 Prerequisites](#61-prerequisites)
    - [6.2 Step 1: Log In and Create a Code Engine Project](#62-step-1-log-in-and-create-a-code-engine-project)
    - [6.3 Step 2a: Deploy from Source (No Docker Required)](#63-step-2a-deploy-from-source-no-docker-required)
    - [6.4 Step 2b: Deploy with Docker Image](#64-step-2b-deploy-with-docker-image)
    - [6.5 Step 3: Verify the Main Proxy](#65-step-3-verify-the-main-proxy)
    - [6.6 Updating the Main Proxy](#66-updating-the-main-proxy)
  - [7. Deploying the AI Proxy — Step by Step](#7-deploying-the-ai-proxy--step-by-step)
    - [7.1 Step 1: Prepare Environment Variables](#71-step-1-prepare-environment-variables)
    - [7.2 Step 2a: Deploy from Source (No Docker Required)](#72-step-2a-deploy-from-source-no-docker-required)
    - [7.3 Step 2b: Deploy with Docker Image](#73-step-2b-deploy-with-docker-image)
    - [7.4 Step 2c: Deploy Using the Provided Script](#74-step-2c-deploy-using-the-provided-script)
    - [7.5 Step 3: Connect Main Proxy to AI Proxy](#75-step-3-connect-main-proxy-to-ai-proxy)
    - [7.6 Step 4: Verify the AI Proxy](#76-step-4-verify-the-ai-proxy)
    - [7.7 Updating the AI Proxy](#77-updating-the-ai-proxy)
  - [8. Deploying via the IBM Cloud UI (Both Proxies)](#8-deploying-via-the-ibm-cloud-ui-both-proxies)
    - [Main Proxy](#main-proxy-1)
    - [AI Proxy](#ai-proxy-1)
    - [Link Them Together (UI)](#link-them-together-ui)
  - [9. Local Development](#9-local-development)
    - [Main Proxy](#main-proxy-2)
    - [AI Proxy](#ai-proxy-2)
    - [Connecting Them Locally](#connecting-them-locally)
  - [10. Monitoring \& Troubleshooting](#10-monitoring--troubleshooting)
    - [Viewing Logs](#viewing-logs)
    - [Checking Application Status](#checking-application-status)
    - [Viewing Build Logs (Source Deployments)](#viewing-build-logs-source-deployments)
    - [Health Checks](#health-checks)
    - [The storage usage of the IBM Container Registry exceeds xx percent of your quota](#the-storage-usage-of-the-ibm-container-registry-exceeds-xx-percent-of-your-quota)
    - [Common Issues](#common-issues)

---

## 1. Architecture Overview

The application uses a **two-container architecture** deployed on IBM Code Engine:

```bash
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                                │
│  API key held in React Context (memory only)                        │
└──────────┬──────────────────────────────────┬───────────────────────┘
           │  X-API-Key header                │  X-API-Key header
           ▼                                  ▼
┌─────────────────────────┐       ┌──────────────────────────┐
│  Main Proxy (Express)   │       │  AI Proxy (Express)      │
│  Port 8080              │       │  Port 8080               │
│                         │       │                          │
│  /api/auth/*            │       │  /api/insights           │
│  /api/collect/*  (SSE)  │       │  /api/chat               │
│  /api/export/*          │       │  /api/cost-optimization  │
│  /api/vpc/*             │       │  /api/report-narratives  │
│  /api/migration         │       │  /health                 │
│  / (static SPA)         │       │                          │
└──────┬──────────────────┘       └──────┬───────────────────┘
       │                                 │
       ▼                                 ▼
  SoftLayer REST API               watsonx.ai API
  VPC Regional APIs                (Granite 3 8B Instruct)
  Transit Gateway API
  Direct Link API
  IBM Global Catalog API
```

**Why a proxy?** SoftLayer and VPC APIs do not support CORS, so all IBM Cloud API calls must go through a backend proxy. The AI proxy is a separate container because it has its own credentials (watsonx API key) and independent scaling requirements.

---

## 2. Main Proxy (Express Backend)

### 2.1 How the Proxy Works

The Express server at `server/src/index.ts` serves two roles:

1. **Static file server** — In production, serves the built React SPA from `dist/` with SPA fallback routing (all non-API paths return `index.html`).
2. **API proxy** — Forwards browser requests to IBM Cloud APIs, injecting the correct authentication headers.

The browser never talks to IBM Cloud APIs directly. Every request goes:

```
Browser  →  Express /api/*  →  IBM Cloud API
```

The API key is passed via the `X-API-Key` HTTP header on every request. The server extracts it, uses it for that single request, and discards it. There is no session state, no database, and no server-side key storage.

### 2.2 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/validate` | POST | Validate a SoftLayer API key against `SoftLayer_Account.getObject` |
| `/api/collect/stream` | GET | SSE stream — collects all Classic resources (27+ types) |
| `/api/export` | POST | Generate XLSX export from collected Classic data |
| `/api/migration` | POST | Fetch IBM Cloud pricing from the Global Catalog API |
| `/api/vpc/auth/validate` | POST | Validate API key by exchanging it for an IAM token |
| `/api/vpc/collect/stream` | GET | SSE stream — collects all VPC resources (21 types, all regions) |
| `/api/vpc/export` | POST | Generate XLSX export from collected VPC data |
| `/health` | GET | Health check (no auth required) |

### 2.3 Authentication Flow

**SoftLayer (Classic):**

```
API key → base64("apikey:<key>") → Authorization: Basic <base64> → api.softlayer.com
```

The `SoftLayerClient` (`server/src/services/softlayer/client.ts`) constructs HTTP Basic auth on each request.

**VPC / IAM:**

```
API key → POST https://iam.cloud.ibm.com/identity/token
        → grant_type=urn:ibm:params:oauth:grant-type:apikey
        → Returns IAM Bearer token (cached until 60s before expiry)
        → Authorization: Bearer <token> → {region}.iaas.cloud.ibm.com
```

The `VpcClient` (`server/src/services/vpc/client.ts`) handles token exchange and caching.

**VMware:** Uses the same IAM token exchange as VPC. Calls go to `api.vmware-solutions.cloud.ibm.com`.

**Transit Gateway:** IAM Bearer token → `transit.cloud.ibm.com/v1/`

**Direct Link:** IAM Bearer token → `directlink.cloud.ibm.com/v1/`

### 2.4 SSE Streaming (Data Collection)

Data collection uses **Server-Sent Events** to stream progress to the browser in real time. The collection routes (`/api/collect/stream` and `/api/vpc/collect/stream`) respond with `Content-Type: text/event-stream`.

**Event types sent over the stream:**

| Event | Payload | Purpose |
|-------|---------|---------|
| `connected` | `{ status: "connected" }` | Confirms SSE connection |
| `progress` | `{ phase, resource, status, totalResources, completedResources }` | Updates the progress bar |
| `data` | `{ resourceKey, items, count }` | Delivers a batch of collected resources |
| `error` | `{ resource, message }` | Reports per-resource collection errors |
| `complete` | `{ collectionTimestamp, duration, errors }` | Signals collection is finished |

**Classic collection runs in phases:**
1. **Shallow Scan** — 23 resources with minimal object masks (fast)
2. **Deep Scan** — Re-fetches 12 slow resources with full object masks + VMware/TGW/DirectLink in parallel
3. **Billing** — Billing items collected last (slowest call)
4. **Relationships** — Builds 13 parent-child resource pairs

All phases use a **concurrency limiter** (`server/src/utils/concurrency.ts`) capped at 10 concurrent API calls to avoid rate limiting.

**VPC collection** runs as a single phase across all auto-discovered regions with the same 10-concurrent-task limit.

### 2.5 Security Model

- **Stateless API key handling** — The key lives only in browser memory (React Context) and is sent via `X-API-Key` header per request. Never stored on disk, in localStorage, or in sessions.
- **60-minute inactivity timeout** — The browser clears the key after 60 minutes of inactivity.
- **Log sanitization** — The logger (`server/src/utils/logger.ts`) uses regex patterns to detect and redact API keys, Bearer tokens, Basic auth strings, and sensitive field names from all log output.
- **Helmet + CSP** — Security headers protect against XSS, clickjacking, and other attacks. The CSP `connect-src` directive is extended with `AI_PROXY_URL` to allow browser calls to the AI proxy.
- **Retry with backoff** — Both SoftLayer and VPC clients retry on 429 (rate limit) and 503 (unavailable) with exponential backoff (1s, 2s, 4s; 3 retries max).

---

## 3. AI Proxy (watsonx.ai Sidecar)

### 3.1 Overview

The AI proxy is a **separate Express application** in the `ai-proxy/` directory. It provides AI-powered analysis features by calling the watsonx.ai text generation API using the IBM Granite 3 8B Instruct model.

It is deployed as a second Code Engine application alongside the main proxy. The main app's CSP is configured to allow browser requests to it via the `AI_PROXY_URL` environment variable.

### 3.2 AI Proxy Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/insights` | POST | Generate executive summary, risks, and recommendations from infrastructure data |
| `/api/chat` | POST | Conversational assistant — answer questions about collected infrastructure |
| `/api/cost-optimization` | POST | Generate cost-saving narratives and specific savings recommendations |
| `/api/report-narratives` | POST | Generate narrative sections for infrastructure reports |
| `/health` | GET | Health check (no auth required) |

**Report narrative section types:** `executive_summary`, `environment_overview`, `migration_readiness`, `compute_assessment`, `network_assessment`, `storage_assessment`, `security_assessment`, `cost_analysis`, `recommendations`.

### 3.3 watsonx.ai Integration

**File:** `ai-proxy/src/services/watsonx.ts`

| Setting | Value |
|---------|-------|
| Model | `ibm/granite-3-8b-instruct` |
| API endpoint | `https://{WATSONX_URL}/ml/v1/text/generation?version=2024-03-14` |
| Default max tokens | 4096 |
| Temperature | 0.3 |
| Top-p | 0.9 |
| Repetition penalty | 1.1 |

The service exchanges the watsonx API key for an IAM Bearer token (`ai-proxy/src/services/iamToken.ts`) using the `ibm-cloud-sdk-core` library. Tokens are cached for 30 minutes.

**Caching:** Responses are cached in-memory using an LRU cache (`ai-proxy/src/services/cache.ts`) — max 100 entries, 30-minute TTL. Cache keys are SHA-256 hashes of request payloads. Chat responses are not cached.

### 3.4 AI Proxy Auth & Rate Limiting

**Authentication:** The AI proxy uses a shared secret (`AI_PROXY_SECRET`) rather than the user's IBM Cloud API key. The browser sends this secret in the `X-API-Key` header. This protects the watsonx endpoint from unauthorized use.

**Rate limiting:** 30 requests per minute per IP address, with sliding window. Returns `429` with `retryAfter` when exceeded.

---

## 4. watsonx.ai Project & Runtime Setup

The AI proxy requires a watsonx.ai project with an associated Watson Machine Learning (WML) runtime. Here is how to set it up.

### 4.1 Create a watsonx.ai Project (UI)

1. Go to [https://dataplatform.cloud.ibm.com/projects](https://dataplatform.cloud.ibm.com/projects) (or [https://eu-de.dataplatform.cloud.ibm.com/projects](https://eu-de.dataplatform.cloud.ibm.com/projects) for EU).
2. Click **New project** > **Create an empty project**.
3. Enter a name (e.g., `infra-explorer-ai`).
4. Select or create a **Cloud Object Storage** instance (required for project assets).
   1. `ibmcloud resource service-instance-create Cloud-Object-Storage-infra-explorer cloud-object-storage standard global --deployment premium-global-deployment-iam`
5. Click **Create**.
6. Once created, go to the project's **Manage** tab > **General** and copy the **Project ID**. e.g. 30a4fcbf-ccaa-42f2-804a-cdbca515fc8d

### 4.2 Create a watsonx.ai Project (CLI)

```bash
# Install the IBM Cloud CLI if not already installed
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

# Log in
ibmcloud login --apikey <your-api-key>

# Target a resource group
ibmcloud target -g infra-explorer-rg
```

There is no direct CLI command to create a watsonx.ai project — use the UI or the Watson Data API. However, you can list existing projects:

```bash
# List Watson Studio / watsonx projects
ibmcloud resource service-instances --service-name data-science-experience
```

### 4.3 Provision a Watson Machine Learning Runtime

A WML service instance is required to run model inference. The Lite plan is free.

**Via CLI:**

```bash
# Create a WML instance (Lite plan is free, v2-standard is "Essentials" inn the UI)
# To list all plans: ibmcloud catalog service pm-20 
ibmcloud resource service-instance-create \
  watsonx.ai-infra-explorer \
  pm-20 \
  v2-standard \
  us-south

# Get the instance CRN (needed to associate with the project)
ibmcloud resource service-instance watsonx.ai-infra-explorer --output json | jq -r '.[0].crn'

# e.g.
crn:v1:bluemix:public:pm-20:us-south:a/3cfdf229dfeb4afb8bf3f1067a9003e3:65cf5de3-8b50-44fd-bb48-6b0dc94e9041::
```

**Via UI:**

1. Go to [IBM Cloud Catalog](https://cloud.ibm.com/catalog).
2. Search for **Watson Machine Learning**.
3. Select the **Lite** plan (or Standard for production workloads).
4. Choose the same region as your watsonx.ai project (e.g., `us-south`).
5. Click **Create**.

**Associate WML with your project:**

1. Open your watsonx.ai project in the UI.
2. Go to **Manage** > **Services & integrations**.
3. Click **Associate service** and select your WML instance.

### 4.4 Get Your Project ID

**Via UI:**
- Open the project > **Manage** tab > **General** > copy the **Project ID** (a UUID).

**Via API:**
```bash
# Get an IAM token
IAM_TOKEN=$(ibmcloud iam oauth-tokens --output json | jq -r '.iam_token')

# List projects
curl -s -H "Authorization: ${IAM_TOKEN}" \
  "https://api.dataplatform.cloud.ibm.com/v2/projects" | jq '.resources[] | {name, id: .metadata.guid}'
```

### 4.5 Generate an API Key

The watsonx.ai API key can be the same IBM Cloud API key you already use, or a dedicated service ID API key:

```bash
# Create a dedicated service ID for the AI proxy
ibmcloud iam service-id-create infra-explorer-ai-proxy --description "AI proxy for Infrastructure Explorer"
ibmcloud iam service-policy-create infra-explorer-ai-proxy --roles Writer --service-name pm-20
ibmcloud iam service-api-key-create ai-proxy-key infra-explorer-ai-proxy --description "API key for AI proxy"
```

Save the API key — you will set it as `WATSONX_API_KEY` in the deployment step.

**Important — Add the service ID to the watsonx.ai project:**

A platform-level IAM policy on WML is not sufficient. The service ID (or user) must also be a **collaborator** on the watsonx.ai project itself, otherwise the API returns `403 Failed to find member in project_id`.

1. Open your watsonx.ai project at [https://dataplatform.cloud.ibm.com/projects](https://dataplatform.cloud.ibm.com/projects).
2. Go to **Manage** > **Access Control**.
3. Click **Add collaborators** and switch to **Service IDs**.
4. Find `infra-explorer-ai-proxy` (or the service ID associated with your API key) and add it with the **Editor** role.

Alternatively, skip the service ID and use a **personal API key** from a user who is already a project member — this is often simpler for initial setup.

---

## 5. Environment Variables Reference

### Main Proxy

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Set to `production` for production deployments |
| `PORT` | No | `8080` (prod) / `3001` (dev) | Server listen port |
| `LOG_LEVEL` | No | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |
| `AI_PROXY_URL` | No | — | Full URL of the AI proxy (e.g., `https://ai-proxy.xxxxx.us-south.codeengine.appdomain.cloud`). Added to CSP `connect-src` so the browser can reach it. |

### AI Proxy

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WATSONX_API_KEY` | **Yes** | — | IBM Cloud API key with access to the WML instance |
| `WATSONX_PROJECT_ID` | **Yes** | — | watsonx.ai project ID (UUID) |
| `WATSONX_URL` | No | `https://us-south.ml.cloud.ibm.com` | watsonx.ai regional endpoint |
| `AI_PROXY_SECRET` | **Yes** | — | Shared secret for authenticating browser requests to the AI proxy |
| `NODE_ENV` | No | `production` | Runtime environment |
| `PORT` | No | `8080` | Server listen port |

**watsonx.ai regional endpoints:**

| Region | Endpoint |
|--------|----------|
| US South (Dallas) | `https://us-south.ml.cloud.ibm.com` |
| EU Germany (Frankfurt) | `https://eu-de.ml.cloud.ibm.com` |
| EU United Kingdom (London) | `https://eu-gb.ml.cloud.ibm.com` |
| Asia Pacific (Tokyo) | `https://jp-tok.ml.cloud.ibm.com` |

---

## 6. Deploying the Main Proxy — Step by Step

The main proxy serves the React SPA and proxies all IBM Cloud API calls (SoftLayer, VPC, Transit Gateway, Direct Link, Global Catalog).

### 6.1 Prerequisites

- IBM Cloud account
- IBM Cloud CLI installed:

```bash
  # macOS
  curl -fsSL https://clis.cloud.ibm.com/install/osx | sh

  # Linux
  curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

  # Windows (PowerShell)
  iex (New-Object Net.WebClient).DownloadString('https://clis.cloud.ibm.com/install/powershell')
```

- Code Engine plugin:

```bash
  ibmcloud plugin install code-engine
```

- (Docker path only) Docker installed locally and IBM Container Registry plugin:

```bash
  ibmcloud plugin install container-registry
```

### 6.2 Step 1: Log In and Create a Code Engine Project

```bash
# Log in with your API key (or use --sso for browser-based login)
ibmcloud login --apikey <your-api-key>

# Create a resource group
ibmcloud resource group-create infra-explorer-rg

# Target a region and resource group
ibmcloud target -r us-south -g infra-explorer-rg

# Create a Code Engine project (one-time setup)
ibmcloud ce project create --name infra-explorer

# Or select an existing one
ibmcloud ce project select --name infra-explorer
```

### 6.3 Step 2a: Deploy from Source (No Docker Required)

Code Engine builds the container for you. No Docker installation needed. Since the repo has a `Dockerfile`, Code Engine uses it automatically.

**From local source:**

```bash
# Run from the project root directory
ibmcloud ce app create \
  --name infra-explorer \
  --build-source . \
  --cpu 0.5 \
  --memory 1G \
  --port 8080 \
  --min-scale 0 \
  --max-scale 10 \
  --request-timeout 300 \
  --env NODE_ENV=production \
  --env LOG_LEVEL=info
```

**From a Git repository:**

```bash
ibmcloud ce app create \
  --name infra-explorer \
  --build-source https://github.com/<org>/<repo> \
  --cpu 0.5 \
  --memory 1G \
  --port 8080 \
  --min-scale 0 \
  --max-scale 10 \
  --request-timeout 300 \
  --env NODE_ENV=production \
  --env LOG_LEVEL=info
```

### 6.4 Step 2b: Deploy with Docker Image

If you prefer to build locally with Docker:

```bash
# 1. Log in to IBM Container Registry
ibmcloud cr login

# 2. Build the image
docker build -t us.icr.io/<namespace>/infra-explorer:latest .

# 3. Push to registry
docker push us.icr.io/<namespace>/infra-explorer:latest

# 4. Deploy the pre-built image
ibmcloud ce app create \
  --name infra-explorer \
  --image us.icr.io/<namespace>/infra-explorer:latest \
  --cpu 0.5 \
  --memory 1G \
  --port 8080 \
  --min-scale 0 \
  --max-scale 10 \
  --request-timeout 300 \
  --env NODE_ENV=production \
  --env LOG_LEVEL=info
```

### 6.5 Step 3: Verify the Main Proxy

```bash
# Get the application URL
ibmcloud ce app get --name infra-explorer --output url

# Test the health endpoint
curl https://<app-url>/health
# Expected: {"status":"healthy","timestamp":"...","version":"1.0.0"}

# Open the app in a browser
open https://<app-url>
```

### 6.6 Updating the Main Proxy

```bash
# Source-based update (rebuilds from source)
ibmcloud ce app update \
  --name infra-explorer \
  --build-source .

# Docker-based update (after pushing a new image)
ibmcloud ce app update \
  --name infra-explorer \
  --image us.icr.io/<namespace>/infra-explorer:latest

# Update environment variables only
ibmcloud ce app update \
  --name infra-explorer \
  --env LOG_LEVEL=debug
```

---

## 7. Deploying the AI Proxy — Step by Step

The AI proxy is a separate Express application in the `ai-proxy/` directory. It calls the watsonx.ai text generation API. You must complete [Section 4 (watsonx.ai Project & Runtime Setup)](#4-watsonxai-project--runtime-setup) before deploying.

### 7.1 Step 1: Prepare Environment Variables

You need four values before deploying:

| Variable | Where to Get It |
|----------|-----------------|
| `WATSONX_API_KEY` | Your IBM Cloud API key (see [Section 4.5](#45-generate-an-api-key)) |
| `WATSONX_PROJECT_ID` | Your watsonx.ai project ID (see [Section 4.4](#44-get-your-project-id)) |
| `WATSONX_URL` | Regional endpoint (see [Section 5](#5-environment-variables-reference)), defaults to `https://us-south.ml.cloud.ibm.com` |
| `AI_PROXY_SECRET` | A strong random string you generate (shared with the frontend) |

Generate a random secret:

```bash
openssl rand -base64 32
```

### 7.2 Step 2a: Deploy from Source (No Docker Required)

```bash
# Change into the ai-proxy directory
cd ai-proxy

# Ensure there is a package-lock.json
npm install --package-lock-only 

# Deploy (Code Engine builds using the ai-proxy Dockerfile)
ibmcloud ce app create \
  --name ai-proxy \
  --build-source . \
  --cpu 0.25 \
  --memory 0.5G \
  --port 8080 \
  --min-scale 0 \
  --max-scale 5 \
  --request-timeout 120 \
  --env WATSONX_API_KEY="<your-watsonx-api-key>" \
  --env WATSONX_PROJECT_ID="<your-project-id>" \
  --env WATSONX_URL="https://us-south.ml.cloud.ibm.com" \
  --env AI_PROXY_SECRET="<your-generated-secret>" \
  --env NODE_ENV=production
```

### 7.3 Step 2b: Deploy with Docker Image

```bash
cd ai-proxy

# 1. Log in to IBM Container Registry
ibmcloud cr login

# 2. Build the image
docker build -t us.icr.io/<namespace>/ai-proxy:latest .

# 3. Push to registry
docker push us.icr.io/<namespace>/ai-proxy:latest

# 4. Deploy the pre-built image
ibmcloud ce app create \
  --name ai-proxy \
  --image us.icr.io/<namespace>/ai-proxy:latest \
  --cpu 0.25 \
  --memory 0.5G \
  --port 8080 \
  --min-scale 0 \
  --max-scale 5 \
  --request-timeout 120 \
  --env WATSONX_API_KEY="<your-watsonx-api-key>" \
  --env WATSONX_PROJECT_ID="<your-project-id>" \
  --env WATSONX_URL="https://us-south.ml.cloud.ibm.com" \
  --env AI_PROXY_SECRET="<your-generated-secret>" \
  --env NODE_ENV=production \
  --env PORT=8080
```

### 7.4 Step 2c: Deploy Using the Provided Script

A convenience script is included at `ai-proxy/deploy/code-engine.sh`. This script builds a Docker image, pushes it, and creates/updates the Code Engine app in one go.

```bash
# Set required variables
export WATSONX_API_KEY="<your-watsonx-api-key>"
export WATSONX_PROJECT_ID="<your-project-id>"
export AI_PROXY_SECRET="<your-generated-secret>"

# Optional overrides (these have sensible defaults)
export WATSONX_URL="https://us-south.ml.cloud.ibm.com"
export CE_PROJECT="infra-explorer"
export CE_REGION="us-south"
export CE_REGISTRY="us.icr.io"
export CE_NAMESPACE="infra-explorer"

# Run the script
cd ai-proxy
./deploy/code-engine.sh
```

The script will:
1. Build and push the Docker image to `us.icr.io/<namespace>/ai-proxy:latest`
2. Target the Code Engine project
3. Create the app (or update it if it already exists)
4. Print the application URL

### 7.5 Step 3: Connect Main Proxy to AI Proxy

The main proxy needs to know the AI proxy URL so it can add it to the Content Security Policy, allowing the browser to make direct requests.

```bash
# Get the AI proxy URL
AI_URL=$(ibmcloud ce app get --name ai-proxy --output url)
echo "AI Proxy URL: ${AI_URL}"

# Update the main proxy with the AI proxy URL
ibmcloud ce app update \
  --name infra-explorer \
  --env AI_PROXY_URL="${AI_URL}"
```

This sets `AI_PROXY_URL` on the main proxy, which Helmet reads to add the AI proxy origin to the CSP `connect-src` directive.

### 7.6 Step 4: Verify the AI Proxy

```bash
# Get the AI proxy URL
AI_URL=$(ibmcloud ce app get --name ai-proxy --output url)

# Test the health endpoint (no auth required)
curl ${AI_URL}/health
# Expected: {"status":"ok"} or similar

# Test an authenticated endpoint
curl -X POST ${AI_URL}/api/insights \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-AI_PROXY_SECRET>" \
  -d '{"analysisData": {"totalResources": 42}}'
```

### 7.7 Updating the AI Proxy

```bash
# Source-based update
cd ai-proxy
ibmcloud ce app update \
  --name ai-proxy \
  --build-source .

# Docker-based update
ibmcloud ce app update \
  --name ai-proxy \
  --image us.icr.io/<namespace>/ai-proxy:latest

# Update environment variables only (e.g., rotate the watsonx API key)
ibmcloud ce app update \
  --name ai-proxy \
  --env WATSONX_API_KEY="<new-api-key>"

# Or re-run the deploy script
cd ai-proxy && ./deploy/code-engine.sh
```

---

## 8. Deploying via the IBM Cloud UI (Both Proxies)

If you prefer the web console over CLI, both proxies can be deployed through the IBM Cloud UI.

### Main Proxy

1. Go to [IBM Cloud Code Engine](https://cloud.ibm.com/codeengine/overview).
2. Click **Projects** > create or select a project (e.g., `infra-explorer`).
3. Click **Applications** > **Create**.
4. Choose **Source code** as the source type.
   - Point to your GitHub repo or upload a local archive of the project root.
   - Code Engine will detect the `Dockerfile` and build automatically.
5. Configure:
   - **Name:** `infra-explorer`
   - **Port:** `8080`
   - **CPU:** `0.5 vCPU`
   - **Memory:** `1 GB`
   - **Min instances:** `0`
   - **Max instances:** `10`
   - **Request timeout:** `300`
6. Under **Environment variables**, add:
   - `NODE_ENV` = `production`
   - `LOG_LEVEL` = `info`
7. Click **Create**.
8. Once deployed, copy the application URL.

### AI Proxy

1. In the same Code Engine project, click **Applications** > **Create**.
2. Choose **Source code** as the source type.
   - Point to the `ai-proxy/` subdirectory of your repo, or upload the `ai-proxy/` folder.
3. Configure:
   - **Name:** `ai-proxy`
   - **Port:** `8080`
   - **CPU:** `0.25 vCPU`
   - **Memory:** `0.5 GB`
   - **Min instances:** `0`
   - **Max instances:** `5`
   - **Request timeout:** `120`
4. Under **Environment variables**, add:
   - `WATSONX_API_KEY` = `<your-watsonx-api-key>`
   - `WATSONX_PROJECT_ID` = `<your-project-id>`
   - `WATSONX_URL` = `https://us-south.ml.cloud.ibm.com`
   - `AI_PROXY_SECRET` = `<your-generated-secret>`
   - `NODE_ENV` = `production`
   - `PORT` = `8080`
5. Click **Create**.
6. Copy the AI proxy application URL.

### Link Them Together (UI)

1. Go back to the **infra-explorer** application.
2. Click **Environment variables** > **Add**.
3. Add `AI_PROXY_URL` with the AI proxy URL (e.g., `https://ai-proxy.xxxxx.us-south.codeengine.appdomain.cloud`).
4. Click **Save and deploy new revision**.

---

## 9. Local Development

### Main Proxy

```bash
# From the project root
npm ci
npm run dev
# Starts Vite dev server (frontend) + Express backend on port 3001
```

### AI Proxy

```bash
# From the ai-proxy directory
cd ai-proxy
npm ci

# Set required env vars and start
WATSONX_API_KEY=<key> \
WATSONX_PROJECT_ID=<id> \
AI_PROXY_SECRET=<secret> \
npm run dev
# Starts on port 8080 with hot reload (tsx watch)
```

### Connecting Them Locally

For the main app's CSP to allow browser requests to the local AI proxy, set the `AI_PROXY_URL` when starting the main proxy:

```bash
AI_PROXY_URL=http://localhost:8080 npm run dev
```

---

## 10. Monitoring & Troubleshooting

### Viewing Logs

```bash
# Main proxy logs (streaming)
ibmcloud ce app logs --name infra-explorer --follow

# AI proxy logs (streaming)
ibmcloud ce app logs --name ai-proxy --follow
```

### Checking Application Status

```bash
ibmcloud ce app get --name infra-explorer
ibmcloud ce app get --name ai-proxy
```

### Viewing Build Logs (Source Deployments)

```bash
ibmcloud ce buildrun list
ibmcloud ce buildrun logs --name <buildrun-name>
```

### Health Checks

```bash
# Main proxy
curl https://<main-app-url>/health

# AI proxy
curl https://<ai-proxy-url>/health
```

### The storage usage of the IBM Container Registry exceeds xx percent of your quota
                                                                                                             Code Engine stores build images in IBM Container Registry (ICR). You can clean up old images:                  

```bash   
  # List your namespaces:
  ibmcloud cr namespace-list

  # List images (Code Engine typically uses a namespace like ce-<project-id>):
  ibmcloud cr image-list --restrict <namespace>

  # Delete old images:
  ibmcloud cr image-rm <region>.icr.io/<namespace>/<image>:<tag> 

  # Or bulk delete untagged/old images with retention policy:
  ibmcloud cr retention-run --images 1 <namespace>

  # This keeps only the 1 most recent image per repository in that namespace and deletes the rest.                   
  # Check your usage after cleanup:
  ibmcloud cr quota

  # You can also set up automatic cleanup with:
  ibmcloud cr trash-list           # see what's in the trash
  ibmcloud cr image-prune-untagged # remove untagged images 
```

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `401 Unauthorized` on `/api/auth/validate` | Invalid IBM Cloud API key | Verify the API key is correct and active |
| `401 Unauthorized` on AI proxy routes | `AI_PROXY_SECRET` mismatch or missing `X-API-Key` header | Verify the secret matches between the frontend config and the AI proxy env var |
| `502 Bad Gateway` on auth validate | IBM Cloud API unreachable from Code Engine | Check network/firewall; retry |
| SSE stream cuts off mid-collection | Request timeout exceeded (default 300s) | Increase `--request-timeout` on the Code Engine app |
| `429 Too Many Requests` from SoftLayer | Too many concurrent API calls | The proxy already limits to 10 concurrent; if persistent, reduce concurrency or retry later |
| `429 Too Many Requests` from AI proxy | Rate limiter triggered (30 req/min/IP) | Wait and retry |
| AI features not loading in browser | CSP blocking requests to AI proxy | Verify `AI_PROXY_URL` is set on the main proxy and matches the AI proxy's actual URL |
| `watsonx API error (401)` | Invalid or expired `WATSONX_API_KEY` | Regenerate the API key and update the env var |
| `watsonx API error (403)` "Failed to find member in project_id" | The service ID or user behind `WATSONX_API_KEY` is not a collaborator on the watsonx.ai project | Add the service ID/user to the project via **Manage > Access Control > Add collaborators** with Editor role (see [Section 4.5](#45-generate-an-api-key)), or use a personal API key from an existing project member |
| `watsonx API error (404)` | Wrong `WATSONX_URL` region or invalid `WATSONX_PROJECT_ID` | Verify project ID and ensure the WML instance is in the same region as the URL |
| `No results returned from watsonx` | Model returned empty response | Check the prompt data; ensure `analysisData`/`costData` is not empty |
| Build fails in Code Engine | Missing dependencies or build errors | Check build logs with `ibmcloud ce buildrun logs` |
| App starts but SSE streams don't work | Compression buffering SSE events | The proxy already disables compression for `text/event-stream`; check if a CDN or reverse proxy in front is buffering |
