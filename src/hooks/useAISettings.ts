// AI settings persistence — feature toggles
import { useLocalPreferences } from './useLocalPreferences';

interface AISettings {
  enableInsights: boolean;
  enableCostOptimization: boolean;
  enableReportEnhancement: boolean;
  enableChat: boolean;
}

const DEFAULT_AI_SETTINGS: AISettings = {
  enableInsights: true,
  enableCostOptimization: true,
  enableReportEnhancement: true,
  enableChat: true,
};

export function useAISettings(accountId?: string, accountName?: string) {
  const { data, persist, reset } = useLocalPreferences<AISettings>({
    storageKey: 'ibm-explorer-ai-settings',
    version: 1,
    defaultValue: DEFAULT_AI_SETTINGS,
    accountId,
    accountName,
  });

  return { aiSettings: data, setAISettings: persist, resetAISettings: reset };
}
