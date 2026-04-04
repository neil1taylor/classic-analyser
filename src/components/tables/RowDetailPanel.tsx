import React, { useMemo } from 'react';
import { Tag } from '@carbon/react';
import type { ColumnDefinition } from '@/types/resources';
import { get, formatValue } from '@/utils/formatters';
import { getRelatedResources } from '@/utils/relationships';
import { useVpcData } from '@/contexts/VpcDataContext';

const KEY_FIELDS: Record<string, string[]> = {
  // ── Classic ──
  virtualServers: ['id', 'hostname', 'domain', 'fqdn', 'primaryIp', 'backendIp', 'primarySubnet', 'backendSubnet', 'publicVlan', 'privateVlan', 'status', 'powerState', 'startCpus', 'maxCpu', 'maxMemory', 'diskGb', 'blockDeviceDetails', 'localDisk', 'os', 'datacenter', 'hourlyBilling', 'dedicated', 'privateNetworkOnly', 'placementGroupId', 'createDate', 'modifyDate', 'costBasis', 'recurringFee', 'hourlyRate', 'billingCategories', 'networkVlans', 'attachedBlockStorageGb', 'attachedFileStorageGb', 'volumeCount', 'localStorageGb', 'portableStorageGb', 'diskUtilUsedPercent', 'diskUtilUsedGB', 'diskUtilStatus', 'tags', 'notes'],
  bareMetal: ['id', 'hostname', 'domain', 'fqdn', 'serialNumber', 'primaryIp', 'backendIp', 'primarySubnet', 'backendSubnet', 'publicVlan', 'privateVlan', 'cores', 'memory', 'hardDrives', 'hardDriveDetails', 'os', 'datacenter', 'provisionDate', 'recurringFee', 'powerSupplyCount', 'gatewayMember', 'networkComponents', 'nicDetails', 'networkVlans', 'attachedBlockStorageGb', 'attachedFileStorageGb', 'volumeCount', 'diskUtilUsedPercent', 'diskUtilUsedGB', 'diskUtilStatus', 'tags', 'notes'],
  vlans: ['id', 'vlanNumber', 'name', 'networkSpace', 'primaryRouter', 'datacenter', 'virtualGuestCount', 'hardwareCount', 'gateway'],
  subnets: ['id', 'networkIdentifier', 'cidr', 'subnetType', 'gateway', 'datacenter', 'vlanNumber', 'usableIpAddressCount', 'broadcastAddress', 'totalIpAddresses', 'networkVlanId'],
  gateways: ['id', 'name', 'publicIp', 'privateIp', 'datacenter', 'status', 'memberCount', 'networkSpace', 'insideVlanCount', 'deviceType', 'cores', 'memoryGb'],
  firewalls: ['id', 'firewallType', 'primaryIpAddress', 'datacenter', 'vlanNumber', 'recurringFee', 'ruleCount'],
  blockStorage: ['id', 'username', 'storageType', 'storageTierLevel', 'capacityGb', 'iops', 'datacenter', 'targetIp', 'lunId', 'encrypted', 'recurringFee', 'snapshotCapacityGb', 'snapshotCount', 'replicationStatus', 'replicationPartners', 'percentUsed', 'connectedHosts', 'allowedVirtualGuests', 'allowedHardware', 'allowedSubnets', 'createDate', 'notes'],
  fileStorage: ['id', 'username', 'storageType', 'storageTierLevel', 'capacityGb', 'iops', 'datacenter', 'mountAddress', 'targetIp', 'encrypted', 'recurringFee', 'snapshotCapacityGb', 'snapshotCount', 'replicationStatus', 'replicationPartners', 'percentUsed', 'connectedHosts', 'allowedVirtualGuests', 'allowedHardware', 'allowedSubnets', 'createDate', 'notes'],
  objectStorage: ['id', 'username', 'storageType', 'capacityGb', 'bytesUsed', 'recurringFee', 'createDate'],
  sslCerts: ['id', 'commonName', 'organizationName', 'validityBegin', 'validityEnd', 'validityDays', 'createDate', 'notes'],
  sshKeys: ['id', 'label', 'fingerprint', 'createDate', 'modifyDate', 'notes'],
  dnsDomains: ['id', 'name', 'serial', 'updateDate', 'recordCount'],
  dnsRecords: ['id', 'host', 'type', 'data', 'ttl', 'domainId', 'domainName', 'priority'],
  loadBalancers: ['id', 'name', 'ipAddress', 'loadBalancerType', 'connectionLimit', 'recurringFee', 'virtualServers'],
  securityGroups: ['id', 'name', 'description', 'createDate', 'modifyDate', 'ruleCount', 'bindingCount'],
  securityGroupRules: ['securityGroupName', 'id', 'direction', 'protocol', 'portRangeMin', 'portRangeMax', 'remoteIp', 'remoteGroupId'],
  placementGroups: ['id', 'name', 'rule', 'backendRouter', 'createDate', 'guestCount'],
  dedicatedHosts: ['id', 'name', 'datacenter', 'cpuCount', 'memoryCapacity', 'diskCapacity', 'createDate', 'guestCount'],
  reservedCapacity: ['id', 'name', 'createDate', 'backendRouter', 'instanceCount'],
  users: ['id', 'username', 'firstName', 'lastName', 'email', 'createDate', 'userStatus', 'statusDate', 'roles', 'permissions'],
  billingItems: ['id', 'description', 'categoryCode', 'recurringFee', 'createDate', 'cancellationDate', 'notes'],
  eventLog: ['eventName', 'objectName', 'userType', 'eventCreateDate', 'userId', 'username', 'objectId', 'traceId'],
  imageTemplates: ['id', 'globalIdentifier', 'name', 'note', 'createDate', 'status', 'datacenter', 'parentId'],
  vpnTunnels: ['id', 'name', 'customerPeerIpAddress', 'internalPeerIpAddress', 'phaseOneAuthentication', 'phaseOneEncryption', 'phaseTwoAuthentication', 'phaseTwoEncryption', 'customerSubnets', 'internalSubnets'],
  classicTransitGateways: ['id', 'name', 'status', 'location', 'global', 'createdAt'],
  classicTransitGatewayConnections: ['id', 'name', 'status', 'networkType', 'transitGatewayName', 'networkId', 'networkAccountId'],
  directLinkGateways: ['id', 'name', 'type', 'speedMbps', 'locationName', 'bgpStatus', 'operationalStatus', 'global', 'createdAt'],
  tgwRoutePrefixes: ['transitGatewayName', 'prefixes', 'connectionCount', 'connectionSummary'],
  tgwVpcVpnGateways: ['id', 'name', 'status', 'mode', 'transitGatewayName', 'vpcName', 'vpcRegion'],
  // ── VPC ──
  vpcInstances: ['id', 'name', 'status', 'profile', 'vcpu', 'memory', 'zone', 'vpcName', 'primaryIp', 'region', 'created_at', 'resourceGroup', 'crn'],
  vpcBareMetalServers: ['id', 'name', 'status', 'profile', 'zone', 'vpcName', 'region', 'created_at', 'resourceGroup'],
  vpcDedicatedHosts: ['id', 'name', 'state', 'profile', 'zone', 'vcpu', 'memory', 'instanceCount', 'region', 'created_at', 'resourceGroup'],
  vpcPlacementGroups: ['id', 'name', 'strategy', 'region', 'created_at', 'resourceGroup'],
  vpcs: ['id', 'name', 'status', 'classicAccess', 'region', 'created_at', 'resourceGroup', 'crn'],
  vpcSubnets: ['id', 'name', 'status', 'cidr', 'availableIps', 'totalIps', 'zone', 'vpcName', 'region', 'created_at', 'resourceGroup'],
  vpcSecurityGroups: ['id', 'name', 'vpcName', 'ruleCount', 'targetCount', 'region', 'created_at'],
  vpcFloatingIps: ['id', 'name', 'address', 'status', 'target', 'zone', 'region', 'created_at'],
  vpcPublicGateways: ['id', 'name', 'status', 'vpcName', 'floatingIp', 'zone', 'region', 'created_at'],
  vpcNetworkAcls: ['id', 'name', 'vpcName', 'ruleCount', 'subnetCount', 'region', 'created_at'],
  vpcLoadBalancers: ['id', 'name', 'hostname', 'isPublic', 'operatingStatus', 'provisioningStatus', 'subnetNames', 'region', 'created_at'],
  vpcVpnGateways: ['id', 'name', 'status', 'mode', 'subnet', 'region', 'created_at'],
  vpcEndpointGateways: ['id', 'name', 'lifecycleState', 'healthState', 'target', 'vpcName', 'region', 'created_at'],
  vpcRoutingTables: ['id', 'name', 'vpcName', 'isDefault', 'lifecycleState', 'routeCount', 'subnetCount', 'region', 'created_at'],
  vpcRoutes: ['id', 'name', 'destination', 'action', 'nextHopType', 'nextHopTarget', 'zone', 'priority', 'origin', 'lifecycleState', 'routingTableName', 'vpcName', 'region', 'created_at'],
  vpcVolumes: ['id', 'name', 'status', 'capacity', 'iops', 'profile', 'encryption', 'zone', 'region', 'created_at'],
  vpcSshKeys: ['id', 'name', 'type', 'fingerprint', 'length', 'region', 'created_at'],
  vpcImages: ['id', 'name', 'status', 'os', 'architecture', 'region', 'created_at'],
  vpcFlowLogCollectors: ['id', 'name', 'active', 'lifecycleState', 'target', 'storageBucket', 'region', 'created_at'],
  transitGateways: ['id', 'name', 'status', 'location', 'global', 'routingScope', 'created_at', 'resourceGroup', 'crn'],
  transitGatewayConnections: ['id', 'name', 'status', 'networkType', 'transitGatewayName', 'networkId', 'networkAccountId', 'created_at'],
  vpnGatewayConnections: ['id', 'name', 'status', 'mode', 'vpnGatewayName', 'peerAddress', 'localCidrs', 'peerCidrs', 'region', 'created_at'],
  directLinkVirtualConnections: ['id', 'name', 'status', 'type', 'gatewayName', 'networkId', 'created_at'],
  // ── PowerVS ──
  pvsInstances: ['pvmInstanceID', 'serverName', 'status', 'sysType', 'processors', 'procType', 'memory', 'osType', 'primaryIp', 'storageType', 'creationDate', 'workspace', 'zone'],
  pvsVolumes: ['volumeID', 'name', 'state', 'size', 'diskType', 'bootable', 'shareable', 'pvmInstanceName', 'creationDate', 'workspace', 'zone'],
  pvsNetworks: ['networkID', 'name', 'type', 'vlanID', 'cidr', 'gateway', 'mtu', 'ipAvailable', 'ipUsed', 'workspace', 'zone'],
  pvsNetworkPorts: ['portID', 'ipAddress', 'macAddress', 'status', 'networkName', 'pvmInstanceName', 'workspace', 'zone'],
  pvsSshKeys: ['name', 'sshKey', 'creationDate', 'workspace', 'zone'],
  pvsImages: ['imageID', 'name', 'state', 'operatingSystem', 'architecture', 'size', 'storageType', 'creationDate', 'workspace', 'zone'],
  pvsStockImages: ['imageID', 'name', 'state', 'operatingSystem', 'architecture', 'storageType', 'workspace', 'zone'],
  pvsSnapshots: ['snapshotID', 'name', 'status', 'percentComplete', 'pvmInstanceName', 'volumeCount', 'creationDate', 'workspace', 'zone'],
  pvsPlacementGroups: ['id', 'name', 'policy', 'memberCount', 'workspace', 'zone'],
  pvsCloudConnections: ['cloudConnectionID', 'name', 'speed', 'globalRouting', 'greEnabled', 'transitEnabled', 'networkCount', 'workspace', 'zone'],
  pvsDhcpServers: ['id', 'status', 'networkId', 'networkName', 'workspace', 'zone'],
  pvsVpnConnections: ['id', 'name', 'status', 'mode', 'peerAddress', 'localSubnets', 'peerSubnets', 'workspace', 'zone'],
  pvsIkePolicies: ['id', 'name', 'version', 'encryption', 'dhGroup', 'authentication', 'workspace', 'zone'],
  pvsIpsecPolicies: ['id', 'name', 'encryption', 'dhGroup', 'authentication', 'pfs', 'workspace', 'zone'],
  pvsSharedProcessorPools: ['id', 'name', 'hostGroup', 'reservedCores', 'allocatedCores', 'availableCores', 'instanceCount', 'workspace', 'zone'],
  pvsVolumeGroups: ['id', 'name', 'status', 'consistencyGroupName', 'volumeCount', 'replicationEnabled', 'workspace', 'zone'],
  pvsNetworkSecurityGroups: ['id', 'name', 'ruleCount', 'memberCount', 'workspace', 'zone'],
  pvsHostGroups: ['id', 'name', 'hostCount', 'secondaryCount', 'workspace', 'zone'],
  pvsWorkspaces: ['guid', 'name', 'zone', 'region', 'resourceGroupName', 'state', 'createdAt'],
  pvsSystemPools: ['type', 'sharedCoreRatio', 'maxAvailable', 'maxMemory', 'coreMemoryRatio', 'workspace', 'zone'],
  pvsSapProfiles: ['profileID', 'type', 'cores', 'memory', 'saps', 'certified', 'workspace', 'zone'],
  pvsEvents: ['eventID', 'action', 'level', 'message', 'resource', 'user', 'timestamp', 'workspace', 'zone'],
  // ── Platform ──
  serviceInstances: ['name', 'guid', '_serviceType', '_serviceCategory', 'state', 'location', '_resourceGroupName', 'type', 'created_at', 'updated_at', 'crn'],
};

interface RowDetailPanelProps {
  row: Record<string, unknown>;
  resourceKey: string;
  columns: ColumnDefinition[];
  collectedData: Record<string, unknown[]>;
}

const RowDetailPanel: React.FC<RowDetailPanelProps> = ({ row, resourceKey, columns, collectedData }) => {
  const { vpcCollectedData } = useVpcData();

  const keyFields = useMemo(() => {
    const priorityFields = KEY_FIELDS[resourceKey] ?? columns.map((c) => c.field);
    // Show all non-empty fields: priority fields first (in order), then any extra fields on the row
    const seen = new Set<string>();
    const result: string[] = [];
    for (const f of priorityFields) {
      seen.add(f);
      result.push(f);
    }
    // Add any remaining fields from the row data that aren't already listed
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    }
    return result;
  }, [resourceKey, columns, row]);

  const relatedResources = useMemo(
    () => getRelatedResources(resourceKey, row, collectedData),
    [resourceKey, row, collectedData],
  );

  // Build a column lookup for formatting
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnDefinition>();
    columns.forEach((c) => map.set(c.field, c));
    return map;
  }, [columns]);

  // Get routes for routing tables
  const routingTableRoutes = useMemo(() => {
    if (resourceKey !== 'vpcRoutingTables') return [];
    const routingTableId = row.id as string;
    const routes = vpcCollectedData.vpcRoutes as Array<Record<string, unknown>> | undefined;
    if (!routes) return [];
    return routes.filter((r) => r.routingTableId === routingTableId);
  }, [resourceKey, row.id, vpcCollectedData.vpcRoutes]);

  return (
    <div
      style={{
        display: 'flex',
        gap: '2rem',
        padding: '1rem 1.5rem',
        background: 'var(--cds-layer-accent)',
        borderLeft: '4px solid var(--cds-link-primary)',
        borderBottom: '1px solid var(--cds-border-subtle)',
        fontSize: '0.8125rem',
        width: 'fit-content',
        minWidth: '100%',
      }}
    >
      {/* Key fields */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--cds-text-secondary)' }}>
          Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem' }}>
          {keyFields.map((field) => {
            const value = get(row, field);
            if (value === null || value === undefined || value === '') return null;
            const col = columnMap.get(field);
            const formatted = col ? formatValue(value, col.dataType, col.field) : String(value);
            const label = col?.header ?? field;

            return (
              <React.Fragment key={field}>
                <span style={{ color: 'var(--cds-text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatted}</span>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Related resources */}
      {relatedResources.length > 0 && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--cds-text-secondary)' }}>
            Related Resources
          </div>
          {relatedResources.map((group) => (
            <div key={group.label} style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                {group.label} ({group.items.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {group.items.slice(0, 20).map((item) => (
                  <Tag key={item.id} size="sm" type={group.relationType === 'children' ? 'blue' : 'purple'}>
                    {item.displayName}
                  </Tag>
                ))}
                {group.items.length > 20 && (
                  <Tag size="sm" type="gray">+{group.items.length - 20} more</Tag>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Routes for routing tables */}
      {resourceKey === 'vpcRoutingTables' && routingTableRoutes.length > 0 && (
        <div style={{ flex: 2, minWidth: 0 }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--cds-text-secondary)' }}>
            Routes ({routingTableRoutes.length})
          </div>
          <div style={{
            border: '1px solid var(--cds-border-subtle)',
            borderRadius: '4px',
            overflow: 'hidden',
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.75rem',
            }}>
              <thead>
                <tr style={{ background: 'var(--cds-layer-02)' }}>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--cds-border-subtle)' }}>Destination</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--cds-border-subtle)' }}>Action</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--cds-border-subtle)' }}>Next Hop</th>
                </tr>
              </thead>
              <tbody>
                {routingTableRoutes.slice(0, 50).map((route) => {
                  const nextHopType = route.nextHopType as string;
                  const nextHopTarget = route.nextHopTarget as string;
                  const nextHopDisplay = nextHopType && nextHopTarget
                    ? `${nextHopType}: ${nextHopTarget}`
                    : nextHopTarget || nextHopType || '-';
                  return (
                    <tr key={route.id as string} style={{ borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <td style={{ padding: '0.375rem 0.5rem', fontFamily: 'monospace' }}>{route.destination as string}</td>
                      <td style={{ padding: '0.375rem 0.5rem' }}>{route.action as string}</td>
                      <td style={{ padding: '0.375rem 0.5rem' }}>{nextHopDisplay}</td>
                    </tr>
                  );
                })}
                {routingTableRoutes.length > 50 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '0.375rem 0.5rem', color: 'var(--cds-text-secondary)', fontStyle: 'italic' }}>
                      +{routingTableRoutes.length - 50} more routes...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RowDetailPanel;
