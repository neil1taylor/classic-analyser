import { useMemo } from 'react';
import { useVpcData } from '@/contexts/VpcDataContext';
import { useData } from '@/contexts/DataContext';

export type SubnetSourceType = 'Own VPC' | 'Own Classic' | 'TGW' | 'Direct Link' | 'VPN';
export type SubnetReachability = 'Direct' | 'Via TGW' | 'Via DL' | 'Via VPN';

export interface KnownSubnet {
  id: string;
  cidr: string;
  sourceType: SubnetSourceType;
  sourceName: string;
  region?: string;
  vpcOrVlan?: string;
  reachability: SubnetReachability;
  connectionId?: string;
  transitGatewayName?: string;
  gatewayName?: string;
}

type RawItem = Record<string, unknown>;

function str(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

export function useKnownSubnets(): KnownSubnet[] {
  const { vpcCollectedData } = useVpcData();
  const { collectedData: classicData } = useData();

  return useMemo(() => {
    const subnets: KnownSubnet[] = [];
    let idCounter = 0;

    // 1. Own VPC Subnets
    const vpcSubnets = (vpcCollectedData['vpcSubnets'] ?? []) as RawItem[];
    for (const subnet of vpcSubnets) {
      const cidr = str(subnet.cidr);
      if (!cidr) continue;
      subnets.push({
        id: `vpc-subnet-${idCounter++}`,
        cidr,
        sourceType: 'Own VPC',
        sourceName: str(subnet.name),
        region: str(subnet.region),
        vpcOrVlan: str(subnet.vpcName),
        reachability: 'Direct',
      });
    }

    // 2. Own Classic Subnets
    const classicSubnets = (classicData['subnets'] ?? []) as RawItem[];
    for (const subnet of classicSubnets) {
      // Classic subnets have networkIdentifier (e.g., "10.0.0.0") and cidr (e.g., 26) as separate fields
      const networkId = str(subnet.networkIdentifier);
      const prefixLen = str(subnet.cidr);
      const cidr = networkId && prefixLen ? `${networkId}/${prefixLen}` : '';
      if (!cidr) continue;
      subnets.push({
        id: `classic-subnet-${idCounter++}`,
        cidr,
        sourceType: 'Own Classic',
        sourceName: str(subnet.note || subnet.id),
        region: str(subnet.datacenter),
        vpcOrVlan: str(subnet.vlanNumber),
        reachability: 'Direct',
      });
    }

    // 3. TGW Route Prefixes (from route reports)
    // Check both VPC and Classic contexts - Classic collection also gathers TGW data
    const vpcTgwPrefixes = (vpcCollectedData['tgwRoutePrefixes'] ?? []) as RawItem[];
    const classicTgwPrefixes = (classicData['tgwRoutePrefixes'] ?? []) as RawItem[];
    const tgwRoutePrefixes = [...vpcTgwPrefixes, ...classicTgwPrefixes];
    for (const tgw of tgwRoutePrefixes) {
      const tgwName = str(tgw.transitGatewayName);
      const connectionPrefixes = (tgw.connectionPrefixes ?? []) as Array<{
        connectionId: string;
        connectionName: string;
        connectionType: string;
        prefixes: string[];
      }>;

      for (const conn of connectionPrefixes) {
        for (const prefix of conn.prefixes) {
          // Skip VPC subnets already added as "Own VPC" (they appear in route reports too)
          const isOwnVpcPrefix = vpcSubnets.some((s) => str(s.cidr) === prefix);
          if (isOwnVpcPrefix) continue;

          subnets.push({
            id: `tgw-prefix-${idCounter++}`,
            cidr: prefix,
            sourceType: 'TGW',
            sourceName: conn.connectionName,
            reachability: 'Via TGW',
            connectionId: conn.connectionId,
            transitGatewayName: tgwName,
          });
        }
      }
    }

    // 4. Direct Link Virtual Connections (network prefixes if available)
    const dlVirtualConnections = (vpcCollectedData['directLinkVirtualConnections'] ?? []) as RawItem[];
    for (const conn of dlVirtualConnections) {
      const networkId = str(conn.networkId);
      if (networkId && networkId.includes('/')) {
        // If networkId looks like a CIDR
        subnets.push({
          id: `dl-prefix-${idCounter++}`,
          cidr: networkId,
          sourceType: 'Direct Link',
          sourceName: str(conn.name),
          reachability: 'Via DL',
          gatewayName: str(conn.gatewayName),
        });
      }
    }

    // 5. VPN Gateway Connections (peer_cidrs)
    const vpnConnections = (vpcCollectedData['vpnGatewayConnections'] ?? []) as RawItem[];
    for (const conn of vpnConnections) {
      const peerCidrs = (conn.peerCidrsArray ?? []) as string[];
      const connName = str(conn.name);
      const vpnGwName = str(conn.vpnGatewayName);
      const region = str(conn.region);

      for (const cidr of peerCidrs) {
        subnets.push({
          id: `vpn-prefix-${idCounter++}`,
          cidr,
          sourceType: 'VPN',
          sourceName: connName,
          region,
          reachability: 'Via VPN',
          gatewayName: vpnGwName,
        });
      }
    }

    // Sort by CIDR for consistent display
    subnets.sort((a, b) => {
      // Sort by source type first, then by CIDR
      const typeOrder: Record<SubnetSourceType, number> = {
        'Own VPC': 0,
        'Own Classic': 1,
        'TGW': 2,
        'Direct Link': 3,
        'VPN': 4,
      };
      const typeDiff = typeOrder[a.sourceType] - typeOrder[b.sourceType];
      if (typeDiff !== 0) return typeDiff;
      return a.cidr.localeCompare(b.cidr);
    });

    return subnets;
  }, [vpcCollectedData, classicData]);
}
