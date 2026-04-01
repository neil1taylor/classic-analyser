export interface SLSoftwareDescription {
  name?: string;
  version?: string;
  manufacturer?: string;
  longDescription?: string;
}

export interface SLOperatingSystem {
  softwareDescription?: SLSoftwareDescription;
  passwords?: Array<{ username?: string; password?: string; port?: number }>;
}

export interface SLDatacenter {
  id?: number;
  name?: string;
  longName?: string;
}

export interface SLTag {
  tag?: {
    name?: string;
  };
}

export interface SLBlockDevice {
  bootableFlag?: number;
  device?: string;
  diskImage?: {
    capacity?: number;
    units?: string;
    localDiskFlag?: boolean;
    description?: string;
  };
}

export interface SLNetworkVlanRef {
  id?: number;
  vlanNumber?: number;
  name?: string;
  networkSpace?: string;
}

export interface SLBillingItem {
  id?: number;
  description?: string;
  categoryCode?: string;
  recurringFee?: string;
  hourlyRecurringFee?: string;
  children?: SLBillingItemChild[];
  createDate?: string;
  cancellationDate?: string;
  notes?: string;
  orderItem?: {
    description?: string;
  };
}

export interface SLBillingItemChild {
  categoryCode?: string;
  hourlyRecurringFee?: string;
}

export interface SLAccount {
  id?: number;
  companyName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface SLVirtualGuest {
  id?: number;
  hostname?: string;
  domain?: string;
  fullyQualifiedDomainName?: string;
  primaryIpAddress?: string;
  primaryBackendIpAddress?: string;
  maxCpu?: number;
  maxMemory?: number;
  startCpus?: number;
  status?: { name?: string; keyName?: string };
  powerState?: { name?: string; keyName?: string };
  datacenter?: SLDatacenter;
  operatingSystem?: SLOperatingSystem;
  hourlyBillingFlag?: boolean;
  createDate?: string;
  modifyDate?: string;
  billingItem?: SLBillingItem;
  networkVlans?: SLNetworkVlanRef[];
  blockDevices?: SLBlockDevice[];
  tagReferences?: SLTag[];
  notes?: string;
  dedicatedAccountHostOnlyFlag?: boolean;
  placementGroupId?: number;
  privateNetworkOnlyFlag?: boolean;
  localDiskFlag?: boolean;
  dedicatedHost?: { id?: number; name?: string };
  blockDeviceTemplateGroup?: { id?: number; globalIdentifier?: string };
}

export interface SLNetworkComponent {
  primaryIpAddress?: string;
  port?: number;
  speed?: number;
  status?: string;
  macAddress?: string;
  guest?: { hostname?: string };
  hardware?: { hostname?: string };
}

export interface SLHardwareComponentType {
  hardwareComponentType?: {
    keyName?: string;
    type?: string;
  };
}

export interface SLHardDrive {
  capacity?: number;
  hardwareComponentModel?: {
    hardwareGenericComponentModel?: SLHardwareComponentType;
  };
}

export interface SLHardware {
  id?: number;
  hostname?: string;
  domain?: string;
  fullyQualifiedDomainName?: string;
  manufacturerSerialNumber?: string;
  primaryIpAddress?: string;
  primaryBackendIpAddress?: string;
  processorPhysicalCoreAmount?: number;
  memoryCapacity?: number;
  hardDrives?: SLHardDrive[];
  datacenter?: SLDatacenter;
  operatingSystem?: SLOperatingSystem;
  networkComponents?: SLNetworkComponent[];
  billingItem?: SLBillingItem;
  provisionDate?: string;
  powerSupplyCount?: number;
  networkGatewayMemberFlag?: boolean;
  networkVlans?: SLNetworkVlanRef[];
  tagReferences?: SLTag[];
  notes?: string;
}

export interface SLSubnet {
  id?: number;
  networkIdentifier?: string;
  cidr?: number;
  subnetType?: string;
  gateway?: string;
  broadcastAddress?: string;
  usableIpAddressCount?: number;
  totalIpAddresses?: number;
  ipAddresses?: SLIPAddress[];
  networkVlan?: SLNetworkVlanRef;
  datacenter?: SLDatacenter;
}

export interface SLIPAddress {
  ipAddress?: string;
  isReserved?: boolean;
  note?: string;
  virtualGuest?: { hostname?: string };
  hardware?: { hostname?: string };
}

export interface SLNetworkVlan {
  id?: number;
  vlanNumber?: number;
  name?: string;
  networkSpace?: string;
  primaryRouter?: {
    hostname?: string;
    datacenter?: SLDatacenter;
  };
  subnets?: SLSubnet[];
  firewallGuestNetworkComponents?: Array<{ id?: number }>;
  attachedNetworkGateway?: {
    id?: number;
    name?: string;
  };
}

export interface SLNetworkGateway {
  id?: number;
  name?: string;
  networkSpace?: string;
  status?: { name?: string; keyName?: string };
  members?: Array<{
    hardware?: {
      id?: number;
      hostname?: string;
      primaryIpAddress?: string;
      primaryBackendIpAddress?: string;
      datacenter?: SLDatacenter;
    };
  }>;
  insideVlans?: Array<{
    id?: number;
    bypassFlag?: boolean;
    networkVlan?: {
      id?: number;
      vlanNumber?: number;
      name?: string;
    };
  }>;
  publicVlan?: { id?: number; vlanNumber?: number };
  privateVlan?: { id?: number; vlanNumber?: number };
  publicIpAddress?: { ipAddress?: string };
  privateIpAddress?: { ipAddress?: string };
}

export interface SLFirewallRule {
  orderValue?: number;
  action?: string;
  protocol?: string;
  sourceIpAddress?: string;
  sourceIpCidr?: number;
  destinationIpAddress?: string;
  destinationIpCidr?: number;
  destinationPortRangeStart?: number;
  destinationPortRangeEnd?: number;
}

export interface SLFirewall {
  id?: number;
  primaryIpAddress?: string;
  firewallType?: string;
  networkVlan?: SLNetworkVlanRef;
  billingItem?: SLBillingItem;
  datacenter?: SLDatacenter;
  rules?: SLFirewallRule[];
}

export interface SLSecurityGroupRule {
  id?: number;
  direction?: string;
  protocol?: string;
  portRangeMin?: number;
  portRangeMax?: number;
  remoteIp?: string;
  remoteGroupId?: number;
}

export interface SLSecurityGroup {
  id?: number;
  name?: string;
  description?: string;
  createDate?: string;
  modifyDate?: string;
  rules?: SLSecurityGroupRule[];
  networkComponentBindings?: Array<{
    networkComponent?: SLNetworkComponent;
  }>;
}

export interface SLLoadBalancerService {
  ipAddress?: string;
  port?: number;
  healthCheck?: string;
}

export interface SLLoadBalancerServiceGroup {
  services?: SLLoadBalancerService[];
}

export interface SLLoadBalancerVirtualServer {
  id?: number;
  port?: number;
  allocation?: number;
  serviceGroups?: SLLoadBalancerServiceGroup[];
}

export interface SLLoadBalancer {
  id?: number;
  name?: string;
  ipAddress?: { ipAddress?: string } | string;
  loadBalancerType?: string;
  connectionLimit?: number;
  virtualServers?: SLLoadBalancerVirtualServer[];
  healthMonitors?: unknown[];
  billingItem?: SLBillingItem;
}

export interface SLAllowedGuest {
  id?: number;
  hostname?: string;
}

export interface SLAllowedHardware {
  id?: number;
  hostname?: string;
}

export interface SLReplicationPartner {
  id?: number;
  username?: string;
  serviceResourceBackendIpAddress?: string;
}

export interface SLSnapshot {
  id?: number;
  createDate?: string;
  sizeBytes?: number;
  notes?: string;
}

export interface SLBlockStorage {
  id?: number;
  username?: string;
  capacityGb?: number;
  iops?: string;
  storageType?: { keyName?: string };
  storageTierLevel?: string;
  serviceResourceBackendIpAddress?: string;
  lunId?: string;
  allowedVirtualGuests?: SLAllowedGuest[];
  allowedHardware?: SLAllowedHardware[];
  allowedSubnets?: unknown[];
  snapshotCapacityGb?: number;
  schedules?: unknown[];
  replicationPartners?: SLReplicationPartner[];
  billingItem?: SLBillingItem;
  createDate?: string;
  notes?: string;
  hasEncryptionAtRest?: boolean;
  serviceResource?: { datacenter?: { name?: string } };
  parentVolume?: { snapshotSizeBytes?: number };
  snapshots?: SLSnapshot[];
}

export interface SLFileStorage {
  id?: number;
  username?: string;
  capacityGb?: number;
  iops?: string;
  storageType?: { keyName?: string };
  storageTierLevel?: string;
  serviceResourceBackendIpAddress?: string;
  fileNetworkMountAddress?: string;
  allowedVirtualGuests?: SLAllowedGuest[];
  allowedHardware?: SLAllowedHardware[];
  allowedSubnets?: unknown[];
  snapshotCapacityGb?: number;
  schedules?: unknown[];
  replicationPartners?: SLReplicationPartner[];
  billingItem?: SLBillingItem;
  createDate?: string;
  notes?: string;
  bytesUsed?: number;
  hasEncryptionAtRest?: boolean;
  serviceResource?: { datacenter?: { name?: string } };
  parentVolume?: { snapshotSizeBytes?: number };
  snapshots?: SLSnapshot[];
}

export interface SLObjectStorage {
  id?: number;
  username?: string;
  storageType?: { keyName?: string };
  capacityGb?: number;
  bytesUsed?: number;
  billingItem?: SLBillingItem;
  createDate?: string;
}

export interface SLSSLCertificate {
  id?: number;
  commonName?: string;
  organizationName?: string;
  validityBegin?: string;
  validityDays?: number;
  validityEnd?: string;
  createDate?: string;
  modifyDate?: string;
  notes?: string;
}

export interface SLSSHKey {
  id?: number;
  label?: string;
  fingerprint?: string;
  createDate?: string;
  modifyDate?: string;
  notes?: string;
}

export interface SLDNSRecord {
  id?: number;
  host?: string;
  type?: string;
  data?: string;
  ttl?: number;
  priority?: number;
}

export interface SLDomain {
  id?: number;
  name?: string;
  serial?: number;
  updateDate?: string;
  resourceRecords?: SLDNSRecord[];
}

export interface SLImageTemplate {
  id?: number;
  name?: string;
  note?: string;
  createDate?: string;
  status?: { name?: string; keyName?: string };
  datacenter?: SLDatacenter;
  children?: Array<{
    blockDevices?: Array<{
      diskImage?: {
        capacity?: number;
        units?: string;
        softwareReferences?: Array<{
          softwareDescription?: SLSoftwareDescription;
        }>;
      };
    }>;
  }>;
  globalIdentifier?: string;
  parentId?: number;
}

export interface SLPlacementGroup {
  id?: number;
  name?: string;
  createDate?: string;
  rule?: { name?: string };
  backendRouter?: { hostname?: string };
  guestCount?: number;
}

export interface SLReservedCapacity {
  id?: number;
  name?: string;
  createDate?: string;
  backendRouter?: { hostname?: string; datacenter?: SLDatacenter };
  instances?: Array<{ id?: number; billingItem?: { description?: string } }>;
}

export interface SLDedicatedHost {
  id?: number;
  name?: string;
  createDate?: string;
  datacenter?: SLDatacenter;
  cpuCount?: number;
  memoryCapacity?: number;
  diskCapacity?: number;
  guestCount?: number;
}

export interface SLVPNTunnel {
  id?: number;
  name?: string;
  customerPeerIpAddress?: string;
  internalPeerIpAddress?: string;
  phaseOneAuthentication?: string;
  phaseOneEncryption?: string;
  phaseTwoAuthentication?: string;
  phaseTwoEncryption?: string;
  addressTranslations?: unknown[];
  customerSubnets?: unknown[];
  internalSubnets?: unknown[];
}

export interface SLUser {
  id?: number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  createDate?: string;
  statusDate?: string;
  userStatus?: { name?: string };
  roles?: Array<{ name?: string; description?: string }>;
  permissions?: Array<{ keyName?: string; name?: string }>;
}

export interface SLEventLog {
  eventName?: string;
  eventCreateDate?: string;
  userType?: string;
  userId?: number;
  username?: string;
  objectName?: string;
  objectId?: number;
  traceId?: string;
  metaData?: string;
}

export interface CollectedData {
  account?: SLAccount;
  virtualGuests: SLVirtualGuest[];
  hardware: SLHardware[];
  dedicatedHosts: SLDedicatedHost[];
  placementGroups: SLPlacementGroup[];
  reservedCapacity: SLReservedCapacity[];
  imageTemplates: SLImageTemplate[];
  vlans: SLNetworkVlan[];
  subnets: SLSubnet[];
  gateways: SLNetworkGateway[];
  firewalls: SLFirewall[];
  securityGroups: SLSecurityGroup[];
  loadBalancers: SLLoadBalancer[];
  vpnTunnels: SLVPNTunnel[];
  blockStorage: SLBlockStorage[];
  fileStorage: SLFileStorage[];
  objectStorage: SLObjectStorage[];
  sslCertificates: SLSSLCertificate[];
  sshKeys: SLSSHKey[];
  domains: SLDomain[];
  dnsRecords: FlatDNSRecord[];
  securityGroupRules: FlatSecurityGroupRule[];
  billingItems: SLBillingItem[];
  users: SLUser[];
  eventLog: SLEventLog[];
  relationships: RelationshipMap;
  // VMware resources (optional for backward compatibility with pre-VMware exports)
  vmwareInstances?: VMwareInstanceExport[];
  vmwareClusters?: VMwareClusterExport[];
  vmwareHosts?: VMwareHostExport[];
  vmwareVlans?: VMwareVlanExport[];
  vmwareSubnets?: VMwareSubnetExport[];
  directorSites?: DirectorSiteExport[];
  pvdcs?: PVDCExport[];
  vcfClusters?: VCFClusterExport[];
  vdcs?: VDCExport[];
  multitenantSites?: MultitenantSiteExport[];
  vmwareCrossReferences?: VMwareCrossReferenceExport[];
  collectionTimestamp: string;
  collectionDurationMs: number;
  errors: CollectionError[];
}

// Lightweight VMware export types (avoid circular import with vmware/types.ts)
export interface VMwareInstanceExport {
  id?: string;
  name?: string;
  datacenter?: string;
  status?: string;
  type?: string;
  cluster_count?: number;
  vcenter_url?: string;
  created_at?: string;
}

export interface VMwareClusterExport {
  id?: string;
  name?: string;
  datacenter?: string;
  status?: string;
  host_count?: number;
  vsan_enabled?: boolean;
  instance_id?: string;
}

export interface VMwareHostExport {
  hostname?: string;
  primaryIp?: string;
  backendIp?: string;
  status?: string;
  hardwareId?: number;
  clusterId?: string;
  clusterName?: string;
  instanceId?: string;
  location?: string;
  [key: string]: unknown;
}

export interface VMwareVlanExport {
  id?: string | number;
  vlanNumber?: number;
  name?: string;
  type?: string;
  primaryRouter?: string;
  clusterId?: string;
  clusterName?: string;
  instanceId?: string;
  location?: string;
  [key: string]: unknown;
}

export interface VMwareSubnetExport {
  id?: string | number;
  cidr?: string;
  networkIdentifier?: string;
  netmask?: string;
  gateway?: string;
  subnetType?: string;
  vlanNumber?: number;
  vlanId?: string | number;
  vlanName?: string;
  clusterId?: string;
  clusterName?: string;
  instanceId?: string;
  location?: string;
  [key: string]: unknown;
}

export interface DirectorSiteExport {
  id?: string;
  name?: string;
  status?: string;
  region?: string;
  pvdcs?: Array<{ id?: string; name?: string }>;
  created_at?: string;
}

export interface PVDCExport {
  id?: string;
  name?: string;
  data_center_name?: string;
  status?: string;
  provider_type?: string;
  clusters?: Array<{ id?: string; name?: string }>;
  director_site_id?: string;
}

export interface VCFClusterExport {
  id?: string;
  name?: string;
  host_count?: number;
  status?: string;
  data_center_name?: string;
  host_profile?: string;
  storage_type?: string;
  pvdc_id?: string;
}

export interface VDCExport {
  id?: string;
  name?: string;
  status?: string;
  director_site_name?: string;
  cpu?: number;
  ram?: number;
  disk?: number;
  region?: string;
  type?: string;
  created_at?: string;
}

export interface MultitenantSiteExport {
  id?: string;
  name?: string;
  region?: string;
  pvdcs?: Array<{ id?: string; name?: string }>;
}

export interface VMwareCrossReferenceExport {
  classicResourceType: string;
  classicResourceId: number;
  classicResourceName: string;
  vmwareRole: string;
  vmwareResourceType: string;
  vmwareResourceId: string;
  vmwareResourceName: string;
}

export interface FlatSecurityGroupRule {
  securityGroupId: number;
  securityGroupName: string;
  id?: number;
  direction?: string;
  protocol?: string;
  portRangeMin?: number;
  portRangeMax?: number;
  remoteIp?: string;
  remoteGroupId?: number;
}

export interface FlatDNSRecord {
  domainId: number;
  domainName: string;
  id?: number;
  host?: string;
  type?: string;
  data?: string;
  ttl?: number;
  priority?: number;
}

export interface RelationshipEntry {
  parentType: string;
  parentId: number;
  parentName: string;
  childType: string;
  childId: number;
  childName: string;
  relationshipField: string;
}

export type RelationshipMap = RelationshipEntry[];

export interface CollectionError {
  resourceType: string;
  message: string;
  statusCode?: number;
}

export interface SSEEvent {
  type: 'progress' | 'data' | 'error' | 'complete';
  payload: unknown;
}
