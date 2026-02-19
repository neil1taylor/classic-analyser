#!/bin/bash
# Deploy AI Proxy to IBM Code Engine
# Requires: ibmcloud CLI with code-engine plugin
# Env vars: WATSONX_API_KEY, WATSONX_PROJECT_ID, AI_PROXY_SECRET

set -euo pipefail

PROJECT=${CE_PROJECT:-"infrastructure-explorer"}
APP_NAME="ai-proxy"
REGION=${CE_REGION:-"us-south"}
REGISTRY=${CE_REGISTRY:-"us.icr.io"}
NAMESPACE=${CE_NAMESPACE:-"infra-explorer"}
IMAGE="${REGISTRY}/${NAMESPACE}/${APP_NAME}:latest"

echo "==> Building and pushing Docker image..."
docker build -t "${IMAGE}" -f Dockerfile .
docker push "${IMAGE}"

echo "==> Targeting Code Engine project..."
ibmcloud target -r "${REGION}"
ibmcloud ce project select --name "${PROJECT}"

echo "==> Deploying application..."
ibmcloud ce app create \
  --name "${APP_NAME}" \
  --image "${IMAGE}" \
  --port 8080 \
  --cpu 0.25 \
  --memory 0.5G \
  --min-scale 0 \
  --max-scale 5 \
  --request-timeout 120 \
  --env WATSONX_API_KEY="${WATSONX_API_KEY}" \
  --env WATSONX_PROJECT_ID="${WATSONX_PROJECT_ID}" \
  --env WATSONX_URL="${WATSONX_URL:-https://us-south.ml.cloud.ibm.com}" \
  --env AI_PROXY_SECRET="${AI_PROXY_SECRET}" \
  --env NODE_ENV=production \
  --env PORT=8080 \
  2>/dev/null || \
ibmcloud ce app update \
  --name "${APP_NAME}" \
  --image "${IMAGE}" \
  --env WATSONX_API_KEY="${WATSONX_API_KEY}" \
  --env WATSONX_PROJECT_ID="${WATSONX_PROJECT_ID}" \
  --env WATSONX_URL="${WATSONX_URL:-https://us-south.ml.cloud.ibm.com}" \
  --env AI_PROXY_SECRET="${AI_PROXY_SECRET}"

echo "==> Getting application URL..."
ibmcloud ce app get --name "${APP_NAME}" --output url

echo "==> Done."
