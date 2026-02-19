import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Dropdown, Tag, Checkbox, IconButton } from '@carbon/react';
import { Filter, Download } from '@carbon/icons-react';
import { downloadDrawio } from '@/utils/drawioExport';
import { useVpcData } from '@/contexts/VpcDataContext';
import { useVpcTopologyData } from '@/hooks/useVpcTopologyData';
import { applyDagreLayout, type LayoutMode } from '@/hooks/useDagreLayout';
import {
  TransitGatewayNode,
  TgwConnectionNode,
  VpcNode,
  VpcSubnetNode,
  VpcInstanceNode,
  VpcLoadBalancerNode,
  VpcPublicGatewayNode,
  VpcVpnGatewayNode,
  type VpcTopologyNodeData,
} from '@/components/topology/VpcTopologyNodes';
import ConnectionDetailPanel, { type ConnectionDetailData } from '@/components/topology/ConnectionDetailPanel';

const nodeTypes: NodeTypes = {
  transitGatewayNode: TransitGatewayNode as any,
  tgwConnectionNode: TgwConnectionNode as any,
  vpcNode: VpcNode as any,
  subnetNode: VpcSubnetNode as any,
  instanceNode: VpcInstanceNode as any,
  loadBalancerNode: VpcLoadBalancerNode as any,
  publicGatewayNode: VpcPublicGatewayNode as any,
  vpnGatewayNode: VpcVpnGatewayNode as any,
};

type VpcTopologyLayer = 'subnets' | 'instances' | 'loadBalancers' | 'publicGateways' | 'vpnGateways';

const LAYER_CONFIG: { key: VpcTopologyLayer; label: string }[] = [
  { key: 'subnets', label: 'Subnets' },
  { key: 'instances', label: 'Instances' },
  { key: 'loadBalancers', label: 'Load Balancers' },
  { key: 'publicGateways', label: 'Public Gateways' },
  { key: 'vpnGateways', label: 'VPN Gateways' },
];

const ALL_LAYERS = new Set<VpcTopologyLayer>(LAYER_CONFIG.map((l) => l.key));

const VpcTopologyInner: React.FC = () => {
  const { vpcCollectedData } = useVpcData();
  const hasData = Object.keys(vpcCollectedData).length > 0;
  const { fitView } = useReactFlow();

  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set(ALL_LAYERS));
  const [layersOpen, setLayersOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('dagre');
  const [selectedConnection, setSelectedConnection] = useState<ConnectionDetailData | null>(null);

  const toggleLayer = useCallback((layer: VpcTopologyLayer) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }, []);

  // Callback for opening connection detail panel
  const handleOpenConnectionDetail = useCallback((data: VpcTopologyNodeData) => {
    setSelectedConnection({
      connectionId: data.connectionId ?? '',
      connectionName: data.label,
      connectionType: data.networkType ?? 'unknown',
      transitGatewayId: data.transitGatewayId ?? '',
      transitGatewayName: data.transitGatewayName ?? '',
      prefixes: (data.routePrefixes ?? []) as string[],
      status: data.connectionStatus,
      networkAccountId: data.networkAccountId,
      ownershipType: data.ownershipType,
      subnetCount: data.subnetCount,
    });
  }, []);

  const { nodes: initialNodes, edges: initialEdges, regions, stats } = useVpcTopologyData(regionFilter, visibleLayers);

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

  const layoutNodes = useMemo(() => {
    if (layoutMode === 'dagre') {
      return applyDagreLayout(nodesWithCallbacks, initialEdges);
    }
    return nodesWithCallbacks;
  }, [layoutMode, nodesWithCallbacks, initialEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodesKey = useMemo(() => JSON.stringify(layoutNodes.map((n) => n.id)), [layoutNodes]);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodesKey, setNodes, setEdges, layoutNodes, initialEdges, fitView]);

  if (!hasData) {
    return (
      <main style={{ width: '100%', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>VPC Topology</h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          background: 'var(--cds-layer-01)',
          border: '1px solid var(--cds-border-subtle)',
        }}>
          <p style={{ color: 'var(--cds-text-secondary)' }}>
            Collect VPC data to view the topology diagram.
          </p>
        </div>
      </main>
    );
  }

  const regionItems = [
    { id: '__all__', text: 'All Regions' },
    ...regions.map((r) => ({ id: r, text: r })),
  ];

  return (
    <div style={{ padding: '1.5rem', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>VPC Topology</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {stats.transitGateways > 0 && <Tag type="green">{stats.transitGateways} TGW</Tag>}
          {stats.tgwConnections > 0 && <Tag type="green">{stats.tgwConnections} TGW Conn</Tag>}
          <Tag type="blue">{stats.vpcs} VPCs</Tag>
          <Tag type="cyan">{stats.subnets} Subnets</Tag>
          <Tag type="gray">{stats.instances} Instances</Tag>
          <Dropdown
            id="region-filter"
            titleText=""
            label="Region"
            items={regionItems}
            itemToString={(item: { id: string; text: string } | null) => item?.text ?? ''}
            selectedItem={regionItems.find((r) => r.id === (regionFilter ?? '__all__'))}
            onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
              setRegionFilter(selectedItem?.id === '__all__' ? null : selectedItem?.id ?? null);
            }}
            size="sm"
            style={{ minWidth: 180 }}
          />
          <Dropdown
            id="layout-mode"
            titleText=""
            label="Layout"
            items={[
              { id: 'dagre', text: 'Hierarchical (Auto)' },
              { id: 'manual', text: 'Manual (Fixed)' },
            ]}
            itemToString={(item: { id: string; text: string } | null) => item?.text ?? ''}
            selectedItem={{ id: layoutMode, text: layoutMode === 'dagre' ? 'Hierarchical (Auto)' : 'Manual (Fixed)' }}
            onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
              if (selectedItem) setLayoutMode(selectedItem.id as LayoutMode);
            }}
            size="sm"
            style={{ minWidth: 180 }}
          />
          <div style={{ position: 'relative' }} ref={layersRef}>
            <IconButton
              label="Layers"
              size="sm"
              kind="ghost"
              onClick={() => setLayersOpen((prev) => !prev)}
            >
              <Filter size={16} />
            </IconButton>
            {layersOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 10,
                  background: 'var(--cds-layer)',
                  border: '1px solid var(--cds-border-subtle)',
                  borderRadius: 4,
                  padding: '0.75rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  minWidth: 180,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--cds-text-secondary)' }}>
                  Visible Layers
                </div>
                {LAYER_CONFIG.map((layer) => (
                  <Checkbox
                    key={layer.key}
                    id={`vpc-layer-${layer.key}`}
                    labelText={layer.label}
                    checked={visibleLayers.has(layer.key)}
                    onChange={() => toggleLayer(layer.key)}
                  />
                ))}
              </div>
            )}
          </div>
          <IconButton
            label="Export to draw.io"
            size="sm"
            kind="ghost"
            onClick={() => downloadDrawio(nodes, edges, 'vpc-topology.drawio')}
          >
            <Download size={16} />
          </IconButton>
        </div>
      </div>

      <div style={{ flex: 1, border: '1px solid var(--cds-border-subtle)', borderRadius: 4, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
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
        <span>&#9673; Transit Gateway</span>
        <span style={{ color: '#0f62fe' }}>&#9632; VPC</span>
        <span>&#9671; Subnet</span>
        <span>&#9679; Instance</span>
        <span style={{ color: '#8a3ffc' }}>&#9632; Load Balancer</span>
        <span style={{ color: '#da1e28' }}>&#9632; Public Gateway</span>
        <span style={{ color: '#005d5d' }}>&#9632; VPN Gateway</span>
        <span style={{ borderBottom: '2px solid #198038', paddingBottom: 2 }}>TG Connection</span>
        <span style={{ borderBottom: '2px solid #0f62fe', paddingBottom: 2 }}>VPC Network</span>
      </div>

    </div>
  );
};

const VpcTopologyPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <VpcTopologyInner />
    </ReactFlowProvider>
  );
};

export default VpcTopologyPage;
