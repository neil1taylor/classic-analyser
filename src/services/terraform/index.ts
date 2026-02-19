import JSZip from 'jszip';
import type {
  ClassicSecurityGroupRule,
  ClassicSubnetRecommendation,
  ClassicServerRecord,
  ClassicRelationshipEntry,
} from './types';
import { groupByRegion } from './transforms/regionGrouping';
import { generateVersionsTf } from './generators/versions';
import { generateProviderTf } from './generators/provider';
import { generateVariablesTf, generateTfvars } from './generators/variables';
import { generateMainTf } from './generators/main';
import { generateOutputsTf } from './generators/outputs';
import { generateReadme } from './generators/readme';
import { generateVpcMain, generateVpcVariables, generateVpcOutputs, generateVpcVersionsTf } from './generators/modules/vpc';
import { generateSubnetsMain, generateSubnetsVariables, generateSubnetsOutputs, generateSubnetsVersionsTf } from './generators/modules/subnets';
import { generateSecurityGroupsMain, generateSecurityGroupsVariables, generateSecurityGroupsOutputs, generateSecurityGroupsVersionsTf } from './generators/modules/securityGroups';
import { generateNetworkAclsMain, generateNetworkAclsVariables, generateNetworkAclsOutputs, generateNetworkAclsVersionsTf } from './generators/modules/networkAcls';
import {
  generateTransitGatewayMain,
  generateTransitGatewayVariables,
  generateTransitGatewayOutputs,
  generateTransitGatewayVersionsTf,
} from './generators/modules/transitGateway';

export interface GenerateTerraformOptions {
  /** Fallback VPC region when DC mapping is unavailable */
  region: string;
  /** Subnet recommendations from migration analysis */
  subnetRecommendations: ClassicSubnetRecommendation[];
  /** Flat security group rules from collectedData */
  securityGroupRules: ClassicSecurityGroupRule[];
  /** Relationship entries from collectedData['relationships'] */
  relationships?: ClassicRelationshipEntry[];
  /** Virtual servers from collectedData['virtualServers'] */
  virtualServers?: ClassicServerRecord[];
  /** Bare metal servers from collectedData['bareMetal'] */
  bareMetal?: ClassicServerRecord[];
  /** Optional VPC name prefix */
  vpcName?: string;
  /** Optional resource group name */
  resourceGroupName?: string;
}

/**
 * Generate a zip archive containing multi-region, module-based Terraform
 * configuration for migrating Classic subnets and security groups to VPC.
 *
 * Runs entirely in the browser — no backend calls needed.
 */
export async function generateTerraformZip(options: GenerateTerraformOptions): Promise<Blob> {
  const {
    region,
    subnetRecommendations,
    securityGroupRules,
    relationships = [],
    virtualServers = [],
    bareMetal = [],
    vpcName = 'migrated-vpc',
    resourceGroupName = 'Default',
  } = options;

  // Group all data by region
  const input = groupByRegion({
    subnetRecommendations,
    securityGroupRules,
    relationships,
    virtualServers,
    bareMetal,
    fallbackRegion: region,
    resourceGroupName,
    vpcNamePrefix: vpcName,
  });

  // Assemble zip
  const zip = new JSZip();
  const root = zip.folder('terraform-vpc-migration')!;

  // Root files
  root.file('README.md', generateReadme(input));
  root.file('main.tf', generateMainTf(input));
  root.file('variables.tf', generateVariablesTf(input));
  root.file('terraform.tfvars', generateTfvars(input));
  root.file('outputs.tf', generateOutputsTf(input));
  root.file('versions.tf', generateVersionsTf());
  root.file('provider.tf', generateProviderTf(input));

  // modules/vpc
  const vpcMod = root.folder('modules')!.folder('vpc')!;
  vpcMod.file('main.tf', generateVpcMain());
  vpcMod.file('variables.tf', generateVpcVariables());
  vpcMod.file('outputs.tf', generateVpcOutputs());
  vpcMod.file('versions.tf', generateVpcVersionsTf());

  // modules/subnets
  const subnetsMod = root.folder('modules')!.folder('subnets')!;
  subnetsMod.file('main.tf', generateSubnetsMain());
  subnetsMod.file('variables.tf', generateSubnetsVariables());
  subnetsMod.file('outputs.tf', generateSubnetsOutputs());
  subnetsMod.file('versions.tf', generateSubnetsVersionsTf());

  // modules/security_groups
  const sgMod = root.folder('modules')!.folder('security_groups')!;
  sgMod.file('main.tf', generateSecurityGroupsMain());
  sgMod.file('variables.tf', generateSecurityGroupsVariables());
  sgMod.file('outputs.tf', generateSecurityGroupsOutputs());
  sgMod.file('versions.tf', generateSecurityGroupsVersionsTf());

  // modules/network_acls
  const aclMod = root.folder('modules')!.folder('network_acls')!;
  aclMod.file('main.tf', generateNetworkAclsMain());
  aclMod.file('variables.tf', generateNetworkAclsVariables());
  aclMod.file('outputs.tf', generateNetworkAclsOutputs());
  aclMod.file('versions.tf', generateNetworkAclsVersionsTf());

  // modules/transit_gateway (only when 2+ regions)
  if (input.transitGateway) {
    const tgwMod = root.folder('modules')!.folder('transit_gateway')!;
    tgwMod.file('main.tf', generateTransitGatewayMain());
    tgwMod.file('variables.tf', generateTransitGatewayVariables());
    tgwMod.file('outputs.tf', generateTransitGatewayOutputs());
    tgwMod.file('versions.tf', generateTransitGatewayVersionsTf());
  }

  return zip.generateAsync({ type: 'blob' });
}
