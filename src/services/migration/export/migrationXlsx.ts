import ExcelJS from 'exceljs';
import type { MigrationAnalysisOutput, VSIMigration, BareMetalMigration, CheckResult } from '@/types/migration';
import {
  addHeaderStyle, autoWidth, freezeHeaderRow, addAutoFilter,
  applyCurrencyFormat, applyFillByValue,
  STATUS_FILLS, SEVERITY_FILLS, CURRENCY_FORMAT,
} from './styles';

export interface MigrationExportMeta {
  accountName?: string;
}

// ── Public entry point ───────────────────────────────────────────────────

export async function generateMigrationXlsx(
  analysis: MigrationAnalysisOutput,
  meta: MigrationExportMeta = {},
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();

  addMigrationSummary(wb, analysis, meta);
  addMigrationReadiness(wb, analysis);
  addVpcProfileMapping(wb, analysis);
  addPreFlightChecks(wb, analysis);
  addCostComparison(wb, analysis);
  addWavePlanning(wb, analysis);
  addFeatureGaps(wb, analysis);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ── Sheet 1: Migration Summary ───────────────────────────────────────────

function addMigrationSummary(
  wb: ExcelJS.Workbook,
  a: MigrationAnalysisOutput,
  meta: MigrationExportMeta,
): void {
  const ws = wb.addWorksheet('Migration Summary');
  ws.columns = [
    { header: 'Property', key: 'property', width: 30 },
    { header: 'Value', key: 'value', width: 40 },
  ];
  addHeaderStyle(ws);

  const rows: Array<{ property: string; value: string | number }> = [
    { property: 'Account', value: meta.accountName || '' },
    { property: 'Analysis Date', value: a.timestamp },
    { property: 'Target Region', value: a.preferences.targetRegion },
    { property: '', value: '' },
    { property: 'Overall Readiness Score', value: a.complexityScore.overall },
    { property: 'Readiness Category', value: a.complexityScore.category },
    { property: '', value: '' },
    { property: 'Compute Score', value: a.complexityScore.dimensions.compute.score },
    { property: 'Network Score', value: a.complexityScore.dimensions.network.score },
    { property: 'Storage Score', value: a.complexityScore.dimensions.storage.score },
    { property: 'Security Score', value: a.complexityScore.dimensions.security.score },
    { property: 'Features Score', value: a.complexityScore.dimensions.features.score },
    { property: '', value: '' },
    { property: 'Total Instances', value: a.computeAssessment.totalInstances },
    { property: 'Ready to Migrate', value: a.computeAssessment.summary.readyToMigrate },
    { property: 'Needs Work', value: a.computeAssessment.summary.needsWork },
    { property: 'Blocked', value: a.computeAssessment.summary.blocked },
    { property: '', value: '' },
    { property: 'Classic Monthly Cost', value: a.costAnalysis.classicMonthlyCost },
    { property: 'VPC Monthly Cost', value: a.costAnalysis.vpcMonthlyCost },
    { property: 'Monthly Difference', value: a.costAnalysis.monthlyDifference },
    { property: '3-Year Savings', value: a.costAnalysis.threeYearSavings },
    { property: 'Break-Even Months', value: a.costAnalysis.breakEvenMonths },
    { property: '', value: '' },
    { property: 'Migration Waves', value: a.migrationWaves.length },
    { property: 'Total Wave Resources', value: a.migrationWaves.reduce((s, w) => s + w.resources.length, 0) },
  ];

  for (const r of rows) ws.addRow(r);

  // Apply currency format to cost rows
  ws.eachRow((row) => {
    const prop = String(row.getCell(1).value ?? '');
    if (prop.includes('Cost') || prop.includes('Difference') || prop.includes('Savings')) {
      const cell = row.getCell(2);
      if (typeof cell.value === 'number') cell.numFmt = CURRENCY_FORMAT;
    }
  });

  // Bold section labels
  ws.eachRow((row) => {
    const val = String(row.getCell(1).value ?? '');
    if (['Overall Readiness Score', 'Total Instances', 'Classic Monthly Cost', 'Migration Waves'].includes(val)) {
      row.getCell(1).font = { bold: true, size: 11 };
    }
  });

  autoWidth(ws);
}

// ── Sheet 2: Migration Readiness ─────────────────────────────────────────

function addMigrationReadiness(wb: ExcelJS.Workbook, a: MigrationAnalysisOutput): void {
  const ws = wb.addWorksheet('Migration Readiness');
  ws.columns = [
    { header: 'ID', key: 'id' },
    { header: 'Hostname', key: 'hostname' },
    { header: 'Type', key: 'type' },
    { header: 'Datacenter', key: 'datacenter' },
    { header: 'CPU/Cores', key: 'cpu' },
    { header: 'Memory (GB)', key: 'memoryGB' },
    { header: 'OS', key: 'os' },
    { header: 'Status', key: 'status' },
    { header: 'Migration Approach', key: 'approach' },
    { header: 'Recommended Profile', key: 'profile' },
    { header: 'Classic Monthly ($)', key: 'classicFee' },
    { header: 'VPC Monthly ($)', key: 'vpcFee' },
    { header: 'Notes', key: 'notes' },
  ];
  addHeaderStyle(ws);

  for (const v of a.computeAssessment.vsiMigrations) {
    ws.addRow({
      id: v.id,
      hostname: v.hostname,
      type: 'VSI',
      datacenter: v.datacenter,
      cpu: v.cpu,
      memoryGB: Math.round(v.memoryMB / 1024 * 10) / 10,
      os: v.os,
      status: v.status,
      approach: v.migrationApproach ?? '',
      profile: v.recommendedProfile?.name ?? '',
      classicFee: v.currentFee,
      vpcFee: v.recommendedProfile?.estimatedCost ?? 0,
      notes: v.notes.join('; '),
    });
  }

  for (const bm of a.computeAssessment.bareMetalMigrations) {
    ws.addRow({
      id: bm.id,
      hostname: bm.hostname,
      type: 'Bare Metal',
      datacenter: bm.datacenter,
      cpu: bm.cores,
      memoryGB: bm.memoryGB,
      os: bm.os,
      status: bm.status,
      approach: bm.migrationApproach ?? '',
      profile: bm.recommendedProfile?.name ?? '',
      classicFee: bm.currentFee,
      vpcFee: bm.recommendedProfile?.estimatedCost ?? 0,
      notes: bm.notes.join('; '),
    });
  }

  applyCurrencyFormat(ws, ['classicFee', 'vpcFee']);
  applyFillByValue(ws, 'status', STATUS_FILLS);
  freezeHeaderRow(ws);
  addAutoFilter(ws);
  autoWidth(ws);
}

// ── Sheet 3: VPC Profile Mapping ─────────────────────────────────────────

function addVpcProfileMapping(wb: ExcelJS.Workbook, a: MigrationAnalysisOutput): void {
  const ws = wb.addWorksheet('VPC Profile Mapping');
  ws.columns = [
    { header: 'Hostname', key: 'hostname' },
    { header: 'Classic CPU', key: 'cpu' },
    { header: 'Classic Memory (GB)', key: 'memoryGB' },
    { header: 'Recommended Profile', key: 'profile' },
    { header: 'Profile Family', key: 'family' },
    { header: 'Profile vCPU', key: 'profileVcpu' },
    { header: 'Profile Memory (GB)', key: 'profileMem' },
    { header: 'Profile Bandwidth (Gbps)', key: 'profileBw' },
    { header: 'Alt Profile 1', key: 'alt1' },
    { header: 'Alt Profile 2', key: 'alt2' },
    { header: 'OS Compatible', key: 'osCompat' },
    { header: 'OS Upgrade Target', key: 'osUpgrade' },
  ];
  addHeaderStyle(ws);

  const eligible = a.computeAssessment.vsiMigrations.filter(
    (v) => v.status !== 'blocked' && v.recommendedProfile,
  );

  for (const v of eligible) {
    const p = v.recommendedProfile!;
    ws.addRow({
      hostname: v.hostname,
      cpu: v.cpu,
      memoryGB: Math.round(v.memoryMB / 1024 * 10) / 10,
      profile: p.name,
      family: p.family,
      profileVcpu: p.vcpu,
      profileMem: p.memory,
      profileBw: p.bandwidth,
      alt1: v.alternativeProfiles[0]?.name ?? '',
      alt2: v.alternativeProfiles[1]?.name ?? '',
      osCompat: v.osCompatible ? 'Yes' : 'No',
      osUpgrade: v.osUpgradeTarget ?? '',
    });
  }

  freezeHeaderRow(ws);
  addAutoFilter(ws);
  autoWidth(ws);
}

// ── Sheet 4: Pre-Flight Checks ───────────────────────────────────────────

function addPreFlightChecks(wb: ExcelJS.Workbook, a: MigrationAnalysisOutput): void {
  const ws = wb.addWorksheet('Pre-Flight Checks');

  // Section A: Check Summary
  ws.columns = [
    { header: 'Check ID', key: 'checkId' },
    { header: 'Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Severity', key: 'severity' },
    { header: 'Affected', key: 'affected' },
    { header: 'Total Checked', key: 'total' },
    { header: 'Description', key: 'description' },
  ];
  addHeaderStyle(ws);

  const allChecks: CheckResult[] = [
    ...a.prereqChecks.compute,
    ...a.prereqChecks.storage,
    ...a.prereqChecks.network,
    ...a.prereqChecks.security,
  ];

  for (const c of allChecks) {
    ws.addRow({
      checkId: c.check.id,
      name: c.check.name,
      category: c.check.category,
      severity: c.severity,
      affected: c.affectedCount,
      total: c.totalChecked,
      description: c.check.description,
    });
  }

  applyFillByValue(ws, 'severity', SEVERITY_FILLS);

  // Section B: Affected Resources (below, with gap)
  const checksWithAffected = allChecks.filter((c) => c.affectedResources.length > 0);
  if (checksWithAffected.length > 0) {
    const gapRow = ws.rowCount + 2;

    // Add sub-header
    const subHeaderRow = ws.getRow(gapRow);
    subHeaderRow.getCell(1).value = 'Check ID';
    subHeaderRow.getCell(2).value = 'Check Name';
    subHeaderRow.getCell(3).value = 'Resource ID';
    subHeaderRow.getCell(4).value = 'Hostname';
    subHeaderRow.getCell(5).value = 'Detail';
    subHeaderRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    subHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F62FE' } };
    subHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };
    subHeaderRow.height = 24;

    for (const c of checksWithAffected) {
      for (const r of c.affectedResources) {
        ws.addRow({
          checkId: c.check.id,
          name: c.check.name,
          description: String(r.id),
          category: r.hostname,        // reuse column positions
          severity: r.detail ?? '',
        });
      }
    }
  }

  freezeHeaderRow(ws);
  autoWidth(ws);
}

// ── Sheet 5: Cost Comparison ─────────────────────────────────────────────

function addCostComparison(wb: ExcelJS.Workbook, a: MigrationAnalysisOutput): void {
  const ws = wb.addWorksheet('Cost Comparison');
  ws.columns = [
    { header: 'Hostname', key: 'hostname' },
    { header: 'Type', key: 'type' },
    { header: 'Classic Monthly ($)', key: 'classicFee' },
    { header: 'VPC Profile', key: 'profile' },
    { header: 'VPC Monthly ($)', key: 'vpcFee' },
    { header: 'Difference ($)', key: 'diff' },
    { header: '% Change', key: 'pctChange' },
  ];
  addHeaderStyle(ws);

  const instances: Array<{ hostname: string; type: string; classic: number; profile: string; vpc: number }> = [];

  for (const v of a.computeAssessment.vsiMigrations) {
    instances.push({
      hostname: v.hostname,
      type: 'VSI',
      classic: v.currentFee,
      profile: v.recommendedProfile?.name ?? 'N/A',
      vpc: v.recommendedProfile?.estimatedCost ?? 0,
    });
  }
  for (const bm of a.computeAssessment.bareMetalMigrations) {
    instances.push({
      hostname: bm.hostname,
      type: 'Bare Metal',
      classic: bm.currentFee,
      profile: bm.recommendedProfile?.name ?? 'N/A',
      vpc: bm.recommendedProfile?.estimatedCost ?? 0,
    });
  }

  const dataStartRow = 2;
  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i];
    const rowNum = dataStartRow + i;
    ws.addRow({
      hostname: inst.hostname,
      type: inst.type,
      classicFee: inst.classic,
      profile: inst.profile,
      vpcFee: inst.vpc,
      diff: { formula: `E${rowNum}-C${rowNum}` },
      pctChange: { formula: `IF(C${rowNum}=0,0,(E${rowNum}-C${rowNum})/C${rowNum})` },
    });
  }

  const dataEndRow = dataStartRow + instances.length - 1;
  const summaryStart = dataEndRow + 3;

  // Summary section
  const summaryRows: Array<[string, string, string]> = [
    ['Category', 'Classic Monthly ($)', 'VPC Monthly ($)'],
    ['Compute', String(a.costAnalysis.costByCategory.compute.classic), String(a.costAnalysis.costByCategory.compute.vpc)],
    ['Storage', String(a.costAnalysis.costByCategory.storage.classic), String(a.costAnalysis.costByCategory.storage.vpc)],
    ['Network', String(a.costAnalysis.costByCategory.network.classic), String(a.costAnalysis.costByCategory.network.vpc)],
  ];

  // Summary header
  const sumHeaderRow = ws.getRow(summaryStart);
  sumHeaderRow.getCell(1).value = 'Category';
  sumHeaderRow.getCell(2).value = 'Classic Monthly ($)';
  sumHeaderRow.getCell(3).value = 'VPC Monthly ($)';
  sumHeaderRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sumHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F62FE' } };
  sumHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };
  sumHeaderRow.height = 24;

  // Category rows
  const catData = [
    { cat: 'Compute', classic: a.costAnalysis.costByCategory.compute.classic, vpc: a.costAnalysis.costByCategory.compute.vpc },
    { cat: 'Storage', classic: a.costAnalysis.costByCategory.storage.classic, vpc: a.costAnalysis.costByCategory.storage.vpc },
    { cat: 'Network', classic: a.costAnalysis.costByCategory.network.classic, vpc: a.costAnalysis.costByCategory.network.vpc },
  ];

  for (let i = 0; i < catData.length; i++) {
    const row = ws.getRow(summaryStart + 1 + i);
    row.getCell(1).value = catData[i].cat;
    row.getCell(2).value = catData[i].classic;
    row.getCell(2).numFmt = CURRENCY_FORMAT;
    row.getCell(3).value = catData[i].vpc;
    row.getCell(3).numFmt = CURRENCY_FORMAT;
  }

  // Total row with SUM formulas
  const totalRow = ws.getRow(summaryStart + 4);
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(2).value = { formula: `SUM(B${summaryStart + 1}:B${summaryStart + 3})` } as unknown as number;
  totalRow.getCell(2).numFmt = CURRENCY_FORMAT;
  totalRow.getCell(3).value = { formula: `SUM(C${summaryStart + 1}:C${summaryStart + 3})` } as unknown as number;
  totalRow.getCell(3).numFmt = CURRENCY_FORMAT;

  // Extra summary metrics
  const metricsStart = summaryStart + 6;
  const metricRows: Array<[string, string | number]> = [
    ['Monthly Difference', a.costAnalysis.monthlyDifference],
    ['Percentage Change', `${a.costAnalysis.percentageChange.toFixed(1)}%`],
    ['Break-Even Months', a.costAnalysis.breakEvenMonths],
    ['3-Year Savings', a.costAnalysis.threeYearSavings],
  ];
  for (let i = 0; i < metricRows.length; i++) {
    const row = ws.getRow(metricsStart + i);
    row.getCell(1).value = metricRows[i][0];
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = metricRows[i][1];
    if (typeof metricRows[i][1] === 'number' &&
        (String(metricRows[i][0]).includes('Difference') || String(metricRows[i][0]).includes('Savings'))) {
      row.getCell(2).numFmt = CURRENCY_FORMAT;
    }
  }

  // Apply currency + percent formats on data rows
  applyCurrencyFormat(ws, ['classicFee', 'vpcFee', 'diff']);
  ws.eachRow((row, rowNum) => {
    if (rowNum > 1 && rowNum <= dataEndRow) {
      const cell = row.getCell(7); // pctChange column
      cell.numFmt = '0.0%';
    }
  });

  freezeHeaderRow(ws);
  autoWidth(ws);
}

// ── Sheet 6: Wave Planning ───────────────────────────────────────────────

function addWavePlanning(wb: ExcelJS.Workbook, a: MigrationAnalysisOutput): void {
  const ws = wb.addWorksheet('Wave Planning');
  ws.columns = [
    { header: 'Wave #', key: 'wave' },
    { header: 'Name', key: 'name' },
    { header: 'Description', key: 'description' },
    { header: 'Resource Count', key: 'count' },
    { header: 'Resources', key: 'resources' },
    { header: 'Prerequisites', key: 'prereqs' },
    { header: 'Est. Duration', key: 'duration' },
    { header: 'Rollback Plan', key: 'rollback' },
  ];
  addHeaderStyle(ws);

  for (const w of a.migrationWaves) {
    ws.addRow({
      wave: w.waveNumber,
      name: w.name,
      description: w.description,
      count: w.resources.length,
      resources: w.resources.map((r) => r.name).join(', '),
      prereqs: w.prerequisites.join(', '),
      duration: w.estimatedDuration,
      rollback: w.rollbackPlan,
    });
  }

  freezeHeaderRow(ws);
  autoWidth(ws);
}

// ── Sheet 7: Feature Gaps ────────────────────────────────────────────────

function addFeatureGaps(wb: ExcelJS.Workbook, a: MigrationAnalysisOutput): void {
  const detected = a.featureGaps.filter((g) => g.detected);
  if (detected.length === 0) return; // skip sheet if no gaps detected

  const ws = wb.addWorksheet('Feature Gaps');
  ws.columns = [
    { header: 'Feature', key: 'feature' },
    { header: 'Severity', key: 'severity' },
    { header: 'Affected Resources', key: 'affected' },
    { header: 'Workaround', key: 'workaround' },
    { header: 'Notes', key: 'notes' },
  ];
  addHeaderStyle(ws);

  for (const g of detected) {
    ws.addRow({
      feature: g.feature,
      severity: g.severity,
      affected: g.affectedResources,
      workaround: g.workaround,
      notes: g.notes,
    });
  }

  applyFillByValue(ws, 'severity', SEVERITY_FILLS);
  freezeHeaderRow(ws);
  addAutoFilter(ws);
  autoWidth(ws);
}
