import type { SoftLayerClient } from './client.js';
import type {
  SLNetworkVlan,
  SLSubnet,
  SLNetworkGateway,
  SLFirewall,
  SLSecurityGroup,
  SLLoadBalancer,
  SLVPNTunnel,
  FlatSecurityGroupRule,
} from './types.js';
import logger from '../../utils/logger.js';

export async function getNetworkVlans(client: SoftLayerClient): Promise<SLNetworkVlan[]> {
  const objectMask =
    'mask[id,vlanNumber,name,networkSpace,primaryRouter[hostname,datacenter[name]],subnets[id,networkIdentifier,cidr,subnetType,gateway,broadcastAddress,usableIpAddressCount],firewallGuestNetworkComponents[id],attachedNetworkGateway[id,name]]';

  try {
    const result = await client.requestAllPages<SLNetworkVlan>({
      service: 'SoftLayer_Account',
      method: 'getNetworkVlans',
      objectMask,
    });
    logger.info('Collected VLANs', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect VLANs (403)');
      return [];
    }
    throw error;
  }
}

export async function getSubnets(client: SoftLayerClient): Promise<SLSubnet[]> {
  const objectMask =
    'mask[id,networkIdentifier,cidr,subnetType,gateway,broadcastAddress,usableIpAddressCount,totalIpAddresses,ipAddresses[ipAddress,isReserved,note,virtualGuest[hostname],hardware[hostname]],networkVlan[id,vlanNumber,name],datacenter]';

  try {
    const result = await client.requestAllPages<SLSubnet>({
      service: 'SoftLayer_Account',
      method: 'getSubnets',
      objectMask,
    });
    logger.info('Collected subnets', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect subnets (403)');
      return [];
    }
    throw error;
  }
}

export async function getNetworkGateways(client: SoftLayerClient): Promise<SLNetworkGateway[]> {
  const objectMask =
    'mask[id,name,networkSpace,status[keyName],members[hardware[id,hostname,primaryIpAddress,primaryBackendIpAddress,datacenter[name]]],insideVlans[id,bypassFlag,networkVlan[id,vlanNumber,name]],publicVlan[id,vlanNumber],privateVlan[id,vlanNumber],publicIpAddress[ipAddress],privateIpAddress[ipAddress]]';

  try {
    const result = await client.requestAllPages<SLNetworkGateway>({
      service: 'SoftLayer_Account',
      method: 'getNetworkGateways',
      objectMask,
    });
    logger.info('Collected network gateways', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect network gateways (403)');
      return [];
    }
    throw error;
  }
}

export async function getNetworkVlanFirewalls(client: SoftLayerClient): Promise<SLFirewall[]> {
  const objectMask =
    'mask[id,primaryIpAddress,firewallType,networkVlan[id,vlanNumber,name],billingItem[recurringFee],datacenter,rules[orderValue,action,protocol,sourceIpAddress,sourceIpCidr,destinationIpAddress,destinationIpCidr,destinationPortRangeStart,destinationPortRangeEnd]]';

  try {
    const result = await client.requestAllPages<SLFirewall>({
      service: 'SoftLayer_Account',
      method: 'getNetworkVlanFirewalls',
      objectMask,
    });
    logger.info('Collected firewalls', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect firewalls (403)');
      return [];
    }
    throw error;
  }
}

export async function getSecurityGroups(client: SoftLayerClient): Promise<SLSecurityGroup[]> {
  const objectMask =
    'mask[id,name,description,createDate,modifyDate,rules[id,direction,protocol,portRangeMin,portRangeMax,remoteIp,remoteGroupId],networkComponentBindings[networkComponent[id,port,guest[id,hostname]]]]';

  try {
    const result = await client.requestAllPages<SLSecurityGroup>({
      service: 'SoftLayer_Account',
      method: 'getSecurityGroups',
      objectMask,
    });
    logger.info('Collected security groups', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect security groups (403)');
      return [];
    }
    throw error;
  }
}

export async function getAdcLoadBalancers(client: SoftLayerClient): Promise<SLLoadBalancer[]> {
  const objectMask =
    'mask[id,name,ipAddress,loadBalancerType,connectionLimit,virtualServers[id,port,allocation,serviceGroups[services[ipAddress,port,healthCheck]]],healthMonitors,billingItem]';

  try {
    const result = await client.requestAllPages<SLLoadBalancer>({
      service: 'SoftLayer_Account',
      method: 'getAdcLoadBalancers',
      objectMask,
    });
    logger.info('Collected load balancers', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect load balancers (403)');
      return [];
    }
    throw error;
  }
}

export async function getNetworkVlansShallow(client: SoftLayerClient): Promise<SLNetworkVlan[]> {
  const objectMask =
    'mask[id,vlanNumber,name,networkSpace,primaryRouter[hostname,datacenter[name]]]';

  try {
    const result = await client.requestAllPages<SLNetworkVlan>({
      service: 'SoftLayer_Account',
      method: 'getNetworkVlans',
      objectMask,
    });
    logger.info('Collected VLANs (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect VLANs (403)');
      return [];
    }
    throw error;
  }
}

export async function getSubnetsShallow(client: SoftLayerClient): Promise<SLSubnet[]> {
  const objectMask =
    'mask[id,networkIdentifier,cidr,subnetType,gateway,broadcastAddress,usableIpAddressCount,networkVlan[id,vlanNumber,name]]';

  try {
    const result = await client.requestAllPages<SLSubnet>({
      service: 'SoftLayer_Account',
      method: 'getSubnets',
      objectMask,
    });
    logger.info('Collected subnets (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect subnets (403)');
      return [];
    }
    throw error;
  }
}

export async function getNetworkGatewaysShallow(client: SoftLayerClient): Promise<SLNetworkGateway[]> {
  const objectMask =
    'mask[id,name,networkSpace,status[keyName]]';

  try {
    const result = await client.requestAllPages<SLNetworkGateway>({
      service: 'SoftLayer_Account',
      method: 'getNetworkGateways',
      objectMask,
    });
    logger.info('Collected network gateways (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect network gateways (403)');
      return [];
    }
    throw error;
  }
}

export async function getNetworkVlanFirewallsShallow(client: SoftLayerClient): Promise<SLFirewall[]> {
  const objectMask =
    'mask[id,primaryIpAddress,firewallType,networkVlan[id,vlanNumber,name]]';

  try {
    const result = await client.requestAllPages<SLFirewall>({
      service: 'SoftLayer_Account',
      method: 'getNetworkVlanFirewalls',
      objectMask,
    });
    logger.info('Collected firewalls (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect firewalls (403)');
      return [];
    }
    throw error;
  }
}

export async function getSecurityGroupsShallow(client: SoftLayerClient): Promise<SLSecurityGroup[]> {
  const objectMask =
    'mask[id,name,description,createDate]';

  try {
    const result = await client.requestAllPages<SLSecurityGroup>({
      service: 'SoftLayer_Account',
      method: 'getSecurityGroups',
      objectMask,
    });
    logger.info('Collected security groups (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect security groups (403)');
      return [];
    }
    throw error;
  }
}

export async function getAdcLoadBalancersShallow(client: SoftLayerClient): Promise<SLLoadBalancer[]> {
  const objectMask =
    'mask[id,name,connectionLimit,loadBalancerType]';

  try {
    const result = await client.requestAllPages<SLLoadBalancer>({
      service: 'SoftLayer_Account',
      method: 'getAdcLoadBalancers',
      objectMask,
    });
    logger.info('Collected load balancers (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect load balancers (403)');
      return [];
    }
    throw error;
  }
}

export function flattenSecurityGroupRules(groups: SLSecurityGroup[]): FlatSecurityGroupRule[] {
  const result: FlatSecurityGroupRule[] = [];
  for (const group of groups) {
    if (!group.rules) continue;
    for (const rule of group.rules) {
      result.push({
        securityGroupId: group.id ?? 0,
        securityGroupName: group.name ?? '',
        id: rule.id,
        direction: rule.direction,
        protocol: rule.protocol,
        portRangeMin: rule.portRangeMin,
        portRangeMax: rule.portRangeMax,
        remoteIp: rule.remoteIp,
        remoteGroupId: rule.remoteGroupId,
      });
    }
  }
  return result;
}

export async function getNetworkTunnelContexts(client: SoftLayerClient): Promise<SLVPNTunnel[]> {
  const objectMask =
    'mask[id,name,customerPeerIpAddress,internalPeerIpAddress,phaseOneAuthentication,phaseOneEncryption,phaseTwoAuthentication,phaseTwoEncryption,addressTranslations,customerSubnets,internalSubnets]';

  try {
    const result = await client.requestAllPages<SLVPNTunnel>({
      service: 'SoftLayer_Account',
      method: 'getNetworkTunnelContexts',
      objectMask,
    });
    logger.info('Collected VPN tunnels', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect VPN tunnels (403)');
      return [];
    }
    throw error;
  }
}
