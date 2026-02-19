#!/usr/bin/env bash
set -euo pipefail

# IBM Code Engine deployment script for Classic Infrastructure Explorer
# Prerequisites: ibmcloud CLI with ce plugin, logged in, project selected

APP_NAME="classic-explorer"
IMAGE="${ICR_NAMESPACE:?Set ICR_NAMESPACE}/${APP_NAME}:${IMAGE_TAG:-latest}"
REGISTRY="icr.io"

echo "Deploying ${APP_NAME} from ${REGISTRY}/${IMAGE}"

# Check if app exists
if ibmcloud ce app get --name "${APP_NAME}" &>/dev/null; then
  echo "Updating existing application..."
  ibmcloud ce app update \
    --name "${APP_NAME}" \
    --image "${REGISTRY}/${IMAGE}" \
    --cpu 0.5 \
    --memory 1G \
    --min-scale 0 \
    --max-scale 10 \
    --port 8080 \
    --request-timeout 300 \
    --env NODE_ENV=production \
    --env LOG_LEVEL=info
else
  echo "Creating new application..."
  ibmcloud ce app create \
    --name "${APP_NAME}" \
    --image "${REGISTRY}/${IMAGE}" \
    --cpu 0.5 \
    --memory 1G \
    --min-scale 0 \
    --max-scale 10 \
    --port 8080 \
    --request-timeout 300 \
    --visibility public \
    --env NODE_ENV=production \
    --env LOG_LEVEL=info
fi

echo "Deployment complete. Getting application URL..."
ibmcloud ce app get --name "${APP_NAME}" --output url
