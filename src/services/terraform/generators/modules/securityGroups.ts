export function generateSecurityGroupsMain(): string {
  return `resource "ibm_is_security_group" "sg" {
  for_each = var.security_groups

  name           = each.key
  vpc            = var.vpc_id
  resource_group = var.resource_group_id
  tags           = var.tags
}

locals {
  # Flatten security group rules for for_each
  sg_rules = flatten([
    for sg_key, sg in var.security_groups : [
      for rule in sg.rules : {
        sg_key    = sg_key
        name      = rule.name
        direction = rule.direction
        remote    = rule.remote
        protocol  = rule.protocol
        port_min  = rule.port_min
        port_max  = rule.port_max
        type      = rule.type
        code      = rule.code
      }
    ]
  ])

  sg_rules_map = {
    for rule in local.sg_rules : "\${rule.sg_key}-\${rule.name}" => rule
  }
}

resource "ibm_is_security_group_rule" "rule" {
  for_each = local.sg_rules_map

  group     = ibm_is_security_group.sg[each.value.sg_key].id
  direction = each.value.direction
  remote    = each.value.remote

  dynamic "tcp" {
    for_each = each.value.protocol == "tcp" ? [1] : []
    content {
      port_min = each.value.port_min
      port_max = each.value.port_max
    }
  }

  dynamic "udp" {
    for_each = each.value.protocol == "udp" ? [1] : []
    content {
      port_min = each.value.port_min
      port_max = each.value.port_max
    }
  }

  dynamic "icmp" {
    for_each = each.value.protocol == "icmp" ? [1] : []
    content {
      type = each.value.type
      code = each.value.code
    }
  }
}
`;
}

export function generateSecurityGroupsVariables(): string {
  return `variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "resource_group_id" {
  description = "Resource group ID"
  type        = string
}

variable "security_groups" {
  description = "Map of security group configs"
  type = map(object({
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
  default = {}
}

variable "tags" {
  description = "Tags to apply"
  type        = list(string)
  default     = []
}
`;
}

export function generateSecurityGroupsOutputs(): string {
  return `output "security_group_ids" {
  description = "Map of security group name to ID"
  value       = { for k, v in ibm_is_security_group.sg : k => v.id }
}
`;
}

export function generateSecurityGroupsVersionsTf(): string {
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
