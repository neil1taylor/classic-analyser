import type { ReportParserResult, ReportTopologyEdge } from './types';
import type { ImportResult } from '@/services/import';
import type { AccountInfo } from '@/types/resources';
import { createLogger } from '@/utils/logger';

const log = createLogger('ReportMerger');

/**
 * A map that deduplicates resources by `id` (primary) or `hostname` (fallback).
 * When two items match, their fields are merged (later values win for non-empty fields).
 */
interface MergedResourceMap {
  upsert(item: Record<string, unknown>): void;
  values(): Record<string, unknown>[];
}

function createMergedResourceMap(): MergedResourceMap {
  // Primary index: id → item
  const byId = new Map<string | number, Record<string, unknown>>();
  // Secondary index: hostname → id (for matching items without id to items with id)
  const hostnameToId = new Map<string, string | number>();
  // Items with neither id nor matching hostname
  let anonymousCount = 0;

  function mergeInto(existing: Record<string, unknown>, incoming: Record<string, unknown>) {
    for (const [field, value] of Object.entries(incoming)) {
      if (value !== undefined && value !== null && value !== '') {
        existing[field] = value;
      }
    }
  }

  return {
    upsert(item: Record<string, unknown>) {
      // Normalize id to string for consistent Map key comparison
      // (CSV parser produces numbers, XLSX parser produces strings)
      const rawId = item.id;
      const id = (rawId !== undefined && rawId !== null && rawId !== '')
        ? String(rawId)
        : undefined;
      if (id !== undefined) item.id = id;
      const hostname = (item.hostname as string) || '';

      // Try to find an existing entry to merge into
      let existingKey: string | number | undefined;

      if (id !== undefined && id !== null && id !== '') {
        if (byId.has(id)) {
          existingKey = id;
        }
      }

      // Fallback: match by hostname if no id match
      if (existingKey === undefined && hostname) {
        const mappedId = hostnameToId.get(hostname);
        if (mappedId !== undefined && byId.has(mappedId)) {
          existingKey = mappedId;
        }
      }

      if (existingKey !== undefined) {
        // Merge into existing
        mergeInto(byId.get(existingKey)!, item);
      } else {
        // New entry
        const key = (id !== undefined && id !== null && id !== '')
          ? id
          : `_anon_${anonymousCount++}`;
        byId.set(key, { ...item });

        // Index hostname for future lookups
        if (hostname) {
          hostnameToId.set(hostname, key);
        }
      }

      // Always update hostname→id mapping when we have both
      if (id !== undefined && id !== null && id !== '' && hostname) {
        hostnameToId.set(hostname, id);
      }
    },

    values(): Record<string, unknown>[] {
      return Array.from(byId.values());
    },
  };
}

/**
 * Merge results from all parsers into a single ImportResult.
 *
 * Priority order (later wins on field conflicts):
 *   overview_html < summary_html < warnings_csv/html < nas_csv, securitygroups_csv, gateway_csv < drawio < inventory_html
 *
 * Deduplication uses `id` as primary key, with `hostname` as fallback
 * (assessment XLSX has hostnames but no IDs).
 */
export function mergeReportData(
  results: ReportParserResult[],
  filename: string
): ImportResult {
  const mergedData: Record<string, MergedResourceMap> = {};
  const mergedAccountInfo: Partial<AccountInfo> = {};
  const allTopology: ReportTopologyEdge[] = [];

  for (const result of results) {
    // Merge data
    for (const [key, items] of Object.entries(result.data)) {
      if (!mergedData[key]) {
        mergedData[key] = createMergedResourceMap();
      }

      const map = mergedData[key];
      for (const item of items as Record<string, unknown>[]) {
        map.upsert(item);
      }
    }

    // Merge account info (first non-null value for each field)
    if (result.accountInfo) {
      for (const [key, value] of Object.entries(result.accountInfo)) {
        if (value !== undefined && value !== null) {
          if (!(key in mergedAccountInfo) || (mergedAccountInfo as Record<string, unknown>)[key] === undefined) {
            (mergedAccountInfo as Record<string, unknown>)[key] = value;
          }
        }
      }
    }

    // Collect topology
    if (result.topology) {
      allTopology.push(...result.topology);
    }
  }

  // Convert maps back to arrays
  const data: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};
  const worksheets: string[] = [];

  for (const [key, map] of Object.entries(mergedData)) {
    const items = map.values();
    if (items.length > 0) {
      data[key] = items;
      rowCounts[key] = items.length;
      worksheets.push(key);
    }
  }

  // Store topology as a special data key if present
  if (allTopology.length > 0) {
    data._topology = allTopology as unknown as unknown[];
  }

  log.info(`Merged report data: ${worksheets.length} resource types, ${Object.values(rowCounts).reduce((a, b) => a + b, 0)} total records`);

  return {
    data,
    worksheets,
    rowCounts,
    filename,
    accountInfo: Object.keys(mergedAccountInfo).length > 0 ? mergedAccountInfo : undefined,
  };
}
