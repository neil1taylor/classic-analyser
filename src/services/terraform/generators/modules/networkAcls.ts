export function generateNetworkAclsMain(): string {
  return `resource "ibm_is_network_acl" "default" {
  name           = var.acl_name
  vpc            = var.vpc_id
  resource_group = var.resource_group_id
  tags           = var.tags

  # Default allow-all rules — customise as needed for your security requirements

  rules {
    name        = "allow-all-inbound"
    action      = "allow"
    source      = "0.0.0.0/0"
    destination = "0.0.0.0/0"
    direction   = "inbound"
  }

  rules {
    name        = "allow-all-outbound"
    action      = "allow"
    source      = "0.0.0.0/0"
    destination = "0.0.0.0/0"
    direction   = "outbound"
  }
}
`;
}

export function generateNetworkAclsVariables(): string {
  return `variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "resource_group_id" {
  description = "Resource group ID"
  type        = string
}

variable "acl_name" {
  description = "Name for the network ACL"
  type        = string
}

variable "tags" {
  description = "Tags to apply"
  type        = list(string)
  default     = []
}
`;
}

export function generateNetworkAclsOutputs(): string {
  return `output "network_acl_id" {
  description = "ID of the network ACL"
  value       = ibm_is_network_acl.default.id
}
`;
}

export function generateNetworkAclsVersionsTf(): string {
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
