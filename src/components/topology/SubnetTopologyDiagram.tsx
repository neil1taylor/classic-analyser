import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Dropdown, Tag } from '@carbon/react';
import { useSubnetTopologyData } from '@/hooks/useSubnetTopologyData';
import { useData } from '@/contexts/DataContext';
import { applyDagreLayout } from '@/hooks/useDagreLayout';
import { allClassicNodeTypes } from './TopologyNodes';
import type { TgwConnectionNodeData } from '@/hooks/useTopologyData';
import ConnectionDetailPanel, { type ConnectionDetailData } from './ConnectionDetailPanel';

const SubnetTopologyDiagramInner: React.FC = () => {
  const { collectedData } = useData();
  const hasData = Object.keys(collectedData).length > 0;
  const { fitView } = useReactFlow();

  const [dcFilter, setDcFilter] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionDetailData | null>(null);

  // Callback for opening connection detail panel
  const handleOpenConnectionDetail = useCallback((data: TgwConnectionNodeData) => {
    setSelectedConnection({
      connectionId: data.connectionId,
      connectionName: data.connectionName,
      connectionType: data.connectionType,
      transitGatewayId: data.transitGatewayId,
      transitGatewayName: data.transitGatewayName,
      prefixes: data.prefixes ?? [],
      status: data.status,
      networkAccountId: data.networkAccountId,
    });
  }, []);

  const { nodes: initialNodes, edges: initialEdges, datacenters, stats } =
    useSubnetTopologyData(dcFilter);

  // Inject onOpenDetail callback into connection nodes
  const nodesWithCallbacks = useMemo(() => {
    return initialNodes.map((node) => {
      if (node.type === 'tgwConnectionNode') {
        return {
          ...node,
          data: {
            ...node.data,
            onOpenDetail: handleOpenConnectionDetail,
          },
        };
      }
      return node;
    });
  }, [initialNodes, handleOpenConnectionDetail]);

  const layoutNodes = useMemo(
    () => applyDagreLayout(nodesWithCallbacks, initialEdges, { ranksep: 150, nodesep: 40 }),
    [nodesWithCallbacks, initialEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodesKey = useMemo(
    () => JSON.stringify(layoutNodes.map((n) => n.id)),
    [layoutNodes],
  );

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodesKey, setNodes, setEdges, layoutNodes, initialEdges, fitView]);

  if (!hasData) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Subnet Topology</h3>
        <p>Collect data first to visualize your subnet topology.</p>
      </div>
    );
  }

  const dcItems = [
    { id: '__all__', text: 'All Datacenters' },
    ...datacenters.map((dc) => ({ id: dc, text: dc })),
  ];

  return (
    <div style={{ padding: '1.5rem', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Subnet Topology</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Tag type="red">{stats.publicSubnets} Public</Tag>
          <Tag type="blue">{stats.privateSubnets} Private</Tag>
          <Tag type="gray">{stats.gateways} Gateways</Tag>
          <Tag type="cyan">{stats.dualNicDevices} Dual-NIC</Tag>
          {stats.transitGateways > 0 && <Tag type="purple">{stats.transitGateways} TGW</Tag>}
          {stats.tgwConnections > 0 && <Tag type="purple">{stats.tgwConnections} TGW Conn</Tag>}
          {stats.vpnGateways > 0 && <Tag type="teal">{stats.vpnGateways} VPN GWs</Tag>}
          {stats.directLinks > 0 && <Tag type="warm-gray">{stats.directLinks} Direct Links</Tag>}
          <Dropdown
            id="subnet-dc-filter"
            titleText=""
            label="Datacenter"
            items={dcItems}
            itemToString={(item: { id: string; text: string } | null) => item?.text ?? ''}
            selectedItem={dcItems.find((d) => d.id === (dcFilter ?? '__all__'))}
            onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
              setDcFilter(selectedItem?.id === '__all__' ? null : selectedItem?.id ?? null);
            }}
            size="sm"
            style={{ minWidth: 180 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, border: '1px solid var(--cds-border-subtle)', borderRadius: 4, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={allClassicNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            style={{ background: 'var(--cds-layer, #fff)' }}
          />
        </ReactFlow>

        {/* Connection Detail Panel */}
        {selectedConnection && (
          <ConnectionDetailPanel
            connection={selectedConnection}
            onClose={() => setSelectedConnection(null)}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)', flexWrap: 'wrap' }}>
        <span>&#9729; Internet</span>
        <span style={{ color: '#da1e28' }}>&#9632; FCR (Public Router)</span>
        <span style={{ color: '#0f62fe' }}>&#9632; BCR (Private Router)</span>
        <span style={{ borderBottom: '2px solid #da1e28', paddingBottom: 2 }}>Public Subnet</span>
        <span style={{ borderBottom: '2px solid #0f62fe', paddingBottom: 2 }}>Private Subnet</span>
        <span>&#9672; Gateway Appliance</span>
        <span>&#9679; Dual-NIC Device</span>
        <span style={{ color: '#0f62fe' }}>&#9644; Private Network</span>
        <span style={{ color: '#8a3ffc' }}>&#9632; Transit Gateway</span>
        <span style={{ borderLeft: '4px solid #8a3ffc', paddingLeft: 4 }}>TGW Connection</span>
        <span style={{ color: '#005d5d' }}>&#9632; VPN Gateway</span>
        <span style={{ color: '#ff832b' }}>&#9632; Direct Link</span>
        <span style={{ borderBottom: '2px solid #da1e28', paddingBottom: 2 }}>Public Network</span>
        <span style={{ borderBottom: '2px solid #0f62fe', paddingBottom: 2 }}>Private Network</span>
      </div>
    </div>
  );
};

export default SubnetTopologyDiagramInner;
