import React, { useMemo, useState } from 'react';
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import type { HierarchyRectangularNode } from 'd3-hierarchy';
import { scaleOrdinal } from 'd3-scale';
import type { TreemapNode } from '@/hooks/useCostData';

const COLORS = ['#6929c4', '#1192e8', '#005d5d', '#9f1853', '#fa4d56', '#198038', '#002d9c', '#ee538b', '#b28600', '#009d9a'];

interface CostTreemapProps {
  data: TreemapNode;
  width?: number;
  height?: number;
}

const CostTreemap: React.FC<CostTreemapProps> = ({ data, width = 800, height = 400 }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; value: number; parent: string } | null>(null);

  const { leaves, groups, colorScale } = useMemo(() => {
    const root = hierarchy(data)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const treemapLayout = treemap<TreemapNode>()
      .size([width, height])
      .padding(3)
      .paddingTop(20)
      .tile(treemapSquarify);
    const layoutRoot: HierarchyRectangularNode<TreemapNode> = treemapLayout(root);

    const categories = (data.children ?? []).map((c) => c.name);
    const colorScale = scaleOrdinal<string>().domain(categories).range(COLORS);

    const leaves: HierarchyRectangularNode<TreemapNode>[] = layoutRoot.leaves();
    const groups: HierarchyRectangularNode<TreemapNode>[] = layoutRoot.children ?? [];

    return { leaves, groups, colorScale };
  }, [data, width, height]);

  const total = data.children?.reduce(
    (sum, cat) => sum + (cat.children?.reduce((s, c) => s + (c.value ?? 0), 0) ?? 0),
    0,
  ) ?? 0;

  if (leaves.length === 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Group backgrounds */}
        {groups.map((group) => (
          <g key={group.data.name}>
            <rect
              x={group.x0}
              y={group.y0}
              width={group.x1 - group.x0}
              height={group.y1 - group.y0}
              fill={colorScale(group.data.name)}
              fillOpacity={0.08}
              stroke={colorScale(group.data.name)}
              strokeWidth={1}
              rx={4}
            />
            <text
              x={group.x0 + 6}
              y={group.y0 + 14}
              fill={colorScale(group.data.name)}
              fontSize={12}
              fontWeight={600}
              fontFamily="'IBM Plex Sans', sans-serif"
            >
              {group.data.name} — ${(group.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </text>
          </g>
        ))}

        {/* Leaf rectangles */}
        {leaves.map((leaf, i) => {
          const w = leaf.x1 - leaf.x0;
          const h = leaf.y1 - leaf.y0;
          const parentName = leaf.parent?.data.name ?? '';
          const color = colorScale(parentName);
          const showLabel = w > 50 && h > 28;

          return (
            <g
              key={i}
              onMouseEnter={(e) =>
                setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  name: leaf.data.name,
                  value: leaf.data.value ?? 0,
                  parent: parentName,
                })
              }
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={leaf.x0}
                y={leaf.y0}
                width={w}
                height={h}
                fill={color}
                fillOpacity={0.6}
                stroke={color}
                strokeWidth={0.5}
                rx={2}
              />
              {showLabel && (
                <>
                  <text
                    x={leaf.x0 + 4}
                    y={leaf.y0 + 14}
                    fill="#fff"
                    fontSize={11}
                    fontFamily="'IBM Plex Sans', sans-serif"
                    fontWeight={500}
                  >
                    {leaf.data.name.length > w / 7 ? leaf.data.name.slice(0, Math.floor(w / 7)) + '...' : leaf.data.name}
                  </text>
                  {h > 36 && (
                    <text
                      x={leaf.x0 + 4}
                      y={leaf.y0 + 28}
                      fill="rgba(255,255,255,0.8)"
                      fontSize={10}
                      fontFamily="'IBM Plex Sans', sans-serif"
                    >
                      ${(leaf.data.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y - 40,
            background: 'var(--cds-background-inverse, #161616)',
            color: 'var(--cds-text-inverse, #fff)',
            padding: '8px 12px',
            borderRadius: 4,
            fontSize: '0.75rem',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{tooltip.name}</div>
          <div>{tooltip.parent}</div>
          <div>${tooltip.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo</div>
          {total > 0 && <div>{((tooltip.value / total) * 100).toFixed(1)}% of total</div>}
        </div>
      )}
    </div>
  );
};

export default CostTreemap;
