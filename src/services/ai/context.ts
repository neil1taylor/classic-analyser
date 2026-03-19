/**
 * Build AI context from infrastructure data.
 * NEVER includes API keys, IP addresses, hostnames, or other sensitive details.
 * Only aggregated summaries and counts are sent.
 */

/**
 * Build a general infrastructure summary for AI context.
 * Accepts collected data from any domain (Classic, VPC, PowerVS).
 */
export function buildInfrastructureSummary(
  classicData?: Record<string, unknown[]>,
  vpcData?: Record<string, unknown[]>,
  powerVsData?: Record<string, unknown[]>,
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};

  if (classicData) {
    summary.classic = buildDomainSummary(classicData, 'classic');
  }

  if (vpcData) {
    summary.vpc = buildDomainSummary(vpcData, 'vpc');
  }

  if (powerVsData) {
    summary.powerVs = buildDomainSummary(powerVsData, 'powervs');
  }

  summary.totalResources = calculateTotalResources(classicData, vpcData, powerVsData);

  return summary;
}

function buildDomainSummary(
  data: Record<string, unknown[]>,
  domain: string,
): Record<string, unknown> {
  const resourceCounts: Record<string, number> = {};
  let totalCount = 0;

  for (const [key, items] of Object.entries(data)) {
    if (Array.isArray(items)) {
      resourceCounts[key] = items.length;
      totalCount += items.length;
    }
  }

  const summary: Record<string, unknown> = {
    domain,
    totalResources: totalCount,
    resourceCounts,
    categories: categorizeCounts(resourceCounts, domain),
  };

  // Extract datacenter/region distribution without identifying details
  const locations = extractLocationDistribution(data);
  if (Object.keys(locations).length > 0) {
    summary.locationDistribution = locations;
  }

  return summary;
}

function categorizeCounts(
  counts: Record<string, number>,
  domain: string,
): Record<string, number> {
  const categories: Record<string, number> = {};

  const categoryMap: Record<string, string[]> =
    domain === 'classic'
      ? {
          compute: ['virtualServers', 'bareMetalServers', 'dedicatedHosts', 'placementGroups'],
          network: [
            'vlans', 'subnets', 'gateways', 'firewalls', 'securityGroups',
            'loadBalancers', 'ipsecVpn',
          ],
          storage: ['blockStorage', 'fileStorage', 'objectStorage'],
          security: ['sslCertificates', 'sshKeys'],
          dns: ['dnsDomains', 'dnsRecords'],
        }
      : domain === 'vpc'
        ? {
            compute: ['instances', 'bareMetalServers', 'dedicatedHosts', 'placementGroups'],
            network: [
              'vpcs', 'subnets', 'securityGroups', 'floatingIps', 'publicGateways',
              'networkAcls', 'loadBalancers', 'vpnGateways', 'endpointGateways',
              'routingTables', 'routes', 'transitGateways',
            ],
            storage: ['volumes'],
            security: ['sshKeys', 'images'],
          }
        : {
            compute: ['pvsInstances', 'sharedProcessorPools', 'placementGroups', 'hostGroups'],
            network: [
              'networks', 'networkPorts', 'networkSecurityGroups', 'cloudConnections',
              'dhcpServers', 'vpnConnections',
            ],
            storage: ['volumes', 'volumeGroups', 'snapshots'],
            security: ['sshKeys'],
          };

  for (const [category, keys] of Object.entries(categoryMap)) {
    const total = keys.reduce((sum, key) => sum + (counts[key] || 0), 0);
    if (total > 0) {
      categories[category] = total;
    }
  }

  return categories;
}

function extractLocationDistribution(
  data: Record<string, unknown[]>,
): Record<string, number> {
  const locations: Record<string, number> = {};

  for (const items of Object.values(data)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;
      const record = item as Record<string, unknown>;
      // Look for common location fields, only extract the location name
      const loc =
        (record._region as string) ||
        (record.datacenter as string) ||
        (record.zone as string) ||
        (record._zone as string);
      if (typeof loc === 'string' && loc.length > 0) {
        locations[loc] = (locations[loc] || 0) + 1;
      }
    }
  }

  return locations;
}

function calculateTotalResources(
  ...datasets: (Record<string, unknown[]> | undefined)[]
): number {
  let total = 0;
  for (const data of datasets) {
    if (!data) continue;
    for (const items of Object.values(data)) {
      if (Array.isArray(items)) {
        total += items.length;
      }
    }
  }
  return total;
}
