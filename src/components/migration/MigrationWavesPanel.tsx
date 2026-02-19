import React from 'react';
import {
  Accordion,
  AccordionItem,
  Tag,
  UnorderedList,
  ListItem,
} from '@carbon/react';
import type { MigrationWave } from '@/types/migration';

interface Props {
  waves: MigrationWave[];
}

const WAVE_COLORS = ['#6929c4', '#1192e8', '#005d5d', '#9f1853', '#198038', '#002d9c'];

const MigrationWavesPanel: React.FC<Props> = ({ waves }) => {
  if (waves.length === 0) {
    return <p style={{ color: 'var(--cds-text-helper)' }}>No migration waves generated.</p>;
  }

  return (
    <div className="migration-waves-panel">
      {/* Timeline bar */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '1.5rem', borderRadius: '4px', overflow: 'hidden' }}>
        {waves.map((wave, i) => (
          <div
            key={wave.waveNumber}
            style={{
              flex: Math.max(1, wave.resources.length),
              padding: '0.5rem',
              background: WAVE_COLORS[i % WAVE_COLORS.length],
              color: '#fff',
              fontSize: '0.75rem',
              textAlign: 'center',
              minWidth: '60px',
            }}
          >
            <div style={{ fontWeight: 600 }}>Wave {wave.waveNumber}</div>
            <div>{wave.name}</div>
          </div>
        ))}
      </div>

      {/* Detail accordion */}
      <Accordion>
        {waves.map((wave) => (
          <AccordionItem
            key={wave.waveNumber}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong>Wave {wave.waveNumber}: {wave.name}</strong>
                <Tag type="outline" size="sm">{wave.resources.length} resources</Tag>
                <Tag type="cool-gray" size="sm">{wave.estimatedDuration}</Tag>
              </span>
            }
          >
            <div style={{ padding: '0.5rem 0' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>{wave.description}</p>

              {wave.prerequisites.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <h6 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Prerequisites</h6>
                  <UnorderedList>
                    {wave.prerequisites.map((p, i) => <ListItem key={i}>{p}</ListItem>)}
                  </UnorderedList>
                </div>
              )}

              {wave.resources.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <h6 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Resources</h6>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {wave.resources.map((r) => (
                      <Tag key={r.id} type="outline" size="sm">
                        {r.name}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '0.75rem' }}>
                <h6 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Validation Steps</h6>
                <UnorderedList>
                  {wave.validationSteps.map((s, i) => <ListItem key={i}>{s}</ListItem>)}
                </UnorderedList>
              </div>

              <div>
                <h6 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Rollback Plan</h6>
                <p style={{ fontSize: '0.875rem' }}>{wave.rollbackPlan}</p>
              </div>
            </div>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default MigrationWavesPanel;
