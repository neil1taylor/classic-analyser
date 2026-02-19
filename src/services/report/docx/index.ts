import {
  Document,
  Packer,
  Paragraph,
  Table,
  TextRun,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  TableOfContents,
  StyleLevel,
  PageBreak,
  SectionType,
} from 'docx';
import { saveAs } from 'file-saver';
import type { MigrationAnalysisOutput } from '@/types/migration';
import type { ReportConfig } from './types';

import { buildCoverPage } from './sections/coverPage';
import { buildExecutiveSummary } from './sections/executiveSummary';
import { buildEnvironmentOverview } from './sections/environmentOverview';
import { buildInventoryDetails } from './sections/inventoryDetails';
import { buildMigrationReadiness } from './sections/migrationReadiness';
import { buildComputeAssessment } from './sections/computeAssessment';
import { buildNetworkAssessment } from './sections/networkAssessment';
import { buildStorageAssessment } from './sections/storageAssessment';
import { buildSecurityAssessment } from './sections/securityAssessment';
import { buildFeatureGaps } from './sections/featureGaps';
import { buildCostAnalysis } from './sections/costAnalysis';
import { buildWavePlan } from './sections/wavePlan';
import { buildRecommendations } from './sections/recommendations';
import { buildAssumptions } from './sections/assumptions';
import { buildAppendices } from './sections/appendices';
import { resetCaptionCounters } from './utils/captions';
import { GRAY } from './utils/styles';

// ── Helpers ─────────────────────────────────────────────────────────────

function ai(config: ReportConfig, key: string): string | undefined {
  if (!config.includeAI || !config.aiNarratives) return undefined;
  return config.aiNarratives[key];
}

function buildDocument(children: (Paragraph | Table)[]): Document {
  const headerText = 'IBM Cloud Infrastructure Report';

  return new Document({
    features: {
      updateFields: true,
    },
    styles: {
      default: {
        document: {
          run: {
            font: 'IBM Plex Sans',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          titlePage: true,
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: headerText,
                    size: 16,
                    color: GRAY,
                  }),
                ],
              }),
            ],
          }),
          first: new Header({
            children: [new Paragraph({ children: [] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: GRAY,
                  }),
                ],
              }),
            ],
          }),
          first: new Footer({
            children: [new Paragraph({ children: [] })],
          }),
        },
        children,
      },
    ],
  });
}

async function saveDocument(doc: Document, filename: string): Promise<void> {
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

// ── Table of Contents ───────────────────────────────────────────────────

function buildTOC(): (Paragraph | Table | TableOfContents)[] {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 240, after: 200 },
      children: [
        new TextRun({
          text: 'Table of Contents',
          bold: true,
          size: 32,
          color: '161616',
        }),
      ],
    }),
    new TableOfContents('Table of Contents', {
      hyperlink: true,
      headingStyleRange: '1-3',
      stylesWithLevels: [
        new StyleLevel('Heading1', 1),
        new StyleLevel('Heading2', 2),
        new StyleLevel('Heading3', 3),
      ],
    }),
  ];
}

// ── Unified Report ──────────────────────────────────────────────────────

export async function buildReport(
  collectedData: Record<string, unknown[]>,
  config: ReportConfig,
  migrationData?: MigrationAnalysisOutput,
): Promise<void> {
  resetCaptionCounters();

  const hasMigration = !!migrationData;

  const title = hasMigration
    ? 'Classic to VPC Migration Assessment'
    : 'Infrastructure Inventory Report';
  const subtitle = hasMigration
    ? 'IBM Cloud Infrastructure Migration Report'
    : 'IBM Cloud Classic Infrastructure';

  // Cover page
  const children: (Paragraph | Table | TableOfContents)[] = [
    ...buildCoverPage(title, subtitle, config.branding),
  ];

  // Table of Contents
  children.push(...buildTOC());

  // Executive Summary
  const complexityScore = hasMigration
    ? migrationData.complexityScore
    : {
        overall: 0,
        category: 'Low' as const,
        dimensions: {
          compute: { score: 0, label: 'N/A', findings: [] },
          network: { score: 0, label: 'N/A', findings: [] },
          storage: { score: 0, label: 'N/A', findings: [] },
          security: { score: 0, label: 'N/A', findings: [] },
          features: { score: 0, label: 'N/A', findings: [] },
        },
      };

  children.push(
    ...buildExecutiveSummary(complexityScore, ai(config, 'executive_summary')),
  );

  // Environment Overview (async — has charts)
  const envOverview = await buildEnvironmentOverview(
    collectedData,
    hasMigration ? migrationData.costAnalysis : undefined,
    ai(config, 'environment_overview'),
  );
  children.push(...envOverview);

  // Inventory Details
  children.push(...buildInventoryDetails(collectedData));

  // ── Migration-only sections ─────────────────────────────────────────
  if (hasMigration) {
    const readiness = await buildMigrationReadiness(
      migrationData.complexityScore,
      ai(config, 'migration_readiness'),
    );
    children.push(...readiness);

    children.push(
      ...buildComputeAssessment(
        migrationData.computeAssessment,
        ai(config, 'compute_assessment'),
      ),
    );

    children.push(
      ...buildNetworkAssessment(
        migrationData.networkAssessment,
        ai(config, 'network_assessment'),
      ),
    );

    children.push(
      ...buildStorageAssessment(
        migrationData.storageAssessment,
        ai(config, 'storage_assessment'),
      ),
    );

    children.push(
      ...buildSecurityAssessment(
        migrationData.securityAssessment,
        ai(config, 'security_assessment'),
      ),
    );

    children.push(...buildFeatureGaps(migrationData.featureGaps));

    const costSection = await buildCostAnalysis(
      migrationData.costAnalysis,
      ai(config, 'cost_analysis'),
    );
    children.push(...costSection);

    children.push(...buildWavePlan(migrationData.migrationWaves));

    children.push(
      ...buildRecommendations(migrationData, ai(config, 'recommendations')),
    );

    children.push(...buildAssumptions());
  }

  // Appendices (always)
  children.push(...buildAppendices());

  const doc = buildDocument(children as (Paragraph | Table)[]);
  const timestamp = new Date().toISOString().slice(0, 10);
  const suffix = hasMigration ? 'Migration_Assessment' : 'Inventory';
  await saveDocument(doc, `${config.branding.clientName}_${suffix}_${timestamp}.docx`);
}

// ── Legacy exports (backward compatibility) ─────────────────────────────

export async function buildInventoryReport(
  collectedData: Record<string, unknown[]>,
  config: ReportConfig,
): Promise<void> {
  return buildReport(collectedData, config);
}

export async function buildMigrationReport(
  result: MigrationAnalysisOutput,
  collectedData: Record<string, unknown[]>,
  config: ReportConfig,
): Promise<void> {
  return buildReport(collectedData, config, result);
}

// ── Re-exports ──────────────────────────────────────────────────────────

export type { ReportConfig, ReportBranding } from './types';
export { getReportBranding } from './utils/branding';
