import type { Response } from 'express';
import { SoftLayerClient } from './softlayer/client.js';
import {
  getVirtualGuests,
  getVirtualGuestsShallow,
  getHardware,
  getHardwareShallow,
  getDedicatedHosts,
  getPlacementGroups,
  getReservedCapacityGroups,
  getBlockDeviceTemplateGroups,
  getBlockDeviceTemplateGroupsShallow,
} from './softlayer/compute.js';
import {
  getNetworkVlans,
  getNetworkVlansShallow,
  getSubnets,
  getSubnetsShallow,
  getNetworkGateways,
  getNetworkGatewaysShallow,
  getNetworkVlanFirewalls,
  getNetworkVlanFirewallsShallow,
  getSecurityGroups,
  getSecurityGroupsShallow,
  getAdcLoadBalancers,
  getAdcLoadBalancersShallow,
  getNetworkTunnelContexts,
  flattenSecurityGroupRules,
} from './softlayer/network.js';
import {
  getIscsiNetworkStorage,
  getIscsiNetworkStorageShallow,
  getNasNetworkStorage,
  getNasNetworkStorageShallow,
  getHubNetworkStorage,
} from './softlayer/storage.js';
import { getSecurityCertificates, getSshKeys } from './softlayer/security.js';
import { getDomains, getDomainsShallow, flattenDNSRecords } from './softlayer/dns.js';
import { getUsers, getAllBillingItems, getEventLog } from './softlayer/account.js';
import { buildRelationships } from './relationships.js';
import { VMwareClient } from './vmware/client.js';
import { getVMwareInstances, getVMwareClusterHosts, getVMwareClusterVlans } from './vmware/solutions.js';
import type { VMwareInstancesResult } from './vmware/solutions.js';
import {
  getDirectorSites,
  getDirectorSitePvdcs,
  getPvdcClusters,
  getVDCs,
  getMultitenantDirectorSites,
  discoverVcfRegion,
} from './vmware/vcf.js';
import { buildVMwareCrossReferences } from './vmware/crossref.js';
import type {
  VMwareInstance,
  VMwareCluster,
  VMwareHost,
  VMwareVlan,
  VMwareSubnet,
  VMwareNetworkResult,
  DirectorSite,
  PVDC,
  VCFCluster,
  VDC,
  MultitenantDirectorSite,
  VMwareCrossReference,
} from './vmware/types.js';
import { VpcClient } from './vpc/client.js';
import { getTransitGateways, getTransitGatewayConnections, getDirectLinkGateways, getTransitGatewayRouteReports, getVpnGatewaysForTgwVpcConnections } from './vpc/resources.js';
import type { TgwRoutePrefixes, TgwVpcVpnGateway } from './vpc/resources.js';
import type { TransitGateway, TransitGatewayConnection, DirectLinkGateway } from './vpc/types.js';
import { runWithConcurrencyLimit } from '../utils/concurrency.js';
import type {
  SLAccount,
  SLVirtualGuest,
  SLHardware,
  SLNetworkVlan,
  SLSubnet,
  SLNetworkGateway,
  SLFirewall,
  SLSecurityGroup,
  SLLoadBalancer,
  SLBlockStorage,
  SLFileStorage,
  SLObjectStorage,
  SLSSLCertificate,
  SLSSHKey,
  SLDomain,
  SLImageTemplate,
  SLPlacementGroup,
  SLReservedCapacity,
  SLDedicatedHost,
  SLVPNTunnel,
  SLBillingItem,
  SLUser,
  SLEventLog,
  FlatDNSRecord,
  FlatSecurityGroupRule,
  CollectionError,
  RelationshipMap,
} from './softlayer/types.js';
import logger from '../utils/logger.js';

const MAX_CONCURRENCY = 10;

const SL_METHOD_TO_RESOURCE: Record<string, string> = {
  getVirtualGuests: 'virtualGuests',
  getHardware: 'hardware',
  getNetworkVlans: 'vlans',
  getSubnets: 'subnets',
  getNetworkGateways: 'gateways',
  getNetworkVlanFirewalls: 'firewalls',
  getSecurityGroups: 'securityGroups',
  getAdcLoadBalancers: 'loadBalancers',
  getIscsiNetworkStorage: 'blockStorage',
  getNasNetworkStorage: 'fileStorage',
  getHubNetworkStorage: 'objectStorage',
  getBlockDeviceTemplateGroups: 'imageTemplates',
  getDomains: 'domains',
  getAllBillingItems: 'billingItems',
  getUsers: 'users',
  getSecurityCertificates: 'sslCertificates',
  getSshKeys: 'sshKeys',
  getDedicatedHosts: 'dedicatedHosts',
  getPlacementGroups: 'placementGroups',
  getReservedCapacityGroups: 'reservedCapacity',
  getNetworkTunnelContexts: 'vpnTunnels',
};

function sendSSE(res: Response, event: string, data: unknown): void {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // connection may be closed
  }
}

interface CollectorTask {
  name: string;
  fn: () => Promise<unknown>;
}

interface PhaseTracker {
  totalResources: number;
  completedResources: number;
}

async function runPhase(
  phaseName: string,
  tasks: CollectorTask[],
  res: Response,
  errors: CollectionError[],
  tracker: PhaseTracker
): Promise<Map<string, unknown>> {
  const results = new Map<string, unknown>();

  sendSSE(res, 'progress', {
    phase: phaseName,
    resource: tasks[0]?.name ?? '',
    status: 'started',
    totalResources: tracker.totalResources,
    completedResources: tracker.completedResources,
  });

  const taskFunctions = tasks.map((task) => async () => {
    sendSSE(res, 'progress', {
      phase: phaseName,
      resource: task.name,
      status: 'collecting',
      totalResources: tracker.totalResources,
      completedResources: tracker.completedResources,
    });

    try {
      const data = await task.fn();
      const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
      tracker.completedResources++;

      sendSSE(res, 'progress', {
        phase: phaseName,
        resource: task.name,
        status: `collected ${count} items`,
        totalResources: tracker.totalResources,
        completedResources: tracker.completedResources,
      });

      sendSSE(res, 'data', {
        resourceKey: task.name,
        items: Array.isArray(data) ? data : [data],
        count,
      });

      results.set(task.name, data);
      return data;
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      tracker.completedResources++;

      logger.error('Collection failed for resource', {
        phase: phaseName,
        resource: task.name,
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: task.name,
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'progress', {
        phase: phaseName,
        resource: task.name,
        status: `error: ${error.message}`,
        totalResources: tracker.totalResources,
        completedResources: tracker.completedResources,
      });

      sendSSE(res, 'error', {
        resource: task.name,
        message: error.message,
      });

      return undefined;
    }
  });

  await runWithConcurrencyLimit(taskFunctions, MAX_CONCURRENCY);
  return results;
}

export interface CollectOptions {
  skipBilling?: boolean;
}

export async function collectAllData(
  apiKey: string,
  res: Response,
  abortSignal?: { aborted: boolean },
  options?: CollectOptions,
): Promise<void> {
  const startTime = Date.now();
  const client = new SoftLayerClient(apiKey);
  const errors: CollectionError[] = [];
  let currentPhaseName = '';

  let account: SLAccount | undefined;
  let virtualGuests: SLVirtualGuest[] = [];
  let hardware: SLHardware[] = [];
  let vlans: SLNetworkVlan[] = [];
  let subnets: SLSubnet[] = [];
  let gateways: SLNetworkGateway[] = [];
  let firewalls: SLFirewall[] = [];
  let securityGroups: SLSecurityGroup[] = [];
  let loadBalancers: SLLoadBalancer[] = [];
  let blockStorage: SLBlockStorage[] = [];
  let fileStorage: SLFileStorage[] = [];
  let objectStorage: SLObjectStorage[] = [];
  let sslCertificates: SLSSLCertificate[] = [];
  let sshKeys: SLSSHKey[] = [];
  let domains: SLDomain[] = [];
  let dnsRecords: FlatDNSRecord[] = [];
  let securityGroupRules: FlatSecurityGroupRule[] = [];
  let imageTemplates: SLImageTemplate[] = [];
  let placementGroups: SLPlacementGroup[] = [];
  let reservedCapacity: SLReservedCapacity[] = [];
  let dedicatedHosts: SLDedicatedHost[] = [];
  let vpnTunnels: SLVPNTunnel[] = [];
  let billingItems: SLBillingItem[] = [];
  let users: SLUser[] = [];
  let eventLog: SLEventLog[] = [];
  let relationships: RelationshipMap = [];

  // VMware data
  let vmwareInstances: VMwareInstance[] = [];
  const vmwareClusters: VMwareCluster[] = [];
  const vmwareHosts: VMwareHost[] = [];
  const vmwareVlans: VMwareVlan[] = [];
  const vmwareSubnets: VMwareSubnet[] = [];
  let directorSites: DirectorSite[] = [];
  const pvdcs: PVDC[] = [];
  const vcfClusters: VCFCluster[] = [];
  let vdcs: VDC[] = [];
  let multitenantSites: MultitenantDirectorSite[] = [];
  let vmwareCrossReferences: VMwareCrossReference[] = [];

  // IAM-based resources (Transit Gateways, Direct Link)
  let transitGateways: TransitGateway[] = [];
  let transitGatewayConnections: TransitGatewayConnection[] = [];
  let directLinkGateways: DirectLinkGateway[] = [];
  let tgwRoutePrefixes: TgwRoutePrefixes[] = [];
  let tgwVpcVpnGateways: TgwVpcVpnGateway[] = [];

  const skipBilling = options?.skipBilling === true;
  // Total tasks: Shallow(22) + Deep(12) + Billing(0 or 1) + relationships(1) = 35 or 36 (+ VMware tasks added dynamically)
  const tracker: PhaseTracker = { totalResources: skipBilling ? 35 : 36, completedResources: 0 };

  client.onPageProgress = (method: string, totalSoFar: number) => {
    const resourceName = SL_METHOD_TO_RESOURCE[method];
    if (!resourceName) return;
    sendSSE(res, 'progress', {
      phase: currentPhaseName,
      resource: resourceName,
      status: `fetching... ${totalSoFar} items so far`,
      totalResources: tracker.totalResources,
      completedResources: tracker.completedResources,
    });
  };

  try {
    // ── PHASE 1: SHALLOW SCAN ──────────────────────────────────────────
    // All 23 resources concurrently: 10 fast (full masks) + 13 slow (minimal masks)
    if (abortSignal?.aborted) return;
    currentPhaseName = 'Shallow Scan';
    const shallowResults = await runPhase('Shallow Scan', [
      // Fast resources (full masks — 10 resources)
      {
        name: 'account',
        fn: () => client.request<SLAccount>({
          service: 'SoftLayer_Account',
          method: 'getObject',
          objectMask: 'mask[id,companyName,email,firstName,lastName]',
        }),
      },
      {
        name: 'dedicatedHosts',
        fn: () => getDedicatedHosts(client),
      },
      {
        name: 'placementGroups',
        fn: () => getPlacementGroups(client),
      },
      {
        name: 'sslCertificates',
        fn: () => getSecurityCertificates(client),
      },
      {
        name: 'sshKeys',
        fn: () => getSshKeys(client),
      },
      {
        name: 'users',
        fn: () => getUsers(client),
      },
      {
        name: 'eventLog',
        fn: () => getEventLog(client),
      },
      {
        name: 'objectStorage',
        fn: () => getHubNetworkStorage(client),
      },
      {
        name: 'vpnTunnels',
        fn: () => getNetworkTunnelContexts(client),
      },
      {
        name: 'reservedCapacity',
        fn: () => getReservedCapacityGroups(client),
      },
      // Slow resources (minimal masks — 12 resources)
      {
        name: 'virtualGuests',
        fn: () => getVirtualGuestsShallow(client),
      },
      {
        name: 'hardware',
        fn: () => getHardwareShallow(client),
      },
      {
        name: 'vlans',
        fn: () => getNetworkVlansShallow(client),
      },
      {
        name: 'subnets',
        fn: () => getSubnetsShallow(client),
      },
      {
        name: 'gateways',
        fn: () => getNetworkGatewaysShallow(client),
      },
      {
        name: 'firewalls',
        fn: () => getNetworkVlanFirewallsShallow(client),
      },
      {
        name: 'securityGroups',
        fn: () => getSecurityGroupsShallow(client),
      },
      {
        name: 'loadBalancers',
        fn: () => getAdcLoadBalancersShallow(client),
      },
      {
        name: 'blockStorage',
        fn: () => getIscsiNetworkStorageShallow(client),
      },
      {
        name: 'fileStorage',
        fn: () => getNasNetworkStorageShallow(client),
      },
      {
        name: 'imageTemplates',
        fn: () => getBlockDeviceTemplateGroupsShallow(client),
      },
      {
        name: 'domains',
        fn: () => getDomainsShallow(client),
      },
    ], res, errors, tracker);

    // Store shallow results (used as fallback if deep scan fails for individual resources)
    account = shallowResults.get('account') as SLAccount | undefined;
    virtualGuests = (shallowResults.get('virtualGuests') as SLVirtualGuest[] | undefined) ?? [];
    hardware = (shallowResults.get('hardware') as SLHardware[] | undefined) ?? [];
    vlans = (shallowResults.get('vlans') as SLNetworkVlan[] | undefined) ?? [];
    subnets = (shallowResults.get('subnets') as SLSubnet[] | undefined) ?? [];
    gateways = (shallowResults.get('gateways') as SLNetworkGateway[] | undefined) ?? [];
    firewalls = (shallowResults.get('firewalls') as SLFirewall[] | undefined) ?? [];
    securityGroups = (shallowResults.get('securityGroups') as SLSecurityGroup[] | undefined) ?? [];
    loadBalancers = (shallowResults.get('loadBalancers') as SLLoadBalancer[] | undefined) ?? [];
    blockStorage = (shallowResults.get('blockStorage') as SLBlockStorage[] | undefined) ?? [];
    fileStorage = (shallowResults.get('fileStorage') as SLFileStorage[] | undefined) ?? [];
    objectStorage = (shallowResults.get('objectStorage') as SLObjectStorage[] | undefined) ?? [];
    sslCertificates = (shallowResults.get('sslCertificates') as SLSSLCertificate[] | undefined) ?? [];
    sshKeys = (shallowResults.get('sshKeys') as SLSSHKey[] | undefined) ?? [];
    domains = (shallowResults.get('domains') as SLDomain[] | undefined) ?? [];
    imageTemplates = (shallowResults.get('imageTemplates') as SLImageTemplate[] | undefined) ?? [];
    placementGroups = (shallowResults.get('placementGroups') as SLPlacementGroup[] | undefined) ?? [];
    reservedCapacity = (shallowResults.get('reservedCapacity') as SLReservedCapacity[] | undefined) ?? [];
    dedicatedHosts = (shallowResults.get('dedicatedHosts') as SLDedicatedHost[] | undefined) ?? [];
    vpnTunnels = (shallowResults.get('vpnTunnels') as SLVPNTunnel[] | undefined) ?? [];
    users = (shallowResults.get('users') as SLUser[] | undefined) ?? [];
    eventLog = (shallowResults.get('eventLog') as SLEventLog[] | undefined) ?? [];

    // ── PHASE 2: DEEP SCAN + VMWARE (parallel) ─────────────────────────
    // Deep scan re-fetches 12 slow Classic resources with full object masks.
    // VMware collection uses a separate IAM-authenticated client, so it runs
    // concurrently without competing for SoftLayer rate limits.
    // Billing items are the slowest Classic call — they run in Phase 3 so
    // VMware results appear sooner.
    if (abortSignal?.aborted) return;

    // Start VMware IAM token exchange in parallel with deep scan setup
    const vmwareClient = new VMwareClient(apiKey);
    const vmwareAvailablePromise = vmwareClient.isAvailable();

    // Start IAM client for Transit Gateways + Direct Link (reuses same token exchange)
    const iamClient = new VpcClient(apiKey);
    const iamAvailablePromise = iamClient.isAvailable();

    currentPhaseName = 'Deep Scan';
    const deepTasks: CollectorTask[] = [
      { name: 'virtualGuests', fn: () => getVirtualGuests(client) },
      { name: 'hardware', fn: () => getHardware(client) },
      { name: 'vlans', fn: () => getNetworkVlans(client) },
      { name: 'subnets', fn: () => getSubnets(client) },
      { name: 'gateways', fn: () => getNetworkGateways(client) },
      { name: 'firewalls', fn: () => getNetworkVlanFirewalls(client) },
      { name: 'securityGroups', fn: () => getSecurityGroups(client) },
      { name: 'loadBalancers', fn: () => getAdcLoadBalancers(client) },
      { name: 'blockStorage', fn: () => getIscsiNetworkStorage(client) },
      { name: 'fileStorage', fn: () => getNasNetworkStorage(client) },
      { name: 'imageTemplates', fn: () => getBlockDeviceTemplateGroups(client) },
      { name: 'domains', fn: () => getDomains(client) },
    ];

    // Check VMware availability (token exchange already in-flight)
    const vmwareAvailable = await vmwareAvailablePromise;

    if (vmwareAvailable) {
      // VCF for Classic (vcenters) — always add
      tracker.totalResources += 1;
      deepTasks.push(
        { name: 'vmwareInstances', fn: () => getVMwareInstances(vmwareClient) },
      );

      // VCF as a Service (director_sites, vdcs, multitenant) — requires regional endpoint discovery
      const vcfBaseUrl = await discoverVcfRegion(vmwareClient);
      if (vcfBaseUrl) {
        tracker.totalResources += 3; // directorSites, vdcs, multitenantSites
        deepTasks.push(
          { name: 'directorSites', fn: () => getDirectorSites(vmwareClient) },
          { name: 'vdcs', fn: () => getVDCs(vmwareClient) },
          { name: 'multitenantSites', fn: () => getMultitenantDirectorSites(vmwareClient) },
        );
      } else {
        logger.info('VCF as a Service: skipped (no regional endpoint found)');
      }
    } else {
      sendSSE(res, 'progress', {
        phase: 'VMware Collection',
        resource: 'vmware',
        status: 'skipped — IAM token exchange failed (no VMware permissions or not applicable)',
        totalResources: tracker.totalResources,
        completedResources: tracker.completedResources,
      });
    }

    // Check IAM availability for Transit Gateways + Direct Link
    const iamAvailable = await iamAvailablePromise;
    if (iamAvailable) {
      tracker.totalResources += 2; // transitGateways + directLinkGateways
      deepTasks.push(
        { name: 'classicTransitGateways', fn: () => getTransitGateways(iamClient) },
        { name: 'directLinkGateways', fn: () => getDirectLinkGateways(iamClient) },
      );
    } else {
      sendSSE(res, 'progress', {
        phase: 'IAM Resources',
        resource: 'transitGateways',
        status: 'skipped — IAM token exchange failed',
        totalResources: tracker.totalResources,
        completedResources: tracker.completedResources,
      });
    }

    const deepResults = await runPhase('Deep Scan', deepTasks, res, errors, tracker);

    // Use deep results where available, fall back to shallow data
    virtualGuests = (deepResults.get('virtualGuests') as SLVirtualGuest[] | undefined) ?? virtualGuests;
    hardware = (deepResults.get('hardware') as SLHardware[] | undefined) ?? hardware;
    vlans = (deepResults.get('vlans') as SLNetworkVlan[] | undefined) ?? vlans;
    subnets = (deepResults.get('subnets') as SLSubnet[] | undefined) ?? subnets;
    gateways = (deepResults.get('gateways') as SLNetworkGateway[] | undefined) ?? gateways;
    firewalls = (deepResults.get('firewalls') as SLFirewall[] | undefined) ?? firewalls;
    securityGroups = (deepResults.get('securityGroups') as SLSecurityGroup[] | undefined) ?? securityGroups;
    loadBalancers = (deepResults.get('loadBalancers') as SLLoadBalancer[] | undefined) ?? loadBalancers;
    blockStorage = (deepResults.get('blockStorage') as SLBlockStorage[] | undefined) ?? blockStorage;
    fileStorage = (deepResults.get('fileStorage') as SLFileStorage[] | undefined) ?? fileStorage;
    imageTemplates = (deepResults.get('imageTemplates') as SLImageTemplate[] | undefined) ?? imageTemplates;

    // DNS records from deep domains only (requires resourceRecords in mask)
    const deepDomains = deepResults.get('domains') as SLDomain[] | undefined;
    if (deepDomains) {
      domains = deepDomains;
    }
    dnsRecords = flattenDNSRecords(domains);
    if (dnsRecords.length > 0) {
      sendSSE(res, 'data', {
        resourceKey: 'dnsRecords',
        items: dnsRecords,
        count: dnsRecords.length,
      });
    }

    // Security group rules (extracted from deep scan security groups)
    securityGroupRules = flattenSecurityGroupRules(securityGroups);
    if (securityGroupRules.length > 0) {
      sendSSE(res, 'data', {
        resourceKey: 'securityGroupRules',
        items: securityGroupRules,
        count: securityGroupRules.length,
      });
    }

    // Extract VMware top-level results
    if (vmwareAvailable) {
      const vmwareResult = deepResults.get('vmwareInstances') as VMwareInstancesResult | undefined;
      if (vmwareResult) {
        vmwareInstances = vmwareResult.instances ?? [];
        // Clusters extracted inline from instance detail responses
        vmwareClusters.push(...(vmwareResult.clusters ?? []));

        // Always re-send corrected SSE data — runPhase sent the raw
        // VMwareInstancesResult wrapper object; the frontend expects a flat
        // array of instances. We must override even if empty (to clear the wrapper).
        sendSSE(res, 'data', {
          resourceKey: 'vmwareInstances',
          items: vmwareInstances,
          count: vmwareInstances.length,
        });

        // Send clusters extracted from instance detail responses
        if (vmwareClusters.length > 0) {
          sendSSE(res, 'data', {
            resourceKey: 'vmwareClusters',
            items: vmwareClusters,
            count: vmwareClusters.length,
          });
        }
      }
      directorSites = (deepResults.get('directorSites') as DirectorSite[] | undefined) ?? [];
      vdcs = (deepResults.get('vdcs') as VDC[] | undefined) ?? [];
      multitenantSites = (deepResults.get('multitenantSites') as MultitenantDirectorSite[] | undefined) ?? [];

      logger.info('VMware top-level results', {
        vmwareInstances: vmwareInstances.length,
        vmwareClusters: vmwareClusters.length,
        directorSites: directorSites.length,
        vdcs: vdcs.length,
        multitenantSites: multitenantSites.length,
      });
    }

    // Extract Transit Gateway + Direct Link results (IAM-based, independent of VMware)
    if (iamAvailable) {
      transitGateways = (deepResults.get('classicTransitGateways') as TransitGateway[] | undefined) ?? [];
      directLinkGateways = (deepResults.get('directLinkGateways') as DirectLinkGateway[] | undefined) ?? [];
    }

    // ── PHASE 3: VMWARE NESTED + BILLING (parallel) ─────────────────────
    // Billing is the slowest Classic call. VMware nested calls (clusters, PVDCs)
    // use a different API endpoint, so both run concurrently.
    if (abortSignal?.aborted) return;

    const phase3Tasks: CollectorTask[] = [];

    if (!skipBilling) {
      phase3Tasks.push({ name: 'billingItems', fn: () => getAllBillingItems(client) });
    } else {
      logger.info('Billing items collection skipped (user opted out)');
    }

    // Transit Gateway Connections (depends on TG list from Phase 2)
    if (iamAvailable && transitGateways.length > 0) {
      tracker.totalResources += 1;
      phase3Tasks.push({
        name: 'classicTransitGatewayConnections',
        fn: () => getTransitGatewayConnections(iamClient, transitGateways),
      });
    }

    if (vmwareAvailable) {
      // Fetch host detail and VLANs for each VCF for Classic cluster
      for (const cluster of vmwareClusters) {
        if (cluster.instance_id && cluster.id) {
          const instId = cluster.instance_id!;
          const cId = String(cluster.id);
          const cName = String(cluster.name ?? '');
          const cLoc = String(cluster.datacenter ?? '');

          tracker.totalResources += 2; // hosts + vlans
          phase3Tasks.push(
            {
              name: `vmwareHosts:${cId}`,
              fn: () => getVMwareClusterHosts(vmwareClient, instId, cId, cName, cLoc),
            },
            {
              name: `vmwareVlans:${cId}`,
              fn: () => getVMwareClusterVlans(vmwareClient, instId, cId, cName, cLoc),
            },
          );
        }
      }

      // Nested: collect PVDCs for each director site
      for (const site of directorSites) {
        if (site.id) {
          tracker.totalResources++;
          phase3Tasks.push({
            name: `pvdcs:${site.id}`,
            fn: () => getDirectorSitePvdcs(vmwareClient, site.id!),
          });
        }
      }
    }

    let phase3Results = new Map<string, unknown>();
    if (phase3Tasks.length > 0) {
      const phase3Name = skipBilling ? 'Deep Scan (VMware Details)' : 'Deep Scan (Billing + VMware Details)';
      currentPhaseName = phase3Name;
      phase3Results = await runPhase(phase3Name, phase3Tasks, res, errors, tracker);
    }

    if (!skipBilling) {
      billingItems = (phase3Results.get('billingItems') as SLBillingItem[] | undefined) ?? billingItems;
    }

    if (vmwareAvailable) {
      // Gather hosts, VLANs, and PVDCs from phase 3
      for (const [key, value] of phase3Results) {
        if (key.startsWith('vmwareHosts:') && Array.isArray(value)) {
          vmwareHosts.push(...(value as VMwareHost[]));
        }
        if (key.startsWith('vmwareVlans:') && value && typeof value === 'object' && !Array.isArray(value)) {
          const netResult = value as VMwareNetworkResult;
          vmwareVlans.push(...(netResult.vlans ?? []));
          vmwareSubnets.push(...(netResult.subnets ?? []));
        }
        if (key.startsWith('pvdcs:') && Array.isArray(value)) {
          pvdcs.push(...(value as PVDC[]));
        }
      }

      // Nested: collect VCF clusters for each PVDC (requires PVDCs to be collected first)
      if (pvdcs.length > 0) {
        const vcfClusterTasks: CollectorTask[] = pvdcs
          .filter((p) => p.director_site_id && p.id)
          .map((p) => ({
            name: `vcfClusters:${p.id}`,
            fn: () => getPvdcClusters(vmwareClient, p.director_site_id!, p.id!),
          }));

        if (vcfClusterTasks.length > 0) {
          tracker.totalResources += vcfClusterTasks.length;
          const vcfResults = await runPhase('VCFaaS Clusters', vcfClusterTasks, res, errors, tracker);
          for (const [, value] of vcfResults) {
            if (Array.isArray(value)) {
              vcfClusters.push(...(value as VCFCluster[]));
            }
          }
        }
      }

      // Send VMware resource data via SSE
      if (vmwareClusters.length > 0) {
        sendSSE(res, 'data', {
          resourceKey: 'vmwareClusters',
          items: vmwareClusters,
          count: vmwareClusters.length,
        });
      }
      if (vmwareHosts.length > 0) {
        sendSSE(res, 'data', {
          resourceKey: 'vmwareHosts',
          items: vmwareHosts,
          count: vmwareHosts.length,
        });
      }
      if (vmwareVlans.length > 0) {
        sendSSE(res, 'data', {
          resourceKey: 'vmwareVlans',
          items: vmwareVlans,
          count: vmwareVlans.length,
        });
      }
      if (vmwareSubnets.length > 0) {
        sendSSE(res, 'data', {
          resourceKey: 'vmwareSubnets',
          items: vmwareSubnets,
          count: vmwareSubnets.length,
        });
      }
      if (pvdcs.length > 0) {
        sendSSE(res, 'data', {
          resourceKey: 'pvdcs',
          items: pvdcs,
          count: pvdcs.length,
        });
      }
      if (vcfClusters.length > 0) {
        sendSSE(res, 'data', {
          resourceKey: 'vcfClusters',
          items: vcfClusters,
          count: vcfClusters.length,
        });
      }
    }

    // Extract Transit Gateway Connections from Phase 3
    if (iamAvailable) {
      transitGatewayConnections = (phase3Results.get('classicTransitGatewayConnections') as TransitGatewayConnection[] | undefined) ?? [];

      // Send IAM resource data via SSE
      sendSSE(res, 'data', {
        resourceKey: 'classicTransitGateways',
        items: transitGateways,
        count: transitGateways.length,
      });
      sendSSE(res, 'data', {
        resourceKey: 'classicTransitGatewayConnections',
        items: transitGatewayConnections,
        count: transitGatewayConnections.length,
      });
      sendSSE(res, 'data', {
        resourceKey: 'directLinkGateways',
        items: directLinkGateways,
        count: directLinkGateways.length,
      });
    }

    // ── PHASE 4: TGW ROUTE REPORTS + VPN GATEWAYS ──────────────────────
    if (iamAvailable && transitGateways.length > 0 && transitGatewayConnections.length > 0) {
      if (abortSignal?.aborted) return;

      const phase4Tasks: CollectorTask[] = [];

      // Route reports for all TGWs (pass connections for tunnel→parent mapping)
      tracker.totalResources += 1;
      phase4Tasks.push({
        name: 'tgwRoutePrefixes',
        fn: () => getTransitGatewayRouteReports(iamClient, transitGateways, (msg) => {
          sendSSE(res, 'progress', {
            phase: 'TGW Route Reports',
            status: msg,
            completedResources: tracker.completedResources,
            totalResources: tracker.totalResources,
          });
        }, transitGatewayConnections),
      });

      // VPN gateways for VPC connections
      const hasVpcConnections = transitGatewayConnections.some((c) => c.network_type === 'vpc' && c.network_id);
      if (hasVpcConnections) {
        tracker.totalResources += 1;
        phase4Tasks.push({
          name: 'tgwVpcVpnGateways',
          fn: () => getVpnGatewaysForTgwVpcConnections(iamClient, transitGatewayConnections, transitGateways),
        });
      }

      currentPhaseName = 'TGW Route Reports';
      const phase4Results = await runPhase('TGW Route Reports', phase4Tasks, res, errors, tracker);

      tgwRoutePrefixes = (phase4Results.get('tgwRoutePrefixes') as TgwRoutePrefixes[] | undefined) ?? [];
      tgwVpcVpnGateways = (phase4Results.get('tgwVpcVpnGateways') as TgwVpcVpnGateway[] | undefined) ?? [];

      // Send SSE data events
      if (tgwRoutePrefixes.length > 0) {
        sendSSE(res, 'data', {
          resourceKey: 'tgwRoutePrefixes',
          items: tgwRoutePrefixes,
          count: tgwRoutePrefixes.length,
        });
      }
      if (tgwVpcVpnGateways.length > 0) {
        sendSSE(res, 'data', {
          resourceKey: 'tgwVpcVpnGateways',
          items: tgwVpcVpnGateways,
          count: tgwVpcVpnGateways.length,
        });
      }
    }

    // ── POST-COLLECTION: RELATIONSHIPS ────────────────────────────────────
    if (abortSignal?.aborted) return;
    sendSSE(res, 'progress', {
      phase: 'Relationship Mapping',
      resource: 'relationships',
      status: 'building',
      totalResources: tracker.totalResources,
      completedResources: tracker.completedResources,
    });

    relationships = buildRelationships({
      virtualGuests,
      hardware,
      vlans,
      subnets,
      gateways,
      firewalls,
      securityGroups,
      blockStorage,
      fileStorage,
      placementGroups,
      dedicatedHosts,
      imageTemplates,
      vmwareInstances,
      vmwareClusters,
      directorSites,
      pvdcs,
      vcfClusters,
      vdcs,
    });

    tracker.completedResources++;
    sendSSE(res, 'progress', {
      phase: 'Relationship Mapping',
      resource: 'relationships',
      status: `mapped ${relationships.length} relationships`,
      totalResources: tracker.totalResources,
      completedResources: tracker.completedResources,
    });

    // Build VMware cross-references
    if (vmwareAvailable && vmwareClusters.length > 0) {
      vmwareCrossReferences = buildVMwareCrossReferences({
        hardware,
        vlans,
        blockStorage,
        fileStorage,
        vmwareInstances,
        vmwareClusters,
      });

      if (vmwareCrossReferences.length > 0) {
        sendSSE(res, 'data', {
          resourceKey: 'vmwareCrossReferences',
          items: vmwareCrossReferences,
          count: vmwareCrossReferences.length,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const collectionTimestamp = new Date().toISOString();

    // Send relationships as a data event (like other resources)
    sendSSE(res, 'data', {
      resourceKey: 'relationships',
      items: relationships,
      count: relationships.length,
    });

    sendSSE(res, 'complete', {
      collectionTimestamp,
      duration: durationMs,
      totalResources: {
        virtualGuests: virtualGuests.length,
        hardware: hardware.length,
        dedicatedHosts: dedicatedHosts.length,
        placementGroups: placementGroups.length,
        reservedCapacity: reservedCapacity.length,
        imageTemplates: imageTemplates.length,
        vlans: vlans.length,
        subnets: subnets.length,
        gateways: gateways.length,
        firewalls: firewalls.length,
        securityGroups: securityGroups.length,
        securityGroupRules: securityGroupRules.length,
        loadBalancers: loadBalancers.length,
        vpnTunnels: vpnTunnels.length,
        blockStorage: blockStorage.length,
        fileStorage: fileStorage.length,
        objectStorage: objectStorage.length,
        sslCertificates: sslCertificates.length,
        sshKeys: sshKeys.length,
        domains: domains.length,
        dnsRecords: dnsRecords.length,
        billingItems: billingItems.length,
        users: users.length,
        eventLog: eventLog.length,
        relationships: relationships.length,
        vmwareInstances: vmwareInstances.length,
        vmwareClusters: vmwareClusters.length,
        vmwareHosts: vmwareHosts.length,
        vmwareVlans: vmwareVlans.length,
        vmwareSubnets: vmwareSubnets.length,
        directorSites: directorSites.length,
        pvdcs: pvdcs.length,
        vcfClusters: vcfClusters.length,
        vdcs: vdcs.length,
        multitenantSites: multitenantSites.length,
        vmwareCrossReferences: vmwareCrossReferences.length,
        classicTransitGateways: transitGateways.length,
        classicTransitGatewayConnections: transitGatewayConnections.length,
        directLinkGateways: directLinkGateways.length,
        tgwRoutePrefixes: tgwRoutePrefixes.length,
        tgwVpcVpnGateways: tgwVpcVpnGateways.length,
      },
      errors,
    });

    logger.info('Data collection complete', {
      durationMs,
      resourceCounts: {
        virtualGuests: virtualGuests.length,
        hardware: hardware.length,
        vlans: vlans.length,
        subnets: subnets.length,
      },
      errorCount: errors.length,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Fatal collection error', { message: error.message });
    sendSSE(res, 'error', {
      fatal: true,
      message: error.message,
    });
  }
}
