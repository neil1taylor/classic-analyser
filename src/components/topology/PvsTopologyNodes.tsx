import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Tooltip } from '@carbon/react';

export interface PvsTopologyNodeData {
  label: string;
  nodeType: string;
  zone?: string;
  state?: string;
  status?: string;
  networkType?: string;
  cidr?: string;
  processors?: number;
  memory?: number;
  sysType?: string;
  size?: number;
  diskType?: string;
  speed?: number;
  globalRouting?: boolean;
  transitEnabled?: boolean;
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
  if (s.includes('active') || s.includes('running') || s.includes('available') || s.includes('ok')) color = '#24a148';
  else if (s.includes('stopped') || s.includes('shutoff') || s.includes('halted')) color = '#6f6f6f';
  else if (s.includes('starting') || s.includes('build') || s.includes('provisioning') || s.includes('pending') || s.includes('resize')) color = '#f1c21b';
  else if (s.includes('error') || s.includes('failed')) color = '#da1e28';
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: color,
    display: 'inline-block',
  };
};

// PowerVS Workspace Node
export const PvsWorkspaceNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as PvsTopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#8a3ffc',
      borderWidth: 2,
      minWidth: 150,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#8a3ffc' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      {d.zone && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>
          {d.zone}
        </div>
      )}
      {d.state && d.state !== 'active' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <span style={statusDot(d.state)} />
          <span style={{ fontSize: '0.625rem', color: 'var(--cds-text-secondary)' }}>{d.state}</span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#8a3ffc' }} />
    </div>
  );
});
PvsWorkspaceNode.displayName = 'PvsWorkspaceNode';

// PowerVS Network Node
export const PvsNetworkNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as PvsTopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#0f62fe',
      borderWidth: 1,
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#0f62fe' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      {d.cidr && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)', fontSize: '0.6875rem' }}>
          {d.cidr}
        </div>
      )}
      {d.networkType && (
        <span style={{
          fontSize: '0.5625rem',
          padding: '1px 5px',
          borderRadius: 3,
          background: d.networkType === 'vlan' ? '#d0e2ff' : '#e8daff',
          color: d.networkType === 'vlan' ? '#002d9c' : '#6929c4',
          fontWeight: 600,
          marginTop: 3,
          display: 'inline-block',
        }}>
          {d.networkType}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#0f62fe' }} />
    </div>
  );
});
PvsNetworkNode.displayName = 'PvsNetworkNode';

// PowerVS Instance Node
export const PvsInstanceNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as PvsTopologyNodeData;
  return (
    <div style={{ ...nodeBase }}>
      <Handle type="target" position={Position.Top} style={{ background: '#393939' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={statusDot(d.status)} />
        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
          {d.label}
        </span>
      </div>
      {d.sysType && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>{d.sysType}</div>
      )}
      <div style={{ color: 'var(--cds-text-secondary)' }}>
        {d.processors ? `${d.processors} proc` : ''}{d.memory ? ` · ${d.memory} GB` : ''}
      </div>
    </div>
  );
});
PvsInstanceNode.displayName = 'PvsInstanceNode';

// PowerVS Volume Node
export const PvsVolumeNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as PvsTopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#da1e28',
      borderStyle: 'dashed',
      borderWidth: 1,
      minWidth: 120,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#da1e28' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>
        {d.size ? `${d.size} GB` : ''}{d.diskType ? ` · ${d.diskType}` : ''}
      </div>
      {d.state && d.state !== 'available' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <span style={statusDot(d.state)} />
          <span style={{ fontSize: '0.625rem', color: 'var(--cds-text-secondary)' }}>{d.state}</span>
        </div>
      )}
    </div>
  );
});
PvsVolumeNode.displayName = 'PvsVolumeNode';

// PowerVS Cloud Connection Node
export const PvsCloudConnectionNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as PvsTopologyNodeData;
  return (
    <div style={{
      ...nodeBase,
      borderColor: '#198038',
      borderWidth: 2,
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#198038' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.label}</div>
      {d.speed && (
        <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.625rem' }}>
          {d.speed} Mbps
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
        {d.globalRouting && (
          <Tooltip label="Global routing enabled — can reach resources in any region" align="bottom">
            <span style={{
              fontSize: '0.5625rem',
              padding: '1px 5px',
              borderRadius: 3,
              background: '#defbe6',
              color: '#0e6027',
              fontWeight: 600,
            }}>
              Global
            </span>
          </Tooltip>
        )}
        {d.transitEnabled && (
          <Tooltip label="Transit gateway enabled on this cloud connection" align="bottom">
            <span style={{
              fontSize: '0.5625rem',
              padding: '1px 5px',
              borderRadius: 3,
              background: '#d0e2ff',
              color: '#002d9c',
              fontWeight: 600,
            }}>
              Transit
            </span>
          </Tooltip>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#198038' }} />
    </div>
  );
});
PvsCloudConnectionNode.displayName = 'PvsCloudConnectionNode';
