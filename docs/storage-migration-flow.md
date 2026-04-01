# Classic to VPC Storage Migration — Selection Flow

This document describes the decision flow for selecting target VPC storage profiles when migrating from IBM Cloud Classic Infrastructure.

## Source Storage Types

Classic infrastructure has three storage categories:

| Classic Type | Protocol | VPC Equivalent |
|---|---|---|
| Block Storage | iSCSI | Block Storage for VPC |
| File Storage | NFS v3 | File Storage for VPC (NFS v4.1) |
| Object Storage (COS) | S3/Swift | Same service — no migration needed |

## VPC Block Storage Profiles

VPC offers two generations of block storage profiles:

### Gen 2: `sdp` (Defined Performance)

| Attribute | Value |
|---|---|
| IOPS | 20–3000 IOPS/GB (independent of capacity) |
| Max IOPS per volume | 64,000 |
| Max throughput | 8,192 Mbps |
| Capacity | 1 GB – 32 TB |

**Limitations (as of April 2026):**
- **Cannot be used for boot volumes** — cannot reliably detect GPT-formatted volumes; may boot to BIOS instead of UEFI. Must not be used with secure boot.
- **No consistency group snapshots** — volumes can only be snapshotted individually, not as part of a consistency group. This affects crash-consistent backup of multi-volume VMs.
- **Regional availability** — not available in all regions (e.g., Montreal excluded).

### Gen 1: Tiered Profiles

| Profile | IOPS | Max IOPS | Capacity | Max Throughput |
|---|---|---|---|---|
| `general-purpose` | 3 IOPS/GB (fixed) | 48,000 | 10 GB – 16 TB | 670 Mbps |
| `5iops-tier` | 5 IOPS/GB (fixed) | 48,000 | 10 GB – 9.6 TB | 768 Mbps |
| `10iops-tier` | 10 IOPS/GB (fixed) | 48,000 | 10 GB – 4.8 TB | 1,024 Mbps |
| `custom` | Variable | 48,000 | 10 GB – 16 TB | 1,024 Mbps |

`general-purpose` is the **only profile available for boot volumes**.

## Decision Flow: Block Storage

### Step 1 — Is this a boot volume?

- **Yes** → use `general-purpose` (only option)
- **No** → proceed to Step 2

### Step 2 — Is the target region supported by `sdp`?

- **No** → proceed to Step 4 (Gen 1 tier mapping)
- **Yes** → proceed to Step 3

### Step 3 — Does the VM require crash-consistent multi-volume snapshots?

- **Yes** → proceed to Step 4 (Gen 1 tier mapping) — `sdp` does not support consistency groups
- **No** → use `sdp` with IOPS set to match or exceed Classic source IOPS

### Step 4 — Gen 1 Tier Mapping (from Classic source)

Map the Classic storage tier to a Gen 1 VPC profile:

| Classic Tier | Classic IOPS | VPC Profile | VPC IOPS |
|---|---|---|---|
| 0.25 IOPS/GB | ≤500 | `general-purpose` | 3 IOPS/GB (3,000 base) |
| 2 IOPS/GB | 501–3,000 | `5iops-tier` | 5 IOPS/GB |
| 4 IOPS/GB | 3,001–6,000 | `10iops-tier` | 10 IOPS/GB |
| 10 IOPS/GB | 6,001–10,000 | `10iops-tier` | 10 IOPS/GB |
| Custom | >10,000 | `custom` | Up to 48,000 |

### Step 5 — Migration Strategy (by capacity)

| Condition | Strategy | Notes |
|---|---|---|
| Capacity < 2 TB | Snapshot-based (via COS) | Export snapshot, upload to COS, import to VPC |
| Capacity >= 2 TB | Replication-based | Minimises downtime for large volumes |

## Decision Flow: File Storage

| Step | Decision |
|---|---|
| Source is Classic File Storage (NFS v3) | Migrate to VPC File Share (NFS v4.1) |
| | Verify application compatibility with NFS v4.1 |
| | `dp2` profile recommended (independent IOPS/capacity) |

## Decision Flow: Object Storage

| Step | Decision |
|---|---|
| Source is Classic Object Storage (COS) | **No migration required** — same IBM COS service |
| | Update endpoint configuration only (Classic → VPC private endpoint) |

## References

- [IBM Cloud Block Storage for VPC profiles](https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles)
- [Scott Moonen — From VMware to IBM Cloud VPC VSI, part 1](https://fullvalence.com/2025/10/29/from-vmware-to-ibm-cloud-vpc-vsi-part-1-introduction/)
- [Scott Moonen — From VMware to IBM Cloud VPC VSI, part 4: Backup and restore](https://fullvalence.com/2025/11/20/from-vmware-to-ibm-cloud-vpc-vsi-part-4-backup-and-restore/)
- [GA announcement: Gen 2 SDP Profile](https://community.ibm.com/community/user/blogs/prathamesh-kadam/2025/09/24/now-available-gen2-block-storage-sdp-profile)
