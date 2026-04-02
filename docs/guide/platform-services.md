# Platform Services

## Overview

Platform Services collects all IBM Cloud service instances via the Resource Controller API. This includes Cloud Object Storage (COS), Key Protect, Security and Compliance Center (SCC), databases, Event Streams, and 30+ other service types. Platform Services is available whenever VPC or PowerVS authentication succeeds, since all three domains use IAM tokens.

## Data Collection

Platform Services collection is automatic once authenticated and involves two API calls:

1. **Service Instances** — fetched from `/v2/resource_instances`, returning every service instance in the account.
2. **Resource Groups** — fetched from `/v2/resource_groups`, used to resolve resource group IDs to human-readable names.

After fetching, each instance is enriched with display-friendly metadata from a built-in map of 30+ known service types. Services not in the map fall back to the raw `resource_id`.

> **Note:** No additional API key is required. Platform Services reuses the same IAM token obtained during VPC or PowerVS authentication.

## Computed Fields

Each service instance is enriched with three computed fields:

| Field                | Description                                                                 | Example                     |
|----------------------|-----------------------------------------------------------------------------|-----------------------------|
| `_serviceType`       | Human-readable service name resolved from the built-in known services map   | Cloud Object Storage        |
| `_serviceCategory`   | Category grouping for the service                                           | Storage, Security, Database |
| `_resourceGroupName` | Resource group name resolved from the resource group ID                     | Default, production         |

These computed fields enable filtering and grouping in both the dashboard and data tables.

## Known Service Types

The application recognizes 30+ IBM Cloud service types, including:

- **Storage** — Cloud Object Storage
- **Security** — Key Protect, Secrets Manager, Security and Compliance Center
- **Databases** — Databases for PostgreSQL, MongoDB, Redis, MySQL, Elasticsearch, etcd
- **Integration** — Event Streams, MQ, API Gateway
- **AI/ML** — Watson Studio, Watson Machine Learning, Watson Discovery
- **Networking** — Internet Services, DNS Services, Direct Link
- **Containers** — Kubernetes Service, Red Hat OpenShift
- **Monitoring** — Cloud Monitoring, Log Analysis, Activity Tracker

Services not in the known list are displayed using their raw resource identifier.

## XLSX Export

Platform Services data exports to a worksheet named `sServiceInstances`. The `s` prefix denotes Platform Services, distinguishing it from Classic/VPC worksheets (prefixed with `v`) and PowerVS worksheets (prefixed with `p`).

## Dashboard

The Platform Services dashboard displays:

- Total service instance count
- Breakdown by service type and category
- Resource group distribution
- Service instance table with sorting, filtering, and search
