import type { Response } from 'express';
import { VpcClient } from '../vpc/client.js';
import { getResourceGroups, getAllServiceInstances } from './resources.js';
import logger from '../../utils/logger.js';
import { sendSSE } from '../../utils/sse.js';
import type { PlatformCollectionError } from './types.js';

const TOTAL_RESOURCE_TYPES = 2; // resourceGroups + serviceInstances

export async function collectAllPlatformData(
  auth: { apiKey?: string; iamToken?: string },
  res: Response,
  abortSignal: { aborted: boolean },
): Promise<void> {
  const startTime = Date.now();
  const client = auth.iamToken
    ? VpcClient.fromIamToken(auth.iamToken)
    : new VpcClient(auth.apiKey!);
  const errors: PlatformCollectionError[] = [];
  let completedResources = 0;

  try {
    // ── Phase 0: Authentication ─────────────────────────────────────
    sendSSE(res, 'progress', {
      completed: completedResources,
      total: TOTAL_RESOURCE_TYPES,
      currentResource: 'iam-token',
    });

    await client.exchangeToken();

    if (abortSignal.aborted) return;

    // ── Phase 1: Resource Groups (needed for name resolution) ───────
    sendSSE(res, 'progress', {
      completed: completedResources,
      total: TOTAL_RESOURCE_TYPES,
      currentResource: 'resourceGroups',
    });

    let resourceGroupMap: Map<string, string> | undefined;
    try {
      const groups = await getResourceGroups(client);
      resourceGroupMap = new Map(groups.map((g) => [g.id, g.name]));
      completedResources++;

      sendSSE(res, 'data', {
        resourceKey: 'resourceGroups',
        items: groups,
        count: groups.length,
      });
    } catch (err) {
      const error = err as Error;
      completedResources++;
      errors.push({ resourceType: 'resourceGroups', message: error.message });
      logger.warn('Resource group collection failed', { message: error.message });
    }

    if (abortSignal.aborted) return;

    // ── Phase 2: Service Instances ──────────────────────────────────
    sendSSE(res, 'progress', {
      completed: completedResources,
      total: TOTAL_RESOURCE_TYPES,
      currentResource: 'serviceInstances',
    });

    try {
      const instances = await getAllServiceInstances(client, resourceGroupMap);
      completedResources++;

      sendSSE(res, 'data', {
        resourceKey: 'serviceInstances',
        items: instances,
        count: instances.length,
      });

      sendSSE(res, 'progress', {
        completed: completedResources,
        total: TOTAL_RESOURCE_TYPES,
        currentResource: 'serviceInstances',
      });
    } catch (err) {
      const error = err as Error;
      completedResources++;
      errors.push({ resourceType: 'serviceInstances', message: error.message });
      logger.error('Service instance collection failed', { message: error.message });
    }

    // ── Complete ────────────────────────────────────────────────────
    const durationMs = Date.now() - startTime;
    logger.info('Platform Services collection complete', {
      durationMs,
      errors: errors.length,
    });

    sendSSE(res, 'complete', {
      collectionTimestamp: new Date().toISOString(),
      duration: durationMs,
      errors,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Platform Services collection failed', { message: error.message });

    sendSSE(res, 'error', {
      fatal: true,
      message: error.message,
    });
  }
}
