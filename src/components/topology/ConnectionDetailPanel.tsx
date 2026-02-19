import React, { useState, useMemo } from 'react';
import {
  Close,
  VirtualPrivateCloud,
  Cube,
  ConnectionTwoWay,
  DirectLink,
  Flash,
} from '@carbon/icons-react';
import { TextInput, Tag, IconButton } from '@carbon/react';

// Connection type badge colors
const connectionTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  vpc: { bg: '#d0e2ff', text: '#002d9c', border: '#0f62fe' },
  classic: { bg: '#e0e0e0', text: '#393939', border: '#525252' },
  gre_tunnel: { bg: '#d9fbfb', text: '#004144', border: '#009d9a' },
  unbound_gre_tunnel: { bg: '#d9fbfb', text: '#004144', border: '#009d9a' },
  redundant_gre: { bg: '#d9fbfb', text: '#004144', border: '#009d9a' },
  redundant_gre_tunnel: { bg: '#d9fbfb', text: '#004144', border: '#009d9a' },
  directlink: { bg: '#fff2e8', text: '#8a3800', border: '#ff832b' },
  power_virtual_server: { bg: '#ffd6e8', text: '#9f1853', border: '#9f1853' },
};

// Connection type display names
const connectionTypeLabels: Record<string, string> = {
  vpc: 'VPC',
  classic: 'Classic Infrastructure',
  gre_tunnel: 'GRE Tunnel',
  unbound_gre_tunnel: 'Unbound GRE Tunnel',
  redundant_gre: 'Redundant GRE Tunnel',
  redundant_gre_tunnel: 'Redundant GRE Tunnel',
  directlink: 'Direct Link',
  power_virtual_server: 'Power Virtual Server',
};

// Connection type icons (Carbon icons)
const connectionTypeIcons: Record<string, React.ReactNode> = {
  vpc: <VirtualPrivateCloud size={20} />,
  classic: <Cube size={20} />,
  gre_tunnel: <ConnectionTwoWay size={20} />,
  unbound_gre_tunnel: <ConnectionTwoWay size={20} />,
  redundant_gre: <ConnectionTwoWay size={20} />,
  redundant_gre_tunnel: <ConnectionTwoWay size={20} />,
  directlink: <DirectLink size={20} />,
  power_virtual_server: <Flash size={20} />,
};

export interface ConnectionDetailData {
  connectionId: string;
  connectionName: string;
  connectionType: string;
  transitGatewayId: string;
  transitGatewayName: string;
  prefixes: string[];
  status?: string;
  networkAccountId?: string;
  ownershipType?: 'Own Account' | 'Cross Account' | 'Unknown';
  subnetCount?: number;
}

interface ConnectionDetailPanelProps {
  connection: ConnectionDetailData;
  onClose: () => void;
}

const ConnectionDetailPanel: React.FC<ConnectionDetailPanelProps> = ({ connection, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPrefixes = useMemo(() => {
    if (!searchTerm.trim()) return connection.prefixes;
    const term = searchTerm.toLowerCase();
    return connection.prefixes.filter((p) => p.toLowerCase().includes(term));
  }, [connection.prefixes, searchTerm]);

  const typeColors = connectionTypeColors[connection.connectionType] ?? connectionTypeColors.classic;
  const typeLabel = connectionTypeLabels[connection.connectionType] ?? connection.connectionType;
  const typeIcon = connectionTypeIcons[connection.connectionType] ?? <Cube size={20} />;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 360,
        height: '100%',
        background: 'var(--cds-layer, #fff)',
        borderLeft: '1px solid var(--cds-border-subtle)',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          borderBottom: '1px solid var(--cds-border-subtle)',
          background: typeColors.bg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', color: typeColors.text }}>{typeIcon}</span>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: typeColors.text }}>
            Connection Details
          </span>
        </div>
        <IconButton
          label="Close"
          size="sm"
          kind="ghost"
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.1)',
            color: typeColors.text,
          }}
        >
          <Close size={16} />
        </IconButton>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {/* Connection Name */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
            Connection Name
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>{connection.connectionName}</div>
        </div>

        {/* Type and Status */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <Tag
            style={{
              background: typeColors.bg,
              color: typeColors.text,
              border: `1px solid ${typeColors.border}`,
            }}
          >
            {typeLabel}
          </Tag>
          {connection.status && (
            <Tag type={connection.status === 'attached' ? 'green' : 'gray'}>
              {connection.status}
            </Tag>
          )}
          {connection.ownershipType && connection.ownershipType !== 'Unknown' && (
            <Tag type={connection.ownershipType === 'Own Account' ? 'blue' : 'purple'}>
              {connection.ownershipType === 'Own Account' ? 'Own Account' : 'Cross Account'}
            </Tag>
          )}
        </div>

        {/* Transit Gateway */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
            Transit Gateway
          </div>
          <div style={{ fontSize: '0.875rem' }}>{connection.transitGatewayName}</div>
        </div>

        {/* Account Info (for cross-account) */}
        {connection.networkAccountId && connection.ownershipType === 'Cross Account' && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
              Network Account ID
            </div>
            <div style={{ fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" }}>
              {connection.networkAccountId}
            </div>
          </div>
        )}

        {/* Subnet Count (for VPC type) */}
        {connection.connectionType === 'vpc' && connection.subnetCount !== undefined && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
              Reachable Subnets
            </div>
            <div style={{ fontSize: '0.875rem' }}>{connection.subnetCount} subnet{connection.subnetCount !== 1 ? 's' : ''}</div>
          </div>
        )}

        {/* Route Prefixes */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cds-text-secondary)' }}>
              Route Prefixes ({connection.prefixes.length})
            </div>
          </div>

          {connection.prefixes.length > 0 ? (
            <>
              <TextInput
                id="prefix-search"
                labelText=""
                placeholder="Search prefixes..."
                size="sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <div
                style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  border: '1px solid var(--cds-border-subtle)',
                  borderRadius: 4,
                  background: 'var(--cds-field)',
                }}
              >
                {filteredPrefixes.length > 0 ? (
                  filteredPrefixes.map((prefix, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderBottom: i < filteredPrefixes.length - 1 ? '1px solid var(--cds-border-subtle)' : 'none',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.75rem',
                      }}
                    >
                      {prefix}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '0.75rem', color: 'var(--cds-text-secondary)', fontSize: '0.75rem', textAlign: 'center' }}>
                    No prefixes match "{searchTerm}"
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.75rem' }}>
              No route prefixes available
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--cds-border-subtle)',
          fontSize: '0.625rem',
          color: 'var(--cds-text-secondary)',
        }}
      >
        Connection ID: {connection.connectionId}
      </div>
    </div>
  );
};

export default ConnectionDetailPanel;
