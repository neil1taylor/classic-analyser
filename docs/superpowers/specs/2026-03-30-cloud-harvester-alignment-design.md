# Cloud-Harvester Schema Alignment

Align classic_analyser resource type definitions, API collectors, transforms, and XLSX exports with cloud-harvester's schema so that both projects produce and consume identical data.

## Context

cloud-harvester (Python CLI) and classic_analyser (Node.js/React web app) both collect IBM Cloud infrastructure data and output XLSX files. Recent cloud-harvester enhancements added fields to 4 Classic resource types. classic_analyser must match these schemas so that:

1. XLSX files from cloud-harvester import correctly (all columns displayed)
2. API-collected data includes the same fields
3. XLSX exports from classic_analyser are consumable by cloud-harvester

VPC (24 types) and PowerVS (22 types) are already aligned. VMware (10 types) API collectors are complete but one resource type lacks a frontend table definition.

## Changes by Resource Type

### 1. Virtual Servers — 4 new fields

| Field | Header | Type | Source | Default Visible |
|---|---|---|---|---|
| `costBasis` | Cost Basis | string | Derived: "Monthly" or "Estimated" (hourly × 730) | false |
| `attachedBlockStorageGb` | Attached Block Storage (GB) | number | Sum of `allowedNetworkStorage` where `nasType == "ISCSI"` | false |
| `attachedFileStorageGb` | Attached File Storage (GB) | number | Sum of `allowedNetworkStorage` where `nasType == "NAS"` | false |
| `volumeCount` | Volume Count | number | Count of `allowedNetworkStorage` entries | false |

**Files to modify:**

- `src/data/classicResourceTypes.json` — add 4 column definitions after `portableStorageDetails`
- `server/src/services/softlayer/compute.ts` — add `allowedNetworkStorage[id,nasType,capacityGb,username]` to VSI object mask; compute the 4 fields in the transform
- `src/services/transform.ts` — add passthrough for new fields (they arrive pre-computed from API, or as raw values from XLSX import)
- `server/src/services/export.ts` — add 4 columns to vVirtualServers worksheet

**Derivation logic for `costBasis`:**
- If `hourlyBillingFlag` is true and `billingItem.recurringFee` is empty/zero: `costBasis = "Estimated"`, `recurringFee = hourlyTotal * 730`
- Otherwise: `costBasis = "Monthly"`
- This matches cloud-harvester's `virtual_servers.py` lines 49-55

**Derivation logic for attached storage:**
```
allowedNetworkStorage = vsi.allowedNetworkStorage (array)
attachedBlockStorageGb = sum(s.capacityGb for s where s.nasType == "ISCSI")
attachedFileStorageGb  = sum(s.capacityGb for s where s.nasType == "NAS")
volumeCount            = allowedNetworkStorage.length
```

### 2. Bare Metal — 3 new fields

| Field | Header | Type | Source | Default Visible |
|---|---|---|---|---|
| `attachedBlockStorageGb` | Attached Block Storage (GB) | number | Sum of `allowedNetworkStorage` where `nasType == "ISCSI"` | false |
| `attachedFileStorageGb` | Attached File Storage (GB) | number | Sum of `allowedNetworkStorage` where `nasType == "NAS"` | false |
| `volumeCount` | Volume Count | number | Count of `allowedNetworkStorage` entries | false |

**Files to modify:**

- `src/data/classicResourceTypes.json` — add 3 column definitions after `hardDriveDetails`
- `server/src/services/softlayer/compute.ts` — add `allowedNetworkStorage[id,nasType,capacityGb,username]` to bare metal object mask; compute the 3 fields
- `src/services/transform.ts` — add passthrough for new fields
- `server/src/services/export.ts` — add 3 columns to vBareMetal worksheet

### 3. Block Storage — 1 new field

| Field | Header | Type | Source | Default Visible |
|---|---|---|---|---|
| `replicationStatus` | Replication Status | string | Direct from API: `item.replicationStatus` | false |

**Files to modify:**

- `src/data/classicResourceTypes.json` — add column definition after `snapshotSizeBytes`
- `server/src/services/softlayer/storage.ts` — add `replicationStatus` to block storage object mask; extract in transform
- `src/services/transform.ts` — add passthrough
- `server/src/services/export.ts` — add column to vBlockStorage worksheet

### 4. File Storage — 1 new field

| Field | Header | Type | Source | Default Visible |
|---|---|---|---|---|
| `replicationStatus` | Replication Status | string | Direct from API: `item.replicationStatus` | false |

**Files to modify:**

Same pattern as block storage:
- `src/data/classicResourceTypes.json` — add column definition after `snapshotSizeBytes`
- `server/src/services/softlayer/storage.ts` — add `replicationStatus` to file storage object mask; extract in transform
- `src/services/transform.ts` — add passthrough
- `server/src/services/export.ts` — add column to vFileStorage worksheet

### 5. VMware Cross References — frontend table definition

The backend already collects, builds (from bare metal + VMware host matching), and exports this resource type. Only the frontend table definition is missing.

| Field | Header | Type | Default Visible |
|---|---|---|---|
| `classicResourceType` | Classic Resource Type | string | true |
| `classicResourceId` | Classic Resource ID | string | true |
| `classicResourceName` | Classic Resource Name | string | true |
| `vmwareRole` | VMware Role | string | true |
| `vmwareResourceType` | VMware Resource Type | string | true |
| `vmwareResourceId` | VMware Resource ID | string | true |
| `vmwareResourceName` | VMware Resource Name | string | true |

**Files to modify:**

- `src/data/classicResourceTypes.json` — add new resource type entry with key `vmwareCrossReferences`, category `VMware`, worksheetName `vVMwareCrossReferences`

No backend changes needed.

## Implementation Order

Each resource type is independent and can be implemented in parallel:

1. Virtual Servers (largest — 4 fields + costBasis derivation)
2. Bare Metal (3 fields, same pattern as VSIs)
3. Block Storage (1 field)
4. File Storage (1 field)
5. VMware Cross References (JSON only)

## Files Modified (complete list)

| File | Changes |
|---|---|
| `src/data/classicResourceTypes.json` | Add columns to 4 resource types + 1 new resource type |
| `src/services/transform.ts` | Add passthrough for 9 new fields |
| `server/src/services/softlayer/compute.ts` | Add `allowedNetworkStorage` to VSI + BM masks; derive storage fields + costBasis |
| `server/src/services/softlayer/storage.ts` | Add `replicationStatus` to block + file masks; extract field |
| `server/src/services/export.ts` | Add columns to 4 worksheets |

## What's NOT Changing

- VPC domain (24 types) — already aligned
- PowerVS domain (22 types) — already aligned
- VMware API collectors (10 types) — already complete
- No new pages, routes, contexts, or hooks
- No new dependencies

## Verification

- `npm run build` succeeds
- `npm test` passes (all 256+ tests)
- `npm run lint` clean
- Import a cloud-harvester XLSX — new fields appear in tables
- API collection produces the new fields (verifiable via XLSX export comparison)

## Reference: cloud-harvester schema source

`/Users/neiltaylor/Projects/cloud-harvester/src/cloud_harvester/schema.py` — CLASSIC_SCHEMAS entries for virtualServers (lines 26-64), bareMetal (lines 66-96), blockStorage (lines 204-229), fileStorage (lines 231-257), VMWARE_SCHEMAS entry for vmwareCrossReferences (lines 1343-1356).
