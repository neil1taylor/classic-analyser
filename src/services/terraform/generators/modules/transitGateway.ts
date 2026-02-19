export function generateTransitGatewayMain(): string {
  return `resource "ibm_tg_gateway" "tgw" {
  name           = var.tgw_name
  location       = var.tgw_location
  global         = true
  resource_group = var.resource_group_id
  tags           = var.tags
}

# --------------------------------------------------------------------------
# VPC connections — one per region
# --------------------------------------------------------------------------

resource "ibm_tg_connection" "vpc" {
  for_each     = var.vpc_connections
  gateway      = ibm_tg_gateway.tgw.id
  network_type = "vpc"
  name         = each.value.name
  network_id   = each.value.vpc_crn
}

# --------------------------------------------------------------------------
# Classic infrastructure connection
# --------------------------------------------------------------------------

resource "ibm_tg_connection" "classic" {
  gateway      = ibm_tg_gateway.tgw.id
  network_type = "classic"
  name         = "\${var.tgw_name}-classic"
}

# --------------------------------------------------------------------------
# Prefix filters on Classic connection
# PERMIT only migration subnet CIDRs, DENY everything else
# --------------------------------------------------------------------------

resource "ibm_tg_connection_prefix_filter" "permit_migration" {
  count         = length(var.migration_subnet_cidrs)
  gateway       = ibm_tg_gateway.tgw.id
  connection_id = ibm_tg_connection.classic.connection_id
  action        = "permit"
  prefix        = var.migration_subnet_cidrs[count.index]
  le            = 32
  ge            = 24
}

resource "ibm_tg_connection_prefix_filter" "deny_all" {
  gateway       = ibm_tg_gateway.tgw.id
  connection_id = ibm_tg_connection.classic.connection_id
  action        = "deny"
  prefix        = "0.0.0.0/0"
  le            = 32
  depends_on    = [ibm_tg_connection_prefix_filter.permit_migration]
}
`;
}

export function generateTransitGatewayVariables(): string {
  return `variable "tgw_name" {
  description = "Name for the Transit Gateway"
  type        = string
}

variable "tgw_location" {
  description = "Location (region) for the Transit Gateway"
  type        = string
}

variable "resource_group_id" {
  description = "Resource group ID"
  type        = string
}

variable "vpc_connections" {
  description = "Map of VPC connections (region key => {vpc_crn, name})"
  type = map(object({
    vpc_crn = string
    name    = string
  }))
}

variable "migration_subnet_cidrs" {
  description = "List of migration subnet CIDRs to permit through Classic connection"
  type        = list(string)
}

variable "tags" {
  description = "Tags to apply"
  type        = list(string)
  default     = []
}
`;
}

export function generateTransitGatewayOutputs(): string {
  return `output "tgw_id" {
  description = "ID of the Transit Gateway"
  value       = ibm_tg_gateway.tgw.id
}

output "tgw_crn" {
  description = "CRN of the Transit Gateway"
  value       = ibm_tg_gateway.tgw.crn
}

output "vpc_connection_ids" {
  description = "Map of region to VPC connection ID"
  value       = { for k, v in ibm_tg_connection.vpc : k => v.connection_id }
}

output "classic_connection_id" {
  description = "ID of the Classic infrastructure connection"
  value       = ibm_tg_connection.classic.connection_id
}
`;
}

export function generateTransitGatewayVersionsTf(): string {
  return `terraform {
  required_providers {
    ibm = {
      source  = "IBM-Cloud/ibm"
      version = ">= 1.71.0"
    }
  }
}
`;
}
