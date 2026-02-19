// Re-export from the new modular DOCX report system
// This file is kept for backward compatibility with existing imports
export { buildMigrationReport, buildReport } from '@/services/report/docx/index';
export type { ReportConfig, ReportBranding } from '@/services/report/docx/index';
export { getReportBranding } from '@/services/report/docx/index';

import type { MigrationAnalysisOutput } from '@/types/migration';
import { buildReport, getReportBranding } from '@/services/report/docx/index';

/**
 * Legacy API: generate the migration DOCX report.
 * Kept for backward compatibility with useMigrationExport.
 */
export async function generateDocxReport(
  result: MigrationAnalysisOutput,
  accountName?: string,
): Promise<void> {
  const branding = getReportBranding();
  if (accountName) {
    branding.clientName = accountName;
  }
  await buildReport({}, {
    branding,
    includeAI: false,
  }, result);
}
