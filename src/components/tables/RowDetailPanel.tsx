import React, { useMemo } from 'react';
import { Tag } from '@carbon/react';
import type { ColumnDefinition } from '@/types/resources';
import { get, formatValue } from '@/utils/formatters';
import { getRelatedResources } from '@/utils/relationships';
import { useVpcData } from '@/contexts/VpcDataContext';

const KEY_FIELDS: Record<string, string[]> = {
  virtualServers: ['id', 'hostname', 'domain', 'fqdn', 'primaryIp', 'backendIp', 'status', 'powerState', 'startCpus', 'maxCpu', 'maxMemory', 'diskGb', 'blockDeviceDetails', 'localDisk', 'os', 'datacenter', 'hourlyBilling', 'dedicated', 'privateNetworkOnly', 'placementGroupId', 'createDate', 'modifyDate', 'recurringFee', 'hourlyRate', 'billingCategories', 'networkVlans', 'tags', 'notes'],
  bareMetal: ['id', 'hostname', 'domain', 'fqdn', 'serialNumber', 'primaryIp', 'backendIp', 'cores', 'memory', 'hardDrives', 'hardDriveDetails', 'os', 'datacenter', 'provisionDate', 'recurringFee', 'powerSupplyCount', 'gatewayMember', 'networkComponents', 'nicDetails', 'networkVlans', 'tags', 'notes'],
  vlans: ['id', 'vlanNumber', 'name', 'networkSpace', 'primaryRouter', 'datacenter'],
  subnets: ['id', 'networkIdentifier', 'cidr', 'subnetType', 'gateway', 'datacenter', 'vlanNumber', 'usableIpAddressCount'],
  gateways: ['id', 'name', 'publicIp', 'privateIp', 'datacenter', 'status', 'memberCount', 'networkSpace'],
  firewalls: ['id', 'firewallType', 'primaryIpAddress', 'datacenter', 'vlanNumber'],
  blockStorage: ['id', 'username', 'storageType', 'capacityGb', 'iops', 'datacenter', 'recurringFee'],
  fileStorage: ['id', 'username', 'storageType', 'capacityGb', 'iops', 'datacenter', 'recurringFee'],
  objectStorage: ['id', 'name', 'datacenter'],
  sslCerts: ['id', 'commonName', 'validityBegin', 'validityEnd'],
  sshKeys: ['id', 'label', 'fingerprint', 'createDate'],
  dnsDomains: ['id', 'name', 'serial', 'updateDate'],
  dnsRecords: ['id', 'host', 'type', 'data', 'ttl', 'domainId'],
  loadBalancers: ['id', 'name', 'address', 'datacenter', 'type', 'status'],
  securityGroups: ['id', 'name', 'description', 'createDate'],
  placementGroups: ['id', 'name', 'rule', 'datacenter', 'createDate'],
  dedicatedHosts: ['id', 'name', 'datacenter', 'cpuCount', 'memoryCapacity', 'diskCapacity'],
  users: ['id', 'username', 'firstName', 'lastName', 'email', 'createDate', 'status'],
  billingItems: ['id', 'description', 'categoryCode', 'recurringFee', 'createDate'],
  eventLog: ['eventName', 'objectName', 'userType', 'eventCreateDate'],
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
    const fieldList = KEY_FIELDS[resourceKey];
    if (fieldList) {
      return fieldList;
    }
    // Fallback: show all column fields
    return columns.map((c) => c.field);
  }, [resourceKey, columns]);

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
