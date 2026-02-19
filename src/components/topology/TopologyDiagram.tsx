import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Dropdown, Tag, Checkbox, IconButton, ContentSwitcher, Switch, Tooltip } from '@carbon/react';
import { Filter, Download } from '@carbon/icons-react';
import { downloadDrawio } from '@/utils/drawioExport';
import SubnetTopologyDiagramInner from './SubnetTopologyDiagram';
import { useTopologyData, type TgwConnectionNodeData } from '@/hooks/useTopologyData';
import { useData } from '@/contexts/DataContext';
import { applyDagreLayout, type LayoutMode } from '@/hooks/useDagreLayout';
import { allClassicNodeTypes } from './TopologyNodes';
import ConnectionDetailPanel, { type ConnectionDetailData } from './ConnectionDetailPanel';

type TopologyLayer = 'virtualServers' | 'bareMetal' | 'gateways' | 'firewalls' | 'storage' | 'transitGateways' | 'directLinks';

const LAYER_CONFIG: { key: TopologyLayer; label: string }[] = [
  { key: 'virtualServers', label: 'Virtual Servers' },
  { key: 'bareMetal', label: 'Bare Metal' },
  { key: 'gateways', label: 'Gateways' },
  { key: 'firewalls', label: 'Firewalls' },
  { key: 'storage', label: 'Storage' },
  { key: 'transitGateways', label: 'Transit Gateways' },
  { key: 'directLinks', label: 'Direct Links' },
];

const ALL_LAYERS = new Set<TopologyLayer>(LAYER_CONFIG.map((l) => l.key));

const TopologyDiagramInner: React.FC = () => {
  const { collectedData } = useData();
  const hasData = Object.keys(collectedData).length > 0;
  const { fitView } = useReactFlow();

  const [dcFilter, setDcFilter] = useState<string | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set(ALL_LAYERS));
  const [layersOpen, setLayersOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('dagre');
  const [selectedConnection, setSelectedConnection] = useState<ConnectionDetailData | null>(null);

  const toggleLayer = useCallback((layer: TopologyLayer) => {
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

  const { nodes: initialNodes, edges: initialEdges, datacenters, stats } = useTopologyData(dcFilter, visibleLayers);

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

  // Apply layout
  const layoutNodes = useMemo(() => {
    if (layoutMode === 'dagre') {
      return applyDagreLayout(nodesWithCallbacks, initialEdges);
    }
    return nodesWithCallbacks;
  }, [layoutMode, nodesWithCallbacks, initialEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Re-sync when topology data changes (filter change)
  const nodesKey = useMemo(() => JSON.stringify(layoutNodes.map((n) => n.id)), [layoutNodes]);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodesKey, setNodes, setEdges, layoutNodes, initialEdges, fitView]);

  if (!hasData) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Infrastructure Topology</h3>
        <p>Collect data first to visualize your infrastructure topology.</p>
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
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Infrastructure Topology</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Tooltip label="Virtual Server Instances" align="bottom">
            <Tag type="blue">{stats.vsis} VSIs</Tag>
          </Tooltip>
          <Tag type="purple">{stats.bareMetal} Bare Metal</Tag>
          <Tag type="cyan">{stats.vlans} VLANs</Tag>
          <Tag type="magenta">{stats.storage} Storage</Tag>
          {stats.transitGateways > 0 && <Tooltip label="Transit Gateways" align="bottom"><Tag type="purple">{stats.transitGateways} TGW</Tag></Tooltip>}
          {stats.tgwConnections > 0 && <Tooltip label="TGW Connections" align="bottom"><Tag type="purple">{stats.tgwConnections} TGW Conn</Tag></Tooltip>}
          {stats.vpnGateways > 0 && <Tooltip label="VPN Gateways" align="bottom"><Tag type="teal">{stats.vpnGateways} VPN GWs</Tag></Tooltip>}
          {stats.directLinks > 0 && <Tag type="warm-gray">{stats.directLinks} Direct Links</Tag>}
          <Dropdown
            id="dc-filter"
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
                    id={`layer-${layer.key}`}
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
            onClick={() => downloadDrawio(nodes, edges, 'classic-topology.drawio')}
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
        <Tooltip label="Front-end Customer Router — routes public traffic" align="bottom">
          <span style={{ color: '#da1e28' }}>&#9632; FCR</span>
        </Tooltip>
        <Tooltip label="Back-end Customer Router — routes private traffic" align="bottom">
          <span style={{ color: '#0f62fe' }}>&#9632; BCR</span>
        </Tooltip>
        <span>&#9672; Gateway</span>
        <span>&#9679; VSI</span>
        <span>&#9632; Bare Metal</span>
        <span>&#9670; Storage</span>
        <span style={{ borderBottom: '2px solid #da1e28', paddingBottom: 2 }}>Public Network</span>
        <span style={{ borderBottom: '2px solid #0f62fe', paddingBottom: 2 }}>Private Network</span>
        <span style={{ borderBottom: '2px solid #da1e28', paddingBottom: 2 }}>Firewall</span>
        <span style={{ color: '#0f62fe' }}>&#9644; Private Network</span>
        <span style={{ color: '#198038' }}>&#9679; Cloud Services</span>
        <span style={{ color: '#8a3ffc' }}>&#9632; Transit Gateway</span>
        <span style={{ borderLeft: '4px solid #8a3ffc', paddingLeft: 4 }}>TGW Connection</span>
        <span style={{ color: '#005d5d' }}>&#9632; VPN Gateway</span>
        <span style={{ color: '#ff832b' }}>&#9632; Direct Link</span>
      </div>
    </div>
  );
};

const TopologyDiagram: React.FC = () => {
  const [activeView, setActiveView] = useState(0);

  return (
    <div>
      <div style={{ padding: '0.75rem 1.5rem 0' }}>
        <ContentSwitcher
          selectedIndex={activeView}
          onChange={({ index }: { index: number }) => setActiveView(index)}
          size="md"
        >
          <Switch name="infrastructure" text="Infrastructure" />
          <Switch name="subnets" text="Subnets" />
        </ContentSwitcher>
      </div>
      {activeView === 0 ? (
        <ReactFlowProvider>
          <TopologyDiagramInner />
        </ReactFlowProvider>
      ) : (
        <ReactFlowProvider>
          <SubnetTopologyDiagramInner />
        </ReactFlowProvider>
      )}
    </div>
  );
};

export default TopologyDiagram;
