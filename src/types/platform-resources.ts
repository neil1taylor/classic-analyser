import type { ColumnDefinition } from './resources';
import platformResourceTypesData from '../data/platformResourceTypes.json';

export type PlatformResourceCategory = 'Platform Services';

export interface PlatformResourceType {
  key: string;
  label: string;
  category: PlatformResourceCategory;
  worksheetName: string;
  columns: ColumnDefinition[];
}

export const PLATFORM_RESOURCE_TYPES: PlatformResourceType[] = platformResourceTypesData as PlatformResourceType[];

export const PLATFORM_CATEGORIES: PlatformResourceCategory[] = [
  'Platform Services',
];

export function getPlatformResourceType(key: string): PlatformResourceType | undefined {
  return PLATFORM_RESOURCE_TYPES.find((rt) => rt.key === key);
}

export function getPlatformResourcesByCategory(category: PlatformResourceCategory): PlatformResourceType[] {
  return PLATFORM_RESOURCE_TYPES.filter((rt) => rt.category === category);
}
