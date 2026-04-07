# IBM Cloud VPC Quotas and Service Limits

Reference for all VPC quotas (adjustable via IBM Support) and hard limits (fixed).
Used by the migration assessment to validate Classic-to-VPC readiness.

Source: [IBM Cloud VPC Quotas and Service Limits](https://cloud.ibm.com/docs/vpc?topic=vpc-quotas) |
[VPC Limitations](https://cloud.ibm.com/docs/vpc?topic=vpc-limitations)

---

## Compute

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| vCPU | 200 | Quota | Per region | Aggregate vCPU count per target region | `quota-vcpu-per-region` |
| RAM | 5,600 GB | Quota | Per region | Aggregate memory per target region | `quota-memory-per-region` |
| Bare metal servers | 25 | Quota | Per account | Total BM count | `quota-bm-per-account` |
| Instance storage | 18 TB | Quota | Per region | - | - |
| SSH keys | 200 | Quota | Per region | - | - |
| GPU | 16 | Quota | Per region | - | - |
| Dedicated host groups | 100 | Quota | Per region | - | - |
| Storage optimized (ox2) instance storage | 96 TB | Quota | Per region | - | - |
| Boot volume size | 250 GB | Limit | Per instance | Per-VSI boot disk check | `vsi-boot-disk-max` |
| Data volumes per instance | 12 | Limit | Per instance | Per-VSI volume count | `vsi-data-volume-count` |
| Max vCPU per instance | 200 | Limit | Per instance | Per-VSI vCPU check | `vsi-vcpu-max` |
| Max memory per instance | 5,600 GiB | Limit | Per instance | Per-VSI memory check | `vsi-memory-max` |
| Network interfaces per VSI | 5-15 | Limit | Per instance | - | - |
| PCI interfaces (bare metal) | 8 | Limit | Per server | - | - |
| Placement groups | 100 | Quota | Per region | Placement group count | `quota-placement-groups` |
| Instances per placement group (host_spread) | 12 | Limit | Per group | - | - |
| Instances per placement group (power_spread) | 4 | Limit | Per group | - | - |
| Instance groups (auto scale) | 200 | Limit | Per account | - | - |
| Instance group memberships | 1,000 | Limit | Per group | - | - |

**Docs:**
- [Instance profiles](https://cloud.ibm.com/docs/vpc?topic=vpc-profiles)
- [Block storage profiles](https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles)
- [Bare metal profiles](https://cloud.ibm.com/docs/vpc?topic=vpc-bare-metal-servers-profile)

---

## VPC & Subnets

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| VPCs | 10 | Quota | Per region | VLAN groups per target region | `quota-vpcs-per-region` |
| Subnets | 100 | Quota | Per VPC | Subnets per target VPC | `quota-subnets-per-vpc` |
| Address prefixes | 25 | Quota | Per VPC | - | - |
| Service IPs | 1 | Quota | Per zone per VPC | - | - |
| VPCs with classic access | 1 | Limit | Per region | - | - |
| Public gateways | 1 | Limit | Per zone per VPC | - | - |

**Docs:**
- [VPC overview](https://cloud.ibm.com/docs/vpc?topic=vpc-about-vpc)
- [About networking for VPC](https://cloud.ibm.com/docs/vpc?topic=vpc-about-networking-for-vpc)

---

## Security Groups

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Security groups | 100 | Quota | Per VPC | SG count per target VPC | `quota-sgs-per-vpc` |
| Rules per security group | 250 | Quota | Per SG | Per-SG rule count | `net-sg-rules` |
| Targets per security group | 1,000 | Quota | Per SG | - | - |
| Security groups per target | 5 | Limit | Per target | - | - |

**Docs:**
- [About security groups](https://cloud.ibm.com/docs/vpc?topic=vpc-using-security-groups)

---

## Network ACLs

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| ACLs | 100 | Quota | Per VPC | Firewalls per target VPC | `quota-acls-per-vpc` |
| Rules per ACL | 200 | Quota | Per ACL | Firewall rule count | `net-firewall-rules` |

**Docs:**
- [Using ACLs](https://cloud.ibm.com/docs/vpc?topic=vpc-using-acls)

---

## Floating & Reserved IPs

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Floating IP addresses | 40 | Quota | Per zone | Public IPs per target zone | `quota-floating-ips-per-zone` |
| Reserved IP addresses | 20,000 | Quota | Per region | - | - |
| Reserved IPs per subnet | 5 | Limit | Per subnet | IP conflict check | `net-vpc-reserved-ip` |

**Docs:**
- [About floating IPs](https://cloud.ibm.com/docs/vpc?topic=vpc-fip-about)

---

## Load Balancers

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Application load balancers (ALB) | 50 | Quota | Per region | - | - |
| Network load balancers (NLB) | 50 | Quota | Per region | - | - |
| Private path NLBs | 50 | Quota | Per region | - | - |
| Listeners per LB | 10 | Quota | Per LB | - | - |
| Pools per LB | 10 | Quota | Per LB | - | - |
| Members per pool | 50 | Quota | Per pool | - | - |
| Policies per listener | 10 | Quota | Per listener | - | - |
| Rules per policy | 10 | Quota | Per policy | - | - |
| Subnets per ALB | 15 | Quota | Per ALB | - | - |
| Subnets per NLB | 1 | Quota | Per NLB | - | - |

**Docs:**
- [About load balancers](https://cloud.ibm.com/docs/vpc?topic=vpc-load-balancers)

---

## Routing

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Routing tables | 50 | Quota | Per VPC | - | - |
| Routes per table | 200 | Quota | Per routing table | - | - |
| Advertised routes | 70 | Quota | Per VPC | - | - |
| Unique prefix lengths per custom table | 14 | Quota | Per table | - | - |

**Docs:**
- [About routing tables](https://cloud.ibm.com/docs/vpc?topic=vpc-about-custom-routes)

---

## VPN (Site-to-Site)

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| VPN gateways | 9 | Quota | Per region | IPsec VPN count per region | `quota-vpn-gateways-per-region` |
| VPN gateways | 3 | Quota | Per zone | - | - |
| VPN connections | 10 | Quota | Per gateway | - | - |
| IKE policies | 20 | Quota | Per region | - | - |
| IPsec policies | 20 | Quota | Per region | - | - |
| Peer and local subnets | 50 | Quota | Per gateway (across connections) | - | - |
| Peer and local subnets | 15 | Quota | Per connection | - | - |
| User-defined advertised routes | 10 | Quota | Per gateway | - | - |

**Docs:**
- [About VPN gateways](https://cloud.ibm.com/docs/vpc?topic=vpc-using-vpn)

---

## VPN (Client-to-Site)

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Active connections | 2,000 | Quota | Per server | - | - |
| Active VPN servers | 10 | Quota | Per region | - | - |
| Active routes | 50 | Quota | Per server | - | - |
| Certificate revocation lists | 20,000 | Quota | Per region | - | - |
| VPN servers in security group | 10 | Quota | Per group | - | - |
| Auth clients per second | 10 | Quota | Per server | - | - |

**Docs:**
- [About client-to-site VPN](https://cloud.ibm.com/docs/vpc?topic=vpc-vpn-client-to-site-overview)

---

## Block Storage

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Boot and secondary volumes | 300 | Quota | Per region | Total volumes per target region | `quota-volumes-per-region` |
| Volume size (Gen 1) | 16 TB | Limit | Per volume | Per-volume size check | `storage-block-size` |
| Volume size (Gen 2 sdp) | 32 TB | Limit | Per volume | Per-volume size check | `storage-block-size` |
| IOPS (Gen 1) | 48,000 | Limit | Per volume | Per-volume IOPS check | `storage-iops-compat` |
| IOPS (Gen 2 sdp) | 64,000 | Limit | Per volume | Per-volume IOPS check | `storage-iops-compat` |
| Secondary volumes per instance | 12 | Limit | Per instance | Per-VSI attachment count | `storage-attachment-count` |
| Snapshots (1st gen) | 750 | Quota | Per volume per region | - | - |
| Snapshots (2nd gen) | 512 | Quota | Per volume per region | - | - |

**Docs:**
- [Block storage profiles](https://cloud.ibm.com/docs/vpc?topic=vpc-block-storage-profiles)
- [Attaching block storage](https://cloud.ibm.com/docs/vpc?topic=vpc-attaching-block-storage)

---

## File Storage

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| File shares | 300 | Quota | Per account | Total file storage count | `quota-file-shares` |
| File share size | 32 TB | Limit | Per share | Per-volume size check | `storage-file-size` |
| Mount targets | 256 | Quota | Per share per zone | - | - |
| Accessor share bindings | 100 | Quota | Per share | - | - |
| Snapshots (zonal) | 750 | Quota | Per share per region | - | - |
| Snapshots (regional) | 30 | Quota | Per share per region | - | - |

**Docs:**
- [File storage profiles](https://cloud.ibm.com/docs/vpc?topic=vpc-file-storage-profiles)

---

## Backup

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Backup policies | 10 | Quota | Per region | - | - |
| File share backup size | 100 TB | Quota | Per share (cumulative) | - | - |
| Block volume backup size (1st gen) | 10 TB | Quota | Per volume (cumulative) | - | - |
| Block volume backup size (2nd gen) | 32 TB | Quota | Per volume | - | - |
| Retention period | 1,000 days | Quota | Per snapshot | - | - |

**Docs:**
- [Backup service](https://cloud.ibm.com/docs/vpc?topic=vpc-backup-service-about)

---

## Virtual Network Interfaces

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| IP addresses | 8 | Quota | Per interface | - | - |

---

## Cluster Networks

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Cluster networks | 5 | Quota | Per account per region | - | - |
| Cluster network subnets | 32 | Quota | Per cluster network | - | - |
| Reserved IP addresses | 5,000 | Quota | Per account | - | - |

---

## Public Address Ranges

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Public address ranges | 5 | Quota | Per account per region | - | - |
| Prefix size | /32 to /28 | Quota | Configuration | - | - |
| Public address ranges per VPC per zone | 10 | Limit | Per VPC per zone | - | - |

---

## Image Export

| Resource | Default | Type | Scope | Migration Check | Check ID |
|----------|---------|------|-------|-----------------|----------|
| Active export jobs | 5 | Limit | Per image | - | - |
| Total export jobs | 10 | Limit | Per image | - | - |
| Active export jobs | 20 | Limit | Per account per region | - | - |

---

## General Limitations (not quota-based)

| Limitation | Details | Migration Check | Check ID |
|------------|---------|-----------------|----------|
| IPv6 not supported | VPC is IPv4-only | IPv6 detection | `net-ipv6-usage` |
| No public subnets | Use floating IPs or LBs | Public IP detection | `net-public-ip` |
| No VRRP support | Use LBs or floating IP failover | Manual verification | `net-vrrp-ha` |
| VRF required for Transit Gateway | Must enable VRF on account | Manual verification | `net-vrf-enablement` |
| No nested virtualization | VSIs cannot run hypervisors | Hypervisor detection | Compute checks |
| No NFS v3 | File shares use NFS v4.1 only | - | - |
| Volume names unique across VPC | Max 63 chars, lowercase + hyphens | - | - |
| No multi-attach for VSI block storage | Use NFS file shares for shared storage | Multi-attach detection | `storage-multi-attach` |

---

## Notes

- **Quotas** are default values that can be increased by contacting IBM Cloud Support.
- **Limits** are hard constraints that cannot be changed.
- Migration checks with `-` are not currently implemented (resource data not available from Classic API, or not relevant to Classic-to-VPC migration).
- Account-level quota checks (`quota-*`) validate the aggregate Classic estate against default VPC quotas. They produce `warning` severity since quotas can be increased.
