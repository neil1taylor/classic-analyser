import React, { useState } from 'react';
import { ChevronDown } from '@carbon/icons-react';

export type DocSection =
  | 'index'
  | 'feature-overview'
  | 'getting-started'
  | 'classic'
  | 'vpc'
  | 'powervs'
  | 'platform'
  | 'dashboards'
  | 'data-tables'
  | 'visualizations'
  | 'migration'
  | 'import-export'
  | 'input-file-reference'
  | 'security'
  | 'settings'
  | 'troubleshooting';

interface NavGroup {
  label: string;
  items: { id: DocSection; label: string }[];
}

const NAV_STRUCTURE: (NavGroup | { id: DocSection; label: string })[] = [
  { id: 'getting-started', label: 'Getting Started' },
  {
    label: 'Overview',
    items: [
      { id: 'feature-overview', label: 'Feature Overview' },
      { id: 'dashboards', label: 'Dashboards' },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { id: 'classic', label: 'Classic Infrastructure' },
      { id: 'vpc', label: 'VPC Infrastructure' },
      { id: 'powervs', label: 'PowerVS Infrastructure' },
      { id: 'platform', label: 'Platform Services' },
    ],
  },
  {
    label: 'Features',
    items: [
      { id: 'data-tables', label: 'Data Tables' },
      { id: 'visualizations', label: 'Visualizations' },
      { id: 'migration', label: 'Migration Assessment' },
      { id: 'import-export', label: 'Import & Export' },
      { id: 'input-file-reference', label: 'Input File Reference' },
      { id: 'settings', label: 'Settings' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { id: 'security', label: 'Security & Privacy' },
      { id: 'troubleshooting', label: 'Troubleshooting' },
    ],
  },
];

interface DocsNavProps {
  activeSection: DocSection;
  onSectionChange: (section: DocSection) => void;
}

function isGroup(item: NavGroup | { id: DocSection; label: string }): item is NavGroup {
  return 'items' in item;
}

const DocsNav: React.FC<DocsNavProps> = ({ activeSection, onSectionChange }) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <nav className="docs-nav" aria-label="Documentation sections">
      {NAV_STRUCTURE.map((entry) => {
        if (isGroup(entry)) {
          const isCollapsed = collapsedGroups.has(entry.label);
          return (
            <div key={entry.label} className="docs-nav__group">
              <button
                className="docs-nav__group-label"
                onClick={() => toggleGroup(entry.label)}
                aria-expanded={!isCollapsed}
              >
                <span>{entry.label}</span>
                <ChevronDown
                  size={14}
                  className={`docs-nav__group-chevron${isCollapsed ? ' docs-nav__group-chevron--collapsed' : ''}`}
                />
              </button>
              {!isCollapsed && (
                <div className="docs-nav__group-items">
                  {entry.items.map((item) => (
                    <button
                      key={item.id}
                      className={`docs-nav__item${activeSection === item.id ? ' docs-nav__item--active' : ''}`}
                      onClick={() => onSectionChange(item.id)}
                      aria-current={activeSection === item.id ? 'page' : undefined}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={entry.id}
            className={`docs-nav__standalone${activeSection === entry.id ? ' docs-nav__standalone--active' : ''}`}
            onClick={() => onSectionChange(entry.id)}
            aria-current={activeSection === entry.id ? 'page' : undefined}
          >
            {entry.label}
          </button>
        );
      })}
    </nav>
  );
};

export default DocsNav;
