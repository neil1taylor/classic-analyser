import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DependencyGraph } from '@/types/migration';

interface Props {
  graph: DependencyGraph;
}

const NODE_COLORS: Record<string, string> = {
  gateway: '#6929c4',
  vlan: '#1192e8',
  subnet: '#005d5d',
  vsi: '#198038',
  bareMetal: '#9f1853',
  blockStorage: '#b28600',
  fileStorage: '#ee538b',
  firewall: '#da1e28',
  loadBalancer: '#002d9c',
};

const DependencyGraphPanel: React.FC<Props> = ({ graph }) => {
  const { nodes, edges } = useMemo(() => {
    // Simple layout: group by type in rows
    const typeOrder = ['gateway', 'firewall', 'vlan', 'subnet', 'vsi', 'bareMetal', 'loadBalancer', 'blockStorage', 'fileStorage'];
    const byType = new Map<string, typeof graph.nodes>();
    for (const node of graph.nodes) {
      const arr = byType.get(node.type) ?? [];
      arr.push(node);
      byType.set(node.type, arr);
    }

    const flowNodes: Node[] = [];
    let yOffset = 0;

    for (const type of typeOrder) {
      const items = byType.get(type) ?? [];
      if (items.length === 0) continue;

      items.forEach((item, i) => {
        flowNodes.push({
          id: item.id,
          position: { x: 50 + i * 180, y: yOffset },
          data: { label: item.label },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          style: {
            background: NODE_COLORS[type] ?? '#525252',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            border: 'none',
            minWidth: '120px',
            textAlign: 'center' as const,
          },
        });
      });

      yOffset += 100;
    }

    const flowEdges: Edge[] = graph.edges
      .filter((e) => flowNodes.some((n) => n.id === e.source) && flowNodes.some((n) => n.id === e.target))
      .map((e, i) => ({
        id: `dep-edge-${i}`,
        source: e.source,
        target: e.target,
        label: e.relationship,
        type: 'smoothstep',
        style: { stroke: 'var(--cds-border-strong)', strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: 'var(--cds-text-secondary)' },
      }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [graph]);

  if (graph.nodes.length === 0) {
    return <p style={{ color: 'var(--cds-text-helper)' }}>No dependency data available.</p>;
  }

  return (
    <div style={{ height: '500px', border: '1px solid var(--cds-border-subtle)', borderRadius: '4px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default DependencyGraphPanel;
