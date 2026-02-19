import React from 'react';
import { ProgressBar, Tag, Tooltip } from '@carbon/react';
import type { ComplexityScore } from '@/types/migration';

interface Props {
  score: ComplexityScore;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#24a148'; // green
  if (score >= 60) return '#f1c21b'; // yellow
  if (score >= 40) return '#ff832b'; // orange
  return '#da1e28'; // red
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Ready';
  if (score >= 60) return 'Mostly Ready';
  if (score >= 40) return 'Needs Work';
  return 'Significant Effort';
}

const ReadinessScoreCard: React.FC<Props> = ({ score }) => {
  const dimensions = [
    { key: 'compute', label: 'Compute', dim: score.dimensions.compute, tooltip: 'Readiness of virtual servers and bare metal for VPC migration' },
    { key: 'network', label: 'Network', dim: score.dimensions.network, tooltip: 'Readiness of VLANs, gateways, and firewalls for VPC migration' },
    { key: 'storage', label: 'Storage', dim: score.dimensions.storage, tooltip: 'Readiness of block, file, and object storage for VPC migration' },
    { key: 'security', label: 'Security', dim: score.dimensions.security, tooltip: 'Readiness of security groups, certificates, and SSH keys' },
    { key: 'features', label: 'Features', dim: score.dimensions.features, tooltip: 'Classic features with no direct VPC equivalent' },
  ];

  return (
    <div className="readiness-score-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <Tooltip label="Overall readiness score for VPC migration (0–100)" align="bottom">
            <div style={{
              fontSize: '3rem',
              fontWeight: 300,
              color: scoreColor(score.overall),
              lineHeight: 1.1,
            }}>
              {score.overall}%
            </div>
          </Tooltip>
          <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
            {scoreLabel(score.overall)}
          </div>
        </div>

        <div>
          <Tooltip label="Estimated complexity of the full migration effort" align="bottom">
            <Tag type={score.category === 'Low' ? 'green' : score.category === 'Medium' ? 'blue' : score.category === 'High' ? 'warm-gray' : 'red'}>
              {score.category} Complexity
            </Tag>
          </Tooltip>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {dimensions.map(({ key, label, dim, tooltip }) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <Tooltip label={tooltip} align="bottom">
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</span>
              </Tooltip>
              <span style={{ fontSize: '0.875rem', color: scoreColor(dim.score) }}>
                {dim.score}% — {dim.label}
              </span>
            </div>
            <ProgressBar
              value={dim.score}
              max={100}
              size="small"
              status="active"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReadinessScoreCard;
