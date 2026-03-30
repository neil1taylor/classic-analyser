import type { FeatureGapDefinition } from '@/types/migration';

export const FEATURE_GAP_DEFINITIONS: FeatureGapDefinition[] = [
  {
    classicFeature: 'Hardware Firewall (Dedicated)',
    vpcStatus: 'not-available',
    workaround: 'Use VPC Security Groups + NACLs, or deploy third-party NFV appliance (vSRX, FortiGate)',
    severity: 'high',
    detectionKey: 'firewalls',
  },
  {
    classicFeature: 'Gateway Appliance (Vyatta/vSRX)',
    vpcStatus: 'partial',
    workaround: 'VPC native routing + Security Groups for basic use; third-party appliance on VPC for advanced features',
    severity: 'high',
    detectionKey: 'gateways',
  },
  {
    classicFeature: 'Portable Private IPs',
    vpcStatus: 'not-available',
    workaround: 'Use VPC Reserved IPs within subnets',
    severity: 'medium',
  },
  {
    classicFeature: 'Portable Public IPs',
    vpcStatus: 'partial',
    workaround: 'Use VPC Floating IPs (similar but different allocation model)',
    severity: 'medium',
  },
  {
    classicFeature: 'NFS v3 File Storage',
    vpcStatus: 'partial',
    workaround: 'VPC File Storage supports NFS v4.1 only — verify application compatibility',
    severity: 'medium',
    detectionKey: 'fileStorage',
  },
  {
    classicFeature: 'EVault Backup',
    vpcStatus: 'not-available',
    workaround: 'Use IBM Cloud Backup, Veeam for VPC, IBM Storage Protect or another 3rd party product',
    severity: 'medium',
  },
  {
    classicFeature: 'Monthly Billing (VSI)',
    vpcStatus: 'not-available',
    workaround: 'VPC is hourly only — use Reserved Capacity for cost savings',
    severity: 'low',
  },
  {
    classicFeature: 'Auto Scale Groups',
    vpcStatus: 'partial',
    workaround: 'VPC Instance Groups with auto-scale policies (different API)',
    severity: 'low',
  },
  {
    classicFeature: 'Legacy Datacenters (che01)',
    vpcStatus: 'not-available',
    workaround: 'Migrate to a supported VPC region',
    severity: 'high',
  },
  {
    classicFeature: 'Bare Metal Hourly Billing',
    vpcStatus: 'not-available',
    workaround: 'VPC Bare Metal is monthly billing only',
    severity: 'low',
    detectionKey: 'bareMetal',
  },
  {
    classicFeature: 'Bare Metal with VMware vSphere/ESXi',
    vpcStatus: 'not-available',
    workaround: 'VMs must be migrated individually to VPC VSIs or OpenShift Virtualization. Consider IBM Cloud for VMware Solutions for like-for-like VMware environments.',
    severity: 'high',
    detectionKey: 'bareMetal',
  },
  {
    classicFeature: 'Software Add-ons (cPanel, Plesk, etc.)',
    vpcStatus: 'not-available',
    workaround: 'Install and license software add-ons manually on VPC instances. Purchase licenses directly from vendors.',
    severity: 'medium',
    detectionKey: 'billingItems',
  },
];
