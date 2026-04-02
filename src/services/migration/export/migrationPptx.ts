/**
 * Migration Assessment PPTX export using pptxgenjs.
 * Generates a presentation deck with migration-focused slides.
 */
import PptxGenJS from 'pptxgenjs';
import type { MigrationAnalysisOutput } from '@/types/migration';
import type { MigrationExportMeta } from './migrationXlsx';

const IBM_BLUE = '0F62FE';
const LIGHT_GRAY = 'F4F4F4';
const STATUS_COLORS: Record<string, string> = {
  ready: '24A148',
  'needs-work': 'F1C21B',
  blocked: 'DA1E28',
};
const SEVERITY_COLORS: Record<string, string> = {
  blocker: 'DA1E28',
  warning: 'F1C21B',
  info: '0043CE',
  passed: '24A148',
  unknown: '8D8D8D',
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function generateMigrationPptx(
  analysis: MigrationAnalysisOutput,
  meta: MigrationExportMeta = {},
): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'IBM Cloud Infrastructure Explorer';
  pptx.title = 'VPC Migration Assessment';

  addTitleSlide(pptx, analysis, meta);
  addExecutiveSummarySlide(pptx, analysis);
  addReadinessSlide(pptx, analysis);
  addProfileMappingSlide(pptx, analysis);
  addPreFlightSlide(pptx, analysis);
  addCostComparisonSlide(pptx, analysis);
  addWavePlanningSlide(pptx, analysis);
  addFeatureGapsSlide(pptx, analysis);

  const blob = await pptx.write({ outputType: 'blob' }) as Blob;
  return blob;
}

// ── Title Slide ──────────────────────────────────────────────────────────

function addTitleSlide(
  pptx: PptxGenJS,
  analysis: MigrationAnalysisOutput,
  meta: MigrationExportMeta,
): void {
  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '40%',
    fill: { color: IBM_BLUE },
  });

  slide.addText('VPC Migration Assessment', {
    x: 0.75, y: 0.6, w: 11, h: 1,
    fontSize: 32, color: 'FFFFFF', bold: true,
  });

  slide.addText('Classic Infrastructure to IBM Cloud VPC', {
    x: 0.75, y: 1.5, w: 11, h: 0.6,
    fontSize: 20, color: 'FFFFFF',
  });

  const details = [
    meta.accountName ? `Account: ${meta.accountName}` : '',
    `Target Region: ${analysis.preferences.targetRegion}`,
    `Generated: ${new Date(analysis.timestamp).toLocaleDateString()}`,
  ].filter(Boolean);

  slide.addText(details.join('\n'), {
    x: 0.75, y: 3.5, w: 11, h: 1.5,
    fontSize: 14, color: '525252', lineSpacingMultiple: 1.5,
  });
}

// ── Executive Summary ────────────────────────────────────────────────────

function addExecutiveSummarySlide(pptx: PptxGenJS, a: MigrationAnalysisOutput): void {
  const slide = pptx.addSlide();
  slide.addText('Executive Summary', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: '161616',
  });

  // Readiness score
  const scoreColor = a.complexityScore.overall >= 70 ? '24A148'
    : a.complexityScore.overall >= 40 ? 'F1C21B' : 'DA1E28';

  slide.addText(`${a.complexityScore.overall}`, {
    x: 0.75, y: 1.2, w: 2, h: 1.5,
    fontSize: 48, bold: true, color: scoreColor, align: 'center',
  });
  slide.addText(`Readiness\n${a.complexityScore.category}`, {
    x: 0.75, y: 2.7, w: 2, h: 0.8,
    fontSize: 12, color: '525252', align: 'center',
  });

  // Dimension scores
  const dims = a.complexityScore.dimensions;
  const dimData = [
    { label: 'Compute', score: dims.compute.score },
    { label: 'Network', score: dims.network.score },
    { label: 'Storage', score: dims.storage.score },
    { label: 'Security', score: dims.security.score },
    { label: 'Features', score: dims.features.score },
  ];

  const dimRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Dimension', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 10 } },
      { text: 'Score', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 10, align: 'right' } },
    ],
    ...dimData.map((d, i) => [
      { text: d.label, options: { fontSize: 10, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      { text: String(d.score), options: { fontSize: 10, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    ]),
  ];

  slide.addTable(dimRows, {
    x: 3.5, y: 1.2, w: 4, colW: [2.5, 1.5],
    border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
  });

  // Instance summary
  const summary = a.computeAssessment.summary;
  const summaryRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Metric', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 10 } },
      { text: 'Value', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 10, align: 'right' } },
    ],
    [
      { text: 'Total Instances', options: { fontSize: 10 } },
      { text: String(a.computeAssessment.totalInstances), options: { fontSize: 10, align: 'right' } },
    ],
    [
      { text: 'Ready to Migrate', options: { fontSize: 10, fill: { color: LIGHT_GRAY } } },
      { text: String(summary.readyToMigrate), options: { fontSize: 10, align: 'right', color: '24A148', bold: true, fill: { color: LIGHT_GRAY } } },
    ],
    [
      { text: 'Needs Work', options: { fontSize: 10 } },
      { text: String(summary.needsWork), options: { fontSize: 10, align: 'right', color: 'F1C21B', bold: true } },
    ],
    [
      { text: 'Blocked', options: { fontSize: 10, fill: { color: LIGHT_GRAY } } },
      { text: String(summary.blocked), options: { fontSize: 10, align: 'right', color: 'DA1E28', bold: true, fill: { color: LIGHT_GRAY } } },
    ],
  ];

  slide.addTable(summaryRows, {
    x: 8.5, y: 1.2, w: 4, colW: [2.5, 1.5],
    border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
  });

  // Cost headline
  slide.addText([
    { text: 'Cost Impact: ', options: { bold: true, fontSize: 14 } },
    { text: `${formatCurrency(a.costAnalysis.classicMonthlyCost)}/mo`, options: { fontSize: 14, color: '525252' } },
    { text: ' → ', options: { fontSize: 14 } },
    { text: `${formatCurrency(a.costAnalysis.vpcMonthlyCost)}/mo`, options: { fontSize: 14, color: IBM_BLUE, bold: true } },
    { text: `  (${a.costAnalysis.percentageChange > 0 ? '+' : ''}${a.costAnalysis.percentageChange.toFixed(1)}%)`, options: { fontSize: 14, color: a.costAnalysis.percentageChange <= 0 ? '24A148' : 'DA1E28' } },
  ], {
    x: 0.75, y: 5.5, w: 12, h: 0.5,
  });

  slide.addText(`3-Year Savings: ${formatCurrency(a.costAnalysis.threeYearSavings)}  |  ${a.migrationWaves.length} migration waves planned`, {
    x: 0.75, y: 6.1, w: 12, h: 0.4,
    fontSize: 12, color: '525252',
  });
}

// ── Migration Readiness ──────────────────────────────────────────────────

function addReadinessSlide(pptx: PptxGenJS, a: MigrationAnalysisOutput): void {
  const slide = pptx.addSlide();
  slide.addText('Migration Readiness', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: '161616',
  });

  const allInstances = [
    ...a.computeAssessment.vsiMigrations.map((v) => ({
      hostname: v.hostname, type: 'VSI', dc: v.datacenter,
      cpu: v.cpu, mem: Math.round(v.memoryMB / 1024), os: v.os,
      status: v.status, approach: v.migrationApproach ?? '',
    })),
    ...a.computeAssessment.bareMetalMigrations.map((bm) => ({
      hostname: bm.hostname, type: 'BM', dc: bm.datacenter,
      cpu: bm.cores, mem: bm.memoryGB, os: bm.os,
      status: bm.status, approach: bm.migrationApproach ?? '',
    })),
  ];

  const preview = allInstances.slice(0, 18);
  const headers: PptxGenJS.TableRow = [
    { text: 'Hostname', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'Type', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'DC', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'CPU', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8, align: 'right' } },
    { text: 'Mem (GB)', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8, align: 'right' } },
    { text: 'Status', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'Approach', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
  ];

  const dataRows: PptxGenJS.TableRow[] = preview.map((inst, i) => [
    { text: inst.hostname, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: inst.type, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: inst.dc, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: String(inst.cpu), options: { fontSize: 7, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: String(inst.mem), options: { fontSize: 7, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: inst.status, options: { fontSize: 7, color: STATUS_COLORS[inst.status] || '161616', bold: true, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: inst.approach, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
  ]);

  slide.addTable([headers, ...dataRows], {
    x: 0.3, y: 1.1, w: 12.7,
    border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
    autoPage: true,
  });

  if (allInstances.length > 18) {
    slide.addText(`Showing 18 of ${allInstances.length} instances. See XLSX export for full data.`, {
      x: 0.5, y: 6.8, w: 12, h: 0.4,
      fontSize: 9, color: '8D8D8D', italic: true,
    });
  }
}

// ── VPC Profile Mapping ──────────────────────────────────────────────────

function addProfileMappingSlide(pptx: PptxGenJS, a: MigrationAnalysisOutput): void {
  const eligible = a.computeAssessment.vsiMigrations.filter(
    (v) => v.status !== 'blocked' && v.recommendedProfile,
  );
  if (eligible.length === 0) return;

  const slide = pptx.addSlide();
  slide.addText('VPC Profile Mapping', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: '161616',
  });

  slide.addText(`${eligible.length} instances mapped to VPC profiles`, {
    x: 0.5, y: 0.9, w: 12, h: 0.4,
    fontSize: 12, color: '525252',
  });

  const preview = eligible.slice(0, 18);
  const headers: PptxGenJS.TableRow = [
    { text: 'Hostname', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'Classic CPU', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8, align: 'right' } },
    { text: 'Classic Mem', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8, align: 'right' } },
    { text: 'VPC Profile', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'Family', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'vCPU', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8, align: 'right' } },
    { text: 'Mem (GB)', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8, align: 'right' } },
  ];

  const dataRows: PptxGenJS.TableRow[] = preview.map((v, i) => {
    const p = v.recommendedProfile!;
    return [
      { text: v.hostname, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      { text: String(v.cpu), options: { fontSize: 7, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      { text: String(Math.round(v.memoryMB / 1024)), options: { fontSize: 7, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      { text: p.name, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      { text: p.family, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      { text: String(p.vcpu), options: { fontSize: 7, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      { text: String(p.memory), options: { fontSize: 7, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    ];
  });

  slide.addTable([headers, ...dataRows], {
    x: 0.3, y: 1.5, w: 12.7,
    border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
    autoPage: true,
  });

  if (eligible.length > 18) {
    slide.addText(`Showing 18 of ${eligible.length} mappings. See XLSX export for full data.`, {
      x: 0.5, y: 6.8, w: 12, h: 0.4,
      fontSize: 9, color: '8D8D8D', italic: true,
    });
  }
}

// ── Pre-Flight Checks ────────────────────────────────────────────────────

function addPreFlightSlide(pptx: PptxGenJS, a: MigrationAnalysisOutput): void {
  const allChecks = [
    ...a.prereqChecks.compute,
    ...a.prereqChecks.storage,
    ...a.prereqChecks.network,
    ...a.prereqChecks.security,
  ];

  const blockers = allChecks.filter((c) => c.severity === 'blocker' && c.affectedCount > 0);
  const warnings = allChecks.filter((c) => c.severity === 'warning' && c.affectedCount > 0);
  const passed = allChecks.filter((c) => c.severity === 'passed');

  const slide = pptx.addSlide();
  slide.addText('Pre-Flight Checks', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: '161616',
  });

  slide.addText(`${allChecks.length} checks run  |  ${blockers.length} blockers  |  ${warnings.length} warnings  |  ${passed.length} passed`, {
    x: 0.5, y: 0.9, w: 12, h: 0.4,
    fontSize: 12, color: '525252',
  });

  // Show blockers and warnings (most important)
  const important = [...blockers, ...warnings].slice(0, 15);
  if (important.length === 0) {
    slide.addText('All pre-flight checks passed.', {
      x: 0.5, y: 2.5, w: 12, h: 1,
      fontSize: 18, color: '24A148', bold: true, align: 'center',
    });
    return;
  }

  const headers: PptxGenJS.TableRow = [
    { text: 'Check', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'Category', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'Severity', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
    { text: 'Affected', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8, align: 'right' } },
    { text: 'Description', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 8 } },
  ];

  const dataRows: PptxGenJS.TableRow[] = important.map((c, i) => [
    { text: c.check.name, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: c.check.category, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: c.severity, options: { fontSize: 7, color: SEVERITY_COLORS[c.severity] || '161616', bold: true, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: String(c.affectedCount), options: { fontSize: 7, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: c.check.description, options: { fontSize: 7, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
  ]);

  slide.addTable([headers, ...dataRows], {
    x: 0.3, y: 1.5, w: 12.7,
    colW: [2.5, 1.5, 1, 1, 6.7],
    border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
    autoPage: true,
  });
}

// ── Cost Comparison ──────────────────────────────────────────────────────

function addCostComparisonSlide(pptx: PptxGenJS, a: MigrationAnalysisOutput): void {
  const slide = pptx.addSlide();
  slide.addText('Cost Comparison', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: '161616',
  });

  // Category breakdown table
  const cats = a.costAnalysis.costByCategory;
  const catRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Category', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 10 } },
      { text: 'Classic Monthly', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 10, align: 'right' } },
      { text: 'VPC Monthly', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 10, align: 'right' } },
      { text: 'Difference', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 10, align: 'right' } },
    ],
    ...([
      { label: 'Compute', classic: cats.compute.classic, vpc: cats.compute.vpc },
      { label: 'Storage', classic: cats.storage.classic, vpc: cats.storage.vpc },
      { label: 'Network', classic: cats.network.classic, vpc: cats.network.vpc },
    ].map((r, i) => {
      const diff = r.vpc - r.classic;
      return [
        { text: r.label, options: { fontSize: 10, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
        { text: formatCurrency(r.classic), options: { fontSize: 10, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
        { text: formatCurrency(r.vpc), options: { fontSize: 10, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
        { text: formatCurrency(diff), options: { fontSize: 10, align: 'right' as const, color: diff <= 0 ? '24A148' : 'DA1E28', fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
      ];
    })),
    [
      { text: 'Total', options: { bold: true, fontSize: 11 } },
      { text: formatCurrency(a.costAnalysis.classicMonthlyCost), options: { bold: true, fontSize: 11, align: 'right' } },
      { text: formatCurrency(a.costAnalysis.vpcMonthlyCost), options: { bold: true, fontSize: 11, align: 'right', color: IBM_BLUE } },
      { text: formatCurrency(a.costAnalysis.monthlyDifference), options: { bold: true, fontSize: 11, align: 'right', color: a.costAnalysis.monthlyDifference <= 0 ? '24A148' : 'DA1E28' } },
    ],
  ];

  slide.addTable(catRows, {
    x: 0.5, y: 1.2, w: 12, colW: [3, 3, 3, 3],
    border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
  });

  // Key metrics
  const metrics = [
    `Monthly Change: ${a.costAnalysis.percentageChange > 0 ? '+' : ''}${a.costAnalysis.percentageChange.toFixed(1)}%`,
    `Break-Even: ${a.costAnalysis.breakEvenMonths} months`,
    `3-Year Savings: ${formatCurrency(a.costAnalysis.threeYearSavings)}`,
  ];

  slide.addText(metrics.join('     |     '), {
    x: 0.5, y: 4.5, w: 12, h: 0.6,
    fontSize: 14, color: '161616', bold: true, align: 'center',
  });
}

// ── Wave Planning ────────────────────────────────────────────────────────

function addWavePlanningSlide(pptx: PptxGenJS, a: MigrationAnalysisOutput): void {
  if (a.migrationWaves.length === 0) return;

  const slide = pptx.addSlide();
  slide.addText('Migration Wave Plan', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: '161616',
  });

  const totalResources = a.migrationWaves.reduce((s, w) => s + w.resources.length, 0);
  slide.addText(`${a.migrationWaves.length} waves | ${totalResources} resources`, {
    x: 0.5, y: 0.9, w: 12, h: 0.4,
    fontSize: 12, color: '525252',
  });

  const headers: PptxGenJS.TableRow = [
    { text: 'Wave', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 9 } },
    { text: 'Name', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 9 } },
    { text: 'Resources', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 9, align: 'right' } },
    { text: 'Duration', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 9 } },
    { text: 'Description', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 9 } },
  ];

  const dataRows: PptxGenJS.TableRow[] = a.migrationWaves.map((w, i) => [
    { text: String(w.waveNumber), options: { fontSize: 9, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: w.name, options: { fontSize: 9, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: String(w.resources.length), options: { fontSize: 9, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: w.estimatedDuration, options: { fontSize: 9, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: w.description, options: { fontSize: 9, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
  ]);

  slide.addTable([headers, ...dataRows], {
    x: 0.3, y: 1.5, w: 12.7,
    colW: [1, 2.5, 1.2, 1.5, 6.5],
    border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
    autoPage: true,
  });
}

// ── Feature Gaps ─────────────────────────────────────────────────────────

function addFeatureGapsSlide(pptx: PptxGenJS, a: MigrationAnalysisOutput): void {
  const detected = a.featureGaps.filter((g) => g.detected);
  if (detected.length === 0) return;

  const slide = pptx.addSlide();
  slide.addText('Feature Gaps', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: '161616',
  });

  slide.addText(`${detected.length} Classic features with no direct VPC equivalent`, {
    x: 0.5, y: 0.9, w: 12, h: 0.4,
    fontSize: 12, color: '525252',
  });

  const headers: PptxGenJS.TableRow = [
    { text: 'Feature', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 9 } },
    { text: 'Severity', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 9 } },
    { text: 'Affected', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 9, align: 'right' } },
    { text: 'Workaround', options: { bold: true, color: 'FFFFFF', fill: { color: IBM_BLUE }, fontSize: 9 } },
  ];

  const dataRows: PptxGenJS.TableRow[] = detected.map((g, i) => [
    { text: g.feature, options: { fontSize: 8, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: g.severity, options: { fontSize: 8, color: SEVERITY_COLORS[g.severity] || '161616', bold: true, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: String(g.affectedResources), options: { fontSize: 8, align: 'right' as const, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
    { text: g.workaround, options: { fontSize: 8, fill: { color: i % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY } } },
  ]);

  slide.addTable([headers, ...dataRows], {
    x: 0.3, y: 1.5, w: 12.7,
    colW: [3, 1.5, 1.2, 7],
    border: { type: 'solid', pt: 0.5, color: 'D0D0D0' },
    autoPage: true,
  });
}
