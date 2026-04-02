import { Paragraph, Table, HeadingLevel } from 'docx';
import type { PreReqCheckResults, CheckResult } from '@/types/migration';
import { heading, body, spacer, pageBreak } from '../utils/styles';
import { createStyledTable } from '../utils/tables';
import { tableCaption } from '../utils/captions';

export function buildPreFlightChecks(
  checks: PreReqCheckResults,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Pre-Flight Checks'),
    body(
      'The following pre-requisite checks were evaluated against the Classic infrastructure to identify potential migration blockers, warnings, and informational findings.',
    ),
    spacer(),
  ];

  const allChecks: CheckResult[] = [
    ...checks.compute,
    ...checks.storage,
    ...checks.network,
    ...checks.security,
  ];

  const blockers = allChecks.filter((c) => c.severity === 'blocker' && c.affectedCount > 0);
  const warnings = allChecks.filter((c) => c.severity === 'warning' && c.affectedCount > 0);
  const passed = allChecks.filter((c) => c.severity === 'passed');
  const info = allChecks.filter((c) => c.severity === 'info' && c.affectedCount > 0);

  elements.push(
    body(
      `${allChecks.length} checks evaluated: ${blockers.length} blockers, ${warnings.length} warnings, ${info.length} informational, ${passed.length} passed.`,
    ),
    spacer(),
  );

  // Blockers
  if (blockers.length > 0) {
    elements.push(heading('Blockers', HeadingLevel.HEADING_2));
    elements.push(
      body('These issues must be resolved before migration can proceed.'),
    );
    elements.push(tableCaption('Migration Blockers'));
    elements.push(buildCheckTable(blockers));
    elements.push(spacer());
  }

  // Warnings
  if (warnings.length > 0) {
    elements.push(heading('Warnings', HeadingLevel.HEADING_2));
    elements.push(
      body('These issues should be addressed but do not prevent migration.'),
    );
    elements.push(tableCaption('Migration Warnings'));
    elements.push(buildCheckTable(warnings));
    elements.push(spacer());
  }

  // Info
  if (info.length > 0) {
    elements.push(heading('Informational', HeadingLevel.HEADING_2));
    elements.push(tableCaption('Informational Findings'));
    elements.push(buildCheckTable(info));
    elements.push(spacer());
  }

  // Affected resources detail (blockers only)
  if (blockers.length > 0) {
    const withResources = blockers.filter((c) => c.affectedResources.length > 0);
    if (withResources.length > 0) {
      elements.push(heading('Affected Resources (Blockers)', HeadingLevel.HEADING_2));
      elements.push(
        body('Resources affected by blocking checks that require remediation before migration.'),
      );

      const headers = ['Check', 'Resource ID', 'Hostname', 'Detail'];
      const rows: string[][] = [];
      for (const c of withResources) {
        for (const r of c.affectedResources.slice(0, 20)) {
          rows.push([
            c.check.name,
            String(r.id),
            r.hostname,
            r.detail ?? '',
          ]);
        }
        if (c.affectedResources.length > 20) {
          rows.push([c.check.name, `... and ${c.affectedResources.length - 20} more`, '', '']);
        }
      }
      elements.push(tableCaption('Blocker Affected Resources'));
      elements.push(createStyledTable(headers, rows));
      elements.push(spacer());
    }
  }

  return elements;
}

function buildCheckTable(checks: CheckResult[]): Table {
  const headers = ['Check', 'Category', 'Severity', 'Affected', 'Total', 'Description'];
  const rows = checks.map((c) => [
    c.check.name,
    c.check.category,
    c.severity.toUpperCase(),
    String(c.affectedCount),
    String(c.totalChecked),
    c.check.description,
  ]);
  return createStyledTable(headers, rows);
}
