import type { TerraformMultiRegionInput } from '../types';
import { hclString } from '../utils';

export function generateVariablesTf(input: TerraformMultiRegionInput): string {
  const lines: string[] = [];

  lines.push(`variable "resource_group_name" {
  description = "IBM Cloud resource group name"
  type        = string
  default     = "Default"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = list(string)
  default     = []
}

variable "vpcs" {
  description = "Per-region VPC configurations"
  type = map(object({
    name                       = string
    default_sg_name            = string
    default_acl_name           = string
    default_routing_table_name = string
    migration_subnet_cidr      = string
    migration_subnet_zone      = string
    acl_name                   = string
    subnets = map(object({
      zone = string
      cidr = string
    }))
    security_groups = map(object({
      description = string
      rules = list(object({
        name      = string
        direction = string
        remote    = string
        protocol  = optional(string)
        port_min  = optional(number)
        port_max  = optional(number)
        type      = optional(number)
        code      = optional(number)
      }))
    }))
  }))
}`);

  // TGW variables only when transit gateway is present
  if (input.transitGateway) {
    lines.push('');
    lines.push(`variable "tgw_name" {
  description = "Name for the Transit Gateway"
  type        = string
}

variable "tgw_location" {
  description = "Location (region) for the Transit Gateway"
  type        = string
}`);
  }

  lines.push('');
  return lines.join('\n');
}

export function generateTfvars(input: TerraformMultiRegionInput): string {
  const lines: string[] = [];

  lines.push(`resource_group_name = ${hclString(input.resourceGroupName)}`);
  lines.push(`tags                = ["${input.tags.join('", "')}"]`);
  lines.push('');

  // TGW vars
  if (input.transitGateway) {
    lines.push(`tgw_name     = ${hclString(input.transitGateway.name)}`);
    lines.push(`tgw_location = ${hclString(input.transitGateway.location)}`);
    lines.push('');
  }

  // vpcs map
  lines.push('vpcs = {');
  for (const region of input.regions) {
    const vpc = input.vpcs[region];
    lines.push(`  ${hclString(region)} = {`);
    lines.push(`    name                       = ${hclString(vpc.name)}`);
    lines.push(`    default_sg_name            = ${hclString(vpc.defaultSgName)}`);
    lines.push(`    default_acl_name           = ${hclString(vpc.defaultAclName)}`);
    lines.push(`    default_routing_table_name = ${hclString(vpc.defaultRoutingTableName)}`);
    lines.push(`    migration_subnet_cidr      = ${hclString(vpc.migrationSubnetCidr)}`);
    lines.push(`    migration_subnet_zone      = ${hclString(vpc.migrationSubnetZone)}`);
    lines.push(`    acl_name                   = ${hclString(vpc.aclName)}`);
    lines.push('');

    // Subnets
    lines.push('    subnets = {');
    for (const [name, cfg] of Object.entries(vpc.subnets)) {
      lines.push(`      ${hclString(name)} = {`);
      lines.push(`        zone = ${hclString(cfg.zone)}`);
      lines.push(`        cidr = ${hclString(cfg.cidr)}`);
      lines.push('      }');
    }
    lines.push('    }');
    lines.push('');

    // Security groups
    lines.push('    security_groups = {');
    for (const [name, sg] of Object.entries(vpc.securityGroups)) {
      lines.push(`      ${hclString(name)} = {`);
      lines.push(`        description = ${hclString(sg.description)}`);
      lines.push('        rules = [');
      for (const rule of sg.rules) {
        lines.push('          {');
        lines.push(`            name      = ${hclString(rule.name)}`);
        lines.push(`            direction = ${hclString(rule.direction)}`);
        lines.push(`            remote    = ${hclString(rule.remote)}`);
        lines.push(`            protocol  = ${rule.protocol ? hclString(rule.protocol) : 'null'}`);
        lines.push(`            port_min  = ${rule.port_min != null ? rule.port_min : 'null'}`);
        lines.push(`            port_max  = ${rule.port_max != null ? rule.port_max : 'null'}`);
        lines.push(`            type      = ${rule.type != null ? rule.type : 'null'}`);
        lines.push(`            code      = ${rule.code != null ? rule.code : 'null'}`);
        lines.push('          },');
      }
      lines.push('        ]');
      lines.push('      }');
    }
    lines.push('    }');

    lines.push('  }');
  }
  lines.push('}');

  return lines.join('\n') + '\n';
}
