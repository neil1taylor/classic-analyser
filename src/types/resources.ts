import classicResourceTypesData from '../data/classicResourceTypes.json';

export type ResourceCategory = 'Compute' | 'Network' | 'Storage' | 'Security' | 'DNS' | 'VMware' | 'Other';

export type ColumnDataType = 'string' | 'number' | 'boolean' | 'date' | 'currency' | 'array' | 'bytes';

export interface ColumnDefinition {
  field: string;
  header: string;
  dataType: ColumnDataType;
  defaultVisible: boolean;
  sortable: boolean;
}

export interface ResourceType {
  key: string;
  label: string;
  category: ResourceCategory;
  worksheetName: string;
  columns: ColumnDefinition[];
}

export interface AccountInfo {
  id: number;
  companyName: string;
  email: string;
  firstName: string;
  lastName: string;
  ibmCloudAccountId?: string;
  ibmCloudAccountName?: string;
}

export const RESOURCE_TYPES: ResourceType[] = classicResourceTypesData as ResourceType[];

export function getResourceType(key: string): ResourceType | undefined {
  return RESOURCE_TYPES.find((rt) => rt.key === key);
}

export function getResourcesByCategory(category: ResourceCategory): ResourceType[] {
  return RESOURCE_TYPES.filter((rt) => rt.category === category);
}

export const CATEGORIES: ResourceCategory[] = ['Compute', 'Network', 'Storage', 'Security', 'DNS', 'VMware', 'Other'];
