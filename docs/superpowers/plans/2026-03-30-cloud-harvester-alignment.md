# Cloud-Harvester Schema Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align classic_analyser with cloud-harvester schemas so both projects produce and consume identical XLSX data for 5 Classic resource types (9 new fields total + 1 new resource type definition).

**Architecture:** Each resource type is modified independently across 4 layers: column definitions (JSON), frontend transform, backend API collector, and XLSX export. The transform layer handles both API-collected data (raw SoftLayer objects) and XLSX-imported data (pre-flattened rows). The export layer must handle both raw and pre-transformed data using the `r.field ?? vol.nested?.field` pattern already established.

**Tech Stack:** TypeScript, React, ExcelJS, SoftLayer REST API

**Spec:** `docs/superpowers/specs/2026-03-30-cloud-harvester-alignment-design.md`

---

## File Structure

| File | Responsibility | Changes |
|---|---|---|
| `src/data/classicResourceTypes.json` | Frontend column definitions | Add columns to 4 types + 1 new type |
| `src/services/transform.ts` | Raw API → flat UI row mapping | Add fields to VSI + BM transforms, add `replicationStatus` to storage transforms |
| `server/src/services/softlayer/compute.ts` | SoftLayer API collection | Add `allowedNetworkStorage` to VSI + BM object masks |
| `server/src/services/softlayer/storage.ts` | SoftLayer API collection | Add `replicationStatus` to block + file object masks |
| `server/src/services/export.ts` | XLSX worksheet generation | Add columns + row fields to 4 worksheets |

---

### Task 1: Virtual Servers — Add 4 fields

**Files:**
- Modify: `server/src/services/softlayer/compute.ts:13-14` (VSI object mask)
- Modify: `src/services/transform.ts:115-229` (transformVirtualServer)
- Modify: `src/data/classicResourceTypes.json:205-211` (after portableStorageDetails)
- Modify: `server/src/services/export.ts:139-226` (vVirtualServers worksheet)

- [ ] **Step 1: Add `allowedNetworkStorage` to VSI object mask**

In `server/src/services/softlayer/compute.ts`, the VSI `objectMask` on line 13-14 is a single string. Append `allowedNetworkStorage[id,nasType,capacityGb,username]` before the closing `]`:

```typescript
  const objectMask =
    'mask[id,hostname,domain,fullyQualifiedDomainName,primaryIpAddress,primaryBackendIpAddress,maxCpu,maxMemory,startCpus,status,powerState,datacenter,operatingSystem[softwareDescription],hourlyBillingFlag,createDate,modifyDate,billingItem[recurringFee,hourlyRecurringFee,children[categoryCode,hourlyRecurringFee],orderItem],networkVlans[id,vlanNumber,name,networkSpace],blockDevices[bootableFlag,device,diskImage[capacity,units,localDiskFlag,description]],allowedNetworkStorage[id,nasType,capacityGb,username],tagReferences[tag],notes,dedicatedAccountHostOnlyFlag,placementGroupId,privateNetworkOnlyFlag,localDiskFlag]';
```

- [ ] **Step 2: Add storage fields + costBasis to VSI transform**

In `src/services/transform.ts`, in `transformVirtualServer` (starts line 115), add the computation after the `portableStorageDetails` block (around line 151) and add the new fields to the return object (before the closing `};` around line 229).

Add this computation block after the `portableStorageDetails` variable (after line 151):

```typescript
  // Attached network storage (block & file)
  const allowedNetworkStorage = raw.allowedNetworkStorage as RawItem[] | undefined;
  const attachedBlockStorageGb = allowedNetworkStorage
    ? allowedNetworkStorage
        .filter((s) => s.nasType === 'ISCSI')
        .reduce((sum, s) => sum + (Number(s.capacityGb) || 0), 0)
    : 0;
  const attachedFileStorageGb = allowedNetworkStorage
    ? allowedNetworkStorage
        .filter((s) => s.nasType === 'NAS')
        .reduce((sum, s) => sum + (Number(s.capacityGb) || 0), 0)
    : 0;
  const volumeCount = allowedNetworkStorage ? allowedNetworkStorage.length : 0;

  // Cost basis derivation
  const costBasis = (() => {
    const monthly = nested(raw, 'billingItem', 'recurringFee');
    if (monthly && Number(monthly) > 0) return 'Monthly';
    if (raw.hourlyBillingFlag) {
      const totalHourly = sumHourlyFees(raw);
      if (totalHourly > 0) return 'Estimated';
    }
    return '';
  })();
```

Then add these fields to the return object, after `blockDeviceDetails` (around line 212) and before `billingCategories`:

```typescript
    attachedBlockStorageGb,
    attachedFileStorageGb,
    volumeCount,
    costBasis,
```

- [ ] **Step 3: Add column definitions to classicResourceTypes.json**

In `src/data/classicResourceTypes.json`, find the `portableStorageDetails` column in the virtualServers section (around line 205). After that column entry, add these 4 new column objects:

```json
      {
        "field": "attachedBlockStorageGb",
        "header": "Attached Block Storage (GB)",
        "dataType": "number",
        "defaultVisible": false,
        "sortable": true
      },
      {
        "field": "attachedFileStorageGb",
        "header": "Attached File Storage (GB)",
        "dataType": "number",
        "defaultVisible": false,
        "sortable": true
      },
      {
        "field": "volumeCount",
        "header": "Volume Count",
        "dataType": "number",
        "defaultVisible": false,
        "sortable": true
      },
      {
        "field": "costBasis",
        "header": "Cost Basis",
        "dataType": "string",
        "defaultVisible": false,
        "sortable": true
      },
```

- [ ] **Step 4: Add columns to XLSX export**

In `server/src/services/export.ts`, the vVirtualServers worksheet columns (line 139-169) and row data (line 175-225) need updating.

Add these columns after `portableStorageDetails` (after line 167, before `networkVlans`):

```typescript
    { header: 'Block Device Details', key: 'blockDeviceDetails', width: 40 },
    { header: 'Attached Block Storage (GB)', key: 'attachedBlockStorageGb', width: 24 },
    { header: 'Attached File Storage (GB)', key: 'attachedFileStorageGb', width: 24 },
    { header: 'Volume Count', key: 'volumeCount', width: 14 },
```

Note: `blockDeviceDetails` is already computed in the transform but was missing from the export columns. Add it too.

Add these fields to the `addRow` call (after `portableStorageDetails`, before `networkVlans`):

```typescript
      blockDeviceDetails: r.blockDeviceDetails ?? '',
      attachedBlockStorageGb: r.attachedBlockStorageGb ?? '',
      attachedFileStorageGb: r.attachedFileStorageGb ?? '',
      volumeCount: r.volumeCount ?? '',
```

The `costBasis` column and row field are already in the export (lines 155, 202-211) — no change needed there.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean build with no TypeScript errors.

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: All tests pass (256+).

- [ ] **Step 7: Commit**

```bash
git add src/data/classicResourceTypes.json src/services/transform.ts server/src/services/softlayer/compute.ts server/src/services/export.ts
git commit -m "feat: add attached storage and costBasis fields to virtual servers

Aligns with cloud-harvester schema: attachedBlockStorageGb,
attachedFileStorageGb, volumeCount, costBasis. Adds
allowedNetworkStorage to VSI object mask for API collection."
```

---

### Task 2: Bare Metal — Add 3 fields

**Files:**
- Modify: `server/src/services/softlayer/compute.ts:35-36` (BM object mask)
- Modify: `src/services/transform.ts:232-310` (transformBareMetal)
- Modify: `src/data/classicResourceTypes.json` (bareMetal columns, after hardDriveDetails)
- Modify: `server/src/services/export.ts:230-284` (vBareMetal worksheet)

- [ ] **Step 1: Add `allowedNetworkStorage` to bare metal object mask**

In `server/src/services/softlayer/compute.ts`, the BM `objectMask` on line 36 is a single string. Append `allowedNetworkStorage[id,nasType,capacityGb,username]` before the closing `]`:

```typescript
  const objectMask =
    'mask[id,hostname,domain,fullyQualifiedDomainName,manufacturerSerialNumber,primaryIpAddress,primaryBackendIpAddress,processorPhysicalCoreAmount,memoryCapacity,hardDrives[capacity,hardwareComponentModel[hardwareGenericComponentModel[hardwareComponentType]]],datacenter,operatingSystem[softwareDescription],networkComponents[primaryIpAddress,port,speed,status,macAddress],billingItem[recurringFee],provisionDate,powerSupplyCount,networkGatewayMemberFlag,networkVlans,tagReferences,notes,allowedNetworkStorage[id,nasType,capacityGb,username]]';
```

- [ ] **Step 2: Add storage fields to bare metal transform**

In `src/services/transform.ts`, in `transformBareMetal` (starts line 232), add the computation before the return statement (before line 258):

```typescript
  // Attached network storage (block & file)
  const allowedNetworkStorage = raw.allowedNetworkStorage as RawItem[] | undefined;
  const attachedBlockStorageGb = allowedNetworkStorage
    ? allowedNetworkStorage
        .filter((s) => s.nasType === 'ISCSI')
        .reduce((sum, s) => sum + (Number(s.capacityGb) || 0), 0)
    : 0;
  const attachedFileStorageGb = allowedNetworkStorage
    ? allowedNetworkStorage
        .filter((s) => s.nasType === 'NAS')
        .reduce((sum, s) => sum + (Number(s.capacityGb) || 0), 0)
    : 0;
  const volumeCount = allowedNetworkStorage ? allowedNetworkStorage.length : 0;
```

Add these fields to the return object, after `hardDriveDetails` (before the closing `};`):

```typescript
    attachedBlockStorageGb,
    attachedFileStorageGb,
    volumeCount,
```

- [ ] **Step 3: Add column definitions to classicResourceTypes.json**

In `src/data/classicResourceTypes.json`, find the `hardDriveDetails` column in the bareMetal section (around line 388). After that column entry, add:

```json
      {
        "field": "attachedBlockStorageGb",
        "header": "Attached Block Storage (GB)",
        "dataType": "number",
        "defaultVisible": false,
        "sortable": true
      },
      {
        "field": "attachedFileStorageGb",
        "header": "Attached File Storage (GB)",
        "dataType": "number",
        "defaultVisible": false,
        "sortable": true
      },
      {
        "field": "volumeCount",
        "header": "Volume Count",
        "dataType": "number",
        "defaultVisible": false,
        "sortable": true
      },
```

- [ ] **Step 4: Add columns to XLSX export**

In `server/src/services/export.ts`, the vBareMetal worksheet columns (line 231-253) and row data (line 259-283) need updating.

Add these columns after `hardDrives` (line 249), before `networkComponents`:

```typescript
    { header: 'Drive Details', key: 'hardDriveDetails', width: 40 },
    { header: 'Attached Block Storage (GB)', key: 'attachedBlockStorageGb', width: 24 },
    { header: 'Attached File Storage (GB)', key: 'attachedFileStorageGb', width: 24 },
    { header: 'Volume Count', key: 'volumeCount', width: 14 },
```

Note: `hardDriveDetails` was missing from the export columns (like `blockDeviceDetails` for VSIs). Add it too for cloud-harvester alignment.

Add these fields to the `addRow` call (after `hardDrives`, before `networkComponents`):

```typescript
      hardDriveDetails: r.hardDriveDetails ?? '',
      attachedBlockStorageGb: r.attachedBlockStorageGb ?? '',
      attachedFileStorageGb: r.attachedFileStorageGb ?? '',
      volumeCount: r.volumeCount ?? '',
```

- [ ] **Step 5: Verify build and tests**

Run: `npm run build && npm test`
Expected: Clean build, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/data/classicResourceTypes.json src/services/transform.ts server/src/services/softlayer/compute.ts server/src/services/export.ts
git commit -m "feat: add attached storage fields to bare metal servers

Aligns with cloud-harvester schema: attachedBlockStorageGb,
attachedFileStorageGb, volumeCount. Adds allowedNetworkStorage
to bare metal object mask for API collection."
```

---

### Task 3: Block Storage — Add replicationStatus field

**Files:**
- Modify: `server/src/services/softlayer/storage.ts:11-12` (block storage object mask)
- Modify: `src/services/transform.ts:444-467` (transformBlockStorage)
- Modify: `src/data/classicResourceTypes.json` (blockStorage columns, after snapshotSizeBytes)
- Modify: `server/src/services/export.ts:501-552` (vBlockStorage worksheet)

- [ ] **Step 1: Add `replicationStatus` to block storage object mask**

In `server/src/services/softlayer/storage.ts`, the block storage `objectMask` on line 11-12. Add `replicationStatus` to the mask. Insert it after `parentVolume[snapshotSizeBytes]`:

```typescript
  const objectMask =
    'mask[id,username,capacityGb,iops,storageType,storageTierLevel,serviceResourceBackendIpAddress,lunId,allowedVirtualGuests[id,hostname],allowedHardware[id,hostname],allowedSubnets,snapshotCapacityGb,schedules,replicationPartners[id,username,serviceResourceBackendIpAddress],billingItem[recurringFee],createDate,notes,hasEncryptionAtRest,serviceResource[datacenter[name]],parentVolume[snapshotSizeBytes],replicationStatus]';
```

- [ ] **Step 2: Add replicationStatus to block storage transform**

In `src/services/transform.ts`, in `transformBlockStorage` (line 444), add after `snapshotCount` (line 465) and before the closing `};`:

```typescript
    replicationStatus: raw.replicationStatus ?? '',
```

- [ ] **Step 3: Add column definition to classicResourceTypes.json**

In `src/data/classicResourceTypes.json`, find the `snapshotSizeBytes` column in the blockStorage section (around line 1091). After `snapshotCount` (around line 1098), add:

```json
      {
        "field": "replicationStatus",
        "header": "Replication Status",
        "dataType": "string",
        "defaultVisible": false,
        "sortable": true
      },
```

- [ ] **Step 4: Add column to XLSX export**

In `server/src/services/export.ts`, the vBlockStorage worksheet.

Add this column after `snapshotCount` (line 522), before `allowedSubnets`:

```typescript
    { header: 'Replication Status', key: 'replicationStatus', width: 16 },
```

Add this field to the `addRow` call (after `snapshotCount`, before `allowedSubnets`):

```typescript
      replicationStatus: r.replicationStatus ?? '',
```

- [ ] **Step 5: Verify build and tests**

Run: `npm run build && npm test`
Expected: Clean build, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/data/classicResourceTypes.json src/services/transform.ts server/src/services/softlayer/storage.ts server/src/services/export.ts
git commit -m "feat: add replicationStatus field to block storage

Aligns with cloud-harvester schema. Adds replicationStatus to
object mask, transform, column definition, and XLSX export."
```

---

### Task 4: File Storage — Add replicationStatus field

**Files:**
- Modify: `server/src/services/softlayer/storage.ts:64-65` (file storage object mask)
- Modify: `src/services/transform.ts:469-493` (transformFileStorage)
- Modify: `src/data/classicResourceTypes.json` (fileStorage columns, after snapshotSizeBytes)
- Modify: `server/src/services/export.ts:554-607` (vFileStorage worksheet)

- [ ] **Step 1: Add `replicationStatus` to file storage object mask**

In `server/src/services/softlayer/storage.ts`, the file storage `objectMask` on line 64-65. Add `replicationStatus` after `parentVolume[snapshotSizeBytes]`:

```typescript
  const objectMask =
    'mask[id,username,capacityGb,iops,storageType,storageTierLevel,serviceResourceBackendIpAddress,fileNetworkMountAddress,allowedVirtualGuests[id,hostname],allowedHardware[id,hostname],allowedSubnets,snapshotCapacityGb,schedules,replicationPartners[id,username,serviceResourceBackendIpAddress],billingItem[recurringFee],createDate,notes,bytesUsed,hasEncryptionAtRest,serviceResource[datacenter[name]],parentVolume[snapshotSizeBytes],replicationStatus]';
```

- [ ] **Step 2: Add replicationStatus to file storage transform**

In `src/services/transform.ts`, in `transformFileStorage` (line 469), add after `snapshotCount` (line 491) and before the closing `};`:

```typescript
    replicationStatus: raw.replicationStatus ?? '',
```

- [ ] **Step 3: Add column definition to classicResourceTypes.json**

In `src/data/classicResourceTypes.json`, find the `snapshotSizeBytes` column in the fileStorage section (around line 1246). After `snapshotCount` (around line 1253), add:

```json
      {
        "field": "replicationStatus",
        "header": "Replication Status",
        "dataType": "string",
        "defaultVisible": false,
        "sortable": true
      },
```

- [ ] **Step 4: Add column to XLSX export**

In `server/src/services/export.ts`, the vFileStorage worksheet.

Add this column after `snapshotCount` (line 576), before `allowedSubnets`:

```typescript
    { header: 'Replication Status', key: 'replicationStatus', width: 16 },
```

Add this field to the `addRow` call (after `snapshotCount`, before `allowedSubnets`):

```typescript
      replicationStatus: r.replicationStatus ?? '',
```

- [ ] **Step 5: Verify build and tests**

Run: `npm run build && npm test`
Expected: Clean build, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/data/classicResourceTypes.json src/services/transform.ts server/src/services/softlayer/storage.ts server/src/services/export.ts
git commit -m "feat: add replicationStatus field to file storage

Aligns with cloud-harvester schema. Adds replicationStatus to
object mask, transform, column definition, and XLSX export."
```

---

### Task 5: VMware Cross References — Add frontend table definition

**Files:**
- Modify: `src/data/classicResourceTypes.json` (add new resource type at end, before closing `]`)

- [ ] **Step 1: Add vmwareCrossReferences resource type**

In `src/data/classicResourceTypes.json`, before the final closing `]` on line 3025, add a comma after the last resource type's closing `}` and add:

```json
  {
    "key": "vmwareCrossReferences",
    "label": "VMware Cross References",
    "category": "VMware",
    "worksheetName": "vVMwareCrossReferences",
    "columns": [
      {
        "field": "classicResourceType",
        "header": "Classic Resource Type",
        "dataType": "string",
        "defaultVisible": true,
        "sortable": true
      },
      {
        "field": "classicResourceId",
        "header": "Classic Resource ID",
        "dataType": "string",
        "defaultVisible": true,
        "sortable": true
      },
      {
        "field": "classicResourceName",
        "header": "Classic Resource Name",
        "dataType": "string",
        "defaultVisible": true,
        "sortable": true
      },
      {
        "field": "vmwareRole",
        "header": "VMware Role",
        "dataType": "string",
        "defaultVisible": true,
        "sortable": true
      },
      {
        "field": "vmwareResourceType",
        "header": "VMware Resource Type",
        "dataType": "string",
        "defaultVisible": true,
        "sortable": true
      },
      {
        "field": "vmwareResourceId",
        "header": "VMware Resource ID",
        "dataType": "string",
        "defaultVisible": true,
        "sortable": true
      },
      {
        "field": "vmwareResourceName",
        "header": "VMware Resource Name",
        "dataType": "string",
        "defaultVisible": true,
        "sortable": true
      }
    ]
  }
```

- [ ] **Step 2: Verify build and tests**

Run: `npm run build && npm test`
Expected: Clean build, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/data/classicResourceTypes.json
git commit -m "feat: add vmwareCrossReferences frontend table definition

Backend already collects and exports this resource type. This adds
the column definitions so it appears in the UI tables."
```

---

### Task 6: Final verification

- [ ] **Step 1: Full build + lint + test**

Run: `npm run lint && npm run build && npm test`
Expected: All pass clean.

- [ ] **Step 2: Verify column count alignment with cloud-harvester**

Quick check — the field counts should match:
- virtualServers: cloud-harvester has 31 columns, we should now have 31+ (we have extra: `billingCategories`, `hourlyRate`, `blockDeviceDetails`, `estimatedCost`, `noBillingItem`)
- bareMetal: cloud-harvester has 25 columns, we should now have 25+ (we have extra: `nicDetails`)
- blockStorage: cloud-harvester has 19 columns, we should now have 19+ (we have extra: `snapshotCount`)
- fileStorage: cloud-harvester has 20 columns, we should now have 20+ (we have extra: `snapshotCount`)
- vmwareCrossReferences: cloud-harvester has 7 columns, we should have 7

Our app has a superset of cloud-harvester fields (extra fields for UI features). All cloud-harvester fields must be present.

- [ ] **Step 3: Commit all and push**

If any uncommitted changes remain:

```bash
git add -A
git commit -m "chore: cloud-harvester schema alignment complete"
```
