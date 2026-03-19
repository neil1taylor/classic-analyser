import type { ColumnDefinition } from './resources';
import powerVsResourceTypesData from '../data/powerVsResourceTypes.json';

export type PowerVsResourceCategory = 'PowerVS Compute' | 'PowerVS Network' | 'PowerVS Storage' | 'PowerVS Security' | 'PowerVS Other';

export interface PowerVsResourceType {
  key: string;
  label: string;
  category: PowerVsResourceCategory;
  worksheetName: string;
  columns: ColumnDefinition[];
}

export const POWERVS_RESOURCE_TYPES: PowerVsResourceType[] = powerVsResourceTypesData as PowerVsResourceType[];

export const POWERVS_CATEGORIES: PowerVsResourceCategory[] = [
  'PowerVS Compute',
  'PowerVS Network',
  'PowerVS Storage',
  'PowerVS Security',
  'PowerVS Other',
];

export function getPowerVsResourceType(key: string): PowerVsResourceType | undefined {
  return POWERVS_RESOURCE_TYPES.find((rt) => rt.key === key);
}

export function getPowerVsResourcesByCategory(category: PowerVsResourceCategory): PowerVsResourceType[] {
  return POWERVS_RESOURCE_TYPES.filter((rt) => rt.category === category);
}
