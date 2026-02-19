import type { AIInsightsResponse } from '@/types/ai';
import type { MigrationAnalysisOutput } from '@/types/migration';
import { proxyPost } from './aiProxyClient';
import { buildInsightsInput } from './contextBuilders';
import { hashKey, cacheGet, cacheSet } from './cache';

export async function fetchInsights(
  analysisResult: MigrationAnalysisOutput,
): Promise<AIInsightsResponse> {
  const input = buildInsightsInput(analysisResult);
  const key = `insights:${hashKey(input)}`;

  const cached = cacheGet<AIInsightsResponse>(key);
  if (cached) return cached;

  const response = await proxyPost<AIInsightsResponse>('/insights', {
    analysisData: input,
  });

  cacheSet(key, response);
  return response;
}
