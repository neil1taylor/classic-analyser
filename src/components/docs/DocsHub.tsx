import React, { useState, useRef, useEffect } from 'react';
import DocsNav, { type DocSection } from './DocsNav';
import {
  GettingStartedSection,
  ClassicSection,
  VpcSection,
  DataTablesSection,
  VisualizationsSection,
  MigrationSection,
  AIFeaturesSection,
  ImportExportSection,
  SettingsSection,
  SecuritySection,
  ResourceReferenceSection,
  TroubleshootingSection,
} from './sections';
import '@/styles/docs.scss';

const renderSection = (section: DocSection): React.ReactNode => {
  switch (section) {
    case 'getting-started':
      return <GettingStartedSection />;
    case 'classic':
      return <ClassicSection />;
    case 'vpc':
      return <VpcSection />;
    case 'data-tables':
      return <DataTablesSection />;
    case 'visualizations':
      return <VisualizationsSection />;
    case 'migration':
      return <MigrationSection />;
    case 'ai-features':
      return <AIFeaturesSection />;
    case 'import-export':
      return <ImportExportSection />;
    case 'settings':
      return <SettingsSection />;
    case 'security':
      return <SecuritySection />;
    case 'resource-reference':
      return <ResourceReferenceSection />;
    case 'troubleshooting':
      return <TroubleshootingSection />;
    default:
      return <GettingStartedSection />;
  }
};

const DocsHub: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSection>('getting-started');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo(0, 0);
    }
  }, [activeSection]);

  return (
    <div className="docs-hub">
      <div className="docs-hub__nav">
        <DocsNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </div>
      <div className="docs-hub__content" ref={contentRef}>
        {renderSection(activeSection)}
      </div>
    </div>
  );
};

export default DocsHub;
