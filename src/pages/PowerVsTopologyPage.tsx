import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Filter } from '@carbon/icons-react';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { usePowerVsTopologyData } from '@/hooks/usePowerVsTopologyData';
import { applyDagreLayout, type LayoutMode } from '@/hooks/useDagreLayout';
import {
  TransitGatewayNode,
  TgwConnectionNode,
} from '@/components/topology/VpcTopologyNodes';
import {
  PvsWorkspaceNode,
  PvsNetworkNode,
  PvsInstanceNode,
  PvsVolumeNode,
  PvsCloudConnectionNode,
} from '@/components/topology/PvsTopologyNodes';

const nodeTypes: NodeTypes = {
  transitGatewayNode: TransitGatewayNode as any,
  tgwConnectionNode: TgwConnectionNode as any,
  pvsWorkspaceNode: PvsWorkspaceNode as any,
  pvsNetworkNode: PvsNetworkNode as any,
  pvsInstanceNode: PvsInstanceNode as any,
  pvsVolumeNode: PvsVolumeNode as any,
  pvsCloudConnectionNode: PvsCloudConnectionNode as any,
};

type PvsTopologyLayer = 'networks' | 'instances' | 'volumes' | 'cloudConnections';

const LAYER_CONFIG: { key: PvsTopologyLayer; label: string }[] = [
  { key: 'networks', label: 'Networks' },
  { key: 'instances', label: 'Instances' },
  { key: 'volumes', label: 'Volumes' },
  { key: 'cloudConnections', label: 'Cloud Connections' },
];

const ALL_LAYERS = new Set<PvsTopologyLayer>(LAYER_CONFIG.map((l) => l.key));

const PvsTopologyInner: React.FC = () => {
  const { pvsCollectedData } = usePowerVsData();
  const hasData = Object.keys(pvsCollectedData).length > 0;
  const { fitView } = useReactFlow();

  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set(ALL_LAYERS));
  const [layersOpen, setLayersOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('dagre');

  const toggleLayer = useCallback((layer: PvsTopologyLayer) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  const { nodes: initialNodes, edges: initialEdges, zones, stats } = usePowerVsTopologyData(zoneFilter, visibleLayers);

  const layoutNodes = useMemo(() => {
    if (layoutMode === 'dagre') {
      return applyDagreLayout(initialNodes, initialEdges);
    }
    return initialNodes;
  }, [layoutMode, initialNodes, initialEdges]);

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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>PowerVS Topology</h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          background: 'var(--cds-layer-01)',
          border: '1px solid var(--cds-border-subtle)',
        }}>
          <p style={{ color: 'var(--cds-text-secondary)' }}>
            Collect PowerVS data to view the topology diagram.
          </p>
        </div>
      </main>
    );
  }

  const zoneItems = [
    { id: '__all__', text: 'All Zones' },
    ...zones.map((z) => ({ id: z, text: z })),
  ];

  return (
    <div style={{ padding: '1.5rem', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>PowerVS Topology</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {stats.transitGateways > 0 && <Tag type="green">{stats.transitGateways} TGW</Tag>}
          {stats.tgwConnections > 0 && <Tag type="green">{stats.tgwConnections} TGW Conn</Tag>}
          <Tag type="purple">{stats.workspaces} Workspaces</Tag>
          <Tag type="blue">{stats.networks} Networks</Tag>
          <Tag type="gray">{stats.instances} Instances</Tag>
          {stats.volumes > 0 && <Tag type="red">{stats.volumes} Volumes</Tag>}
          {stats.cloudConnections > 0 && <Tag type="green">{stats.cloudConnections} Cloud Conns</Tag>}
          <Dropdown
            id="zone-filter"
            titleText=""
            label="Zone"
            items={zoneItems}
            itemToString={(item: { id: string; text: string } | null) => item?.text ?? ''}
            selectedItem={zoneItems.find((z) => z.id === (zoneFilter ?? '__all__'))}
            onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
              setZoneFilter(selectedItem?.id === '__all__' ? null : selectedItem?.id ?? null);
            }}
            size="sm"
            style={{ minWidth: 160 }}
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
          <div style={{ position: 'relative' }}>
            <IconButton
              label="Layers"
              size="sm"
              kind="ghost"
              onClick={() => setLayersOpen((prev) => !prev)}
            >
              <Filter size={16} />
            </IconButton>
            {layersOpen && (
              <div style={{
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
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--cds-text-secondary)' }}>
                  Visible Layers
                </div>
                {LAYER_CONFIG.map((layer) => (
                  <Checkbox
                    key={layer.key}
                    id={`pvs-layer-${layer.key}`}
                    labelText={layer.label}
                    checked={visibleLayers.has(layer.key)}
                    onChange={() => toggleLayer(layer.key)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, border: '1px solid var(--cds-border-subtle)', borderRadius: 4 }}>
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
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)', flexWrap: 'wrap' }}>
        <span>&#9673; Transit Gateway</span>
        <span style={{ color: '#8a3ffc' }}>&#9632; Workspace</span>
        <span style={{ color: '#0f62fe' }}>&#9632; Network</span>
        <span>&#9679; Instance</span>
        <span style={{ color: '#da1e28' }}>&#9671; Volume</span>
        <span style={{ color: '#198038' }}>&#9632; Cloud Connection</span>
        <span style={{ borderBottom: '2px solid #198038', paddingBottom: 2 }}>TG Connection</span>
      </div>
    </div>
  );
};

const PowerVsTopologyPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <PvsTopologyInner />
    </ReactFlowProvider>
  );
};

export default PowerVsTopologyPage;
