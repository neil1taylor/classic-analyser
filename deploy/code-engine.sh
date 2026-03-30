#!/usr/bin/env bash
# Deploy Infrastructure Explorer to IBM Code Engine
# Requires: ibmcloud CLI with code-engine plugin, Docker

set -euo pipefail

# Load .env if present (for IC_API_KEY)
if [[ -f "$(dirname "$0")/../.env" ]]; then
  source "$(dirname "$0")/../.env"
fi

: "${IC_API_KEY:?Set IC_API_KEY in .env or environment}"

PROJECT=${CE_PROJECT:-"infra-explorer"}
RESOURCE_GROUP=${CE_RESOURCE_GROUP:-"infra-explorer-rg"}
APP_NAME="infra-explorer"
REGION=${CE_REGION:-"us-south"}
REGISTRY=${CE_REGISTRY:-"us.icr.io"}
NAMESPACE=${CE_NAMESPACE:-"infra-explorer"}
TAG=${IMAGE_TAG:-"latest"}
IMAGE="${REGISTRY}/${NAMESPACE}/${APP_NAME}:${TAG}"

echo "==> Logging into IBM Cloud..."
ibmcloud login --apikey "${IC_API_KEY}" -r "${REGION}"
ibmcloud cr login

CONTAINER_CLI=$(command -v docker 2>/dev/null || command -v podman 2>/dev/null || { echo "Error: docker or podman required" >&2; exit 1; })
echo "==> Building and pushing image with ${CONTAINER_CLI}..."
"${CONTAINER_CLI}" build --platform linux/amd64 -t "${IMAGE}" .
"${CONTAINER_CLI}" push "${IMAGE}"

echo "==> Targeting Code Engine project..."
ibmcloud target -g "${RESOURCE_GROUP}"
ibmcloud ce project select --name "${PROJECT}"

echo "==> Deploying application..."
ibmcloud ce app create \
  --name "${APP_NAME}" \
  --image "${IMAGE}" \
  --registry-secret icr-creds \
  --cpu 0.5 \
  --memory 1G \
  --min-scale 1 \
  --max-scale 10 \
  --port 8080 \
  --request-timeout 300 \
  --visibility public \
  --env NODE_ENV=production \
  --env LOG_LEVEL=info \
  2>/dev/null || \
ibmcloud ce app update \
  --name "${APP_NAME}" \
  --image "${IMAGE}" \
  --registry-secret icr-creds \
  --cpu 0.5 \
  --memory 1G \
  --min-scale 1 \
  --max-scale 10 \
  --port 8080 \
  --request-timeout 300 \
  --env NODE_ENV=production \
  --env LOG_LEVEL=info

echo "==> Getting application URL..."
ibmcloud ce app get --name "${APP_NAME}" --output url

echo "==> Done."
