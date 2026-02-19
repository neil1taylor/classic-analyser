import type { Response } from 'express';
import { VpcClient } from './client.js';
import { discoverVpcRegions } from './regions.js';
import {
  getVpcInstances,
  getVpcBareMetalServers,
  getVpcDedicatedHosts,
  getVpcPlacementGroups,
  getVpcs,
  getVpcSubnets,
  getVpcSecurityGroups,
  getVpcFloatingIps,
  getVpcPublicGateways,
  getVpcNetworkAcls,
  getVpcLoadBalancers,
  getVpcVpnGateways,
  getVpcEndpointGateways,
  getVpcVolumes,
  getVpcSshKeys,
  getVpcImages,
  getVpcFlowLogCollectors,
  getTransitGateways,
  getTransitGatewayConnections,
  getTransitGatewayRouteReports,
  getDirectLinkGateways,
  getDirectLinkVirtualConnections,
  getVpnGatewayConnections,
  getVpcRoutingTables,
  getVpcRoutes,
  groupVpcsByRegion,
  groupRoutingTablesByRegion,
} from './resources.js';
import type { DirectLinkGateway, Vpc, VpcRoutingTable } from './types.js';
import { runWithConcurrencyLimit } from '../../utils/concurrency.js';
import type { VpcCollectionError } from './types.js';
import logger from '../../utils/logger.js';

const MAX_CONCURRENCY = 10;

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
  fn: () => Promise<unknown[]>;
}

export async function collectAllVpcData(
  apiKey: string,
  res: Response,
  abortSignal?: { aborted: boolean },
): Promise<void> {
  const startTime = Date.now();
  const client = new VpcClient(apiKey);
  const errors: VpcCollectionError[] = [];

  try {
    // Exchange IAM token
    sendSSE(res, 'progress', {
      phase: 'VPC Authentication',
      resource: 'iam-token',
      status: 'exchanging IAM token',
      totalResources: 20,
      completedResources: 0,
    });

    await client.exchangeToken();

    // Send metadata with user account ID (for ownership detection)
    const userAccountId = client.getAccountId();
    if (userAccountId) {
      sendSSE(res, 'metadata', { userAccountId });
    }

    if (abortSignal?.aborted) return;

    // Discover regions
    sendSSE(res, 'progress', {
      phase: 'VPC Region Discovery',
      resource: 'regions',
      status: 'discovering regions',
      totalResources: 20,
      completedResources: 0,
    });

    const regions = await discoverVpcRegions(client);

    sendSSE(res, 'progress', {
      phase: 'VPC Region Discovery',
      resource: 'regions',
      status: `found ${regions.length} regions`,
      totalResources: 20,
      completedResources: 0,
    });

    if (abortSignal?.aborted) return;

    // Collect Transit Gateways, Direct Link Gateways, and VPCs first (other resources depend on them)
    let collectedTransitGateways: Awaited<ReturnType<typeof getTransitGateways>> = [];
    let collectedDirectLinkGateways: DirectLinkGateway[] = [];
    let collectedVpcs: Vpc[] = [];
    let collectedRoutingTables: VpcRoutingTable[] = [];
    let completedResources = 0;
    const totalResources = 26; // TGW + DL + VPCs + RoutingTables + Routes + 21 other tasks

    try {
      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'transitGateways',
        status: 'collecting',
        totalResources,
        completedResources,
      });

      collectedTransitGateways = await getTransitGateways(client);
      completedResources++;

      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'transitGateways',
        status: `collected ${collectedTransitGateways.length} items`,
        totalResources,
        completedResources,
      });

      sendSSE(res, 'data', {
        resourceKey: 'transitGateways',
        items: collectedTransitGateways,
        count: collectedTransitGateways.length,
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      completedResources++;

      logger.error('VPC collection failed for resource', {
        resource: 'transitGateways',
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: 'transitGateways',
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'error', {
        resource: 'transitGateways',
        message: error.message,
      });
    }

    if (abortSignal?.aborted) return;

    // Collect Direct Link Gateways (virtual connections depend on them)
    try {
      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'directLinkGateways',
        status: 'collecting',
        totalResources,
        completedResources,
      });

      collectedDirectLinkGateways = await getDirectLinkGateways(client);
      completedResources++;

      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'directLinkGateways',
        status: `collected ${collectedDirectLinkGateways.length} items`,
        totalResources,
        completedResources,
      });

      sendSSE(res, 'data', {
        resourceKey: 'directLinkGateways',
        items: collectedDirectLinkGateways,
        count: collectedDirectLinkGateways.length,
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      completedResources++;

      logger.error('VPC collection failed for resource', {
        resource: 'directLinkGateways',
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: 'directLinkGateways',
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'error', {
        resource: 'directLinkGateways',
        message: error.message,
      });
    }

    if (abortSignal?.aborted) return;

    // Collect VPCs first (routing tables depend on them)
    try {
      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'vpcs',
        status: 'collecting',
        totalResources,
        completedResources,
      });

      collectedVpcs = await getVpcs(client, regions) as Vpc[];
      completedResources++;

      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'vpcs',
        status: `collected ${collectedVpcs.length} items`,
        totalResources,
        completedResources,
      });

      sendSSE(res, 'data', {
        resourceKey: 'vpcs',
        items: collectedVpcs,
        count: collectedVpcs.length,
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      completedResources++;

      logger.error('VPC collection failed for resource', {
        resource: 'vpcs',
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: 'vpcs',
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'error', {
        resource: 'vpcs',
        message: error.message,
      });
    }

    if (abortSignal?.aborted) return;

    // Collect Routing Tables (routes depend on them)
    const vpcsByRegion = groupVpcsByRegion(collectedVpcs);
    try {
      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'vpcRoutingTables',
        status: 'collecting',
        totalResources,
        completedResources,
      });

      collectedRoutingTables = await getVpcRoutingTables(client, vpcsByRegion);
      completedResources++;

      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'vpcRoutingTables',
        status: `collected ${collectedRoutingTables.length} items`,
        totalResources,
        completedResources,
      });

      sendSSE(res, 'data', {
        resourceKey: 'vpcRoutingTables',
        items: collectedRoutingTables,
        count: collectedRoutingTables.length,
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      completedResources++;

      logger.error('VPC collection failed for resource', {
        resource: 'vpcRoutingTables',
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: 'vpcRoutingTables',
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'error', {
        resource: 'vpcRoutingTables',
        message: error.message,
      });
    }

    if (abortSignal?.aborted) return;

    // Collect Routes (depends on routing tables)
    const routingTablesByRegion = groupRoutingTablesByRegion(collectedRoutingTables);
    try {
      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'vpcRoutes',
        status: 'collecting',
        totalResources,
        completedResources,
      });

      const collectedRoutes = await getVpcRoutes(client, routingTablesByRegion);
      completedResources++;

      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: 'vpcRoutes',
        status: `collected ${collectedRoutes.length} items`,
        totalResources,
        completedResources,
      });

      sendSSE(res, 'data', {
        resourceKey: 'vpcRoutes',
        items: collectedRoutes,
        count: collectedRoutes.length,
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      completedResources++;

      logger.error('VPC collection failed for resource', {
        resource: 'vpcRoutes',
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: 'vpcRoutes',
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'error', {
        resource: 'vpcRoutes',
        message: error.message,
      });
    }

    if (abortSignal?.aborted) return;

    // Define all resource collection tasks (excluding VPCs, routing tables, routes which are collected above)
    const tgRef = collectedTransitGateways;
    const dlRef = collectedDirectLinkGateways;
    const tasks: CollectorTask[] = [
      { name: 'vpcInstances', fn: () => getVpcInstances(client, regions) },
      { name: 'vpcBareMetalServers', fn: () => getVpcBareMetalServers(client, regions) },
      { name: 'vpcDedicatedHosts', fn: () => getVpcDedicatedHosts(client, regions) },
      { name: 'vpcPlacementGroups', fn: () => getVpcPlacementGroups(client, regions) },
      { name: 'vpcSubnets', fn: () => getVpcSubnets(client, regions) },
      { name: 'vpcSecurityGroups', fn: () => getVpcSecurityGroups(client, regions) },
      { name: 'vpcFloatingIps', fn: () => getVpcFloatingIps(client, regions) },
      { name: 'vpcPublicGateways', fn: () => getVpcPublicGateways(client, regions) },
      { name: 'vpcNetworkAcls', fn: () => getVpcNetworkAcls(client, regions) },
      { name: 'vpcLoadBalancers', fn: () => getVpcLoadBalancers(client, regions) },
      { name: 'vpcVpnGateways', fn: () => getVpcVpnGateways(client, regions) },
      { name: 'vpcEndpointGateways', fn: () => getVpcEndpointGateways(client, regions) },
      { name: 'vpcVolumes', fn: () => getVpcVolumes(client, regions) },
      { name: 'vpcSshKeys', fn: () => getVpcSshKeys(client, regions) },
      { name: 'vpcImages', fn: () => getVpcImages(client, regions) },
      { name: 'vpcFlowLogCollectors', fn: () => getVpcFlowLogCollectors(client, regions) },
      { name: 'transitGatewayConnections', fn: () => getTransitGatewayConnections(client, tgRef) },
      { name: 'tgwRoutePrefixes', fn: () => getTransitGatewayRouteReports(client, tgRef, (msg) => {
        sendSSE(res, 'progress', {
          phase: 'VPC Collection',
          resource: 'tgwRoutePrefixes',
          status: msg,
          totalResources,
          completedResources,
        });
      }) },
      { name: 'directLinkVirtualConnections', fn: () => getDirectLinkVirtualConnections(client, dlRef) },
      { name: 'vpnGatewayConnections', fn: () => getVpnGatewayConnections(client, regions) },
    ];

    // Run all tasks with concurrency limit
    const taskFunctions = tasks.map((task) => async () => {
      if (abortSignal?.aborted) return undefined;

      sendSSE(res, 'progress', {
        phase: 'VPC Collection',
        resource: task.name,
        status: 'collecting',
        totalResources,
        completedResources,
      });

      try {
        const data = await task.fn();
        const count = data.length;
        completedResources++;

        sendSSE(res, 'progress', {
          phase: 'VPC Collection',
          resource: task.name,
          status: `collected ${count} items`,
          totalResources,
          completedResources,
        });

        sendSSE(res, 'data', {
          resourceKey: task.name,
          items: data,
          count,
        });

        return data;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        completedResources++;

        logger.error('VPC collection failed for resource', {
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
          phase: 'VPC Collection',
          resource: task.name,
          status: `error: ${error.message}`,
          totalResources,
          completedResources,
        });

        sendSSE(res, 'error', {
          resource: task.name,
          message: error.message,
        });

        return undefined;
      }
    });

    await runWithConcurrencyLimit(taskFunctions, MAX_CONCURRENCY);

    const durationMs = Date.now() - startTime;
    const collectionTimestamp = new Date().toISOString();

    sendSSE(res, 'complete', {
      collectionTimestamp,
      duration: durationMs,
      errors,
    });

    logger.info('VPC data collection complete', {
      durationMs,
      errorCount: errors.length,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Fatal VPC collection error', { message: error.message });
    sendSSE(res, 'error', {
      fatal: true,
      message: error.message,
    });
  }
}
