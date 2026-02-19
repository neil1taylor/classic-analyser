import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
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

const GeographyMap: React.FC = () => {
  const { collectedData } = useData();
  const hasData = Object.keys(collectedData).length > 0;
  const { markers } = useGeographyData();
  const [selectedDC, setSelectedDC] = useState<DCMarker | null>(null);

  const maxServers = useMemo(
    () => Math.max(1, ...markers.map((m) => m.serverCount)),
    [markers],
  );

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
          <ComposableMap
            projectionConfig={{ scale: 140, center: [10, 20] }}
            style={{ width: '100%', height: 500 }}
          >
            <ZoomableGroup>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="var(--cds-border-subtle, #e0e0e0)"
                      stroke="var(--cds-background, #f4f4f4)"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', fill: 'var(--cds-border-strong, #8d8d8d)' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {markers.map((marker) => {
                const radius = Math.max(6, Math.min(25, (marker.serverCount / maxServers) * 25));
                const isSelected = selectedDC?.dc === marker.dc;

                return (
                  <Marker
                    key={marker.dc}
                    coordinates={[marker.lng, marker.lat]}
                    onClick={() => setSelectedDC(isSelected ? null : marker)}
                  >
                    <g style={{ cursor: 'pointer' }}>
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
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
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
