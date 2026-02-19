export interface TerraformSubnetConfig {
  zone: string;
  cidr: string;
}

export interface TerraformSecurityGroupRule {
  name: string;
  direction: 'inbound' | 'outbound';
  remote: string;
  protocol?: string;
  port_min?: number;
  port_max?: number;
  type?: number;
  code?: number;
}

export interface TerraformSecurityGroupConfig {
  description: string;
  rules: TerraformSecurityGroupRule[];
}

export interface TerraformExportInput {
  region: string;
  vpcName: string;
  resourceGroupName: string;
  subnets: Record<string, TerraformSubnetConfig>;
  securityGroups: Record<string, TerraformSecurityGroupConfig>;
}

/** Raw Classic security group rule as stored in collectedData['securityGroupRules'] */
export interface ClassicSecurityGroupRule {
  securityGroupId: number;
  securityGroupName: string;
  id?: number;
  direction?: string;
  protocol?: string;
  portRangeMin?: number;
  portRangeMax?: number;
  remoteIp?: string;
  remoteGroupId?: number;
}

/** Subnet recommendation from analysisResult.networkAssessment.vlanAnalysis */
export interface ClassicSubnetRecommendation {
  classicVlanId: number;
  classicVlanNumber: number;
  classicVlanName: string;
  networkSpace: string;
  datacenter: string;
  vpcSubnetCIDR: string;
  vpcSubnetName: string;
  vpcZone: string;
}

/** Classic server record (Virtual Server or Bare Metal) for hostname→datacenter lookup */
export interface ClassicServerRecord {
  hostname?: string;
  fullyQualifiedDomainName?: string;
  datacenter?: { name?: string } | string;
  [key: string]: unknown;
}

/** Classic relationship entry from collectedData['relationships'] */
export interface ClassicRelationshipEntry {
  parentType: string;
  parentName: string;
  parentId?: number | string;
  childType: string;
  childName: string;
  childId?: number | string;
  [key: string]: unknown;
}

/** Per-region VPC configuration for multi-region Terraform export */
export interface TerraformRegionConfig {
  name: string;
  region: string;
  defaultSgName: string;
  defaultAclName: string;
  defaultRoutingTableName: string;
  migrationSubnetCidr: string;
  migrationSubnetZone: string;
  subnets: Record<string, TerraformSubnetConfig>;
  securityGroups: Record<string, TerraformSecurityGroupConfig>;
  aclName: string;
}

/** Multi-region input for Terraform generation */
export interface TerraformMultiRegionInput {
  resourceGroupName: string;
  regions: string[];
  vpcs: Record<string, TerraformRegionConfig>;
  tags: string[];
  /** Transit Gateway config — only present when 2+ regions */
  transitGateway?: {
    name: string;
    location: string;
  };
}
