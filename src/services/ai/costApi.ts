import type { AICostOptimizationResponse } from '@/types/ai';
import type { CostAnalysis } from '@/types/migration';
import { proxyPost } from './aiProxyClient';
import { buildCostInput } from './contextBuilders';
import { hashKey, cacheGet, cacheSet } from './cache';

export async function fetchCostOptimization(
  costData: CostAnalysis,
): Promise<AICostOptimizationResponse> {
  const input = buildCostInput(costData);
  const key = `cost:${hashKey(input)}`;

  const cached = cacheGet<AICostOptimizationResponse>(key);
  if (cached) return cached;

  const response = await proxyPost<AICostOptimizationResponse>('/cost-optimization', {
    costData: input,
  });

  cacheSet(key, response);
  return response;
}
