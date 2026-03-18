import type { Response } from 'express';
import { PowerVsClient } from './client.js';
import { discoverPowerVsWorkspaces } from './workspaces.js';
import * as resources from './resources.js';
import { VpcClient } from '../vpc/client.js';
import { getTransitGateways, getTransitGatewayConnections } from '../vpc/resources.js';
import logger from '../../utils/logger.js';
import { runWithConcurrencyLimit } from '../../utils/concurrency.js';
import type { PowerVsCollectionError, PowerVsWorkspace, PvsNetwork } from './types.js';

const MAX_CONCURRENCY = 10;
const TOTAL_RESOURCE_TYPES = 24;

function sendSSE(res: Response, event: string, data: unknown): void {
  if (!res.writableEnded) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

interface CollectorTask {
  name: string;
  fn: () => Promise<unknown[]>;
}

export async function collectAllPowerVsData(
  auth: { apiKey?: string; iamToken?: string },
  res: Response,
  abortSignal: { aborted: boolean },
): Promise<void> {
  const startTime = Date.now();
  const client = auth.iamToken
    ? PowerVsClient.fromIamToken(auth.iamToken)
    : new PowerVsClient(auth.apiKey!);
  const errors: PowerVsCollectionError[] = [];
  let completedResources = 0;

  try {
    // ── Phase 0: Authentication ─────────────────────────────────────
    sendSSE(res, 'progress', {
      completed: completedResources,
      total: TOTAL_RESOURCE_TYPES,
      currentResource: 'iam-token',
    });

    await client.exchangeToken();

    // Send metadata with user account ID
    const userAccountId = client.getAccountId();
    if (userAccountId) {
      sendSSE(res, 'metadata', { userAccountId });
    }

    if (abortSignal.aborted) return;

    // ── Workspace Discovery ─────────────────────────────────────────
    sendSSE(res, 'progress', {
      completed: completedResources,
      total: TOTAL_RESOURCE_TYPES,
      currentResource: 'pvsWorkspaces',
    });

    const workspaces = await discoverPowerVsWorkspaces(client);

    logger.info('PowerVS workspace discovery complete', {
      workspaceCount: workspaces.length,
    });

    // Send workspace data as the first resource
    const workspaceItems = workspaces.map((ws: PowerVsWorkspace) => ({
      id: ws.id,
      guid: ws.guid,
      crn: ws.crn,
      name: ws.name,
      state: ws.state,
      region_id: ws.region_id,
      resource_group_id: ws.resource_group_id,
      created_at: ws.created_at,
      updated_at: ws.updated_at,
      _zone: ws._zone,
      _apiRegion: ws._apiRegion,
      _cloudInstanceId: ws._cloudInstanceId,
    }));

    completedResources++;
    sendSSE(res, 'data', {
      resourceKey: 'pvsWorkspaces',
      items: workspaceItems,
    });
    sendSSE(res, 'progress', {
      completed: completedResources,
      total: TOTAL_RESOURCE_TYPES,
      currentResource: 'pvsWorkspaces',
    });

    if (abortSignal.aborted) return;

    // ── Phase 1: Dependencies (Networks) ────────────────────────────
    let collectedNetworks: (PvsNetwork & { _workspace: string; _workspaceId: string; _zone: string })[] = [];

    try {
      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: 'pvsNetworks',
      });

      collectedNetworks = await resources.getPvsNetworks(client, workspaces);
      completedResources++;

      sendSSE(res, 'data', {
        resourceKey: 'pvsNetworks',
        items: collectedNetworks,
      });
      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: 'pvsNetworks',
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      completedResources++;

      logger.error('PowerVS collection failed for resource', {
        resource: 'pvsNetworks',
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: 'pvsNetworks',
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'error', {
        resourceType: 'pvsNetworks',
        message: error.message,
      });
    }

    if (abortSignal.aborted) return;

    // ── Phase 2: Dependent (Network Ports) ──────────────────────────
    try {
      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: 'pvsNetworkPorts',
      });

      const collectedNetworkPorts = await resources.getPvsNetworkPorts(
        client,
        workspaces,
        collectedNetworks,
      );
      completedResources++;

      sendSSE(res, 'data', {
        resourceKey: 'pvsNetworkPorts',
        items: collectedNetworkPorts,
      });
      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: 'pvsNetworkPorts',
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      completedResources++;

      logger.error('PowerVS collection failed for resource', {
        resource: 'pvsNetworkPorts',
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: 'pvsNetworkPorts',
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'error', {
        resourceType: 'pvsNetworkPorts',
        message: error.message,
      });
    }

    if (abortSignal.aborted) return;

    // ── Phase 3: Transit Gateways (global, via VPC API) ─────────────
    // TGWs connect to PowerVS workspaces; collect them so the topology
    // diagram can show the TGW → Connection → Workspace hierarchy.
    const vpcClient = auth.iamToken
      ? VpcClient.fromIamToken(auth.iamToken)
      : new VpcClient(auth.apiKey!);
    let collectedTransitGateways: Awaited<ReturnType<typeof getTransitGateways>> = [];

    try {
      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: 'transitGateways',
      });

      collectedTransitGateways = await getTransitGateways(vpcClient);
      completedResources++;

      sendSSE(res, 'data', {
        resourceKey: 'transitGateways',
        items: collectedTransitGateways,
      });
      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: 'transitGateways',
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      completedResources++;

      logger.warn('Transit Gateways collection failed (PowerVS aggregator)', {
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: 'transitGateways',
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'error', {
        resourceType: 'transitGateways',
        message: error.message,
      });
    }

    if (abortSignal.aborted) return;

    try {
      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: 'transitGatewayConnections',
      });

      const collectedTgConns = await getTransitGatewayConnections(
        vpcClient,
        collectedTransitGateways,
      );
      completedResources++;

      sendSSE(res, 'data', {
        resourceKey: 'transitGatewayConnections',
        items: collectedTgConns,
      });
      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: 'transitGatewayConnections',
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      completedResources++;

      logger.warn('Transit Gateway Connections collection failed (PowerVS aggregator)', {
        message: error.message,
        statusCode: error.statusCode,
      });

      errors.push({
        resourceType: 'transitGatewayConnections',
        message: error.message,
        statusCode: error.statusCode,
      });

      sendSSE(res, 'error', {
        resourceType: 'transitGatewayConnections',
        message: error.message,
      });
    }

    if (abortSignal.aborted) return;

    // ── Phase 4: All Remaining Resources (Concurrent) ───────────────
    const tasks: CollectorTask[] = [
      { name: 'pvsInstances', fn: () => resources.getPvsInstances(client, workspaces) },
      { name: 'pvsVolumes', fn: () => resources.getPvsVolumes(client, workspaces) },
      { name: 'pvsSshKeys', fn: () => resources.getPvsSshKeys(client, workspaces) },
      { name: 'pvsImages', fn: () => resources.getPvsImages(client, workspaces) },
      { name: 'pvsStockImages', fn: () => resources.getPvsStockImages(client, workspaces) },
      { name: 'pvsSnapshots', fn: () => resources.getPvsSnapshots(client, workspaces) },
      { name: 'pvsPlacementGroups', fn: () => resources.getPvsPlacementGroups(client, workspaces) },
      { name: 'pvsCloudConnections', fn: () => resources.getPvsCloudConnections(client, workspaces) },
      { name: 'pvsDhcpServers', fn: () => resources.getPvsDhcpServers(client, workspaces) },
      { name: 'pvsVpnConnections', fn: () => resources.getPvsVpnConnections(client, workspaces) },
      { name: 'pvsIkePolicies', fn: () => resources.getPvsIkePolicies(client, workspaces) },
      { name: 'pvsIpsecPolicies', fn: () => resources.getPvsIpsecPolicies(client, workspaces) },
      { name: 'pvsSharedProcessorPools', fn: () => resources.getPvsSharedProcessorPools(client, workspaces) },
      { name: 'pvsVolumeGroups', fn: () => resources.getPvsVolumeGroups(client, workspaces) },
      { name: 'pvsNetworkSecurityGroups', fn: () => resources.getPvsNetworkSecurityGroups(client, workspaces) },
      { name: 'pvsHostGroups', fn: () => resources.getPvsHostGroups(client, workspaces) },
      { name: 'pvsSystemPools', fn: () => resources.getPvsSystemPools(client, workspaces) },
      { name: 'pvsSapProfiles', fn: () => resources.getPvsSapProfiles(client, workspaces) },
      { name: 'pvsEvents', fn: () => resources.getPvsEvents(client, workspaces) },
    ];

    const taskFunctions = tasks.map((task) => async () => {
      if (abortSignal.aborted) return undefined;

      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: task.name,
      });

      try {
        const data = await task.fn();
        completedResources++;

        sendSSE(res, 'data', {
          resourceKey: task.name,
          items: data,
        });
        sendSSE(res, 'progress', {
          completed: completedResources,
          total: TOTAL_RESOURCE_TYPES,
          currentResource: task.name,
        });

        return data;
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        completedResources++;

        logger.error('PowerVS collection failed for resource', {
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
          completed: completedResources,
          total: TOTAL_RESOURCE_TYPES,
          currentResource: task.name,
        });

        sendSSE(res, 'error', {
          resourceType: task.name,
          message: error.message,
        });

        return undefined;
      }
    });

    await runWithConcurrencyLimit(taskFunctions, MAX_CONCURRENCY);

    // ── Complete ────────────────────────────────────────────────────
    const durationMs = Date.now() - startTime;

    sendSSE(res, 'complete', {
      duration: durationMs,
      errors,
    });

    logger.info('PowerVS data collection complete', {
      durationMs,
      workspaceCount: workspaces.length,
      errorCount: errors.length,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Fatal PowerVS collection error', { message: error.message });

    sendSSE(res, 'error', {
      fatal: true,
      message: error.message,
    });
  }

  if (!res.writableEnded) {
    res.end();
  }
}
