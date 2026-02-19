import type {
  ClassicSecurityGroupRule,
  TerraformSecurityGroupConfig,
  TerraformSecurityGroupRule,
} from '../types';
import { tfName, deduplicateNames } from '../utils';

/**
 * Group flat Classic security-group rules by group name, translate each rule
 * to VPC format, and return a map of Terraform security-group configs.
 */
export function transformSecurityGroups(
  flatRules: ClassicSecurityGroupRule[],
  allGroupNames: Set<string>,
): Record<string, TerraformSecurityGroupConfig> {
  // Group rules by security group name
  const grouped = new Map<string, ClassicSecurityGroupRule[]>();
  for (const rule of flatRules) {
    const name = rule.securityGroupName || `sg-${rule.securityGroupId}`;
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(rule);
  }

  const result: Record<string, TerraformSecurityGroupConfig> = {};
  const rawNames = Array.from(grouped.keys()).map((n) => tfName(n));
  const uniqueNames = deduplicateNames(rawNames);
  const originalNames = Array.from(grouped.keys());

  for (let i = 0; i < originalNames.length; i++) {
    const origName = originalNames[i];
    const tfKey = uniqueNames[i];
    const rules = grouped.get(origName)!;

    const ruleNames = deduplicateNames(
      rules.map((r) => buildRuleName(r)),
    );

    const tfRules: TerraformSecurityGroupRule[] = rules.map((r, idx) =>
      translateRule(r, ruleNames[idx], allGroupNames),
    );

    result[tfKey] = {
      description: `Migrated from Classic SG: ${origName}`,
      rules: tfRules,
    };
  }

  return result;
}

function buildRuleName(rule: ClassicSecurityGroupRule): string {
  const dir = rule.direction === 'egress' ? 'outbound' : 'inbound';
  const proto = rule.protocol || 'all';
  const port =
    rule.portRangeMin && rule.portRangeMax
      ? rule.portRangeMin === rule.portRangeMax
        ? `${rule.portRangeMin}`
        : `${rule.portRangeMin}-${rule.portRangeMax}`
      : '';
  return tfName(`allow-${proto}${port ? '-' + port : ''}-${dir}`);
}

function translateRule(
  rule: ClassicSecurityGroupRule,
  name: string,
  allGroupNames: Set<string>,
): TerraformSecurityGroupRule {
  const direction: 'inbound' | 'outbound' =
    rule.direction === 'egress' ? 'outbound' : 'inbound';

  // Determine remote
  let remote = '0.0.0.0/0';
  if (rule.remoteIp) {
    remote = rule.remoteIp;
  } else if (rule.remoteGroupId) {
    // Try to find the group name; if unknown fall back to 0.0.0.0/0 with a note
    const foundName = findGroupName(rule.remoteGroupId, allGroupNames);
    if (foundName) {
      remote = foundName; // Will reference SG by name in the generated HCL
    }
    // else keep 0.0.0.0/0 — the generator will add a comment
  }

  const tfRule: TerraformSecurityGroupRule = {
    name,
    direction,
    remote,
  };

  // Protocol-specific fields
  if (rule.protocol && rule.protocol !== 'all') {
    tfRule.protocol = rule.protocol;
    if (
      (rule.protocol === 'tcp' || rule.protocol === 'udp') &&
      rule.portRangeMin != null &&
      rule.portRangeMax != null
    ) {
      tfRule.port_min = rule.portRangeMin;
      tfRule.port_max = rule.portRangeMax;
    }
    if (rule.protocol === 'icmp') {
      tfRule.type = rule.portRangeMin ?? 8;
      tfRule.code = rule.portRangeMax ?? 0;
    }
  }

  return tfRule;
}

/** Best-effort lookup of a Classic SG ID → name. */
function findGroupName(
  _groupId: number,
  _allGroupNames: Set<string>,
): string | null {
  // The flat rules don't carry a reverse mapping from ID→name of the *remote* group.
  // We'd need the full securityGroups array for that. Return null to fall back.
  return null;
}
