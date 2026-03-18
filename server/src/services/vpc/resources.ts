import type { VpcClient } from './client.js';
import type { TransitGateway, TransitGatewayConnection, TransitGatewayPrefixFilter, DirectLinkGateway, DirectLinkVirtualConnection, TransitGatewayRouteReport, VpnGatewayConnection, VpcRoutingTable, VpcRoute, Vpc } from './types.js';
import { runWithConcurrencyLimit } from '../../utils/concurrency.js';
import logger from '../../utils/logger.js';

const MAX_REGION_CONCURRENCY = 5;

/**
 * Generic multi-region collector: fans out to all regions, injects _region field.
 */
async function collectAcrossRegions<T extends Record<string, unknown>>(
  client: VpcClient,
  regions: string[],
  path: string,
  itemsKey: string,
  resourceName: string,
): Promise<T[]> {
  const allItems: T[] = [];

  const tasks = regions.map((region) => async () => {
    try {
      const items = await client.requestAllPages<T>(region, path, itemsKey);
      for (const item of items) {
        (item as Record<string, unknown>)._region = region;
      }
      if (items.length > 0) {
        logger.debug(`VPC ${resourceName}: ${items.length} items from ${region}`);
      }
      return items;
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      // 404 means the resource type isn't available in this region — skip silently
      if (error.statusCode === 404) return [];
      logger.warn(`VPC ${resourceName} failed in ${region}`, { message: error.message });
      throw error;
    }
  });

  const results = await runWithConcurrencyLimit(tasks, MAX_REGION_CONCURRENCY);
  for (const items of results) {
    if (items) allItems.push(...items);
  }

  return allItems;
}

export async function getVpcInstances(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'instances', 'instances', 'Instances');
}

export async function getVpcBareMetalServers(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'bare_metal_servers', 'bare_metal_servers', 'Bare Metal Servers');
}

export async function getVpcDedicatedHosts(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'dedicated_hosts', 'dedicated_hosts', 'Dedicated Hosts');
}

export async function getVpcPlacementGroups(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'placement_groups', 'placement_groups', 'Placement Groups');
}

export async function getVpcs(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'vpcs', 'vpcs', 'VPCs');
}

export async function getVpcSubnets(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'subnets', 'subnets', 'Subnets');
}

export async function getVpcSecurityGroups(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'security_groups', 'security_groups', 'Security Groups');
}

export async function getVpcFloatingIps(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'floating_ips', 'floating_ips', 'Floating IPs');
}

export async function getVpcPublicGateways(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'public_gateways', 'public_gateways', 'Public Gateways');
}

export async function getVpcNetworkAcls(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'network_acls', 'network_acls', 'Network ACLs');
}

export async function getVpcLoadBalancers(client: VpcClient, regions: string[]) {
  const items = await collectAcrossRegions(client, regions, 'load_balancers', 'load_balancers', 'Load Balancers');
  // Flatten subnet references into simple string arrays for reliable topology edge creation.
  // The nested `subnets` array (SubnetReference[]) may not survive transform/serialization cleanly.
  for (const item of items) {
    const subnets = item.subnets as Array<{ id?: string; name?: string }> | undefined;
    if (subnets && Array.isArray(subnets)) {
      item._subnetIds = subnets.map((s) => s.id).filter(Boolean);
      item._subnetNames = subnets.map((s) => s.name).filter(Boolean);
    } else {
      item._subnetIds = [];
      item._subnetNames = [];
    }
  }
  return items;
}

export async function getVpcVpnGateways(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'vpn_gateways', 'vpn_gateways', 'VPN Gateways');
}

export async function getVpcEndpointGateways(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'endpoint_gateways', 'endpoint_gateways', 'Endpoint Gateways');
}

export async function getVpcVolumes(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'volumes', 'volumes', 'Volumes');
}

export async function getVpcSshKeys(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'keys', 'keys', 'SSH Keys');
}

export async function getVpcImages(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'images?visibility=private', 'images', 'Images');
}

export async function getVpcFlowLogCollectors(client: VpcClient, regions: string[]) {
  return collectAcrossRegions(client, regions, 'flow_log_collectors', 'flow_log_collectors', 'Flow Log Collectors');
}

/**
 * Transit Gateways are global (not per-region).
 * Uses the Transit Gateway API at transit.cloud.ibm.com.
 */
export async function getTransitGateways(client: VpcClient): Promise<TransitGateway[]> {
  try {
    const items = await client.requestAllTransitGatewayPages<TransitGateway>(
      'transit_gateways',
      'transit_gateways',
    );
    if (items.length > 0) {
      logger.debug(`Transit Gateways: ${items.length} items`);
    }
    return items;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    logger.warn('Transit Gateways collection failed', { message: error.message });
    throw error;
  }
}

/**
 * Transit Gateway Connections — sub-resource of each transit gateway.
 */
export async function getTransitGatewayConnections(
  client: VpcClient,
  transitGateways: TransitGateway[],
): Promise<TransitGatewayConnection[]> {
  const allConnections: TransitGatewayConnection[] = [];

  const tasks = transitGateways.map((tg) => async () => {
    try {
      const connections = await client.requestAllTransitGatewayPages<TransitGatewayConnection>(
        `transit_gateways/${tg.id}/connections`,
        'connections',
      );
      for (const conn of connections) {
        conn.transit_gateway = { id: tg.id, name: tg.name };
      }
      return connections;
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 404) return [];
      logger.warn(`Transit Gateway Connections failed for ${tg.name}`, { message: error.message });
      throw error;
    }
  });

  const results = await runWithConcurrencyLimit(tasks, MAX_REGION_CONCURRENCY);
  for (const conns of results) {
    if (conns) allConnections.push(...conns);
  }

  // Fetch prefix_filters for GRE tunnel connections (they use a separate API endpoint)
  // Note: redundant_gre connections don't use prefix_filters - routes are learned via BGP
  const greConnections = allConnections.filter((c) =>
    c.network_type === 'gre_tunnel' || c.network_type === 'unbound_gre_tunnel'
  );
  if (greConnections.length > 0) {
    logger.debug(`Fetching prefix_filters for ${greConnections.length} GRE connections`);
    const prefixTasks = greConnections.map((conn) => async () => {
      try {
        const filters = await client.requestAllTransitGatewayPages<TransitGatewayPrefixFilter>(
          `transit_gateways/${conn.transit_gateway.id}/connections/${conn.id}/prefix_filters`,
          'prefix_filters',
        );
        if (filters.length > 0) {
          conn.prefix_filters = filters;
          logger.debug(`  ${conn.name}: ${filters.length} prefix filters`);
        }
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode !== 404) {
          logger.warn(`Prefix filters failed for connection ${conn.name}`, { message: error.message });
        }
      }
    });
    await runWithConcurrencyLimit(prefixTasks, MAX_REGION_CONCURRENCY);
  }

  return allConnections;
}

/**
 * Direct Link Gateways — global resource.
 * Uses the Direct Link API at directlink.cloud.ibm.com.
 */
export async function getDirectLinkGateways(client: VpcClient): Promise<DirectLinkGateway[]> {
  try {
    const items = await client.requestAllDirectLinkPages<DirectLinkGateway>(
      'gateways',
      'gateways',
    );
    if (items.length > 0) {
      logger.debug(`Direct Link Gateways: ${items.length} items`);
    }
    return items;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    logger.warn('Direct Link Gateways collection failed', { message: error.message });
    throw error;
  }
}

/**
 * Direct Link Virtual Connections — sub-resource of each Direct Link gateway.
 * Contains routing info and connected network references.
 */
export async function getDirectLinkVirtualConnections(
  client: VpcClient,
  directLinkGateways: DirectLinkGateway[],
): Promise<DirectLinkVirtualConnection[]> {
  const allConnections: DirectLinkVirtualConnection[] = [];

  const tasks = directLinkGateways.map((dl) => async () => {
    try {
      const connections = await client.requestAllDirectLinkPages<DirectLinkVirtualConnection>(
        `gateways/${dl.id}/virtual_connections`,
        'virtual_connections',
      );
      for (const conn of connections) {
        conn.gateway = { id: dl.id, name: dl.name };
      }
      return connections;
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 404) return [];
      logger.warn(`Direct Link Virtual Connections failed for ${dl.name}`, { message: error.message });
      return [];
    }
  });

  const results = await runWithConcurrencyLimit(tasks, MAX_REGION_CONCURRENCY);
  for (const conns of results) {
    if (conns) allConnections.push(...conns);
  }

  if (allConnections.length > 0) {
    logger.debug(`Direct Link Virtual Connections: ${allConnections.length} items`);
  }

  return allConnections;
}

// ── TGW Route Prefixes + VPN Gateways for Classic topology ──────

export interface TgwRouteConnectionPrefixes {
  connectionId: string;
  connectionName: string;
  connectionType: string;
  prefixes: string[];
}

export interface TgwRoutePrefixes {
  transitGatewayId: string;
  transitGatewayName: string;
  prefixes: string[];
  connectionPrefixes: TgwRouteConnectionPrefixes[];
}

export interface TgwVpcVpnGateway {
  id: string;
  name: string;
  status: string;
  mode?: string;
  transitGatewayId: string;
  transitGatewayName: string;
  vpcId: string;
  vpcName?: string;
  vpcRegion: string;
}

const ROUTE_REPORT_POLL_INTERVAL = 3000;  // 3 seconds between polls
const ROUTE_REPORT_MAX_ATTEMPTS = 40;     // Up to 2 minutes total timeout

export type RouteReportProgressCallback = (message: string) => void;

/**
 * Clean up any existing route reports for a transit gateway before creating a new one.
 * The API may throttle or block new report creation if stale reports exist.
 */
async function cleanupExistingRouteReports(
  client: VpcClient,
  tgId: string,
  tgName: string,
): Promise<TransitGatewayRouteReport | null> {
  try {
    const response = await client.requestTransitGateway<{ route_reports?: TransitGatewayRouteReport[] }>(
      `transit_gateways/${tgId}/route_reports`,
    );
    const reports = response.route_reports ?? [];
    if (reports.length === 0) return null;

    logger.debug(`TGW ${tgName}: found ${reports.length} existing route report(s)`);

    // If there's a recently completed report, reuse it instead of creating a new one
    const complete = reports.find((r) => r.status === 'complete');
    if (complete) {
      logger.debug(`TGW ${tgName}: reusing existing complete route report ${complete.id}`);
      return complete;
    }

    // If there's a pending report, wait for it instead of creating a new one
    const pending = reports.find((r) => r.status === 'pending');
    if (pending) {
      logger.debug(`TGW ${tgName}: found pending route report ${pending.id}, will poll it`);
      return pending;
    }

    // Delete any failed or stale reports
    for (const report of reports) {
      logger.debug(`TGW ${tgName}: deleting stale route report ${report.id} (status: ${report.status})`);
      await client.deleteTransitGateway(`transit_gateways/${tgId}/route_reports/${report.id}`);
    }
  } catch (err) {
    const error = err as Error;
    logger.warn(`TGW ${tgName}: failed to list existing route reports`, { message: error.message });
  }
  return null;
}

/**
 * Delete a route report after extracting data.
 */
async function deleteRouteReport(client: VpcClient, tgId: string, reportId: string, tgName: string): Promise<void> {
  try {
    await client.deleteTransitGateway(`transit_gateways/${tgId}/route_reports/${reportId}`);
    logger.debug(`TGW ${tgName}: deleted route report ${reportId}`);
  } catch (err) {
    const error = err as Error;
    logger.warn(`TGW ${tgName}: failed to delete route report ${reportId}`, { message: error.message });
  }
}

/**
 * Create and poll route reports for each transit gateway to extract reachable prefixes.
 * Also accepts connections to map tunnel IDs back to parent redundant_gre connection IDs.
 */
export async function getTransitGatewayRouteReports(
  client: VpcClient,
  transitGateways: TransitGateway[],
  onProgress?: RouteReportProgressCallback,
  connections?: TransitGatewayConnection[],
): Promise<TgwRoutePrefixes[]> {
  const results: TgwRoutePrefixes[] = [];

  // Build a map of tunnel ID → parent connection ID for redundant_gre connections
  // This allows mapping route report tunnel entries back to their parent connection
  const tunnelToParentMap = new Map<string, { parentId: string; parentName: string }>();
  if (connections) {
    const redundantGreConns = connections.filter((c) => c.network_type === 'redundant_gre');
    for (const conn of redundantGreConns) {
      // The connection object should have a 'tunnels' array with tunnel IDs
      const tunnels = (conn as Record<string, unknown>).tunnels as Array<{ id?: string; name?: string }> | undefined;
      if (tunnels) {
        for (const tunnel of tunnels) {
          if (tunnel.id) {
            tunnelToParentMap.set(tunnel.id, { parentId: conn.id, parentName: conn.name });
          }
        }
      }
    }
    if (tunnelToParentMap.size > 0) {
      logger.debug(`Built tunnel→parent map: ${tunnelToParentMap.size} tunnels across ${redundantGreConns.length} redundant_gre connections`);
    }
  }

  // Process TGWs sequentially (not concurrently) to avoid rate limiting on route report creation
  const tasks = transitGateways.map((tg, tgIndex) => async () => {
    let reportId: string | null = null;
    try {
      // Check for existing route reports — reuse complete/pending, clean up stale
      onProgress?.(`Checking existing route reports for ${tg.name} (${tgIndex + 1}/${transitGateways.length})`);
      const existing = await cleanupExistingRouteReports(client, tg.id, tg.name);

      let current: TransitGatewayRouteReport;
      if (existing && (existing.status === 'complete' || existing.status === 'pending')) {
        current = existing;
        reportId = existing.id;
        if (existing.status === 'complete') {
          // Fetch full report details (the list response may not include connections)
          current = await client.requestTransitGateway<TransitGatewayRouteReport>(
            `transit_gateways/${tg.id}/route_reports/${existing.id}`,
          );
        }
      } else {
        // Create a new route report
        onProgress?.(`Creating route report for ${tg.name} (${tgIndex + 1}/${transitGateways.length})`);
        const report = await client.postTransitGateway<TransitGatewayRouteReport>(
          `transit_gateways/${tg.id}/route_reports`,
        );
        current = report;
        reportId = report.id;
        logger.debug(`TGW ${tg.name}: created route report ${report.id} (status: ${report.status})`);
      }

      // Poll until complete
      for (let attempt = 0; attempt < ROUTE_REPORT_MAX_ATTEMPTS; attempt++) {
        if (current.status === 'complete') break;
        if (current.status === 'failed') {
          logger.warn(`Route report failed for TGW ${tg.name}`);
          return { transitGatewayId: tg.id, transitGatewayName: tg.name, prefixes: [], connectionPrefixes: [] };
        }
        onProgress?.(`Waiting for ${tg.name} route report... (${attempt + 1}/${ROUTE_REPORT_MAX_ATTEMPTS})`);
        await new Promise((r) => setTimeout(r, ROUTE_REPORT_POLL_INTERVAL));
        try {
          current = await client.requestTransitGateway<TransitGatewayRouteReport>(
            `transit_gateways/${tg.id}/route_reports/${current.id}`,
          );
        } catch (pollErr) {
          const pollError = pollErr as Error & { statusCode?: number };
          // If the report was deleted or vanished, bail out
          if (pollError.statusCode === 404) {
            logger.warn(`TGW ${tg.name}: route report ${current.id} disappeared during polling`);
            return { transitGatewayId: tg.id, transitGatewayName: tg.name, prefixes: [], connectionPrefixes: [] };
          }
          logger.warn(`TGW ${tg.name}: poll error (attempt ${attempt + 1})`, { message: pollError.message });
          // Continue polling — transient errors shouldn't abort
        }
      }

      if (current.status !== 'complete') {
        logger.warn(`Route report timed out for TGW ${tg.name} after ${ROUTE_REPORT_MAX_ATTEMPTS * ROUTE_REPORT_POLL_INTERVAL / 1000}s (status: ${current.status})`);
        return { transitGatewayId: tg.id, transitGatewayName: tg.name, prefixes: [], connectionPrefixes: [] };
      }

      // Log route report summary
      logger.debug(`TGW ${tg.name} route report: ${current.connections?.length ?? 0} connections`);

      // Extract deduplicated prefixes and per-connection prefixes
      const prefixSet = new Set<string>();
      const connectionPrefixes: TgwRouteConnectionPrefixes[] = [];
      for (const conn of current.connections ?? []) {
        const connPrefixes: string[] = [];

        // Extract routes directly on the connection
        for (const route of conn.routes ?? []) {
          if (route.prefix) {
            prefixSet.add(route.prefix);
            connPrefixes.push(route.prefix);
          }
        }

        // For redundant_gre, also check for routes within the tunnels array
        const tunnels = (conn as Record<string, unknown>).tunnels as Array<Record<string, unknown>> | undefined;
        if (tunnels && tunnels.length > 0) {
          for (const tunnel of tunnels) {
            const tunnelRoutes = tunnel.routes as Array<{ prefix?: string }> | undefined;
            if (tunnelRoutes) {
              for (const route of tunnelRoutes) {
                if (route.prefix && !connPrefixes.includes(route.prefix)) {
                  prefixSet.add(route.prefix);
                  connPrefixes.push(route.prefix);
                }
              }
            }
            // Also check for bgp_learned_routes or advertised_routes
            const bgpRoutes = (tunnel.bgp_learned_routes ?? tunnel.advertised_routes ?? tunnel.learned_routes) as Array<{ prefix?: string }> | undefined;
            if (bgpRoutes) {
              for (const route of bgpRoutes) {
                if (route.prefix && !connPrefixes.includes(route.prefix)) {
                  prefixSet.add(route.prefix);
                  connPrefixes.push(route.prefix);
                }
              }
            }
          }
        }

        // Also check for overlapping_routes at connection level (may contain prefixes)
        const overlappingRoutes = (conn as Record<string, unknown>).overlapping_routes as Array<{ prefix?: string }> | undefined;
        if (overlappingRoutes) {
          for (const route of overlappingRoutes) {
            if (route.prefix && !connPrefixes.includes(route.prefix)) {
              prefixSet.add(route.prefix);
              connPrefixes.push(route.prefix);
            }
          }
        }

        // For redundant_gre_tunnel (individual tunnels), map routes to parent connection
        let effectiveId = conn.id;
        let effectiveName = conn.name;
        let effectiveType = conn.type;

        if (conn.type === 'redundant_gre_tunnel') {
          const parent = tunnelToParentMap.get(conn.id);
          if (parent) {
            effectiveId = parent.parentId;
            effectiveName = parent.parentName;
            effectiveType = 'redundant_gre';
          }
        }

        // Check if we already have an entry for this connection (for aggregating tunnel routes)
        const existingEntry = connectionPrefixes.find((cp) => cp.connectionId === effectiveId);
        if (existingEntry) {
          // Aggregate routes to existing entry
          for (const prefix of connPrefixes) {
            if (!existingEntry.prefixes.includes(prefix)) {
              existingEntry.prefixes.push(prefix);
            }
          }
          existingEntry.prefixes.sort();
        } else {
          // Create new entry
          connectionPrefixes.push({
            connectionId: effectiveId,
            connectionName: effectiveName,
            connectionType: effectiveType,
            prefixes: connPrefixes.sort(),
          });
        }
        // Log connections with no routes for debugging
        if (connPrefixes.length === 0) {
          logger.debug(`TGW ${tg.name}: connection "${conn.name}" (${conn.type}) has no routes`);
        }
      }

      const prefixes = Array.from(prefixSet).sort();
      const connsWithRoutes = connectionPrefixes.filter(c => c.prefixes.length > 0).length;
      logger.debug(`TGW ${tg.name}: ${prefixes.length} route prefixes across ${connsWithRoutes}/${connectionPrefixes.length} connections`);

      // Clean up the route report after extracting data
      if (reportId) {
        await deleteRouteReport(client, tg.id, reportId, tg.name);
      }

      return { transitGatewayId: tg.id, transitGatewayName: tg.name, prefixes, connectionPrefixes };
    } catch (err) {
      const error = err as Error;
      logger.warn(`Route report collection failed for TGW ${tg.name}`, { message: error.message });
      // Attempt cleanup even on failure
      if (reportId) {
        await deleteRouteReport(client, tg.id, reportId, tg.name);
      }
      return { transitGatewayId: tg.id, transitGatewayName: tg.name, prefixes: [], connectionPrefixes: [] };
    }
  });

  // Run route reports with low concurrency — each one involves POST + polling + DELETE
  const taskResults = await runWithConcurrencyLimit(tasks, 2);
  for (const r of taskResults) {
    if (r) results.push(r);
  }

  return results;
}

/**
 * Parse region from a VPC CRN: crn:v1:bluemix:public:is:{region}:a/...::vpc:{id}
 */
function parseRegionFromCrn(crn: string): string | null {
  const parts = crn.split(':');
  // CRN format: crn:v1:bluemix:public:is:{region}:a/...
  if (parts.length >= 6 && parts[4] === 'is') {
    return parts[5] || null;
  }
  return null;
}

/**
 * Parse VPC ID from a VPC CRN: crn:v1:bluemix:public:is:{region}:a/{account}::vpc:{id}
 */
function parseVpcIdFromCrn(crn: string): string | null {
  const match = crn.match(/::vpc:([a-f0-9-]+)$/);
  return match ? match[1] : null;
}

/**
 * Collect VPN gateways for VPCs connected via Transit Gateway.
 */
export async function getVpnGatewaysForTgwVpcConnections(
  client: VpcClient,
  connections: TransitGatewayConnection[],
  transitGateways: TransitGateway[],
): Promise<TgwVpcVpnGateway[]> {
  const results: TgwVpcVpnGateway[] = [];

  // Build TGW lookup
  const tgwById = new Map<string, TransitGateway>();
  for (const tg of transitGateways) {
    tgwById.set(tg.id, tg);
  }

  // Filter to VPC connections with network_id (CRN)
  const vpcConnections = connections.filter(
    (c) => c.network_type === 'vpc' && c.network_id,
  );

  if (vpcConnections.length === 0) return results;

  // Group by region to avoid duplicate API calls
  interface VpcInfo {
    vpcId: string;
    vpcName: string;
    region: string;
    transitGatewayId: string;
    transitGatewayName: string;
  }
  const regionVpcs = new Map<string, VpcInfo[]>();

  for (const conn of vpcConnections) {
    const crn = conn.network_id!;
    const region = parseRegionFromCrn(crn);
    const vpcId = parseVpcIdFromCrn(crn);
    if (!region || !vpcId) continue;

    const tg = tgwById.get(conn.transit_gateway.id);
    const info: VpcInfo = {
      vpcId,
      vpcName: conn.name || '',
      region,
      transitGatewayId: conn.transit_gateway.id,
      transitGatewayName: tg?.name ?? conn.transit_gateway.name ?? '',
    };

    const arr = regionVpcs.get(region) ?? [];
    arr.push(info);
    regionVpcs.set(region, arr);
  }

  // Fetch VPN gateways per region
  const regionTasks = Array.from(regionVpcs.entries()).map(([region, vpcs]) => async () => {
    try {
      const vpnGateways = await client.requestAllPages<Record<string, unknown>>(
        region,
        'vpn_gateways',
        'vpn_gateways',
      );

      // Build VPC ID set for this region
      const vpcInfoByVpcId = new Map<string, VpcInfo[]>();
      for (const vpc of vpcs) {
        const arr = vpcInfoByVpcId.get(vpc.vpcId) ?? [];
        arr.push(vpc);
        vpcInfoByVpcId.set(vpc.vpcId, arr);
      }

      // Filter VPN gateways matching our VPCs
      for (const vpn of vpnGateways) {
        const vpnVpc = vpn.vpc as { id?: string; name?: string } | undefined;
        if (!vpnVpc?.id) continue;
        const matchingInfos = vpcInfoByVpcId.get(vpnVpc.id);
        if (!matchingInfos) continue;

        for (const info of matchingInfos) {
          results.push({
            id: String(vpn.id),
            name: String(vpn.name ?? ''),
            status: String(vpn.status ?? ''),
            mode: vpn.mode ? String(vpn.mode) : undefined,
            transitGatewayId: info.transitGatewayId,
            transitGatewayName: info.transitGatewayName,
            vpcId: info.vpcId,
            vpcName: vpnVpc.name ?? info.vpcName,
            vpcRegion: region,
          });
        }
      }
    } catch (err) {
      const error = err as Error;
      logger.warn(`VPN gateway collection failed for region ${region}`, { message: error.message });
      // Non-fatal: skip this region
    }
  });

  await runWithConcurrencyLimit(regionTasks, MAX_REGION_CONCURRENCY);
  return results;
}

/**
 * VPN Gateway Connections — sub-resource of each VPN gateway.
 * Contains peer_cidrs (remote subnets reachable via VPN).
 */
export async function getVpnGatewayConnections(
  client: VpcClient,
  regions: string[],
): Promise<VpnGatewayConnection[]> {
  const allConnections: VpnGatewayConnection[] = [];

  const tasks = regions.map((region) => async () => {
    try {
      // First get all VPN gateways in the region
      const vpnGateways = await client.requestAllPages<Record<string, unknown>>(
        region,
        'vpn_gateways',
        'vpn_gateways',
      );

      // Then get connections for each gateway
      const connTasks = vpnGateways.map((vpn) => async () => {
        const vpnId = String(vpn.id);
        const vpnName = String(vpn.name ?? '');
        try {
          const connections = await client.requestAllPages<VpnGatewayConnection>(
            region,
            `vpn_gateways/${vpnId}/connections`,
            'connections',
          );
          for (const conn of connections) {
            conn.vpn_gateway = { id: vpnId, name: vpnName, region };
          }
          return connections;
        } catch (err) {
          const error = err as Error & { statusCode?: number };
          if (error.statusCode === 404) return [];
          logger.warn(`VPN Gateway Connections failed for ${vpnName} in ${region}`, { message: error.message });
          return [];
        }
      });

      const results = await runWithConcurrencyLimit(connTasks, MAX_REGION_CONCURRENCY);
      const regionConns: VpnGatewayConnection[] = [];
      for (const conns of results) {
        if (conns) regionConns.push(...conns);
      }
      return regionConns;
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 404) return [];
      logger.warn(`VPN Gateway Connections failed for region ${region}`, { message: error.message });
      return [];
    }
  });

  const results = await runWithConcurrencyLimit(tasks, MAX_REGION_CONCURRENCY);
  for (const conns of results) {
    if (conns) allConnections.push(...conns);
  }

  if (allConnections.length > 0) {
    logger.debug(`VPN Gateway Connections: ${allConnections.length} items`);
  }

  return allConnections;
}

// ── VPC Routing Tables & Routes ─────────────────────────────────

/**
 * Group VPCs by region for efficient routing table collection.
 */
export interface VpcsByRegion {
  [region: string]: Array<{ id: string; name: string }>;
}

export function groupVpcsByRegion(vpcs: Vpc[]): VpcsByRegion {
  const result: VpcsByRegion = {};
  for (const vpc of vpcs) {
    const region = vpc._region;
    if (!region) continue;
    if (!result[region]) {
      result[region] = [];
    }
    result[region].push({ id: vpc.id, name: vpc.name });
  }
  return result;
}

/**
 * Collect routing tables for all VPCs across all regions.
 * Injects _region, _vpcId, _vpcName into each routing table.
 */
export async function getVpcRoutingTables(
  client: VpcClient,
  vpcsByRegion: VpcsByRegion,
): Promise<VpcRoutingTable[]> {
  const allRoutingTables: VpcRoutingTable[] = [];

  const regionTasks = Object.entries(vpcsByRegion).map(([region, vpcs]) => async () => {
    const regionTables: VpcRoutingTable[] = [];

    const vpcTasks = vpcs.map((vpc) => async () => {
      try {
        const tables = await client.requestAllPages<VpcRoutingTable>(
          region,
          `vpcs/${vpc.id}/routing_tables`,
          'routing_tables',
        );
        for (const table of tables) {
          table._region = region;
          table._vpcId = vpc.id;
          table._vpcName = vpc.name;
        }
        return tables;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 404) return [];
        logger.warn(`Routing Tables failed for VPC ${vpc.name} in ${region}`, { message: error.message });
        return [];
      }
    });

    const results = await runWithConcurrencyLimit(vpcTasks, MAX_REGION_CONCURRENCY);
    for (const tables of results) {
      if (tables) regionTables.push(...tables);
    }
    return regionTables;
  });

  const results = await runWithConcurrencyLimit(regionTasks, MAX_REGION_CONCURRENCY);
  for (const tables of results) {
    if (tables) allRoutingTables.push(...tables);
  }

  if (allRoutingTables.length > 0) {
    logger.debug(`VPC Routing Tables: ${allRoutingTables.length} items`);
  }

  return allRoutingTables;
}

/**
 * Group routing tables by region for efficient route collection.
 */
export interface RoutingTablesByRegion {
  [region: string]: Array<{ id: string; name: string; vpcId: string; vpcName: string }>;
}

export function groupRoutingTablesByRegion(routingTables: VpcRoutingTable[]): RoutingTablesByRegion {
  const result: RoutingTablesByRegion = {};
  for (const rt of routingTables) {
    const region = rt._region;
    if (!region || !rt._vpcId) continue;
    if (!result[region]) {
      result[region] = [];
    }
    result[region].push({
      id: rt.id,
      name: rt.name,
      vpcId: rt._vpcId,
      vpcName: rt._vpcName ?? '',
    });
  }
  return result;
}

/**
 * Collect routes for all routing tables across all regions.
 * Injects _region, _vpcId, _vpcName, _routingTableId, _routingTableName into each route.
 */
export async function getVpcRoutes(
  client: VpcClient,
  routingTablesByRegion: RoutingTablesByRegion,
): Promise<VpcRoute[]> {
  const allRoutes: VpcRoute[] = [];

  const regionTasks = Object.entries(routingTablesByRegion).map(([region, routingTables]) => async () => {
    const regionRoutes: VpcRoute[] = [];

    const rtTasks = routingTables.map((rt) => async () => {
      try {
        const routes = await client.requestAllPages<VpcRoute>(
          region,
          `vpcs/${rt.vpcId}/routing_tables/${rt.id}/routes`,
          'routes',
        );
        for (const route of routes) {
          route._region = region;
          route._vpcId = rt.vpcId;
          route._vpcName = rt.vpcName;
          route._routingTableId = rt.id;
          route._routingTableName = rt.name;
        }
        return routes;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 404) return [];
        logger.warn(`Routes failed for routing table ${rt.name} in ${region}`, { message: error.message });
        return [];
      }
    });

    const results = await runWithConcurrencyLimit(rtTasks, MAX_REGION_CONCURRENCY);
    for (const routes of results) {
      if (routes) regionRoutes.push(...routes);
    }
    return regionRoutes;
  });

  const results = await runWithConcurrencyLimit(regionTasks, MAX_REGION_CONCURRENCY);
  for (const routes of results) {
    if (routes) allRoutes.push(...routes);
  }

  if (allRoutes.length > 0) {
    logger.debug(`VPC Routes: ${allRoutes.length} items`);
  }

  return allRoutes;
}
