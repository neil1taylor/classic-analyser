import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Tooltip } from '@carbon/react';
import {
  ChevronDown,
  ChevronUp,
  VirtualPrivateCloud,
  Cube,
  ConnectionTwoWay,
  DirectLink,
  Flash,
} from '@carbon/icons-react';

export interface VpcTopologyNodeData {
  label: string;
  nodeType: string;
  // Transit Gateway
  location?: string;
  isGlobal?: boolean;
  connectionCount?: number;
  // VPC
  region?: string;
  classicAccess?: boolean;
  // Subnet
  cidr?: string;
  zone?: string;
  availableIps?: number;
  // Instance
  status?: string;
  profile?: string;
  vcpu?: number;
  memory?: number;
  primaryIp?: string;
  // Load Balancer
  hostname?: string;
  isPublic?: boolean;
  // Public Gateway
  floatingIp?: string;
  // VPN Gateway
  mode?: string;
  // TGW Connection
  connectionId?: string;
  connectionStatus?: string;
  networkType?: string;
  subnetCount?: number;
  routePrefixes?: string[];
  ownershipType?: 'Own Account' | 'Cross Account' | 'Unknown';
  networkAccountId?: string;
  transitGatewayId?: string;
  transitGatewayName?: string;
  // Callback for opening detail panel
  onOpenDetail?: (data: VpcTopologyNodeData) => void;
  [key: string]: unknown;
}

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
  if (s.includes('running') || s.includes('active') || s.includes('available')) color = '#24a148';
  else if (s.includes('stopped') || s.includes('halted')) color = '#6f6f6f';
  else if (s.includes('starting') || s.includes('provisioning') || s.includes('pending')) color = '#f1c21b';
  else if (s.includes('error') || s.includes('failed')) color = '#da1e28';
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: color,
    display: 'inline-block',
  };
};

// Transit Gateway Node
export const TransitGatewayNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as VpcTopologyNodeData;
  const isGlobal = d.isGlobal === true;
  return (
    <div style={{
      ...nodeBase,
      background: 'var(--cds-background-inverse, #161616)',
      color: 'var(--cds-text-inverse, #fff)',
      textAlign: 'center',
      minWidth: 160,
    }}>
      <div style={{ fontSize: '1rem', marginBottom: 4 }}>&#9673;</div>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      <div style={{ fontSize: '0.625rem', opacity: 0.8, marginBottom: 4 }}>
        {d.location}
      </div>
      <Tooltip label={isGlobal ? 'Routes can reach resources in any region' : 'Routes are limited to the local region'} align="bottom">
        <span style={{
          fontSize: '0.5625rem',
          padding: '1px 6px',
          borderRadius: 3,
          background: isGlobal ? '#24a148' : '#6f6f6f',
          color: '#fff',
          fontWeight: 600,
        }}>
          {isGlobal ? 'Global' : 'Local'}
        </span>
      </Tooltip>
      {(d.connectionCount ?? 0) > 0 && (
        <div style={{ fontSize: '0.625rem', opacity: 0.7, marginTop: 4 }}>
          {d.connectionCount} connection{d.connectionCount !== 1 ? 's' : ''}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#198038' }} />
    </div>
  );
});
TransitGatewayNode.displayName = 'TransitGatewayNode';

// VPC Node
export const VpcNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as VpcTopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#0f62fe',
      borderWidth: 2,
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#0f62fe' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>
        {d.region}
      </div>
      {d.classicAccess && (
        <Tooltip label="This VPC has connectivity to Classic infrastructure" align="bottom">
          <span style={{
            fontSize: '0.5625rem',
            padding: '1px 5px',
            borderRadius: 3,
            background: '#d0e2ff',
            color: '#002d9c',
            fontWeight: 600,
            marginTop: 4,
            display: 'inline-block',
          }}>
            Classic Access
          </span>
        </Tooltip>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#0f62fe' }} />
    </div>
  );
});
VpcNode.displayName = 'VpcNode';

// VPC Subnet Node
export const VpcSubnetNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as VpcTopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderStyle: 'dashed',
      borderColor: 'var(--cds-border-strong, #8d8d8d)',
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: 'var(--cds-border-strong, #8d8d8d)' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      {d.cidr && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)', fontSize: '0.6875rem' }}>
          {d.cidr}
        </div>
      )}
      <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem', marginTop: 2 }}>
        {d.zone}{d.availableIps !== undefined ? <>{' \u00b7 '}<Tooltip label="Available IP addresses in this subnet" align="bottom"><span>{d.availableIps} IPs avail</span></Tooltip></> : ''}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--cds-border-strong, #8d8d8d)' }} />
    </div>
  );
});
VpcSubnetNode.displayName = 'VpcSubnetNode';

// VPC Instance Node
export const VpcInstanceNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as VpcTopologyNodeData;
  return (
    <div style={{ ...nodeBase }}>
      <Handle type="target" position={Position.Top} style={{ background: '#393939' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={statusDot(d.status)} />
        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
          {d.label}
        </span>
      </div>
      {d.profile && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>{d.profile}</div>
      )}
      <div style={{ color: 'var(--cds-text-secondary)' }}>
        {d.vcpu ? `${d.vcpu} vCPU` : ''}{d.memory ? ` \u00b7 ${d.memory} GB` : ''}
      </div>
      {d.primaryIp && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", marginTop: 4, color: 'var(--cds-text-secondary)' }}>
          {d.primaryIp}
        </div>
      )}
    </div>
  );
});
VpcInstanceNode.displayName = 'VpcInstanceNode';

// VPC Load Balancer Node
export const VpcLoadBalancerNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as VpcTopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#8a3ffc',
      borderWidth: 1,
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#8a3ffc' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      {d.hostname && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)', fontSize: '0.5625rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
          {d.hostname}
        </div>
      )}
      <Tooltip label={d.isPublic ? 'Load balancer is internet-facing' : 'Load balancer serves only private network traffic'} align="bottom">
        <span style={{
          fontSize: '0.5625rem',
          padding: '1px 5px',
          borderRadius: 3,
          background: d.isPublic ? '#ffd7d9' : '#d0e2ff',
          color: d.isPublic ? '#a2191f' : '#002d9c',
          fontWeight: 600,
          marginTop: 4,
          display: 'inline-block',
        }}>
          {d.isPublic ? 'Public' : 'Private'}
        </span>
      </Tooltip>
      <Handle type="source" position={Position.Bottom} style={{ background: '#8a3ffc' }} />
    </div>
  );
});
VpcLoadBalancerNode.displayName = 'VpcLoadBalancerNode';

// VPC Public Gateway Node
export const VpcPublicGatewayNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as VpcTopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#da1e28',
      borderWidth: 1,
      minWidth: 120,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#da1e28' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      {d.floatingIp && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)', fontSize: '0.6875rem' }}>
          {d.floatingIp}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#da1e28' }} />
    </div>
  );
});
VpcPublicGatewayNode.displayName = 'VpcPublicGatewayNode';

// VPC VPN Gateway Node
export const VpcVpnGatewayNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as VpcTopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#005d5d',
      borderWidth: 1,
      minWidth: 120,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#005d5d' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={statusDot(d.status)} />
        <span style={{ fontWeight: 600 }}>{d.label}</span>
      </div>
      {d.mode && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>{d.mode}</div>
      )}
    </div>
  );
});
VpcVpnGatewayNode.displayName = 'VpcVpnGatewayNode';

// Color mapping for connection types
const connectionTypeColor: Record<string, { bg: string; text: string }> = {
  power_virtual_server: { bg: '#ffd6e8', text: '#9f1853' },
  vpc: { bg: '#d0e2ff', text: '#002d9c' },
  classic: { bg: '#e0e0e0', text: '#393939' },
  directlink: { bg: '#fff2e8', text: '#8a3800' },
  gre_tunnel: { bg: '#d9fbfb', text: '#004144' },
  unbound_gre_tunnel: { bg: '#d9fbfb', text: '#004144' },
  redundant_gre: { bg: '#d9fbfb', text: '#004144' },
  redundant_gre_tunnel: { bg: '#d9fbfb', text: '#004144' },
};

// Ownership badge colors
const ownershipColors: Record<string, { bg: string; text: string }> = {
  'Own Account': { bg: '#d0e2ff', text: '#002d9c' },
  'Cross Account': { bg: '#e8daff', text: '#6929c4' },
  'Unknown': { bg: '#e0e0e0', text: '#525252' },
};

// Connection type icons (Carbon icons)
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

// TGW Connection Node with expand/collapse
export const TgwConnectionNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as VpcTopologyNodeData;
  const [expanded, setExpanded] = useState(false);
  const prefixes = (d.routePrefixes ?? []) as string[];
  const isVpcType = d.networkType === 'vpc';
  const MAX_COLLAPSED = 3;
  const MAX_EXPANDED = 12;
  const typeColors = connectionTypeColor[d.networkType ?? ''] ?? connectionTypeColor.classic;
  const ownership = d.ownershipType ?? 'Unknown';
  const ownerColors = ownershipColors[ownership] ?? ownershipColors.Unknown;
  const typeIcon = connectionTypeIcons[d.networkType ?? ''] ?? <Cube size={16} />;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (prefixes.length > 0 || (isVpcType && (d.subnetCount ?? 0) > 0)) {
      setExpanded((prev) => !prev);
    }
  }, [prefixes.length, isVpcType, d.subnetCount]);

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

  const hasExpandableContent = prefixes.length > 0 || (isVpcType && (d.subnetCount ?? 0) > 0);

  return (
    <div
      style={{
        ...nodeBase,
        borderLeft: `4px solid ${typeColors.text}`,
        minWidth: 170,
        padding: '8px 12px',
        cursor: hasExpandableContent ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#198038' }} />

      {/* Header with icon and name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', color: typeColors.text }}>{typeIcon}</span>
        <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {d.label}
        </span>
        {hasExpandableContent && (
          <span style={{ color: 'var(--cds-text-secondary)', flexShrink: 0 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={statusDot(d.connectionStatus)} />
        <span style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>
          {d.connectionStatus ?? 'unknown'}
        </span>
      </div>

      {/* Type and ownership badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
        {d.networkType && (
          <span style={{
            fontSize: '0.5625rem',
            padding: '1px 5px',
            borderRadius: 3,
            background: typeColors.bg,
            color: typeColors.text,
            fontWeight: 600,
          }}>
            {d.networkType}
          </span>
        )}
        {ownership !== 'Unknown' && (
          <Tooltip label={ownership === 'Cross Account' ? `Connected from account ${d.networkAccountId ?? 'unknown'}` : 'Connection owned by your account'} align="bottom">
            <span style={{
              fontSize: '0.5625rem',
              padding: '1px 5px',
              borderRadius: 3,
              background: ownerColors.bg,
              color: ownerColors.text,
              fontWeight: 600,
            }}>
              {ownership === 'Own Account' ? 'Own' : 'Cross'}
            </span>
          </Tooltip>
        )}
      </div>

      {/* Summary line (collapsed) */}
      {!expanded && (
        <>
          {isVpcType && (d.subnetCount ?? 0) > 0 && (
            <div style={{ fontSize: '0.625rem', color: '#198038' }}>
              {d.subnetCount} subnet{d.subnetCount !== 1 ? 's' : ''} reachable
            </div>
          )}
          {prefixes.length > 0 ? (
            <div style={{ fontSize: '0.625rem', color: 'var(--cds-text-secondary)' }}>
              {prefixes.length} route prefix{prefixes.length !== 1 ? 'es' : ''}
            </div>
          ) : !isVpcType && (
            <div style={{ fontSize: '0.625rem', color: 'var(--cds-text-helper)', fontStyle: 'italic' }}>
              No route prefixes
            </div>
          )}
        </>
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

      {/* Expanded subnet info for VPC type */}
      {expanded && isVpcType && (d.subnetCount ?? 0) > 0 && (
        <div style={{ marginTop: 4, fontSize: '0.625rem', color: '#198038' }}>
          {d.subnetCount} subnet{d.subnetCount !== 1 ? 's' : ''} reachable via this connection
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

      <Handle type="source" position={Position.Bottom} style={{ background: '#198038' }} />
    </div>
  );
});
TgwConnectionNode.displayName = 'TgwConnectionNode';
