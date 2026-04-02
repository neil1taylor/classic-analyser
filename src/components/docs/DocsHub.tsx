import React, { useState, useRef, useEffect } from 'react';
import DocsNav, { type DocSection } from './DocsNav';
import MarkdownRenderer from './MarkdownRenderer';
import '@/styles/docs.scss';

import indexMd from '../../../docs/guide/index.md?raw';
import featureOverviewMd from '../../../docs/guide/feature-overview.md?raw';
import gettingStartedMd from '../../../docs/guide/getting-started.md?raw';
import classicMd from '../../../docs/guide/classic-infrastructure.md?raw';
import vpcMd from '../../../docs/guide/vpc-infrastructure.md?raw';
import powervsMd from '../../../docs/guide/powervs-infrastructure.md?raw';
import platformMd from '../../../docs/guide/platform-services.md?raw';
import dashboardsMd from '../../../docs/guide/dashboards.md?raw';
import dataTablesMd from '../../../docs/guide/data-tables.md?raw';
import visualizationsMd from '../../../docs/guide/visualizations.md?raw';
import migrationMd from '../../../docs/guide/migration-assessment.md?raw';
import importExportMd from '../../../docs/guide/import-export.md?raw';
import inputFileRefMd from '../../../docs/guide/input-file-reference.md?raw';
import securityMd from '../../../docs/guide/security-privacy.md?raw';
import settingsMd from '../../../docs/guide/settings.md?raw';
import troubleshootingMd from '../../../docs/guide/troubleshooting.md?raw';

const SECTION_CONTENT: Record<DocSection, string> = {
  'index': indexMd,
  'feature-overview': featureOverviewMd,
  'getting-started': gettingStartedMd,
  'classic': classicMd,
  'vpc': vpcMd,
  'powervs': powervsMd,
  'platform': platformMd,
  'dashboards': dashboardsMd,
  'data-tables': dataTablesMd,
  'visualizations': visualizationsMd,
  'migration': migrationMd,
  'import-export': importExportMd,
  'input-file-reference': inputFileRefMd,
  'security': securityMd,
  'settings': settingsMd,
  'troubleshooting': troubleshootingMd,
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
        <MarkdownRenderer content={SECTION_CONTENT[activeSection] || SECTION_CONTENT['getting-started']} />
      </div>
    </div>
  );
};

export default DocsHub;
