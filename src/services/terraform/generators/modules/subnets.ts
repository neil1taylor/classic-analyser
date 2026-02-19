export function generateSubnetsMain(): string {
  return `resource "ibm_is_vpc_address_prefix" "prefix" {
  for_each = var.subnets

  name = "\${each.key}-prefix"
  vpc  = var.vpc_id
  zone = each.value.zone
  cidr = each.value.cidr
}

resource "ibm_is_subnet" "subnet" {
  for_each = var.subnets

  name            = each.key
  vpc             = var.vpc_id
  zone            = each.value.zone
  ipv4_cidr_block = each.value.cidr
  resource_group  = var.resource_group_id
  tags            = var.tags

  depends_on = [ibm_is_vpc_address_prefix.prefix]
}
`;
}

export function generateSubnetsVariables(): string {
  return `variable "vpc_id" {
  description = "VPC ID to create subnets in"
  type        = string
}

variable "resource_group_id" {
  description = "Resource group ID"
  type        = string
}

variable "subnets" {
  description = "Map of subnet configs"
  type = map(object({
    zone = string
    cidr = string
  }))
  default = {}
}

variable "tags" {
  description = "Tags to apply"
  type        = list(string)
  default     = []
}
`;
}

export function generateSubnetsOutputs(): string {
  return `output "subnet_ids" {
  description = "Map of subnet name to ID"
  value       = { for k, v in ibm_is_subnet.subnet : k => v.id }
}
`;
}

export function generateSubnetsVersionsTf(): string {
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
