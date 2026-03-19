// Focused hook for AI report enhancement — thin wrapper over AIContext + settings
import { useAI } from '@/contexts/AIContext';
import { useAISettings } from './useAISettings';

export function useAIReport(accountId?: string, accountName?: string) {
  const { isAvailable, isWatsonx } = useAI();
  const { aiSettings } = useAISettings(accountId, accountName);

  return {
    isAvailable: isAvailable && aiSettings.enableReportEnhancement,
    isWatsonx,
    reportEnhancementEnabled: aiSettings.enableReportEnhancement,
  };
}
