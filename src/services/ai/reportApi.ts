import type { AIReportSectionType } from '@/types/ai';
import { proxyPost } from './aiProxyClient';
import { buildReportNarrativeInput } from './contextBuilders';
import { hashKey, cacheGet, cacheSet } from './cache';

interface NarrativeResponse {
  narrative: string;
}

export async function fetchReportNarrative(
  sectionType: AIReportSectionType,
  data: Record<string, unknown>,
): Promise<string> {
  const input = buildReportNarrativeInput(sectionType, data);
  const key = `narrative:${sectionType}:${hashKey(input)}`;

  const cached = cacheGet<string>(key);
  if (cached) return cached;

  const response = await proxyPost<NarrativeResponse>('/report-narratives', input);

  cacheSet(key, response.narrative);
  return response.narrative;
}
