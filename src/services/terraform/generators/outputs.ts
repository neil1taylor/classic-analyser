import type { TerraformMultiRegionInput } from '../types';
import { regionToSlug } from '../utils';

export function generateOutputsTf(input: TerraformMultiRegionInput): string {
  const lines: string[] = [];

  // vpc_ids map
  lines.push(`output "vpc_ids" {`);
  lines.push(`  description = "Map of region to VPC ID"`);
  lines.push(`  value = {`);
  for (const region of input.regions) {
    const slug = regionToSlug(region);
    lines.push(`    "${region}" = module.vpc_${slug}.vpc_id`);
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push('');

  // vpc_crns map
  lines.push(`output "vpc_crns" {`);
  lines.push(`  description = "Map of region to VPC CRN"`);
  lines.push(`  value = {`);
  for (const region of input.regions) {
    const slug = regionToSlug(region);
    lines.push(`    "${region}" = module.vpc_${slug}.vpc_crn`);
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push('');

  // subnet_ids map of maps
  lines.push(`output "subnet_ids" {`);
  lines.push(`  description = "Map of region to subnet ID map"`);
  lines.push(`  value = {`);
  for (const region of input.regions) {
    const slug = regionToSlug(region);
    lines.push(`    "${region}" = module.subnets_${slug}.subnet_ids`);
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push('');

  // security_group_ids map of maps
  lines.push(`output "security_group_ids" {`);
  lines.push(`  description = "Map of region to security group ID map"`);
  lines.push(`  value = {`);
  for (const region of input.regions) {
    const slug = regionToSlug(region);
    lines.push(`    "${region}" = module.security_groups_${slug}.security_group_ids`);
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push('');

  // network_acl_ids map
  lines.push(`output "network_acl_ids" {`);
  lines.push(`  description = "Map of region to network ACL ID"`);
  lines.push(`  value = {`);
  for (const region of input.regions) {
    const slug = regionToSlug(region);
    lines.push(`    "${region}" = module.network_acls_${slug}.network_acl_id`);
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push('');

  // migration_subnet_ids map
  lines.push(`output "migration_subnet_ids" {`);
  lines.push(`  description = "Map of region to migration subnet ID"`);
  lines.push(`  value = {`);
  for (const region of input.regions) {
    const slug = regionToSlug(region);
    lines.push(`    "${region}" = module.vpc_${slug}.migration_subnet_id`);
  }
  lines.push(`  }`);
  lines.push(`}`);

  // TGW output (conditional)
  if (input.transitGateway) {
    lines.push('');
    lines.push(`output "tgw_id" {`);
    lines.push(`  description = "ID of the Transit Gateway"`);
    lines.push(`  value       = module.transit_gateway.tgw_id`);
    lines.push(`}`);
    lines.push('');
    lines.push(`output "tgw_crn" {`);
    lines.push(`  description = "CRN of the Transit Gateway"`);
    lines.push(`  value       = module.transit_gateway.tgw_crn`);
    lines.push(`}`);
  }

  lines.push('');
  return lines.join('\n');
}
