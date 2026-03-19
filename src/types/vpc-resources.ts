import type { ColumnDefinition } from './resources';
import vpcResourceTypesData from '../data/vpcResourceTypes.json';

export type VpcResourceCategory = 'VPC Compute' | 'VPC Network' | 'VPC Storage' | 'VPC Security' | 'VPC Other';

export interface VpcResourceType {
  key: string;
  label: string;
  category: VpcResourceCategory;
  worksheetName: string;
  columns: ColumnDefinition[];
}

export const VPC_RESOURCE_TYPES: VpcResourceType[] = vpcResourceTypesData as VpcResourceType[];

export const VPC_CATEGORIES: VpcResourceCategory[] = [
  'VPC Compute',
  'VPC Network',
  'VPC Storage',
  'VPC Security',
  'VPC Other',
];

export function getVpcResourceType(key: string): VpcResourceType | undefined {
  return VPC_RESOURCE_TYPES.find((rt) => rt.key === key);
}

export function getVpcResourcesByCategory(category: VpcResourceCategory): VpcResourceType[] {
  return VPC_RESOURCE_TYPES.filter((rt) => rt.category === category);
}
