import { useCallback, useState } from 'react';
import { buildInventoryReport, getReportBranding } from '@/services/report/docx/index';
import type { ReportConfig } from '@/services/report/docx/types';
import { isAIConfigured } from '@/services/ai/aiProxyClient';
import { fetchReportNarrative } from '@/services/ai/reportApi';
import type { AIReportSectionType } from '@/types/ai';

const AI_SECTIONS: AIReportSectionType[] = [
  'executive_summary',
  'environment_overview',
];

export function useInventoryExport() {
  const [exporting, setExporting] = useState(false);

  const exportInventoryDocx = useCallback(async (
    collectedData: Record<string, unknown[]>,
    options?: { clientName?: string; includeAI?: boolean },
  ) => {
    setExporting(true);
    try {
      const branding = getReportBranding();
      if (options?.clientName) {
        branding.clientName = options.clientName;
      }

      let aiNarratives: Record<string, string> | undefined;
      if (options?.includeAI && await isAIConfigured()) {
        aiNarratives = {};
        for (const section of AI_SECTIONS) {
          try {
            const narrative = await fetchReportNarrative(section, {
              resourceCounts: Object.fromEntries(
                Object.entries(collectedData).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
              ),
            });
            aiNarratives[section] = narrative;
          } catch {
            // AI failures are non-blocking
          }
        }
      }

      const config: ReportConfig = {
        branding,
        includeAI: !!aiNarratives && Object.keys(aiNarratives).length > 0,
        aiNarratives,
      };

      await buildInventoryReport(collectedData, config);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportInventoryDocx, exporting };
}
