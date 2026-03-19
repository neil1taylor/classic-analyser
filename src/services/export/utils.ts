/**
 * Shared utilities for export services.
 */
import { RESOURCE_TYPES } from '@/types/resources';
import { VPC_RESOURCE_TYPES } from '@/types/vpc-resources';
import { POWERVS_RESOURCE_TYPES } from '@/types/powervs-resources';
import type { ExportData, InfrastructureDomain, ResourceTypeMeta } from './types';

export function getResourceTypesForDomain(domain: InfrastructureDomain): ResourceTypeMeta[] {
  switch (domain) {
    case 'classic':
      return RESOURCE_TYPES;
    case 'vpc':
      return VPC_RESOURCE_TYPES;
    case 'powervs':
      return POWERVS_RESOURCE_TYPES;
  }
}

export function getDomainLabel(domain: InfrastructureDomain): string {
  switch (domain) {
    case 'classic':
      return 'Classic Infrastructure';
    case 'vpc':
      return 'VPC Infrastructure';
    case 'powervs':
      return 'PowerVS Infrastructure';
  }
}

/**
 * Build summary rows (resource type label + count) for items that have data.
 */
export function buildSummaryRows(
  exportData: ExportData,
): Array<{ key: string; label: string; count: number; category: string }> {
  const resourceTypes = getResourceTypesForDomain(exportData.domain);
  const rows: Array<{ key: string; label: string; count: number; category: string }> = [];

  for (const rt of resourceTypes) {
    const items = exportData.data[rt.key];
    if (items && items.length > 0) {
      rows.push({
        key: rt.key,
        label: rt.label,
        count: items.length,
        category: rt.category,
      });
    }
  }

  return rows;
}

/**
 * Format a cell value for text-based exports (PDF, DOCX, PPTX).
 */
export function formatCellValue(value: unknown, dataType: string): string {
  if (value == null) return '';

  switch (dataType) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date':
      if (typeof value === 'string' || typeof value === 'number') {
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return String(value);
        }
      }
      return String(value);
    case 'currency':
      if (typeof value === 'number') {
        return `$${value.toFixed(2)}`;
      }
      return String(value);
    case 'bytes':
      if (typeof value === 'number') {
        if (value >= 1073741824) return `${(value / 1073741824).toFixed(1)} GB`;
        if (value >= 1048576) return `${(value / 1048576).toFixed(1)} MB`;
        if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${value} B`;
      }
      return String(value);
    case 'array':
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    default:
      return String(value);
  }
}
