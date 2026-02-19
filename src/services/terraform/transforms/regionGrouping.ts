import type {
  ClassicSubnetRecommendation,
  ClassicSecurityGroupRule,
  ClassicServerRecord,
  ClassicRelationshipEntry,
  TerraformMultiRegionInput,
  TerraformRegionConfig,
} from '../types';
import { transformSubnets } from './subnets';
import { transformSecurityGroups } from './securityRules';
import { mapDatacenterToVPC } from '@/services/migration/data/datacenterMapping';
import { tfName } from '../utils';

export interface RegionGroupingInput {
  subnetRecommendations: ClassicSubnetRecommendation[];
  securityGroupRules: ClassicSecurityGroupRule[];
  relationships: ClassicRelationshipEntry[];
  virtualServers: ClassicServerRecord[];
  bareMetal: ClassicServerRecord[];
  fallbackRegion: string;
  resourceGroupName?: string;
  vpcNamePrefix?: string;
}

/**
 * Group Classic infrastructure data by VPC region and produce
 * a TerraformMultiRegionInput ready for the generators.
 *
 * Steps:
 * 1. Group subnet recommendations by datacenter → VPC region
 * 2. Build hostname→datacenter map from servers
 * 3. Infer which regions each SG belongs to via relationship bindings
 * 4. Build per-region TerraformRegionConfig with subnets, SGs, migration subnet
 * 5. Conditionally include Transit Gateway when 2+ regions
 */
export function groupByRegion(input: RegionGroupingInput): TerraformMultiRegionInput {
  const {
    subnetRecommendations,
    securityGroupRules,
    relationships,
    virtualServers,
    bareMetal,
    fallbackRegion,
    resourceGroupName = 'Default',
    vpcNamePrefix = 'migrated-vpc',
  } = input;

  // --- 1. Group subnets by region ---
  const subnetsByRegion = new Map<string, ClassicSubnetRecommendation[]>();
  for (const rec of subnetRecommendations) {
    const mapping = mapDatacenterToVPC(rec.datacenter);
    const region = mapping && mapping.available ? mapping.vpcRegion : fallbackRegion;
    if (!subnetsByRegion.has(region)) subnetsByRegion.set(region, []);
    subnetsByRegion.get(region)!.push(rec);
  }

  // Ensure at least the fallback region exists
  if (subnetsByRegion.size === 0) {
    subnetsByRegion.set(fallbackRegion, []);
  }

  // --- 2. Build hostname→datacenter lookup ---
  const hostnameToDC = new Map<string, string>();
  for (const server of [...virtualServers, ...bareMetal]) {
    const hostname = server.hostname || server.fullyQualifiedDomainName;
    if (!hostname) continue;
    const dc = typeof server.datacenter === 'string'
      ? server.datacenter
      : server.datacenter?.name;
    if (dc) hostnameToDC.set(hostname, dc);
  }

  // --- 3. Infer SG → regions from relationships ---
  const sgToRegions = new Map<string, Set<string>>();
  const sgRelationships = (relationships ?? []).filter(
    (r) =>
      r.parentType === 'Security Group' &&
      (r.childType === 'Virtual Server' || r.childType === 'Bare Metal'),
  );

  for (const rel of sgRelationships) {
    const sgName = rel.parentName;
    const childName = rel.childName;
    const dc = hostnameToDC.get(childName);
    if (!dc) continue;
    const mapping = mapDatacenterToVPC(dc);
    const region = mapping && mapping.available ? mapping.vpcRegion : fallbackRegion;
    if (!sgToRegions.has(sgName)) sgToRegions.set(sgName, new Set());
    sgToRegions.get(sgName)!.add(region);
  }

  // --- 4. Group SG rules by name ---
  const sgRulesByName = new Map<string, ClassicSecurityGroupRule[]>();
  for (const rule of securityGroupRules) {
    const name = rule.securityGroupName || `sg-${rule.securityGroupId}`;
    if (!sgRulesByName.has(name)) sgRulesByName.set(name, []);
    sgRulesByName.get(name)!.push(rule);
  }

  const allRegions = Array.from(subnetsByRegion.keys()).sort();
  const allGroupNames = new Set(securityGroupRules.map((r) => r.securityGroupName));

  // --- 5. Build per-region configs ---
  const vpcs: Record<string, TerraformRegionConfig> = {};

  for (let regionIdx = 0; regionIdx < allRegions.length; regionIdx++) {
    const region = allRegions[regionIdx];
    const regionRecs = subnetsByRegion.get(region) ?? [];

    // Transform subnets for this region
    const subnets = transformSubnets(regionRecs);

    // Collect SG rules for this region
    const regionSgRules: ClassicSecurityGroupRule[] = [];
    for (const [sgName, rules] of sgRulesByName) {
      const regions = sgToRegions.get(sgName);
      // SGs with no bindings → all regions; otherwise only matching regions
      if (!regions || regions.size === 0 || regions.has(region)) {
        regionSgRules.push(...rules);
      }
    }

    const regionGroupNames = new Set(regionSgRules.map((r) => r.securityGroupName));
    const securityGroups = transformSecurityGroups(regionSgRules, allGroupNames.size > 0 ? allGroupNames : regionGroupNames);

    const vpcName = allRegions.length === 1
      ? vpcNamePrefix
      : `${vpcNamePrefix}-${region}`;

    // Migration subnet: 172.16.{regionIndex}.0/24
    const migrationCidr = `172.16.${regionIdx}.0/24`;
    // Pick zone-1 of the region for migration subnet
    const mapping = mapDatacenterToVPC(regionRecs[0]?.datacenter ?? '');
    const migrationZone = mapping && mapping.available && mapping.vpcZones.length > 0
      ? mapping.vpcZones[0]
      : `${region}-1`;

    vpcs[region] = {
      name: tfName(vpcName),
      region,
      defaultSgName: tfName(`${vpcName}-default-sg`),
      defaultAclName: tfName(`${vpcName}-default-acl`),
      defaultRoutingTableName: tfName(`${vpcName}-default-rt`),
      migrationSubnetCidr: migrationCidr,
      migrationSubnetZone: migrationZone,
      subnets,
      securityGroups,
      aclName: tfName(`${vpcName}-migration-acl`),
    };
  }

  // --- 6. Transit Gateway (only when 2+ regions) ---
  const result: TerraformMultiRegionInput = {
    resourceGroupName,
    regions: allRegions,
    vpcs,
    tags: ['migration:classic-to-vpc', 'generated-by:ibm-cloud-explorer'],
  };

  if (allRegions.length >= 2) {
    result.transitGateway = {
      name: `${vpcNamePrefix}-tgw`,
      location: allRegions[0], // Primary region
    };
  }

  return result;
}
