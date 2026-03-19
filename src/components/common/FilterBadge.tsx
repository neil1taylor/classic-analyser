// Filter badge component for showing active filter state
import { Tag } from '@carbon/react';
import { Close } from '@carbon/icons-react';
import './FilterBadge.scss';

interface FilterBadgeProps {
  dimension: string;
  value: string;
  onClear: () => void;
}

export function FilterBadge({ dimension, value, onClear }: FilterBadgeProps) {
  return (
    <div className="filter-badge">
      <span className="filter-badge__label">Filtered by:</span>
      <Tag
        type="blue"
        size="md"
        className="filter-badge__tag"
      >
        <span className="filter-badge__content">
          <strong>{dimension}:</strong> {value}
        </span>
        <button
          type="button"
          className="filter-badge__clear"
          onClick={onClear}
          aria-label="Clear filter"
        >
          <Close size={16} />
        </button>
      </Tag>
    </div>
  );
}
