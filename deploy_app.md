# Deploying the Main App to IBM Code Engine

Step-by-step instructions for deploying the IBM Cloud Infrastructure Explorer to IBM Code Engine. Covers manual deployment (pre-built image or source-to-image) and automated CI/CD via GitHub Actions.

---

## Prerequisites

Before you begin, ensure you have:

- An IBM Cloud account (pay-as-you-go or subscription — lite accounts cannot use Code Engine)
- Docker Desktop installed and running
- Node.js 20+ and npm installed
- Git (to clone the repository)

---

## Step 1: Install the IBM Cloud CLI

Download and install the IBM Cloud CLI if you don't already have it.

**macOS:**

```bash
curl -fsSL https://clis.cloud.ibm.com/install/osx | sh
```

**Linux:**

```bash
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh
```

**Windows:**

Download the installer from https://cloud.ibm.com/docs/cli

Verify the installation:

```bash
ibmcloud version
```

---

## Step 2: Install Required CLI Plugins

```bash
ibmcloud plugin install container-registry
ibmcloud plugin install code-engine
```

Verify they are installed:

```bash
ibmcloud plugin list
```

You should see `container-registry` and `code-engine` in the output.

---

## Step 3: Log In to IBM Cloud

Log in interactively (opens a browser for SSO if configured):

```bash
ibmcloud login -r us-south
```

Or log in with an API key (useful for scripts or if SSO is required):

```bash
ibmcloud login --apikey <your-ibm-cloud-api-key> -r us-south
```

To generate an API key, go to **Manage > Access (IAM) > API keys** in the IBM Cloud console.

> **Note:** Replace `us-south` with your preferred region if needed (e.g., `eu-gb`, `eu-de`, `au-syd`).

---

## Step 4: Create an IBM Container Registry Namespace

The namespace is where your Docker image will be stored.

```bash
ibmcloud cr namespace-add <your-namespace>
```

Replace `<your-namespace>` with a unique name (e.g., `infra-explorer`). Namespace names must be globally unique within the region.

Verify it was created:

```bash
ibmcloud cr namespace-list
```

---

## Step 5: Create a Code Engine Project

A Code Engine project is a grouping for your apps, jobs, and builds.

```bash
ibmcloud ce project create --name infra-explorer
```

Then select it as the active project:

```bash
ibmcloud ce project select --name infra-explorer
```

---

## Step 6: Build the Docker Image

From the root of the repository:

```bash
cd /path/to/classic_analyser
docker build -t infra-explorer .
```

This runs a multi-stage build that:
1. Installs all dependencies and builds both the React frontend and Express backend
2. Creates a slim production image with only runtime dependencies

---

## Step 7: Test the Image Locally (Optional but Recommended)

```bash
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e AI_PROXY_URL=https://<ai-proxy-url> \
  -e AI_PROXY_SECRET=<ai-proxy-shared-secret> \
  infra-explorer
```

Open http://localhost:8080 in your browser. You should see the login page. If you provided the AI environment variables, go to **Settings** and enable AI features — the "Test Connection" button should confirm the AI proxy is reachable. Press `Ctrl+C` to stop the container when done.

---

## Step 8: Tag and Push the Image to IBM Container Registry

Log in to the container registry:

```bash
ibmcloud cr login
```

Tag the image for ICR:

```bash
docker tag infra-explorer icr.io/<your-namespace>/infra-explorer:latest
```

Push it:

```bash
docker push icr.io/<your-namespace>/infra-explorer:latest
```

Verify the image is in the registry:

```bash
ibmcloud cr image-list
```

You should see your image listed with its tag and size.

---

## Step 9: Deploy to Code Engine

Make sure your project is selected:

```bash
ibmcloud ce project select --name infra-explorer
```

Create the application:

```bash
ibmcloud ce app create \
  --name infra-explorer \
  --image icr.io/<your-namespace>/infra-explorer:latest \
  --port 8080 \
  --cpu 0.5 \
  --memory 1G \
  --min-scale 0 \
  --max-scale 10 \
  --request-timeout 300 \
  --env NODE_ENV=production \
  --env LOG_LEVEL=info \
  --env AI_PROXY_URL=https://<ai-proxy-url> \
  --env AI_PROXY_SECRET=<ai-proxy-shared-secret>
```

**What each flag does:**

| Flag | Value | Purpose |
|------|-------|---------|
| `--port` | `8080` | The port the container listens on |
| `--cpu` | `0.5` | 0.5 vCPU per instance |
| `--memory` | `1G` | 1 GB RAM per instance |
| `--min-scale` | `0` | Scale to zero when idle (saves cost) |
| `--max-scale` | `10` | Maximum concurrent instances |
| `--request-timeout` | `300` | 5-minute timeout for long SSE data collection streams |
| `--env NODE_ENV` | `production` | Enables production optimizations |
| `--env LOG_LEVEL` | `info` | Winston logging level |
| `--env AI_PROXY_URL` | AI proxy URL | Full URL of the deployed AI proxy (optional — omit to disable AI) |
| `--env AI_PROXY_SECRET` | Shared secret | The `AI_PROXY_SECRET` value from the AI proxy (optional) |

> **Note:** The AI environment variables are optional. If omitted, the app works normally but AI features (chat, insights, cost optimization, report narratives) will be hidden. Deploy the AI proxy first (see `proxies.md`) to obtain the URL and secret.

---

## Alternative: Source-to-Image Build (No Docker Required)

Instead of Steps 4 and 6-9, you can let Code Engine build the image from source. This skips Docker and ICR entirely. A `.ceignore` file in the repo root excludes unnecessary files from the upload.

```bash
ibmcloud ce project select --name infra-explorer

ibmcloud ce app create \
  --name infra-explorer \
  --build-source . \
  --port 8080 \
  --cpu 0.5 \
  --memory 1G \
  --min-scale 0 \
  --max-scale 10 \
  --request-timeout 300 \
  --env NODE_ENV=production \
  --env LOG_LEVEL=info \
  --env AI_PROXY_URL=https://<ai-proxy-url> \
  --env AI_PROXY_SECRET=<ai-proxy-shared-secret>
```

Code Engine detects the `Dockerfile` and runs the multi-stage build automatically. The AI proxy configuration is passed as runtime environment variables — the Express server injects them into the frontend at request time. Then continue from Step 10.

---

## Step 10: Get the Application URL

```bash
ibmcloud ce app get --name infra-explorer --output url
```

This prints the public HTTPS URL for your deployed app. e.g. `https://infra-explorer.25usxpekxkhu.us-south.codeengine.appdomain.cloud`

---

## Step 11: Verify the Deployment

Check the health endpoint:

```bash
curl -s https://<app-url>/api/health
```

Open the app in your browser:

```bash
open https://<app-url>
```

You should see the API key login page. Enter a valid IBM Cloud API key to start collecting infrastructure data.

---

## Updating the App After Code Changes

When you make changes and need to redeploy:

```bash
# 1. Rebuild the image
docker build -t infra-explorer .

# 2. Tag with a new version (use a commit hash, date, or version number)
docker tag infra-explorer icr.io/<your-namespace>/infra-explorer:v2

# 3. Push to ICR
ibmcloud cr login
docker push icr.io/<your-namespace>/infra-explorer:v2

# 4. Update the Code Engine app
ibmcloud ce project select --name infra-explorer
ibmcloud ce app update \
  --name infra-explorer \
  --image icr.io/<your-namespace>/infra-explorer:v2
```

### Source-to-Image Update

If you used the source-to-image method:

```bash
ibmcloud ce project select --name infra-explorer
ibmcloud ce app update \
  --name infra-explorer \
  --build-source .
```

---

## Automated CI/CD with GitHub Actions

The repository includes `.github/workflows/deploy.yml` which automatically builds, pushes, and deploys on every push to `main`.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `IBM_CLOUD_API_KEY` | IBM Cloud API key with permissions for ICR and Code Engine |
| `ICR_NAMESPACE` | IBM Container Registry namespace |
| `CE_PROJECT` | Code Engine project name |

> **Note:** AI proxy configuration (`AI_PROXY_URL`, `AI_PROXY_SECRET`) is set as runtime environment variables on the Code Engine app, not as GitHub secrets. Set them via `ibmcloud ce app update --env` after deployment.

### Workflow Steps

1. Checkout, install dependencies, lint, typecheck, and test
2. Install IBM Cloud CLI with `container-registry` and `code-engine` plugins
3. Login to IBM Cloud (`us-south` region)
4. Build and push container image to ICR (tagged with commit SHA)
5. Update the Code Engine app with the new image

---

## Viewing Logs

Stream live logs:

```bash
ibmcloud ce app logs --name infra-explorer --follow
```

View the last 100 lines:

```bash
ibmcloud ce app logs --name infra-explorer --tail 100
```

Check app status and current revision:

```bash
ibmcloud ce app get --name infra-explorer
```

---

## Deleting the App

If you need to tear down the deployment:

```bash
# Delete the app
ibmcloud ce app delete --name infra-explorer --force

# Delete the project (removes all apps, jobs, and builds in it)
ibmcloud ce project delete --name infra-explorer --force

# Optionally remove the image from ICR
ibmcloud cr image-rm icr.io/<your-namespace>/infra-explorer:latest
```

---

## Troubleshooting

**App fails to start**
- Check logs: `ibmcloud ce app logs --name infra-explorer`
- Verify the image runs locally: `docker run -p 8080:8080 infra-explorer`
- Ensure `NODE_ENV=production` is set

**Image pull errors**
- Run `ibmcloud cr login` and verify your session is active
- Check the namespace exists: `ibmcloud cr namespace-list`
- Ensure the Code Engine project and ICR namespace are in the same IBM Cloud account

**Request timeouts during data collection**
- The SSE-based collection can run for several minutes on large accounts
- Confirm `--request-timeout 300` is set on the app
- Compression is automatically disabled for SSE streams to prevent buffering

**Cold starts after scale-to-zero**
- The first request after idle may take a few seconds to spin up an instance
- Set `--min-scale 1` to keep one instance warm (incurs cost when idle)

**ICR quota exceeded**
- List images: `ibmcloud cr image-list`
- Remove old tags: `ibmcloud cr image-rm icr.io/<your-namespace>/infra-explorer:<old-tag>`
- Check quota: `ibmcloud cr quota`
