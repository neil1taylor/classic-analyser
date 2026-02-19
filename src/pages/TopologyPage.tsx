import React from 'react';
import TopologyDiagram from '@/components/topology/TopologyDiagram';

const TopologyPage: React.FC = () => {
  return (
    <main style={{ width: '100%', height: '100%' }}>
      <TopologyDiagram />
    </main>
  );
};

export default TopologyPage;
