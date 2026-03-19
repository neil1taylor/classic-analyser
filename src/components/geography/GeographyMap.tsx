import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { useData } from '@/contexts/DataContext';
import { useGeographyData, type DCMarker } from '@/hooks/useGeographyData';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const RESOURCE_LABELS: Record<string, string> = {
  virtualServers: 'Virtual Servers',
  bareMetal: 'Bare Metal',
  blockStorage: 'Block Storage',
  fileStorage: 'File Storage',
  vlans: 'VLANs',
  subnets: 'Subnets',
};

const MAP_WIDTH = 960;
const MAP_HEIGHT = 500;

interface GeoFeature {
  type: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
}

const GeographyMap: React.FC = () => {
  const { collectedData } = useData();
  const hasData = Object.keys(collectedData).length > 0;
  const { markers } = useGeographyData();
  const [selectedDC, setSelectedDC] = useState<DCMarker | null>(null);
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [hoveredGeo, setHoveredGeo] = useState<number | null>(null);

  // Zoom/pan state
  const [translate, setTranslate] = useState<[number, number]>([0, 0]);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ dragging: boolean; start: [number, number] }>({
    dragging: false,
    start: [0, 0],
  });

  const maxServers = useMemo(
    () => Math.max(1, ...markers.map((m) => m.serverCount)),
    [markers],
  );

  const projection = useMemo(
    () =>
      geoNaturalEarth1()
        .scale(140 * scale)
        .translate([
          MAP_WIDTH / 2 + translate[0],
          MAP_HEIGHT / 2 - 20 + translate[1],
        ]),
    [scale, translate],
  );

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  useEffect(() => {
    fetch(GEO_URL)
      .then((res) => res.json())
      .then((topo: Topology) => {
        const geojson = feature(topo, topo.objects.countries);
        if (geojson.type === 'FeatureCollection') {
          setFeatures(geojson.features as GeoFeature[]);
        }
      })
      .catch(() => {});
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.5, Math.min(8, s * (e.deltaY < 0 ? 1.15 : 0.87))));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { dragging: true, start: [e.clientX, e.clientY] };
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.start[0];
    const dy = e.clientY - dragRef.current.start[1];
    dragRef.current.start = [e.clientX, e.clientY];
    setTranslate((t) => [t[0] + dx, t[1] + dy]);
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
    setIsDragging(false);
  }, []);

  if (!hasData) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Geographic Distribution</h3>
        <p>Collect data first to view datacenter locations.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 600 }}>
        Global Infrastructure Distribution
      </h3>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {/* Map */}
        <div style={{ flex: 1, border: '1px solid var(--cds-border-subtle)', borderRadius: 4, overflow: 'hidden', background: 'var(--cds-layer)' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            style={{ width: '100%', height: MAP_HEIGHT, cursor: isDragging ? 'grabbing' : 'grab' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Country fills */}
            {features.map((geo, i) => (
              <path
                key={i}
                d={pathGenerator(geo.geometry as GeoJSON.Geometry) ?? ''}
                fill={hoveredGeo === i ? 'var(--cds-border-strong, #8d8d8d)' : 'var(--cds-border-subtle, #e0e0e0)'}
                stroke="var(--cds-background, #f4f4f4)"
                strokeWidth={0.5}
                onMouseEnter={() => setHoveredGeo(i)}
                onMouseLeave={() => setHoveredGeo(null)}
                style={{ outline: 'none' }}
              />
            ))}

            {/* Datacenter markers */}
            {markers.map((marker) => {
              const coords = projection([marker.lng, marker.lat]);
              if (!coords) return null;
              const radius = Math.max(6, Math.min(25, (marker.serverCount / maxServers) * 25));
              const isSelected = selectedDC?.dc === marker.dc;

              return (
                <g
                  key={marker.dc}
                  transform={`translate(${coords[0]}, ${coords[1]})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedDC(isSelected ? null : marker)}
                >
                  <circle
                    r={radius}
                    fill="#0f62fe"
                    fillOpacity={0.6}
                    stroke={isSelected ? '#fff' : '#0f62fe'}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                  <text
                    textAnchor="middle"
                    y={radius + 14}
                    style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fill: 'var(--cds-text-primary, #161616)',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {marker.dc}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail panel */}
        <div style={{ width: 300, flexShrink: 0 }}>
          {selectedDC ? (
            <div style={{ background: 'var(--cds-layer)', border: '1px solid var(--cds-border-subtle)', borderRadius: 4, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{selectedDC.dc}</h4>
                <button
                  onClick={() => setSelectedDC(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--cds-text-secondary)' }}
                >
                  &times;
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', margin: '0 0 0.75rem' }}>
                {selectedDC.city}, {selectedDC.country}
              </p>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: 4 }}>Servers</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 300 }}>{selectedDC.serverCount}</div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: 4 }}>Monthly Cost</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 300 }}>
                  ${selectedDC.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <h5 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.5rem' }}>
                Resources
              </h5>
              {Object.entries(selectedDC.resources).map(([key, count]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>{RESOURCE_LABELS[key] ?? key}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--cds-layer)', border: '1px solid var(--cds-border-subtle)', borderRadius: 4, padding: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Datacenter Summary</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', margin: '0 0 1rem' }}>
                Click a datacenter marker for details.
              </p>
              {markers
                .sort((a, b) => b.serverCount - a.serverCount)
                .map((m) => (
                  <div
                    key={m.dc}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                      padding: '0.35rem 0',
                      borderBottom: '1px solid var(--cds-border-subtle)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedDC(m)}
                  >
                    <span>
                      <strong>{m.dc}</strong>
                      <span style={{ color: 'var(--cds-text-secondary)', marginLeft: 6 }}>{m.city}</span>
                    </span>
                    <span>{m.serverCount} servers</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
        <span>Bubble size = server count</span>
        <span>Click marker for details</span>
        <span>Scroll to zoom &middot; Drag to pan</span>
      </div>
    </div>
  );
};

export default GeographyMap;
