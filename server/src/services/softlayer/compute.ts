import type { SoftLayerClient } from './client.js';
import type {
  SLVirtualGuest,
  SLHardware,
  SLDedicatedHost,
  SLPlacementGroup,
  SLReservedCapacity,
  SLImageTemplate,
} from './types.js';
import logger from '../../utils/logger.js';

export async function getVirtualGuests(client: SoftLayerClient): Promise<SLVirtualGuest[]> {
  const objectMask =
    'mask[id,hostname,domain,fullyQualifiedDomainName,primaryIpAddress,primaryBackendIpAddress,maxCpu,maxMemory,startCpus,status,powerState,datacenter,operatingSystem[softwareDescription],hourlyBillingFlag,createDate,modifyDate,billingItem[recurringFee,hourlyRecurringFee,children[categoryCode,hourlyRecurringFee],orderItem],networkVlans[id,vlanNumber,name,networkSpace],blockDevices[diskImage[capacity,units]],tagReferences[tag],notes,dedicatedAccountHostOnlyFlag,placementGroupId,privateNetworkOnlyFlag,localDiskFlag]';

  try {
    const result = await client.requestAllPages<SLVirtualGuest>({
      service: 'SoftLayer_Account',
      method: 'getVirtualGuests',
      objectMask,
    });
    logger.info('Collected virtual guests', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect virtual guests (403)');
      return [];
    }
    throw error;
  }
}

export async function getHardware(client: SoftLayerClient): Promise<SLHardware[]> {
  const objectMask =
    'mask[id,hostname,domain,fullyQualifiedDomainName,manufacturerSerialNumber,primaryIpAddress,primaryBackendIpAddress,processorPhysicalCoreAmount,memoryCapacity,hardDrives[capacity,hardwareComponentModel[hardwareGenericComponentModel[hardwareComponentType]]],datacenter,operatingSystem[softwareDescription],networkComponents[primaryIpAddress,port,speed,status,macAddress],billingItem[recurringFee],provisionDate,powerSupplyCount,networkGatewayMemberFlag,networkVlans,tagReferences,notes]';

  try {
    const result = await client.requestAllPages<SLHardware>({
      service: 'SoftLayer_Account',
      method: 'getHardware',
      objectMask,
    });
    logger.info('Collected bare metal servers', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect hardware (403)');
      return [];
    }
    throw error;
  }
}

export async function getDedicatedHosts(client: SoftLayerClient): Promise<SLDedicatedHost[]> {
  const objectMask =
    'mask[id,name,createDate,datacenter,cpuCount,memoryCapacity,diskCapacity,guestCount]';

  try {
    const result = await client.requestAllPages<SLDedicatedHost>({
      service: 'SoftLayer_Account',
      method: 'getDedicatedHosts',
      objectMask,
    });
    logger.info('Collected dedicated hosts', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect dedicated hosts (403)');
      return [];
    }
    throw error;
  }
}

export async function getPlacementGroups(client: SoftLayerClient): Promise<SLPlacementGroup[]> {
  const objectMask =
    'mask[id,name,createDate,rule,backendRouter,guestCount]';

  try {
    const result = await client.requestAllPages<SLPlacementGroup>({
      service: 'SoftLayer_Account',
      method: 'getPlacementGroups',
      objectMask,
    });
    logger.info('Collected placement groups', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect placement groups (403)');
      return [];
    }
    throw error;
  }
}

export async function getReservedCapacityGroups(client: SoftLayerClient): Promise<SLReservedCapacity[]> {
  const objectMask =
    'mask[id,name,createDate,backendRouter[hostname,datacenter[name]],instances[id,billingItem[description]]]';

  try {
    const result = await client.requestAllPages<SLReservedCapacity>({
      service: 'SoftLayer_Account',
      method: 'getReservedCapacityGroups',
      objectMask,
    });
    logger.info('Collected reserved capacity groups', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect reserved capacity groups (403)');
      return [];
    }
    throw error;
  }
}

export async function getVirtualGuestsShallow(client: SoftLayerClient): Promise<SLVirtualGuest[]> {
  const objectMask =
    'mask[id,hostname,domain,fullyQualifiedDomainName,primaryIpAddress,primaryBackendIpAddress,maxCpu,maxMemory,startCpus,status,powerState,datacenter,createDate,privateNetworkOnlyFlag]';

  try {
    const result = await client.requestAllPages<SLVirtualGuest>({
      service: 'SoftLayer_Account',
      method: 'getVirtualGuests',
      objectMask,
    });
    logger.info('Collected virtual guests (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect virtual guests (403)');
      return [];
    }
    throw error;
  }
}

export async function getHardwareShallow(client: SoftLayerClient): Promise<SLHardware[]> {
  const objectMask =
    'mask[id,hostname,domain,fullyQualifiedDomainName,primaryIpAddress,primaryBackendIpAddress,processorPhysicalCoreAmount,memoryCapacity,datacenter,provisionDate]';

  try {
    const result = await client.requestAllPages<SLHardware>({
      service: 'SoftLayer_Account',
      method: 'getHardware',
      objectMask,
    });
    logger.info('Collected bare metal servers (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect hardware (403)');
      return [];
    }
    throw error;
  }
}

export async function getBlockDeviceTemplateGroupsShallow(client: SoftLayerClient): Promise<SLImageTemplate[]> {
  const objectMask =
    'mask[id,name,createDate,globalIdentifier,parentId]';

  try {
    const result = await client.requestAllPages<SLImageTemplate>({
      service: 'SoftLayer_Account',
      method: 'getBlockDeviceTemplateGroups',
      objectMask,
    });
    logger.info('Collected image templates (shallow)', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect image templates (403)');
      return [];
    }
    throw error;
  }
}

export async function getBlockDeviceTemplateGroups(client: SoftLayerClient): Promise<SLImageTemplate[]> {
  const objectMask =
    'mask[id,name,note,createDate,status,datacenter,children[blockDevices[diskImage[capacity,units,softwareReferences[softwareDescription]]]],globalIdentifier,parentId]';

  try {
    const result = await client.requestAllPages<SLImageTemplate>({
      service: 'SoftLayer_Account',
      method: 'getBlockDeviceTemplateGroups',
      objectMask,
    });
    logger.info('Collected image templates', { count: result.length });
    return result;
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 403 || error.statusCode === 404) {
      logger.warn('Insufficient permissions to collect image templates (403)');
      return [];
    }
    throw error;
  }
}
