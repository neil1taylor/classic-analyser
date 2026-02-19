import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div
      style={{
        height: '100%',
        minHeight: '180px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cds-layer)',
        borderRadius: '4px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div className="skeleton" style={{ width: 20, height: 20, borderRadius: '50%' }} />
        <div className="skeleton skeleton--text" style={{ width: '40%' }} />
      </div>
      <div className="skeleton skeleton--text" style={{ width: '55%', marginBottom: '0.5rem' }} />
      <div className="skeleton skeleton--heading" />
      <div className="skeleton skeleton--sub" style={{ marginTop: 'auto' }} />
    </div>
  );
};

export default SkeletonCard;
