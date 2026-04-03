import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { TopologyNodeData, TgwConnectionNodeData } from '@/hooks/useTopologyData';
import {
  ChevronDown,
  ChevronUp,
  VirtualPrivateCloud,
  Cube,
  ConnectionTwoWay,
  DirectLink,
  Flash,
} from '@carbon/icons-react';
import { Tooltip } from '@carbon/react';

const nodeBase: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--cds-border-subtle, #e0e0e0)',
  background: 'var(--cds-layer, #fff)',
  fontSize: '0.75rem',
  fontFamily: "'IBM Plex Sans', sans-serif",
  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  minWidth: 120,
};

const statusDot = (status?: string): React.CSSProperties => {
  let color = '#6f6f6f';
  const s = (status ?? '').toLowerCase();
  if (s.includes('running') || s.includes('active')) color = '#24a148';
  else if (s.includes('stopped') || s.includes('halted')) color = '#6f6f6f';
  else if (s.includes('starting') || s.includes('provisioning')) color = '#f1c21b';
  else if (s.includes('error')) color = '#da1e28';
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: color,
    display: 'inline-block',
  };
};

// Internet Node
export const InternetNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{ ...nodeBase, background: 'var(--cds-background-inverse, #161616)', color: 'var(--cds-text-inverse, #fff)', textAlign: 'center', minWidth: 100 }}>
      <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>&#9729;</div>
      <div style={{ fontWeight: 600 }}>{d.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#da1e28' }} />
    </div>
  );
});
InternetNode.displayName = 'InternetNode';

// Router Node (FCR / BCR)
export const RouterNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  const isFCR = d.routerType === 'fcr';
  const color = isFCR ? '#da1e28' : '#0f62fe';
  return (
    <div style={{
      ...nodeBase,
      borderColor: color,
      borderWidth: 2,
      textAlign: 'center',
      minWidth: 140,
      background: isFCR ? 'rgba(218, 30, 40, 0.08)' : 'rgba(15, 98, 254, 0.08)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      <div style={{ fontSize: '0.625rem', color: 'var(--cds-text-secondary)' }}>
        {isFCR ? 'Frontend Customer Router' : 'Backend Customer Router'}
      </div>
      {d.datacenter && (
        <div style={{ color: 'var(--cds-text-secondary)', marginTop: 2 }}>{d.datacenter}</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
});
RouterNode.displayName = 'RouterNode';

// Gateway Node
export const GatewayNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{ ...nodeBase, borderColor: '#525252', borderWidth: 2 }}>
      <Handle type="target" position={Position.Top} style={{ background: '#525252' }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.label}</div>
      {d.ip && <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)' }}>{d.ip}</div>}
      <div style={{ color: 'var(--cds-text-secondary)', marginTop: 4 }}>
        {d.memberCount ?? 0} members
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#525252' }} />
    </div>
  );
});
GatewayNode.displayName = 'GatewayNode';

// VLAN Node — shows subnet count and CIDR list
export const VlanNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  const hasSubnets = (d.subnetCount ?? 0) > 0;
  const vlanColor = d.networkSpace === 'PUBLIC' ? '#da1e28' : '#0f62fe';
  const cidrs = (d.subnetCidrs ?? []) as string[];
  return (
    <div style={{ ...nodeBase, borderColor: vlanColor, borderStyle: 'dashed' }}>
      <Handle type="target" position={Position.Top} style={{ background: vlanColor }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>VLAN {d.vlanNumber}</span>
        <span style={{
          fontSize: '0.625rem',
          padding: '1px 6px',
          borderRadius: 4,
          background: d.networkSpace === 'PUBLIC' ? '#ffd7d9' : '#d0e2ff',
          color: d.networkSpace === 'PUBLIC' ? '#a2191f' : '#002d9c',
        }}>
          {d.networkSpace}
        </span>
      </div>
      {d.label !== `VLAN ${d.vlanNumber}` && (
        <div style={{ color: 'var(--cds-text-secondary)' }}>{d.label}</div>
      )}
      <div style={{ color: 'var(--cds-text-secondary)', marginTop: 2 }}>{d.datacenter}</div>
      {hasSubnets && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: 2 }}>
            {d.subnetCount} subnet{d.subnetCount !== 1 ? 's' : ''}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5625rem', color: 'var(--cds-text-secondary)', lineHeight: 1.4 }}>
            {cidrs.map((cidr, i) => {
              const isIPv6 = cidr.includes('(IPv6)');
              const isLinkLocal = cidr.includes('(link-local)');
              return (
                <div key={i}>
                  {isIPv6 ? (
                    <>{cidr.replace(' (IPv6)', '')} <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.5rem', opacity: 0.7, fontStyle: 'italic', color: '#8a3ffc' }}>IPv6</span></>
                  ) : isLinkLocal ? (
                    <>{cidr.replace(' (link-local)', '')} <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.5rem', opacity: 0.7, fontStyle: 'italic' }}>link-local</span></>
                  ) : cidr}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: vlanColor }} />
    </div>
  );
});
VlanNode.displayName = 'VlanNode';

// Subnet Node
export const SubnetNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: 'var(--cds-border-strong, #8d8d8d)',
      borderStyle: 'dotted',
      borderWidth: 1,
      minWidth: 100,
      fontSize: '0.6875rem',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: 'var(--cds-border-strong, #8d8d8d)' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {d.networkIdentifier}/{d.cidr}
      </div>
      <div style={{ color: 'var(--cds-text-secondary)' }}>
        {d.subnetType} &middot; {d.usableIpCount ?? 0} IPs
      </div>
      {d.gateway ? (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)', marginTop: 2, fontSize: '0.625rem' }}>
          gw: {String(d.gateway)}
        </div>
      ) : null}
    </div>
  );
});
SubnetNode.displayName = 'SubnetNode';

// Firewall Node
export const FirewallNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{ ...nodeBase, borderColor: '#da1e28', borderWidth: 2, minWidth: 100 }}>
      <Handle type="target" position={Position.Top} style={{ background: '#da1e28' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>&#128737; {d.label}</div>
      {d.ip && <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)' }}>{d.ip}</div>}
      <Handle type="source" position={Position.Bottom} style={{ background: '#da1e28' }} />
    </div>
  );
});
FirewallNode.displayName = 'FirewallNode';

// VSI Node
export const VSINode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{ ...nodeBase }}>
      <Handle type="target" position={Position.Top} style={{ background: '#da1e28' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={statusDot(d.status)} />
        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
          {d.label}
        </span>
      </div>
      <div style={{ color: 'var(--cds-text-secondary)' }}>
        {d.cpu} vCPU &middot; {d.memory} GB
      </div>
      {d.os && (
        <div style={{ color: 'var(--cds-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
          {d.os}
        </div>
      )}
      {(d.publicIp || d.privateIp) && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", marginTop: 4, color: 'var(--cds-text-secondary)', fontSize: '0.6875rem', lineHeight: 1.4 }}>
          {d.publicIp && <div style={{ color: '#da1e28' }}>{d.publicIp}</div>}
          {d.privateIp && <div style={{ color: '#0f62fe' }}>{d.privateIp}</div>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#0f62fe' }} />
    </div>
  );
});
VSINode.displayName = 'VSINode';

// Bare Metal Node
export const BareMetalNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{ ...nodeBase }}>
      <Handle type="target" position={Position.Top} style={{ background: '#002d9c' }} />
      <div style={{ background: '#002d9c', height: 4, borderRadius: 2, marginBottom: 6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={statusDot(d.status)} />
        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
          {d.label}
        </span>
      </div>
      <div style={{ color: 'var(--cds-text-secondary)' }}>
        {d.cpu} cores &middot; {d.memory} GB
      </div>
      {(d.publicIp || d.privateIp) && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", marginTop: 4, color: 'var(--cds-text-secondary)', fontSize: '0.6875rem', lineHeight: 1.4 }}>
          {d.publicIp && <div style={{ color: '#da1e28' }}>{d.publicIp}</div>}
          {d.privateIp && <div style={{ color: '#0f62fe' }}>{d.privateIp}</div>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#002d9c' }} />
    </div>
  );
});
BareMetalNode.displayName = 'BareMetalNode';

// Storage Node
export const StorageNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{ ...nodeBase, borderColor: '#0f62fe', borderStyle: 'dotted' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#0f62fe' }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        &#9670; {d.label}
      </div>
      <div style={{ color: 'var(--cds-text-secondary)' }}>
        {d.capacityGb} GB &middot; {d.storageType}
      </div>
    </div>
  );
});
StorageNode.displayName = 'StorageNode';

// Storage Group Node — one per datacenter, click to expand detail list
export const StorageGroupNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);
  const details = d.storageDetails ?? [];
  const breakdown = d.storageBreakdown;
  return (
    <div
      style={{ ...nodeBase, borderColor: '#0f62fe', borderStyle: 'dotted', cursor: 'pointer', minWidth: 160 }}
      onClick={toggle}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#0f62fe' }} />
      <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>&#9670; {d.storageCount} Volumes</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      <div style={{ color: 'var(--cds-text-secondary)', marginBottom: 2 }}>
        {d.totalCapacityGb?.toLocaleString()} GB total
      </div>
      {breakdown && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.75rem' }}>
          {breakdown.block} block &middot; {breakdown.file} file
        </div>
      )}
      {expanded && details.length > 0 && (
        <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', borderTop: '1px solid var(--cds-border-subtle)', paddingTop: 4 }}>
          {details.map((item, i) => (
            <div key={i} style={{ fontSize: '0.75rem', padding: '2px 0', color: 'var(--cds-text-secondary)' }}>
              {item.label} &middot; {item.capacityGb} GB &middot; {item.storageType}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
StorageGroupNode.displayName = 'StorageGroupNode';

// Private Network Node — bottom anchor for subnet topology
export const PrivateNetworkNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{ ...nodeBase, background: '#0f62fe', color: '#fff', textAlign: 'center', minWidth: 100 }}>
      <Handle type="target" position={Position.Top} style={{ background: '#0f62fe' }} />
      <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>&#9737;</div>
      <div style={{ fontWeight: 600 }}>{d.label}</div>
    </div>
  );
});
PrivateNetworkNode.displayName = 'PrivateNetworkNode';

// Subnet Detail Node — rich card for subnet topology view
export const SubnetDetailNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  const isPublic = d.networkSpace === 'PUBLIC';
  const borderColor = isPublic ? '#da1e28' : '#0f62fe';
  const badgeBg = isPublic ? '#ffd7d9' : '#d0e2ff';
  const badgeColor = isPublic ? '#a2191f' : '#002d9c';
  return (
    <div style={{
      ...nodeBase,
      borderColor,
      borderWidth: 2,
      minWidth: 180,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: borderColor }} />
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.8125rem' }}>
        {d.networkIdentifier}/{d.cidr}
      </div>
      {d.gateway != null && d.gateway !== '' && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)', fontSize: '0.6875rem', marginBottom: 4 }}>
          gw: {String(d.gateway)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{
          fontSize: '0.625rem',
          padding: '1px 6px',
          borderRadius: 4,
          background: badgeBg,
          color: badgeColor,
          fontWeight: 600,
        }}>
          {d.subnetType}
        </span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)' }}>
          {d.usableIpCount ?? 0} IPs
        </span>
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)' }}>
        VLAN {d.vlanNumber} &middot; {d.datacenter}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: borderColor }} />
    </div>
  );
});
SubnetDetailNode.displayName = 'SubnetDetailNode';

// Dual-NIC Device Node — gateway appliance or compute with both public and private IPs
export const DualNicDeviceNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  const deviceType = d.deviceType as string | undefined;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#525252',
      borderWidth: 2,
      minWidth: 170,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#da1e28' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {d.status && <span style={statusDot(d.status)} />}
        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
          {d.label}
        </span>
      </div>
      {deviceType && (
        <div style={{
          fontSize: '0.625rem',
          padding: '1px 6px',
          borderRadius: 4,
          background: 'var(--cds-layer-accent, #e0e0e0)',
          color: 'var(--cds-text-primary)',
          display: 'inline-block',
          marginBottom: 4,
          fontWeight: 600,
        }}>
          {deviceType}
        </div>
      )}
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem' }}>
        {d.publicIp && (
          <div style={{ color: '#da1e28' }}>pub: {String(d.publicIp)}</div>
        )}
        {d.privateIp && (
          <div style={{ color: '#0f62fe' }}>priv: {String(d.privateIp)}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#0f62fe' }} />
    </div>
  );
});
DualNicDeviceNode.displayName = 'DualNicDeviceNode';

// Private Network Bus Bar — wide horizontal bar connecting all BCRs
export const PrivateNetworkBusNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{
      padding: '8px 24px',
      borderRadius: 6,
      background: '#0f62fe',
      color: '#fff',
      textAlign: 'center',
      minWidth: 600,
      fontSize: '0.75rem',
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontWeight: 600,
      boxShadow: '0 2px 6px rgba(15, 98, 254, 0.3)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#0f62fe' }} />
      <div>{d.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#0f62fe' }} />
    </div>
  );
});
PrivateNetworkBusNode.displayName = 'PrivateNetworkBusNode';

// Cloud Services Node
export const CloudServicesNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#198038',
      borderWidth: 2,
      background: 'rgba(25, 128, 56, 0.08)',
      textAlign: 'center',
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#198038' }} />
      <div style={{ fontSize: '1rem', marginBottom: 2 }}>&#9729;</div>
      <div style={{ fontWeight: 600, color: '#198038' }}>{d.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#198038' }} />
    </div>
  );
});
CloudServicesNode.displayName = 'CloudServicesNode';

// Connection type badge colors for TGW route prefix grouping
const tgwConnTypeColor: Record<string, { bg: string; text: string }> = {
  power_virtual_server: { bg: '#ffd6e8', text: '#9f1853' },
  vpc: { bg: '#d0e2ff', text: '#002d9c' },
  classic: { bg: '#e0e0e0', text: '#393939' },
  directlink: { bg: '#fff2e8', text: '#8a3800' },
  gre_tunnel: { bg: '#d9fbfb', text: '#004144' },
  unbound_gre_tunnel: { bg: '#d9fbfb', text: '#004144' },
  redundant_gre: { bg: '#d9fbfb', text: '#004144' },
  redundant_gre_tunnel: { bg: '#d9fbfb', text: '#004144' },
};

// Transit Gateway Node — with route prefix display (grouped by connection when available)
export const TransitGatewayNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  const prefixes = (d.routePrefixes ?? []) as string[];
  const connectionPrefixes = d.connectionPrefixes as Array<{
    connectionId: string;
    connectionName: string;
    connectionType: string;
    prefixes: string[];
  }> | undefined;
  const hasGrouped = connectionPrefixes && connectionPrefixes.length > 0;
  const MAX_DISPLAY = 8;
  const MAX_PREFIXES_PER_CONN = 4;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#8a3ffc',
      borderWidth: 2,
      background: 'rgba(138, 63, 252, 0.08)',
      minWidth: 160,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#8a3ffc' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={statusDot(d.status)} />
        <span style={{ fontWeight: 600, color: '#8a3ffc' }}>{d.label}</span>
      </div>
      {d.location && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.6875rem' }}>{String(d.location)}</div>
      )}
      {hasGrouped ? (
        <div style={{ marginTop: 6, maxHeight: 120, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: 4 }}>
            {prefixes.length} route{prefixes.length !== 1 ? 's' : ''} via {connectionPrefixes.length} connection{connectionPrefixes.length !== 1 ? 's' : ''}
          </div>
          {connectionPrefixes.map((cp) => {
            const colors = tgwConnTypeColor[cp.connectionType] ?? tgwConnTypeColor.classic;
            const cpOverflow = cp.prefixes.length - MAX_PREFIXES_PER_CONN;
            return (
              <div key={cp.connectionId} style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                  <span style={{
                    fontSize: '0.5rem',
                    padding: '0px 4px',
                    borderRadius: 3,
                    background: colors.bg,
                    color: colors.text,
                    fontWeight: 600,
                  }}>
                    {cp.connectionType}
                  </span>
                  <span style={{ fontSize: '0.5625rem', color: 'var(--cds-text-secondary)', fontWeight: 600 }}>
                    {cp.connectionName} ({cp.prefixes.length})
                  </span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: 'var(--cds-text-secondary)', lineHeight: 1.3, paddingLeft: 4 }}>
                  {cp.prefixes.slice(0, MAX_PREFIXES_PER_CONN).map((p, i) => (
                    <div key={i}>{p}</div>
                  ))}
                  {cpOverflow > 0 && <div>+{cpOverflow} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : prefixes.length > 0 ? (
        <div style={{ marginTop: 6, maxHeight: 80, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: 2 }}>
            {prefixes.length} route{prefixes.length !== 1 ? 's' : ''}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5625rem', color: 'var(--cds-text-secondary)', lineHeight: 1.4 }}>
            {prefixes.slice(0, MAX_DISPLAY).map((p, i) => (
              <div key={i}>{p}</div>
            ))}
            {prefixes.length - MAX_DISPLAY > 0 && <div>+{prefixes.length - MAX_DISPLAY} more</div>}
          </div>
        </div>
      ) : null}
      <Handle type="source" position={Position.Bottom} style={{ background: '#8a3ffc' }} />
    </div>
  );
});
TransitGatewayNode.displayName = 'TransitGatewayNode';

// Direct Link Node
export const DirectLinkNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#ff832b',
      borderWidth: 2,
      background: 'rgba(255, 131, 43, 0.08)',
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#ff832b' }} />
      <div style={{ fontWeight: 600, color: '#ff832b', marginBottom: 4 }}>{d.label}</div>
      {d.dlType && (
        <div style={{
          fontSize: '0.625rem',
          padding: '1px 6px',
          borderRadius: 4,
          background: '#fff2e8',
          color: '#8a3800',
          display: 'inline-block',
          marginBottom: 4,
          fontWeight: 600,
        }}>
          {String(d.dlType)}
        </div>
      )}
      {d.speed && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.6875rem' }}>{String(d.speed)} Mbps</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#ff832b' }} />
    </div>
  );
});
DirectLinkNode.displayName = 'DirectLinkNode';

// VPN Gateway Node (VPC VPN GW discovered via TGW)
export const VpnGatewayNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#005d5d',
      borderWidth: 2,
      background: 'rgba(0, 93, 93, 0.08)',
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#005d5d' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={statusDot(d.status)} />
        <span style={{ fontWeight: 600, color: '#005d5d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
          {d.label}
        </span>
      </div>
      {d.vpnMode && (
        <div style={{
          fontSize: '0.625rem',
          padding: '1px 6px',
          borderRadius: 4,
          background: '#d9fbfb',
          color: '#004144',
          display: 'inline-block',
          marginBottom: 4,
          fontWeight: 600,
        }}>
          {String(d.vpnMode)}
        </div>
      )}
      {d.vpcName && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.6875rem' }}>{String(d.vpcName)}</div>
      )}
      {d.vpcRegion && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>{String(d.vpcRegion)}</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#005d5d' }} />
    </div>
  );
});
VpnGatewayNode.displayName = 'VpnGatewayNode';

// Connection type icons for TGW connections (Carbon icons)
const connectionTypeIcons: Record<string, React.ReactNode> = {
  vpc: <VirtualPrivateCloud size={16} />,
  classic: <Cube size={16} />,
  gre_tunnel: <ConnectionTwoWay size={16} />,
  unbound_gre_tunnel: <ConnectionTwoWay size={16} />,
  redundant_gre: <ConnectionTwoWay size={16} />,
  redundant_gre_tunnel: <ConnectionTwoWay size={16} />,
  directlink: <DirectLink size={16} />,
  power_virtual_server: <Flash size={16} />,
};

// TGW Connection Node — for Classic topology (separate node for each TGW connection)
export const TgwConnectionNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as TgwConnectionNodeData;
  const [expanded, setExpanded] = useState(false);
  const prefixes = (d.prefixes ?? []) as string[];
  const MAX_COLLAPSED = 3;
  const MAX_EXPANDED = 12;
  const colors = tgwConnTypeColor[d.connectionType] ?? tgwConnTypeColor.classic;
  const typeIcon = connectionTypeIcons[d.connectionType] ?? <Cube size={16} />;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (prefixes.length > 0) {
      setExpanded((prev) => !prev);
    }
  }, [prefixes.length]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (d.onOpenDetail) {
      d.onOpenDetail(d);
    }
  }, [d]);

  const displayPrefixes = expanded ? prefixes.slice(0, MAX_EXPANDED) : prefixes.slice(0, MAX_COLLAPSED);
  const remainingCount = expanded
    ? prefixes.length - MAX_EXPANDED
    : prefixes.length - MAX_COLLAPSED;

  const hasExpandableContent = prefixes.length > 0;

  return (
    <div
      style={{
        ...nodeBase,
        borderLeft: `4px solid ${colors.text}`,
        minWidth: 170,
        padding: '8px 12px',
        cursor: hasExpandableContent ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#8a3ffc' }} />

      {/* Header with icon and name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', color: colors.text }}>{typeIcon}</span>
        <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {d.connectionName}
        </span>
        {hasExpandableContent && (
          <span style={{ color: 'var(--cds-text-secondary)', flexShrink: 0 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={statusDot(d.status)} />
        <span style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>
          {d.status ?? 'unknown'}
        </span>
      </div>

      {/* Type badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.5625rem',
          padding: '1px 5px',
          borderRadius: 3,
          background: colors.bg,
          color: colors.text,
          fontWeight: 600,
        }}>
          {d.connectionType}
        </span>
        {d.networkAccountId && (
          <Tooltip label={`Network Account: ${d.networkAccountId}`} align="bottom">
            <span style={{
              fontSize: '0.5625rem',
              padding: '1px 5px',
              borderRadius: 3,
              background: '#e8daff',
              color: '#6929c4',
              fontWeight: 600,
            }}>
              Cross
            </span>
          </Tooltip>
        )}
      </div>

      {/* Summary line (collapsed) */}
      {!expanded && (
        prefixes.length > 0 ? (
          <div style={{ fontSize: '0.625rem', color: 'var(--cds-text-secondary)' }}>
            {prefixes.length} route prefix{prefixes.length !== 1 ? 'es' : ''}
          </div>
        ) : (
          <div style={{ fontSize: '0.625rem', color: 'var(--cds-text-helper)', fontStyle: 'italic' }}>
            No route prefixes
          </div>
        )
      )}

      {/* Expanded prefix list */}
      {expanded && prefixes.length > 0 && (
        <div style={{ marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: 4 }}>
            {prefixes.length} route prefix{prefixes.length !== 1 ? 'es' : ''}
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.5625rem',
            color: 'var(--cds-text-secondary)',
            lineHeight: 1.5,
            background: 'var(--cds-field, #f4f4f4)',
            borderRadius: 4,
            padding: '4px 6px',
          }}>
            {displayPrefixes.map((p, i) => (
              <div key={i}>{p}</div>
            ))}
            {remainingCount > 0 && (
              <div style={{ fontStyle: 'italic', marginTop: 2 }}>+{remainingCount} more...</div>
            )}
          </div>
        </div>
      )}

      {/* Double-click hint */}
      {expanded && d.onOpenDetail && (
        <div style={{
          marginTop: 6,
          paddingTop: 4,
          borderTop: '1px solid var(--cds-border-subtle)',
          fontSize: '0.5625rem',
          color: 'var(--cds-text-helper)',
          textAlign: 'center',
        }}>
          Double-click for full details
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: '#8a3ffc' }} />
    </div>
  );
});
TgwConnectionNode.displayName = 'TgwConnectionNode';

// Combined nodeTypes object including all node types for both Infrastructure and Subnet views
// This prevents React Flow warnings when switching between views
import type { NodeTypes } from '@xyflow/react';

export const allClassicNodeTypes: NodeTypes = {
  // Common to both views
  internetNode: InternetNode as any,
  routerNode: RouterNode as any,
  privateNetworkBusNode: PrivateNetworkBusNode as any,
  transitGatewayNode: TransitGatewayNode as any,
  tgwConnectionNode: TgwConnectionNode as any,
  directLinkNode: DirectLinkNode as any,
  vpnGatewayNode: VpnGatewayNode as any,
  // Infrastructure view
  gatewayNode: GatewayNode as any,
  vlanNode: VlanNode as any,
  firewallNode: FirewallNode as any,
  vsiNode: VSINode as any,
  bareMetalNode: BareMetalNode as any,
  storageNode: StorageNode as any,
  storageGroupNode: StorageGroupNode as any,
  cloudServicesNode: CloudServicesNode as any,
  // Subnet view
  subnetDetailNode: SubnetDetailNode as any,
  dualNicDeviceNode: DualNicDeviceNode as any,
};
