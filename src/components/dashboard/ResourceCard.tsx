import React from 'react';
import { ClickableTile } from '@carbon/react';
import {
  VirtualMachine,
  Network_2,
  DataBase,
  Security,
  IbmCloudDirectLink_2Dedicated as DnsIcon,
  Category,
} from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import AnimatedCounter from '@/components/common/AnimatedCounter';
import TrendIndicator from '@/components/common/TrendIndicator';
import SkeletonCard from '@/components/common/SkeletonCard';
import type { ResourceCategory } from '@/types/resources';

interface ResourceCardProps {
  resourceKey: string;
  label: string;
  category: ResourceCategory | string;
  count: number | null;
  loading?: boolean;
  dcCount?: number;
  subMetrics?: string;
  linkPrefix?: string;
}

function getCategoryIcon(category: ResourceCategory | string) {
  switch (category) {
    case 'Compute':
      return VirtualMachine;
    case 'Network':
      return Network_2;
    case 'Storage':
      return DataBase;
    case 'Security':
      return Security;
    case 'DNS':
      return DnsIcon;
    case 'Other':
      return Category;
    default:
      // VPC categories: map to same icons
      if (typeof category === 'string') {
        if (category.includes('Compute')) return VirtualMachine;
        if (category.includes('Network')) return Network_2;
        if (category.includes('Storage')) return DataBase;
        if (category.includes('Security')) return Security;
      }
      return Category;
  }
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  resourceKey,
  label,
  category,
  count,
  loading = false,
  dcCount,
  subMetrics,
  linkPrefix,
}) => {
  const navigate = useNavigate();

  if (loading && count === null) {
    return <SkeletonCard />;
  }

  const Icon = getCategoryIcon(category);

  return (
    <ClickableTile
      className="metric-card"
      onClick={() => navigate(linkPrefix ? `${linkPrefix}/resources/${resourceKey}` : `/resources/${resourceKey}`)}
      style={{ height: '100%', minHeight: '180px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Icon size={20} style={{ color: 'var(--cds-icon-secondary)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.32px' }}>
            {category}
          </span>
        </div>

        <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
          {label}
        </p>

        <p style={{ fontSize: '2rem', fontWeight: 300, margin: '0 0 0.25rem', color: count !== null ? 'var(--cds-text-primary)' : 'var(--cds-text-disabled)' }}>
          {count !== null ? <AnimatedCounter value={count} /> : '--'}
        </p>

        {dcCount !== undefined && dcCount > 0 && (
          <div style={{ marginBottom: '0.25rem' }}>
            <TrendIndicator dcCount={dcCount} />
          </div>
        )}

        {subMetrics && (
          <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', margin: 'auto 0 0', lineHeight: 1.4 }}>
            {subMetrics}
          </p>
        )}
      </div>
    </ClickableTile>
  );
};

export default ResourceCard;
