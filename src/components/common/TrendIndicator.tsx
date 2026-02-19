import React from 'react';

interface TrendIndicatorProps {
  dcCount: number;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ dcCount }) => {
  if (dcCount === 0) return null;

  const label = dcCount === 1 ? '1 DC' : `spread across ${dcCount} DCs`;

  return (
    <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      <span>{label}</span>
    </span>
  );
};

export default TrendIndicator;
