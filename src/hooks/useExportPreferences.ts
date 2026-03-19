// Export preferences persistence — last-used export options
import { useLocalPreferences } from './useLocalPreferences';

interface ExportPrefs {
  lastFormat: 'xlsx' | 'pdf' | 'docx' | 'pptx';
  includeAIInsights: boolean;
  includeCharts: boolean;
}

const DEFAULT_EXPORT_PREFS: ExportPrefs = {
  lastFormat: 'xlsx',
  includeAIInsights: false,
  includeCharts: true,
};

export function useExportPreferences(accountId?: string, accountName?: string) {
  const { data, persist, reset } = useLocalPreferences<ExportPrefs>({
    storageKey: 'ibm-explorer-export-prefs',
    version: 1,
    defaultValue: DEFAULT_EXPORT_PREFS,
    accountId,
    accountName,
  });

  return { exportPreferences: data, setExportPreferences: persist, resetExportPreferences: reset };
}
