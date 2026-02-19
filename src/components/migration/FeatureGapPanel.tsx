import React from 'react';
import { Tag, Tooltip } from '@carbon/react';
import type { FeatureGap } from '@/types/migration';
import MigrationTable from './MigrationTable';
import type { MigrationColumnDef, ColumnGroup } from './MigrationTable';

interface Props {
  featureGaps: FeatureGap[];
}

function severityTag(severity: string): React.ReactNode {
  switch (severity) {
    case 'critical': return <Tag type="red" size="sm">Critical</Tag>;
    case 'high': return <Tag type="magenta" size="sm">High</Tag>;
    case 'medium': return <Tag type="warm-gray" size="sm">Medium</Tag>;
    case 'low': return <Tag type="cool-gray" size="sm">Low</Tag>;
    default: return <Tag size="sm">{severity}</Tag>;
  }
}

const featureColumnGroups: ColumnGroup[] = [
  { id: 'feature', label: 'Feature', className: 'migration-table__group--classic' },
  { id: 'impact', label: 'Impact', className: 'migration-table__group--impact' },
];

const featureColumns: MigrationColumnDef[] = [
  { key: 'feature', header: 'Classic Feature', group: 'feature' },
  { key: 'workaround', header: 'VPC Workaround', group: 'feature' },
  {
    key: 'severity',
    header: 'Severity',
    group: 'impact',
    render: (val) => severityTag(val as string),
  },
  {
    key: 'detected',
    header: 'Detected',
    group: 'impact',
    render: (val) => (
      <Tag type={val === 'Yes' ? 'warm-gray' : 'green'} size="sm">{val as string}</Tag>
    ),
  },
  { key: 'affected', header: 'Affected', group: 'impact' },
];

const FeatureGapPanel: React.FC<Props> = ({ featureGaps }) => {
  const rows = featureGaps.map((gap, i) => ({
    id: String(i),
    feature: gap.feature,
    severity: gap.severity,
    detected: gap.detected ? 'Yes' : 'No',
    affected: gap.detected ? String(gap.affectedResources) : '-',
    workaround: gap.workaround,
  }));

  const detectedCount = featureGaps.filter((g) => g.detected).length;

  return (
    <div className="feature-gap-panel">
      <div style={{ marginBottom: '1rem' }}>
        <Tooltip label="Number of Classic features with no direct VPC equivalent" align="bottom">
          <Tag type={detectedCount > 0 ? 'warm-gray' : 'green'}>
            {detectedCount} of {featureGaps.length} feature gap(s) detected
          </Tag>
        </Tooltip>
      </div>

      <MigrationTable
        columns={featureColumns}
        columnGroups={featureColumnGroups}
        rows={rows}
        emptyMessage="No feature gaps to display."
      />
    </div>
  );
};

export default FeatureGapPanel;
