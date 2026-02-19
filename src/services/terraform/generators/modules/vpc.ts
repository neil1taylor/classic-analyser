export function generateVpcMain(): string {
  return `resource "ibm_is_vpc" "vpc" {
  name                      = var.vpc_name
  resource_group            = var.resource_group_id
  address_prefix_management = "manual"
  tags                      = var.tags

  # Explicitly name the auto-created default resources
  default_security_group_name = var.default_sg_name
  default_network_acl_name    = var.default_acl_name
  default_routing_table_name  = var.default_routing_table_name
}

# --------------------------------------------------------------------------
# Migration subnet — reachable from Classic via Transit Gateway
# --------------------------------------------------------------------------

resource "ibm_is_vpc_address_prefix" "migration" {
  name = "\${var.vpc_name}-migration-prefix"
  vpc  = ibm_is_vpc.vpc.id
  zone = var.migration_subnet_zone
  cidr = var.migration_subnet_cidr
}

resource "ibm_is_subnet" "migration" {
  name            = "\${var.vpc_name}-migration"
  vpc             = ibm_is_vpc.vpc.id
  zone            = var.migration_subnet_zone
  ipv4_cidr_block = var.migration_subnet_cidr
  resource_group  = var.resource_group_id
  tags            = var.tags

  depends_on = [ibm_is_vpc_address_prefix.migration]
}
`;
}

export function generateVpcVariables(): string {
  return `variable "vpc_name" {
  description = "Name for the VPC"
  type        = string
}

variable "resource_group_id" {
  description = "Resource group ID"
  type        = string
}

variable "default_sg_name" {
  description = "Name for the VPC default security group"
  type        = string
}

variable "default_acl_name" {
  description = "Name for the VPC default network ACL"
  type        = string
}

variable "default_routing_table_name" {
  description = "Name for the VPC default routing table"
  type        = string
}

variable "migration_subnet_cidr" {
  description = "CIDR block for the migration subnet (reachable from Classic via TGW)"
  type        = string
}

variable "migration_subnet_zone" {
  description = "Zone for the migration subnet"
  type        = string
}

variable "tags" {
  description = "Tags to apply"
  type        = list(string)
  default     = []
}
`;
}

export function generateVpcOutputs(): string {
  return `output "vpc_id" {
  description = "ID of the VPC"
  value       = ibm_is_vpc.vpc.id
}

output "vpc_crn" {
  description = "CRN of the VPC"
  value       = ibm_is_vpc.vpc.crn
}

output "default_security_group_id" {
  description = "ID of the VPC default security group"
  value       = ibm_is_vpc.vpc.default_security_group
}

output "default_network_acl_id" {
  description = "ID of the VPC default network ACL"
  value       = ibm_is_vpc.vpc.default_network_acl
}

output "default_routing_table_id" {
  description = "ID of the VPC default routing table"
  value       = ibm_is_vpc.vpc.default_routing_table
}

output "migration_subnet_id" {
  description = "ID of the migration subnet"
  value       = ibm_is_subnet.migration.id
}
`;
}

export function generateVpcVersionsTf(): string {
  return `terraform {
  required_providers {
    ibm = {
      source                = "IBM-Cloud/ibm"
      version               = ">= 1.71.0"
      configuration_aliases = [ibm]
    }
  }
}
`;
}
